import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { shelfRequest } from '../../app/ui'
import type { DockId } from '../../engine/layout/layout'
import type { MessageKey } from '../../i18n'
import { useStore } from '../useStore'
import { useT } from '../useT'
import { PanelSlot, type PanelId } from './panels'

// What each dock holds, until the redesign gives them panels of their own.
const CONTENT: Record<Exclude<DockId, 'library'>, PanelId[]> = {
  layers: ['visuals'],
  inspector: ['inspector'],
  clips: ['clips'],
  audio: ['player', 'queue', 'analysis'],
  live: ['live'],
  perform: ['perform'],
  knobs: ['knobs'],
  modulators: ['modulators'],
  mypanel: ['mypanel'],
}

// The dock a panel shows in; null for those that are not in one (menus of the top bar,
// settings).
export function dockOfPanel(panel: PanelId): DockId | null {
  if (SHELVES.some((s) => s.id === panel)) return 'library'
  const found = (Object.entries(CONTENT) as [DockId, PanelId[]][]).find(([, list]) => list.includes(panel))
  return found ? found[0] : null
}

export function DockBody({ id }: { id: DockId }) {
  if (id === 'library') return <Library />
  const panels = CONTENT[id]
  return (
    <div className={`dock-content${panels.length === 1 ? ' single' : ''}`}>
      {panels.map((p) => (
        <PanelSlot key={p} id={p} />
      ))}
    </div>
  )
}

const SHELVES: { id: PanelId; title: MessageKey }[] = [
  { id: 'browser', title: 'dock.visuals' },
  { id: 'presets', title: 'presets.title' },
  { id: 'shaders', title: 'shaders.title' },
  { id: 'vinput', title: 'vinput.title' },
]
const SHELF_KEY = 'spectra.library'

function savedShelf(): PanelId {
  try {
    const v = localStorage.getItem(SHELF_KEY)
    return SHELVES.find((s) => s.id === v)?.id ?? 'browser'
  } catch {
    return 'browser'
  }
}

// The libraries share one dock, one at a time, picked with the chips at the top.
function Library() {
  const t = useT()
  const [shelf, setShelf] = useState<PanelId>(savedShelf)
  const refs = useRef<Partial<Record<PanelId, HTMLButtonElement | null>>>({})
  const pick = (id: PanelId, focus = false) => {
    setShelf(id)
    try {
      localStorage.setItem(SHELF_KEY, id)
    } catch {
      // Only a convenience: the first one opens next time.
    }
    if (focus) refs.current[id]?.focus()
  }
  // A shelf asked for from elsewhere, as the search does.
  const asked = useStore(shelfRequest)
  useEffect(() => {
    if (!asked) return
    const s = SHELVES.find((x) => x.id === asked)
    if (s) pick(s.id)
    shelfRequest.set(null)
  }, [asked])

  const onKey = (e: KeyboardEvent) => {
    const i = SHELVES.findIndex((s) => s.id === shelf)
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? SHELVES.length - 1 : null
    if (to === null) return
    e.preventDefault()
    pick(SHELVES[(to + SHELVES.length) % SHELVES.length].id, true)
  }
  return (
    <div className="dock-content library">
      <div className="chips" role="tablist" aria-label={t('dock.library')} onKeyDown={onKey}>
        {SHELVES.map((s) => (
          <button
            key={s.id}
            ref={(el) => {
              refs.current[s.id] = el
            }}
            id={`shelf-${s.id}`}
            role="tab"
            className={`chip${shelf === s.id ? ' on' : ''}`}
            aria-selected={shelf === s.id}
            aria-controls={`shelfpanel-${s.id}`}
            tabIndex={shelf === s.id ? 0 : -1}
            onClick={() => pick(s.id)}
          >
            {t(s.title)}
          </button>
        ))}
      </div>
      {SHELVES.map((s) => (
        <div key={s.id} id={`shelfpanel-${s.id}`} role="tabpanel" aria-labelledby={`shelf-${s.id}`} className="shelf" hidden={shelf !== s.id}>
          <PanelSlot id={s.id} />
        </div>
      ))}
    </div>
  )
}
