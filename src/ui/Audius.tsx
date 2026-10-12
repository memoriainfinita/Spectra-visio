import { Plus } from 'lucide-react'
import { useState } from 'react'
import { addAudiusTrack, audiusStore, searchAudius, trendingAudius } from '../app/audius'
import { formatTime } from './format'
import { Hint } from './Hint'
import { useStore } from './useStore'
import { useT } from './useT'

// Music from Audius for the player's list: search or trending; a click adds and plays.
export function AudiusBrowser() {
  const t = useT()
  const a = useStore(audiusStore)
  const [text, setText] = useState('')

  return (
    <details className="audius">
      <summary>{t('audius.title')}</summary>
      <div className="radio">
        <form
          className="radio-search"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) void searchAudius(text)
          }}
        >
          <input type="search" required placeholder={t('audius.placeholder')} aria-label={t('audius.search')} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn" type="submit" disabled={a.searching}>
            {t('audius.search')}
          </button>
          <button className="btn" type="button" disabled={a.searching} onClick={() => void trendingAudius()}>
            {t('audius.trending')}
          </button>
        </form>
        {a.searching && <p className="muted small">{t('audius.searching')}</p>}
        {a.message && <p className={a.message.startsWith('audius.error') ? 'error' : 'muted small'}>{t(a.message)}</p>}
        {a.results && a.results.length > 0 && (
          <ul className="radio-list">
            {a.results.map((tr) => {
              const p = a.downloads[tr.id]
              const busy = p !== undefined && p >= 0
              const label = `${tr.artist} – ${tr.title}`
              return (
                <li key={tr.id} className={`radio-row${p === -1 ? ' unusable' : ''}`}>
                  <button className="radio-main" title={t('audius.play', { name: label })} disabled={busy} onClick={() => void addAudiusTrack(tr, true)}>
                    <span className="radio-name">{tr.title}</span>
                    <span className="radio-sub">
                      {busy ? (
                        t('audius.downloading', { n: Math.round(p * 100) })
                      ) : (
                        <>
                          {p === -1 && <span className="radio-flag">{t('audius.failed')}</span>}
                          {[tr.artist, tr.genre, tr.duration ? formatTime(tr.duration) : ''].filter(Boolean).join(' · ')}
                        </>
                      )}
                    </span>
                  </button>
                  <button className="icon-btn small" title={t('audius.add', { name: label })} aria-label={t('audius.add', { name: label })} disabled={busy} onClick={() => void addAudiusTrack(tr, false)}>
                    <Plus size={15} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <Hint text={t('audius.hint')} />
      </div>
    </details>
  )
}
