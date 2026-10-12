import { Star } from 'lucide-react'
import { useState } from 'react'
import { inputs } from '../app/engine'
import { playStation, radioFavoritesStore, radioStore, searchRadio, toggleRadioFavorite } from '../app/radio'
import type { SearchBy, Station } from '../engine/radio/radio'
import { useStore } from './useStore'
import { useT } from './useT'

const BY: SearchBy[] = ['name', 'tag', 'country']

// Search the radio directory, or list the favourites; a station plays as the Stream source.
export function RadioBrowser() {
  const t = useT()
  const radio = useStore(radioStore)
  const favorites = useStore(radioFavoritesStore)
  const input = useStore(inputs.state)
  const [text, setText] = useState('')
  const [by, setBy] = useState<SearchBy>('name')
  const [showFavorites, setShowFavorites] = useState(false)
  const list = showFavorites ? favorites : radio.results
  const playing = (s: Station) => input.kind === 'stream' && input.status === 'active' && input.streamUrl === s.url

  return (
    <div className="radio">
      <form
        className="radio-search"
        onSubmit={(e) => {
          e.preventDefault()
          setShowFavorites(false)
          if (text.trim()) void searchRadio(text, by)
        }}
      >
        <select aria-label={t('radio.by')} value={by} onChange={(e) => setBy(e.target.value as SearchBy)}>
          {BY.map((b) => (
            <option key={b} value={b}>
              {t(`radio.by.${b}`)}
            </option>
          ))}
        </select>
        <input type="search" required placeholder={t(`radio.placeholder.${by}`)} aria-label={t('radio.search')} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" type="submit" disabled={radio.searching}>
          {t('radio.search')}
        </button>
      </form>
      <div className="segmented radio-tabs" role="group" aria-label={t('radio.list')}>
        <button className={`seg${!showFavorites ? ' on' : ''}`} aria-pressed={!showFavorites} onClick={() => setShowFavorites(false)}>
          {t('radio.results')}
        </button>
        <button className={`seg${showFavorites ? ' on' : ''}`} aria-pressed={showFavorites} onClick={() => setShowFavorites(true)}>
          {t('radio.favorites', { n: favorites.length })}
        </button>
      </div>
      {radio.searching && !showFavorites && <p className="muted small">{t('radio.searching')}</p>}
      {radio.message && <p className={radio.message.startsWith('radio.error') ? 'error' : 'muted small'}>{t(radio.message)}</p>}
      {showFavorites && !favorites.length && <p className="muted small">{t('radio.noFavorites')}</p>}
      {list && list.length > 0 && (
        <ul className="radio-list">
          {list.map((s) => {
            const fav = favorites.some((f) => f.id === s.id)
            return (
              <li key={s.id} className={`radio-row${playing(s) ? ' current' : ''}`}>
                <button className="radio-main" title={s.url} onClick={() => void playStation(s)}>
                  <span className="radio-name">{s.name}</span>
                  <span className="radio-sub">
                    {radio.checking === s.id ? t('radio.checking') : [s.country, [s.codec, s.bitrate ? `${s.bitrate} kbps` : ''].filter(Boolean).join(' '), s.tags.join(', ')].filter(Boolean).join(' · ')}
                  </span>
                </button>
                <button
                  className={`icon-btn small${fav ? ' on' : ''}`}
                  aria-pressed={fav}
                  title={t(fav ? 'radio.unfavorite' : 'radio.favorite', { name: s.name })}
                  aria-label={t(fav ? 'radio.unfavorite' : 'radio.favorite', { name: s.name })}
                  onClick={() => toggleRadioFavorite(s)}
                >
                  <Star size={15} fill={fav ? 'currentColor' : 'none'} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="muted small">{t('radio.hint')}</p>
    </div>
  )
}
