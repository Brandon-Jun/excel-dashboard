import { useState } from 'react'

export default function Uploader({ onFile, onPick, loading, error }) {
  const [over, setOver] = useState(false)

  return (
    <main>
      <section className="tile tile-light hero">
        <div className="container narrow">
          <h1 className="hero-display">엑셀을 올리면,<br />대시보드가 됩니다.</h1>
          <p className="hero-lead">.xlsx 파일의 첫 번째 시트를 읽어 표와 차트로 보여드립니다.</p>

          <div
            className={`dropzone${over ? ' is-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(false)
              onFile(e.dataTransfer.files?.[0])
            }}
          >
            <svg className="drop-icon" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M24 32V12m0 0-8 8m8-8 8 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 30v6a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2v-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p className="drop-title">{loading ? '파일을 읽는 중입니다…' : '여기에 파일을 끌어다 놓으세요'}</p>
            <p className="drop-sub">또는</p>
            <button className="btn-primary" onClick={onPick} disabled={loading}>
              파일 선택
            </button>
          </div>
          {error && <p className="error-banner" role="alert">{error}</p>}
        </div>
      </section>

      <section className="tile tile-parchment">
        <div className="container">
          <div className="feature-grid">
            {[
              ['핵심 지표', '합계·건수·이익률을 카드로 요약합니다.'],
              ['차트 3종', '지역별 매출, 분기별 추이, 법인별 영업이익.'],
              ['검색 · 필터', '키워드와 지역·구분·분기로 좁혀 봅니다.'],
              ['자동 인식', '열 이름을 읽어 지표를 찾고, 직접 바꿀 수도 있습니다.'],
            ].map(([t, d]) => (
              <div className="card feature" key={t}>
                <p className="feature-title">{t}</p>
                <p className="feature-desc">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
