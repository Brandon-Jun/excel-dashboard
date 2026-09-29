import { shortName } from '../lib/format.js'

function Select({ label, value, onChange, options, allLabel = '전체' }) {
  return (
    <label className="select">
      <span className="select-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}

const ROLE_FIELDS = [
  ['region', '지역(그룹) 열', 'text'],
  ['entity', '법인(항목) 열', 'text'],
  ['category', '구분 필터 열', 'text'],
  ['sales', '매출 지표', 'number'],
  ['profit', '영업이익 지표', 'number'],
]

export default function FilterBar({ filters, setFilters, options, roles, setRoles, columnsByType, onReset }) {
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }))
  const active = filters.search || filters.region || filters.category || filters.quarter

  return (
    <div className="filters">
      <div className="filter-row">
        <label className="search">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="전체 열에서 검색"
            value={filters.search}
            onChange={(e) => set('search')(e.target.value)}
          />
        </label>
        {roles.region && <Select label={shortName(roles.region)} value={filters.region} onChange={set('region')} options={options.region} />}
        {roles.category && <Select label={shortName(roles.category)} value={filters.category} onChange={set('category')} options={options.category} />}
        {options.quarter?.length > 0 && <Select label="분기" value={filters.quarter} onChange={set('quarter')} options={options.quarter} />}
        {active && (
          <button className="btn-link" onClick={onReset}>필터 초기화</button>
        )}
      </div>

      <details className="role-config">
        <summary>컬럼 설정 · 자동 인식된 열을 바꿀 수 있습니다</summary>
        <div className="filter-row">
          {ROLE_FIELDS.map(([key, label, type]) => (
            <Select
              key={key}
              label={label}
              value={roles[key] || ''}
              allLabel="(없음)"
              onChange={(v) => setRoles({ ...roles, [key]: v || null })}
              options={columnsByType[type] || []}
            />
          ))}
        </div>
      </details>
    </div>
  )
}
