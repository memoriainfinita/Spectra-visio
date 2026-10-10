import { Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { favoritesStore, loadThumbnails, thumbsStore, toggleFavorite } from '../app/library'
import { sceneStore, setVisual } from '../app/scene'
import { visualsStore } from '../engine/render/registry'
import { CATEGORIES, nameOf, type VisualCategory } from '../engine/render/visual'
import { LANGS, translate, type MessageKey } from '../i18n'
import { useStore } from './useStore'
import { useT } from './useT'

type Filter = 'all' | 'favorites' | VisualCategory
const FILTERS: Filter[] = ['all', 'favorites', ...CATEGORIES]
const LAYER_NAMES = ['A', 'B'] as const

// Lower case without accents, so "tunel" finds "Túnel".
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()


export function Browser() {
  const t = useT()
  const favorites = useStore(favoritesStore)
  const visuals = useStore(visualsStore)
  const thumbs = useStore(thumbsStore)
  const selected = useStore(sceneStore, (s) => s.selected)
  const current = useStore(sceneStore, (s) => s.layers[s.selected].visual)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    void loadThumbnails()
  }, [])

  // Names in every language, so a search in either finds it.
  const searchText = useMemo(() => new Map(visuals.map((v) => [v.id, fold([v.id, ...LANGS.map((l) => nameOf(v, (k) => translate(l, k)))].join(' '))])), [visuals])
  const q = fold(query.trim())
  const shown = visuals.filter((v) => {
    if (filter === 'favorites' && !favorites.includes(v.id)) return false
    if (filter !== 'all' && filter !== 'favorites' && v.category !== filter) return false
    return !q || searchText.get(v.id)!.includes(q)
  })

  return (
    <section className="panel browser">
      <header className="panel-head">
        <h2>{t('browser.title')}</h2>
        <input type="search" className="browser-search" aria-label={t('browser.search')} placeholder={t('browser.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </header>

      <div className="segmented" role="group" aria-label={t('browser.filter')}>
        {FILTERS.map((f) => (
          <button key={f} className={`seg${filter === f ? ' on' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {t(`browser.${f}` as MessageKey)}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="empty">{t(filter === 'favorites' && !q ? 'browser.noFavorites' : 'browser.none')}</p>
      ) : (
        <ul className="visual-grid">
          {shown.map((v) => {
            const name = nameOf(v, t)
            const fav = favorites.includes(v.id)
            return (
              <li key={v.id} className={`visual-card${v.id === current ? ' current' : ''}`}>
                <button className="visual-pick" title={t('browser.pick', { name, n: LAYER_NAMES[selected] })} aria-label={t('browser.pick', { name, n: LAYER_NAMES[selected] })} onClick={() => setVisual(selected, v.id)}>
                  {thumbs[v.id] ? <img src={thumbs[v.id]} alt="" width={192} height={108} /> : <span className="thumb-placeholder" />}
                  <span className="visual-card-name">{name}</span>
                  <span className="visual-card-cat">{t(`browser.${v.category}` as MessageKey)}</span>
                </button>
                <button
                  className={`icon-btn small fav${fav ? ' on' : ''}`}
                  aria-pressed={fav}
                  title={t(fav ? 'browser.unfavorite' : 'browser.favorite', { name })}
                  aria-label={t(fav ? 'browser.unfavorite' : 'browser.favorite', { name })}
                  onClick={() => toggleFavorite(v.id)}
                >
                  <Star size={15} fill={fav ? 'currentColor' : 'none'} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
