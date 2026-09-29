import { useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line, LabelList, ReferenceLine,
} from 'recharts'
import { fmt, fmtCompact } from '../lib/format.js'

const C = {
  accent: '#0066cc',
  negative: '#aeaeb2',
  grid: '#e8e8ed',
  axis: '#7a7a7a',
  ink: '#1d1d1f',
}
const tick = { fill: C.axis, fontSize: 12 }

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div className="tooltip">
      <p className="tooltip-label">{label ?? payload[0].payload.name}</p>
      <p className="tooltip-value">
        {fmt(v)} <span>{unit}</span>
      </p>
    </div>
  )
}

function ChartCard({ title, unit, sub, wide, actions, children, empty }) {
  return (
    <div className={`card chart-card${wide ? ' wide' : ''}`}>
      <div className="chart-head">
        <div>
          <h3 className="chart-title">{title}</h3>
          <p className="chart-sub">{[unit && `단위: ${unit}`, sub].filter(Boolean).join(' · ')}</p>
        </div>
        {actions}
      </div>
      {empty ? <p className="chart-empty">{empty}</p> : children}
    </div>
  )
}

export function RegionChart({ data, title, unit }) {
  const empty = !data.length && '지역 또는 매출 열을 찾지 못했습니다. 위의 [컬럼 설정]에서 지정해 주세요.'
  const many = data.length > 10
  return (
    <ChartCard title={title} unit={unit} sub={`${data.length}개 항목`} empty={empty}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={{ stroke: C.grid }} interval={0}
            angle={many ? -35 : 0} textAnchor={many ? 'end' : 'middle'} height={many ? 64 : 30} />
          <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={fmtCompact} width={56} />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {data.map((d) => <Cell key={d.name} fill={d.value < 0 ? C.negative : C.accent} />)}
            {!many && <LabelList dataKey="value" position="top" formatter={fmtCompact} style={{ fill: C.axis, fontSize: 12 }} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function QuarterChart({ data, title, unit, source }) {
  const empty = !data.length && 'Q1~Q4 열이나 날짜(월) 열이 없어 분기 추이를 만들 수 없습니다.'
  return (
    <ChartCard title={title} unit={unit} sub={source} empty={empty}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 28, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={{ stroke: C.grid }} padding={{ left: 24, right: 24 }} />
          <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={fmtCompact} width={56} domain={['auto', 'auto']} />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: C.axis, strokeDasharray: '3 3' }} />
          <Line type="linear" dataKey="value" stroke={C.accent} strokeWidth={2}
            dot={{ r: 4, fill: '#fff', stroke: C.accent, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: C.accent, stroke: '#fff', strokeWidth: 2 }}>
            <LabelList dataKey="value" position="top" offset={12} formatter={fmtCompact} style={{ fill: C.ink, fontSize: 12 }} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

const LIMITS = [10, 20, 0]

export function EntityChart({ data, title, unit }) {
  const [limit, setLimit] = useState(10)
  const [order, setOrder] = useState('top')
  const sorted = order === 'top' ? data : [...data].reverse()
  const shown = limit ? sorted.slice(0, limit) : sorted
  const hasNegative = shown.some((d) => d.value < 0)
  const empty = !data.length && '법인 또는 영업이익 열을 찾지 못했습니다. 위의 [컬럼 설정]에서 지정해 주세요.'

  const actions = data.length > 0 && (
    <div className="seg-group">
      <div className="seg" role="group" aria-label="정렬">
        <button className={order === 'top' ? 'on' : ''} onClick={() => setOrder('top')}>상위</button>
        <button className={order === 'bottom' ? 'on' : ''} onClick={() => setOrder('bottom')}>하위</button>
      </div>
      <div className="seg" role="group" aria-label="표시 개수">
        {LIMITS.map((n) => (
          <button key={n} className={limit === n ? 'on' : ''} onClick={() => setLimit(n)}>{n ? n : '전체'}</button>
        ))}
      </div>
    </div>
  )

  return (
    <ChartCard wide title={title} unit={unit} sub={`${shown.length} / ${data.length}개 표시`} actions={actions} empty={empty}>
      <ResponsiveContainer width="100%" height={Math.max(160, shown.length * 30 + 40)}>
        <BarChart data={shown} layout="vertical" margin={{ top: 4, right: 64, left: 8, bottom: 4 }} barCategoryGap={4}>
          <CartesianGrid horizontal={false} stroke={C.grid} />
          <XAxis type="number" tick={tick} tickLine={false} axisLine={false} tickFormatter={fmtCompact} />
          <YAxis type="category" dataKey="name" tick={tick} tickLine={false} axisLine={{ stroke: C.grid }} width={210} interval={0}
            tickFormatter={(s) => (s.length > 26 ? `${s.slice(0, 25)}…` : s)} />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          {hasNegative && <ReferenceLine x={0} stroke={C.axis} />}
          <Bar dataKey="value" radius={4} maxBarSize={22}>
            {shown.map((d) => <Cell key={d.name} fill={d.value < 0 ? C.negative : C.accent} />)}
            <LabelList dataKey="value" position="right" formatter={fmtCompact} style={{ fill: C.axis, fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {hasNegative && <p className="chart-note"><span className="swatch neg" /> 회색 막대는 음수(적자)입니다.</p>}
    </ChartCard>
  )
}
