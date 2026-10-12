import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { setActionKey } from '../app/live'
import { settingsStore } from '../app/settings'
import { ACTIONS, DEFAULT_KEYS, keyCombo, type ActionId } from '../engine/live/live'
import { Hint } from './Hint'
import { actionLabel } from './Live'
import { useStore } from './useStore'
import { useT } from './useT'

const ARROWS: Record<string, string> = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' }

// The keyboard shortcut of every live action: click one and press the new key.
export function Shortcuts() {
  const t = useT()
  const keys = useStore(settingsStore, (s) => s.live.keys)
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

  return (
    <>
      <Hint text={t('live.keyHint')} />
      <ul className="key-list">
        {ACTIONS.map((id) => {
          const label = actionLabel(id, t)
          return (
            <li key={id} className="key-row">
              <span>{label}</span>
              <button className={`btn key${capturing === id ? ' on' : ''}`} aria-label={t('live.keyFor', { name: label })} onClick={() => setCapturing(capturing === id ? null : id)}>
                {capturing === id ? t('live.keyPress') : keyName(keys[id])}
              </button>
            </li>
          )
        })}
      </ul>
      <button className="btn" onClick={() => settingsStore.set((s) => ({ ...s, live: { ...s.live, keys: DEFAULT_KEYS } }))}>
        <RotateCcw size={15} /> {t('live.keyReset')}
      </button>
    </>
  )
}
