import { useState } from 'react'
import { mediaStore, openMedia, searchMediaFor, setMediaKind } from '../app/media'
import { visualInputStore } from '../app/visualInput'
import { typeAvailable, type MediaSource, type MediaType } from '../engine/media/media'
import { Hint } from './Hint'
import { useStore } from './useStore'
import { useT } from './useT'

const SOURCES: MediaSource[] = ['commons', 'nasa']
const TYPES: MediaType[] = ['video', 'image']

// Search Wikimedia Commons or NASA for a video or image to use as the visual input.
export function MediaBrowser() {
  const t = useT()
  const m = useStore(mediaStore)
  const input = useStore(visualInputStore)
  const [text, setText] = useState('')

  return (
    <div className="radio media">
      <div className="live-row">
        <div className="segmented" role="group" aria-label={t('media.source')}>
          {SOURCES.map((s) => (
            <button key={s} className={`seg${m.source === s ? ' on' : ''}`} aria-pressed={m.source === s} onClick={() => setMediaKind({ source: s })}>
              {t(`media.source.${s}`)}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label={t('media.type')}>
          {TYPES.map((ty) => (
            <button
              key={ty}
              className={`seg${m.type === ty ? ' on' : ''}`}
              aria-pressed={m.type === ty}
              disabled={!typeAvailable(m.source, ty)}
              title={typeAvailable(m.source, ty) ? undefined : t('media.nasaImages')}
              onClick={() => setMediaKind({ type: ty })}
            >
              {t(`media.type.${ty}`)}
            </button>
          ))}
        </div>
      </div>
      <form
        className="radio-search"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) void searchMediaFor(text)
        }}
      >
        <input type="search" required placeholder={t('media.placeholder')} aria-label={t('media.search')} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" type="submit" disabled={m.searching}>
          {t('media.search')}
        </button>
      </form>
      {m.searching && <p className="muted small">{t('media.searching')}</p>}
      {m.message && <p className={m.message.startsWith('media.error') ? 'error' : 'muted small'}>{t(m.message)}</p>}
      {m.results && m.results.length > 0 && (
        <ul className="media-grid">
          {m.results.map((it) => {
            const key = `${it.source}:${it.id}`
            const current = input.page !== '' && input.page === it.page
            return (
              <li key={key}>
                <button className={`media-item${current ? ' on' : ''}`} title={it.title} aria-pressed={current} disabled={m.opening === key} onClick={() => void openMedia(it)}>
                  <img src={it.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  <span>{m.opening === key ? t('media.opening') : it.title}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {input.page && (
        <p className="muted small">
          <a href={input.page} target="_blank" rel="noreferrer noopener">
            {t('media.page')}
          </a>
        </p>
      )}
      <Hint text={t('media.hint')} />
    </div>
  )
}
