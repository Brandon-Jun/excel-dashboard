import * as XLSX from 'xlsx'

const TOTAL_ROW = /^(합계|총계|소계|전체|total|subtotal|grand total)$/i

// 엑셀 파일(File)을 읽어 첫 번째 시트를 { sheetName, columns, rows } 로 변환
export async function readFirstSheet(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, blankrows: false })
  if (!grid.length) throw new Error('첫 번째 시트가 비어 있습니다.')

  const headerIdx = findHeaderRow(grid)
  const header = grid[headerIdx]
  const width = Math.max(...grid.map((r) => r.length))

  // 헤더 윗줄(그룹 헤더, 예: "📈 매출 (백만원)")은 병합 셀이므로 오른쪽으로 채워서 단위를 추출
  const above = headerIdx > 0 ? grid[headerIdx - 1] || [] : []
  const groupRow = above.filter((v) => v !== null && v !== '').length >= 2 ? fillForward(above, width) : []

  const used = new Set()
  const columns = []
  for (let c = 0; c < width; c++) {
    let name = clean(header[c]) || `열${c + 1}`
    let unique = name
    for (let n = 2; used.has(unique); n++) unique = `${name}_${n}`
    used.add(unique)
    columns.push({ key: unique, index: c, unit: extractUnit(unique) || extractUnit(groupRow[c]) })
  }

  const rows = []
  for (const r of grid.slice(headerIdx + 1)) {
    if (!r || r.every((v) => v === null || v === '')) continue
    if (r.slice(0, 3).some((v) => typeof v === 'string' && TOTAL_ROW.test(v.trim()))) continue
    const obj = {}
    columns.forEach((col) => {
      obj[col.key] = r[col.index] ?? null
    })
    rows.push(obj)
  }

  // 빈 열 제거
  const nonEmpty = columns.filter((col) => rows.some((row) => row[col.key] !== null && row[col.key] !== ''))
  profileColumns(nonEmpty, rows)
  return { sheetName, columns: nonEmpty, rows }
}

function clean(v) {
  if (v === null || v === undefined) return ''
  return String(v).replace(/\s+/g, ' ').trim()
}

function fillForward(row = [], width) {
  const out = []
  let last = null
  for (let c = 0; c < width; c++) {
    if (row[c] !== null && row[c] !== undefined && row[c] !== '') last = row[c]
    out.push(last)
  }
  return out
}

function extractUnit(text) {
  const m = clean(text).match(/\(([^)]+)\)\s*$/)
  return m ? m[1] : ''
}

// 헤더 행 찾기: 상단 15행 중 '문자열로만 채워진 셀 수'가 가장 많은 행 (동점이면 아래쪽)
function findHeaderRow(grid) {
  let best = 0
  let bestScore = -1
  const limit = Math.min(grid.length, 15)
  for (let i = 0; i < limit; i++) {
    const cells = (grid[i] || []).filter((v) => v !== null && v !== '')
    if (!cells.length) continue
    if (cells.some((v) => typeof v === 'number' || v instanceof Date)) continue
    const score = cells.length
    if (score >= bestScore) {
      best = i
      bestScore = score
    }
    // 데이터 행이 시작되면 중단
    const next = grid[i + 1] || []
    if (score >= 3 && next.some((v) => typeof v === 'number')) break
  }
  return best
}

export function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const s = v.replace(/[,\s%]/g, '')
    if (s === '' || s === '-') return null
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }
  return null
}

// 'YYYY-MM', 'YYYY-MM-DD', 'YYYY.MM', Date 객체 → { year, month }
export function toYearMonth(v) {
  if (v instanceof Date && !isNaN(v)) return { year: v.getFullYear(), month: v.getMonth() + 1 }
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{4})[-./년\s]*(\d{1,2})/)
    if (m) {
      const month = Number(m[2])
      if (month >= 1 && month <= 12) return { year: Number(m[1]), month }
    }
  }
  return null
}

function profileColumns(columns, rows) {
  for (const col of columns) {
    const vals = rows.map((r) => r[col.key]).filter((v) => v !== null && v !== '')
    const nums = vals.filter((v) => toNumber(v) !== null).length
    const dates = vals.filter((v) => toYearMonth(v) !== null).length
    const n = vals.length || 1
    col.type = dates / n >= 0.8 && typeof vals[0] !== 'number' ? 'date' : nums / n >= 0.8 ? 'number' : 'text'
    col.distinct = new Set(vals.map(String)).size
  }
}

const pick = (cols, patterns, exclude = []) => {
  for (const p of patterns) {
    const found = cols.find((c) => p.test(c.key) && !exclude.some((e) => e.test(c.key)))
    if (found) return found.key
  }
  return null
}

const QUARTER_COL = /^(?:Q([1-4])\s*(.+)|([1-4])\s*분기\s*(.+))$/i

// 분기 컬럼 묶음: { 매출: {1:'Q1매출',...}, 영업이익: {...} }
export function quarterFamilies(columns) {
  const fam = {}
  for (const c of columns) {
    if (c.type !== 'number') continue
    const m = c.key.match(QUARTER_COL)
    if (!m) continue
    const q = Number(m[1] || m[3])
    const suffix = (m[2] || m[4]).trim()
    fam[suffix] = fam[suffix] || {}
    fam[suffix][q] = c.key
  }
  return Object.fromEntries(Object.entries(fam).filter(([, v]) => Object.keys(v).length >= 2))
}

// 컬럼 이름으로 역할(지역/법인/매출/영업이익/기간)을 자동 추정
export function detectRoles(columns) {
  const text = columns.filter((c) => c.type === 'text')
  const nums = columns.filter((c) => c.type === 'number' && !QUARTER_COL.test(c.key))
  const dateCol = columns.find((c) => c.type === 'date')
    || columns.find((c) => /^(월|년월|기간|일자|날짜|거래일)$/.test(c.key) && c.type !== 'number')

  const region = pick(text, [/지역/, /권역/, /region/i, /구역/, /사업유형/, /사업부문/, /국가/])
    || [...text].sort((a, b) => a.distinct - b.distinct).find((c) => c.distinct > 1)?.key || null

  const entity = pick(text.filter((c) => c.key !== region), [/법인명/, /발전소명/, /고객사/, /회사명|업체명|거래처/, /name/i, /명$/, /법인/])
    || [...text].filter((c) => c.key !== region).sort((a, b) => b.distinct - a.distinct)[0]?.key || null

  const category = pick(
    text.filter((c) => ![region, entity].includes(c.key) && c.distinct <= 30),
    [/사업부문/, /사업유형/, /부문/, /제품군/, /상태/, /등급/, /유형/],
  ) || text.find((c) => ![region, entity].includes(c.key) && c.distinct > 1 && c.distinct <= 20)?.key || null

  const notRatio = [/률|율|%|비율|단가|용량|capacity|단위|지분|임직원|인원/i]
  const sales = pick(nums, [/^연\s*매출/, /매출액/, /매출/, /revenue|sales/i, /발전량/, /총액|거래액/, /합계/], notRatio)
    || nums.find((c) => !notRatio[0].test(c.key))?.key || nums[0]?.key || null

  const profit = pick(nums.filter((c) => c.key !== sales), [/^연\s*영업이익/, /영업이익/, /순이익/, /이익/, /profit/i], notRatio)
    || nums.find((c) => c.key !== sales && !notRatio[0].test(c.key) && !/분기|월/.test(c.key))?.key
    || nums.find((c) => c.key !== sales)?.key || null

  return { region, entity, category, sales, profit, period: dateCol?.key || null }
}

// 선택한 지표에 맞는 분기 컬럼 묶음 찾기 (예: '연매출' → '매출' 묶음)
export function familyFor(metric, families) {
  if (!metric) return null
  const base = metric.replace(/^(연|연간|합계|총)\s*/, '').replace(/\s*\(.*\)$/, '')
  if (families[base]) return families[base]
  const key = Object.keys(families).find((s) => base.includes(s) || s.includes(base))
  return key ? families[key] : null
}
