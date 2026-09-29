import { useMemo, useRef, useState } from 'react'
import { readFirstSheet, detectRoles, quarterFamilies, familyFor, toNumber, toYearMonth } from './lib/excel.js'
import { label } from './lib/format.js'
import Uploader from './components/Uploader.jsx'
import KpiCards from './components/KpiCards.jsx'
import { RegionChart, QuarterChart, EntityChart } from './components/Charts.jsx'
import DataTable from './components/DataTable.jsx'
import FilterBar from './components/FilterBar.jsx'

const EMPTY_FILTERS = { search: '', region: '', category: '', quarter: '' }

export default function App() {
  const [data, setData] = useState(null) // { fileName, sheetName, columns, rows }
  const [roles, setRoles] = useState(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  async function handleFile(file) {
    if (!file) return
    if (!/\.xlsx$/i.test(file.name)) {
      setError('.xlsx 형식의 엑셀 파일만 업로드할 수 있습니다.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const parsed = await readFirstSheet(file)
      if (!parsed.rows.length) throw new Error('첫 번째 시트에 데이터 행이 없습니다.')
      setData({ fileName: file.name, ...parsed })
      setRoles(detectRoles(parsed.columns))
      setFilters(EMPTY_FILTERS)
    } catch (e) {
      setError(`파일을 읽지 못했습니다: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const families = useMemo(() => (data ? quarterFamilies(data.columns) : {}), [data])
  const unitOf = (key) => data?.columns.find((c) => c.key === key)?.unit || ''

  // 행마다 분기 라벨 계산 (날짜/월 컬럼이 있을 때)
  const quarterOf = useMemo(() => {
    if (!data || !roles?.period) return null
    return (row) => {
      const ym = toYearMonth(row[roles.period])
      return ym ? `${ym.year} Q${Math.ceil(ym.month / 3)}` : null
    }
  }, [data, roles])

  const options = useMemo(() => {
    if (!data || !roles) return {}
    const uniq = (key) => (key ? [...new Set(data.rows.map((r) => r[key]).filter((v) => v !== null && v !== ''))].map(String).sort((a, b) => a.localeCompare(b, 'ko')) : [])
    return {
      region: uniq(roles.region),
      category: uniq(roles.category),
      quarter: quarterOf ? [...new Set(data.rows.map(quarterOf).filter(Boolean))].sort() : [],
    }
  }, [data, roles, quarterOf])

  const filtered = useMemo(() => {
    if (!data) return []
    const q = filters.search.trim().toLowerCase()
    return data.rows.filter((row) => {
      if (filters.region && String(row[roles.region]) !== filters.region) return false
      if (filters.category && String(row[roles.category]) !== filters.category) return false
      if (filters.quarter && quarterOf?.(row) !== filters.quarter) return false
      if (q && !Object.values(row).some((v) => v !== null && String(v).toLowerCase().includes(q))) return false
      return true
    })
  }, [data, roles, filters, quarterOf])

  const agg = useMemo(() => {
    if (!data || !roles) return null
    const sum = (rows, key) => rows.reduce((s, r) => s + (toNumber(r[key]) ?? 0), 0)
    const groupSum = (key, metric) => {
      const m = new Map()
      for (const r of filtered) {
        const k = r[key] === null || r[key] === '' ? '(미지정)' : String(r[key])
        m.set(k, (m.get(k) ?? 0) + (toNumber(r[metric]) ?? 0))
      }
      return [...m].map(([name, value]) => ({ name, value }))
    }

    const byRegion = roles.region && roles.sales ? groupSum(roles.region, roles.sales).sort((a, b) => b.value - a.value) : []
    const byEntity = roles.entity && roles.profit ? groupSum(roles.entity, roles.profit).sort((a, b) => b.value - a.value) : []

    // 분기 추이: ① Q1~Q4 컬럼이 있으면 가로형 합산, ② 없으면 날짜 컬럼 기준으로 분기별 합산
    let trend = []
    let trendSource = ''
    const fam = familyFor(roles.sales, families)
    if (fam) {
      trend = [1, 2, 3, 4].filter((q) => fam[q]).map((q) => ({ name: `Q${q}`, value: sum(filtered, fam[q]) }))
      trendSource = `${Object.values(fam).join(', ')} 컬럼 합계`
    } else if (quarterOf && roles.sales) {
      const m = new Map()
      for (const r of filtered) {
        const k = quarterOf(r)
        if (k) m.set(k, (m.get(k) ?? 0) + (toNumber(r[roles.sales]) ?? 0))
      }
      trend = [...m].sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }))
      trendSource = `'${roles.period}' 컬럼을 분기로 묶어 합계`
    }

    return {
      byRegion,
      byEntity,
      trend,
      trendSource,
      totalSales: roles.sales ? sum(filtered, roles.sales) : null,
      totalProfit: roles.profit ? sum(filtered, roles.profit) : null,
      entityCount: roles.entity ? new Set(filtered.map((r) => r[roles.entity])).size : null,
      regionCount: roles.region ? new Set(filtered.map((r) => r[roles.region])).size : null,
    }
  }, [data, roles, filtered, families, quarterOf])

  const columnsByType = useMemo(() => {
    if (!data) return {}
    return {
      text: data.columns.filter((c) => c.type !== 'number').map((c) => c.key),
      number: data.columns.filter((c) => c.type === 'number').map((c) => c.key),
    }
  }, [data])

  const reset = () => {
    setData(null)
    setRoles(null)
    setError('')
  }

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".xlsx"
      hidden
      onChange={(e) => {
        handleFile(e.target.files?.[0])
        e.target.value = ''
      }}
    />
  )

  return (
    <>
      <nav className="global-nav">
        <div className="container nav-inner">
          <span className="nav-brand">Excel Dashboard</span>
          {data && (
            <span className="nav-links">
              <a href="#kpi">핵심 지표</a>
              <a href="#charts">차트</a>
              <a href="#table">원본 데이터</a>
            </span>
          )}
        </div>
      </nav>

      <header className="sub-nav">
        <div className="container sub-inner">
          <div className="sub-title">
            {data ? (
              <>
                {data.fileName}
                <span className="sub-meta">시트 · {data.sheetName}</span>
              </>
            ) : (
              '대시보드'
            )}
          </div>
          <div className="sub-actions">
            {data && (
              <button className="btn-ghost" onClick={reset}>
                처음으로
              </button>
            )}
            <button className="btn-primary" onClick={() => inputRef.current?.click()}>
              {data ? '다른 파일 열기' : '파일 선택'}
            </button>
          </div>
        </div>
      </header>
      {hiddenInput}

      {!data ? (
        <Uploader onFile={handleFile} onPick={() => inputRef.current?.click()} loading={loading} error={error} />
      ) : (
        <main>
          {error && (
            <div className="container">
              <p className="error-banner" role="alert">{error}</p>
            </div>
          )}

          <section id="kpi" className="tile tile-dark">
            <div className="container">
              <h1 className="tile-headline">한눈에 보는 핵심 지표</h1>
              <p className="tile-tagline">
                {filtered.length === data.rows.length
                  ? `전체 ${data.rows.length.toLocaleString()}개 행 기준`
                  : `필터 적용 · ${filtered.length.toLocaleString()} / ${data.rows.length.toLocaleString()}개 행 기준`}
              </p>
              <KpiCards agg={agg} roles={roles} rowCount={filtered.length} unitOf={unitOf} />
            </div>
          </section>

          <section id="charts" className="tile tile-parchment">
            <div className="container">
              <FilterBar
                filters={filters}
                setFilters={setFilters}
                options={options}
                roles={roles}
                setRoles={(next) => {
                  setRoles(next)
                  setFilters((f) => ({ ...f, region: next.region !== roles.region ? '' : f.region, category: next.category !== roles.category ? '' : f.category }))
                }}
                columnsByType={columnsByType}
                onReset={() => setFilters(EMPTY_FILTERS)}
              />

              {filtered.length === 0 ? (
                <div className="card empty">조건에 맞는 데이터가 없습니다. 검색어나 필터를 바꿔보세요.</div>
              ) : (
                <div className="chart-grid">
                  <RegionChart
                    data={agg.byRegion}
                    title={`${label(roles.region) || '지역'}별 ${label(roles.sales) || '매출'}`}
                    unit={unitOf(roles.sales)}
                  />
                  <QuarterChart
                    data={agg.trend}
                    title={`분기별 ${label(roles.sales) || '매출'} 추이`}
                    unit={unitOf(roles.sales)}
                    source={agg.trendSource}
                  />
                  <EntityChart
                    data={agg.byEntity}
                    title={`${label(roles.entity) || '법인'}별 ${label(roles.profit) || '영업이익'}`}
                    unit={unitOf(roles.profit)}
                  />
                </div>
              )}
            </div>
          </section>

          <section id="table" className="tile tile-light">
            <div className="container">
              <h2 className="section-head">원본 데이터</h2>
              <p className="section-sub">첫 번째 시트의 내용입니다. 열 이름을 누르면 정렬됩니다.</p>
              <DataTable columns={data.columns} rows={filtered} highlight={filters.search} />
            </div>
          </section>
        </main>
      )}

      <footer className="footer">
        <div className="container">
          <p>파일은 서버로 전송되지 않고 브라우저 안에서만 읽습니다.</p>
          <p className="fine">React · Vite · SheetJS(xlsx) · Recharts</p>
        </div>
      </footer>
    </>
  )
}
