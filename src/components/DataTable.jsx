import { useEffect, useMemo, useState } from 'react'
import { cellText, fmt } from '../lib/format.js'
import { toNumber } from '../lib/excel.js'

const PAGE = 20

export default function DataTable({ columns, rows, highlight }) {
  const [sort, setSort] = useState({ key: null, dir: 1 })
  const [page, setPage] = useState(0)

  useEffect(() => setPage(0), [rows, sort])

  const sorted = useMemo(() => {
    if (!sort.key) return rows
    const col = columns.find((c) => c.key === sort.key)
    const val = (r) => (col?.type === 'number' ? toNumber(r[sort.key]) : r[sort.key])
    return [...rows].sort((a, b) => {
      const x = val(a)
      const y = val(b)
      if (x === null || x === undefined) return 1
      if (y === null || y === undefined) return -1
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sort.dir
      return String(x).localeCompare(String(y), 'ko', { numeric: true }) * sort.dir
    })
  }, [rows, columns, sort])

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE))
  const view = sorted.slice(page * PAGE, page * PAGE + PAGE)
  const q = highlight.trim().toLowerCase()

  // 오름차순 → 내림차순 → 정렬 해제
  const toggle = (key) => setSort((s) => (s.key === key ? (s.dir === 1 ? { key, dir: -1 } : { key: null, dir: 1 }) : { key, dir: 1 }))

  const mark = (text) => {
    if (!q) return text
    const i = text.toLowerCase().indexOf(q)
    if (i < 0) return text
    return (
      <>
        {text.slice(0, i)}
        <mark>{text.slice(i, i + q.length)}</mark>
        {text.slice(i + q.length)}
      </>
    )
  }

  return (
    <div className="card table-card">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th className="rownum">#</th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={c.type === 'number' ? 'num' : ''}
                  onClick={() => toggle(c.key)}
                  aria-sort={sort.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
                >
                  {c.key}
                  <span className="sort">{sort.key === c.key ? (sort.dir === 1 ? '▲' : '▼') : ''}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => (
              <tr key={page * PAGE + i}>
                <td className="rownum">{page * PAGE + i + 1}</td>
                {columns.map((c) => {
                  const n = c.type === 'number' ? toNumber(r[c.key]) : null
                  return (
                    <td key={c.key} className={c.type === 'number' ? `num${n < 0 ? ' neg' : ''}` : ''}>
                      {n !== null ? fmt(n) : mark(cellText(r[c.key]))}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <span>
          {sorted.length.toLocaleString()}개 행 중 {sorted.length ? page * PAGE + 1 : 0}–{Math.min(sorted.length, (page + 1) * PAGE)}
        </span>
        <div className="pager-btns">
          <button onClick={() => setPage(0)} disabled={page === 0} aria-label="처음">«</button>
          <button onClick={() => setPage((p) => p - 1)} disabled={page === 0} aria-label="이전">‹</button>
          <span className="pager-num">{page + 1} / {pages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= pages - 1} aria-label="다음">›</button>
          <button onClick={() => setPage(pages - 1)} disabled={page >= pages - 1} aria-label="마지막">»</button>
        </div>
      </div>
    </div>
  )
}
