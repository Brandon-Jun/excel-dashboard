const full = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 })
const dec1 = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 })
const compact = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 })

export function fmt(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '-'
  if (typeof v !== 'number') return String(v)
  return Math.abs(v) < 100 && !Number.isInteger(v) ? dec1.format(v) : full.format(v)
}

export const fmtCompact = (v) => (typeof v === 'number' ? compact.format(v) : v)

export const fmtPct = (v) => (v === null || !Number.isFinite(v) ? '-' : `${dec1.format(v)}%`)

export function cellText(v) {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'number') return fmt(v)
  return String(v)
}

// 컬럼명에서 단위 괄호를 뗀 짧은 이름: '발전량(MWh)' → '발전량'
export const shortName = (key) => (key || '').replace(/\s*\([^)]*\)\s*$/, '')

// 차트 제목용 라벨: '법인명' → '법인', '연영업이익' → '영업이익'
export const label = (key) => shortName(key).replace(/^(.{2,})명$/, '$1').replace(/^연간?\s*(?=매출|영업이익|순이익|이익|거래)/, '')
