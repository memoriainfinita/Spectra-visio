import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { liveStore, runAction, setActionKey, toggleLive } from '../app/live'
import { setReduceFlashes, settingsStore } from '../app/settings'
import { ACTIONS, DEFAULT_KEYS, STROBE_RATES, keyCombo, type ActionId, type StrobeRate } from '../engine/live/live'
import type { MessageKey } from '../i18n'
import { useStore } from './useStore'
import { useT } from './useT'

const ARROWS: Record<string, string> = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' }

export function actionLabel(id: ActionId, t: ReturnType<typeof useT>): string {
  return id.startsWith('column') ? t('clips.column', { n: id.slice(6) }) : t(`action.${id}` as MessageKey)
}

// Blackout, freeze and strobe, crossfader moves and the keyboard shortcuts.
export function Live() {
  const t = useT()
  const live = useStore(liveStore)
  const settings = useStore(settingsStore, (s) => s.live)
  const reduceFlashes = useStore(settingsStore, (s) => s.reduceFlashes)
  const [capturing, setCapturing] = useState<ActionId | null>(null)

  const keyName = (key: string | undefined) => {
    if (!key) return t('live.keyNone')
    const shift = key.startsWith('Shift+')
    const k = shift ? key.slice(6) : key
    const name = k === ' ' ? t('live.key.space') : (ARROWS[k] ?? (k.length === 1 ? k.toUpperCase() : k))
    return shift ? `${t('live.key.shift')} + ${name}` : name
  }

  // The next key goes to the action being captured; nothing else sees it.
  useEffect(() => {
    if (!capturing) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') setCapturing(null)
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        setActionKey(capturing, null)
        setCapturing(null)
      } else {
        const combo = keyCombo(e)
        if (!combo) return
        setActionKey(capturing, combo)
        setCapturing(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [capturing])

  const toggle = (key: 'blackout' | 'freeze' | 'strobe') => (
    <button className={`btn${live[key] ? ' on' : ''}`} aria-pressed={live[key]} disabled={key === 'strobe' && reduceFlashes} onClick={() => toggleLive(key)}>
      {t(`live.${key}`)}
    </button>
  )

  return (
    <section className="panel live">
      <header className="panel-head">
        <h2>{t('live.title')}</h2>
      </header>

      <div className="live-row">
        {toggle('blackout')}
        {toggle('freeze')}
        {toggle('strobe')}
        <select
          aria-label={t('live.strobeRate')}
          title={t('live.strobeRate')}
          value={String(settings.strobe)}
          onChange={(e) => {
            const v = e.target.value === 'beat' ? 'beat' : (Number(e.target.value) as StrobeRate)
            settingsStore.set((s) => ({ ...s, live: { ...s.live, strobe: v } }))
          }}
        >
          {STROBE_RATES.map((r) => (
            <option key={r} value={String(r)}>
              {r === 'beat' ? t('live.rate.beat') : t('live.rate.n', { n: r })}
            </option>
          ))}
        </select>
      </div>
      <p className="muted small">{t('live.strobeHint')}</p>
      <label className="check">
        <input type="checkbox" checked={reduceFlashes} onChange={(e) => setReduceFlashes(e.target.checked)} />
        <span>{t('safety.reduce')}</span>
      </label>
      <p className="muted small">{t('safety.reduceHint')}</p>

      <div className="live-row">
        <button className="btn" onClick={() => runAction('crossA')}>
          {t('action.crossA')}
        </button>
        <button className="btn" onClick={() => runAction('crossSwap')}>
          {t('action.crossSwap')}
        </button>
        <button className="btn" onClick={() => runAction('crossB')}>
          {t('action.crossB')}
        </button>
      </div>

      <details className="live-keys">
        <summary>{t('live.keys')}</summary>
        <p className="muted small">{t('live.keyHint')}</p>
        <ul className="key-list">
          {ACTIONS.map((id) => {
            const label = actionLabel(id, t)
            return (
              <li key={id} className="key-row">
                <span>{label}</span>
                <button className={`btn key${capturing === id ? ' on' : ''}`} aria-label={t('live.keyFor', { name: label })} onClick={() => setCapturing(capturing === id ? null : id)}>
                  {capturing === id ? t('live.keyPress') : keyName(settings.keys[id])}
                </button>
              </li>
            )
          })}
        </ul>
        <button className="btn" onClick={() => settingsStore.set((s) => ({ ...s, live: { ...s.live, keys: DEFAULT_KEYS } }))}>
          <RotateCcw size={15} /> {t('live.keyReset')}
        </button>
      </details>
    </section>
  )
}
