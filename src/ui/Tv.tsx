import { Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { settingsStore } from '../app/settings'
import { checkChannels, loadTvGroups, openTvGroup, playChannel, toggleTvFavorite, tvFavoritesStore, tvStore } from '../app/tv'
import { visualInputStore } from '../app/visualInput'
import type { GroupBy, TvGroup } from '../engine/tv/tv'
import type { Lang, MessageKey } from '../i18n'
import { Hint } from './Hint'
import { useStore } from './useStore'
import { useT } from './useT'

const BY: GroupBy[] = ['category', 'country', 'language']
// Channels shown, and checked, at a time.
const PAGE = 50

// A group's name in the app's language where the browser knows it.
function groupName(g: TvGroup, lang: Lang, t: ReturnType<typeof useT>): string {
  try {
    if (g.by === 'country') return new Intl.DisplayNames([lang], { type: 'region' }).of(g.id.toUpperCase()) ?? g.name
    if (g.by === 'language') {
      const name = new Intl.DisplayNames([lang], { type: 'language' }).of(g.id)
      if (name && name !== g.id) return name.charAt(0).toUpperCase() + name.slice(1)
    }
  } catch {
    // An id Intl does not take: the project's English name.
  }
  if (g.by === 'category') {
    const key = `tv.cat.${g.id}` as MessageKey
    const name = t(key)
    if (name && name !== key) return name
  }
  return g.name
}

// A channel's category as the playlist names it ('Music'), in the app's language.
function categoryName(name: string, t: ReturnType<typeof useT>): string {
  const key = `tv.cat.${name.toLowerCase()}` as MessageKey
  const label = t(key)
  return label && label !== key ? label : name
}

// Live TV channels from iptv-org as the visual input: pick a group, filter, play.
export function TvBrowser() {
  const t = useT()
  const lang = useStore(settingsStore, (s) => s.lang)
  const tv = useStore(tvStore)
  const favorites = useStore(tvFavoritesStore)
  const input = useStore(visualInputStore)
  const [by, setBy] = useState<GroupBy | 'all'>('category')
  const [filter, setFilter] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [showFavorites, setShowFavorites] = useState(false)

  useEffect(() => {
    void loadTvGroups()
  }, [])

  const groups = useMemo(
    () =>
      (tv.groups ?? [])
        .filter((g) => g.by === by)
        .map((g) => ({ key: `${g.by}:${g.id}`, label: groupName(g, lang, t), count: g.count }))
        .sort((a, b) => a.label.localeCompare(b.label, lang)),
    [tv.groups, by, lang, t],
  )

  const source = showFavorites ? favorites : (tv.channels ?? [])
  const matching = useMemo(() => {
    const q = filter.trim().toLocaleLowerCase()
    return q ? source.filter((c) => c.name.toLocaleLowerCase().includes(q)) : source
  }, [source, filter])
  const shown = matching.slice(0, limit)

  // Only what is on screen is checked.
  const shownKey = shown.map((c) => c.id).join('\n')
  useEffect(() => {
    if (shown.length) void checkChannels(shown)
  }, [shownKey])

  const pick = (key: string) => {
    setShowFavorites(false)
    setLimit(PAGE)
    if (key) void openTvGroup(key)
  }

  return (
    <div className="radio tv">
      <div className="radio-search">
        <select aria-label={t('tv.by')} value={by} onChange={(e) => setBy(e.target.value as GroupBy | 'all')}>
          {BY.map((b) => (
            <option key={b} value={b}>
              {t(`tv.by.${b}`)}
            </option>
          ))}
          <option value="all">{t('tv.by.all')}</option>
        </select>
        {by === 'all' ? (
          <button className="btn" onClick={() => pick('all')}>
            {t('tv.loadAll')}
          </button>
        ) : (
          <select aria-label={t('tv.group')} value={tv.group.startsWith(`${by}:`) ? tv.group : ''} disabled={!tv.groups} onChange={(e) => pick(e.target.value)}>
            <option value="">{tv.groups ? t('tv.choose') : t('tv.loadingGroups')}</option>
            {groups.map((g) => (
              <option key={g.key} value={g.key}>
                {g.count ? `${g.label} (${g.count})` : g.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <input type="search" placeholder={t('tv.filter')} aria-label={t('tv.filter')} value={filter} onChange={(e) => (setFilter(e.target.value), setLimit(PAGE))} />
      <div className="segmented radio-tabs" role="group" aria-label={t('tv.list')}>
        <button className={`seg${!showFavorites ? ' on' : ''}`} aria-pressed={!showFavorites} onClick={() => (setShowFavorites(false), setLimit(PAGE))}>
          {t('tv.channels')}
        </button>
        <button className={`seg${showFavorites ? ' on' : ''}`} aria-pressed={showFavorites} onClick={() => (setShowFavorites(true), setLimit(PAGE))}>
          {t('tv.favorites', { n: favorites.length })}
        </button>
      </div>
      {tv.loading && !showFavorites && <p className="muted small">{t('tv.loading')}</p>}
      {tv.message && <p className={tv.message.startsWith('tv.error') ? 'error' : 'muted small'}>{t(tv.message)}</p>}
      {showFavorites && !favorites.length && <p className="muted small">{t('tv.noFavorites')}</p>}
      {shown.length > 0 && (
        <ul className="radio-list">
          {shown.map((c) => {
            const fav = favorites.some((f) => f.id === c.id)
            const probe = tv.probes[c.id]
            const flag = probe === 'blocked' ? t('tv.flag.blocked') : probe === 'timeout' ? t('tv.flag.timeout') : null
            const current = input.kind === 'tv' && input.url === c.url
            return (
              <li key={c.id} className={`radio-row${current ? ' current' : ''}${flag ? ' unusable' : ''}`}>
                <button className="radio-main" title={c.name} onClick={() => void playChannel(c)}>
                  <span className="radio-name">{c.name}</span>
                  <span className="radio-sub">
                    {tv.checking === c.id ? (
                      t('tv.checking')
                    ) : (
                      <>
                        {flag && <span className="radio-flag">{flag}</span>}
                        {[c.quality, c.categories.map((g) => categoryName(g, t)).join(', '), c.labels.join(', ')].filter(Boolean).join(' · ')}
                      </>
                    )}
                  </span>
                </button>
                <button
                  className={`icon-btn small${fav ? ' on' : ''}`}
                  aria-pressed={fav}
                  title={t(fav ? 'tv.unfavorite' : 'tv.favorite', { name: c.name })}
                  aria-label={t(fav ? 'tv.unfavorite' : 'tv.favorite', { name: c.name })}
                  onClick={() => toggleTvFavorite(c)}
                >
                  <Star size={15} fill={fav ? 'currentColor' : 'none'} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {matching.length > shown.length && (
        <button className="btn" onClick={() => setLimit((n) => n + PAGE)}>
          {t('tv.more', { n: matching.length - shown.length })}
        </button>
      )}
      <Hint text={t('tv.hint')} />
    </div>
  )
}
