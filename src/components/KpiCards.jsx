import { fmt, fmtPct, label as shortName } from '../lib/format.js'

export default function KpiCards({ agg, roles, rowCount, unitOf }) {
  const moneyLike = /매출|이익|금액|총액|revenue|profit/i
  const showMargin = roles.sales && roles.profit && moneyLike.test(roles.sales) && moneyLike.test(roles.profit) && agg.totalSales

  const cards = [
    { label: '데이터 건수', value: fmt(rowCount), unit: '행' },
    roles.sales && { label: `총 ${shortName(roles.sales)}`, value: fmt(agg.totalSales), unit: unitOf(roles.sales) },
    roles.profit && {
      label: `총 ${shortName(roles.profit)}`,
      value: fmt(agg.totalProfit),
      unit: unitOf(roles.profit),
      negative: agg.totalProfit < 0,
    },
    showMargin && { label: '이익률', value: fmtPct((agg.totalProfit / agg.totalSales) * 100), unit: `${shortName(roles.profit)} ÷ ${shortName(roles.sales)}` },
    roles.entity && { label: `${shortName(roles.entity)} 수`, value: fmt(agg.entityCount), unit: '개' },
    roles.region && { label: `${shortName(roles.region)} 수`, value: fmt(agg.regionCount), unit: '개' },
  ].filter(Boolean)

  return (
    <div className="kpi-grid">
      {cards.map((c) => (
        <div className="kpi" key={c.label}>
          <p className="kpi-label">{c.label}</p>
          <p className={`kpi-value${c.negative ? ' is-negative' : ''}`}>{c.value}</p>
          {c.unit && <p className="kpi-unit">{c.unit}</p>}
        </div>
      ))}
    </div>
  )
}
