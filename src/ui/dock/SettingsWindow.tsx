import { X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { settingsUi } from '../../app/ui'
import { SECTIONS, SECTION_TITLE, SettingsSection, type SectionId } from '../Settings'
import { useStore } from '../useStore'
import { useT } from '../useT'

const SECTION_KEY = 'spectra.settingsSection'

function savedSection(): SectionId {
  try {
    const v = localStorage.getItem(SECTION_KEY)
    return SECTIONS.find((s) => s === v) ?? 'general'
  } catch {
    return 'general'
  }
}

// The settings in a window over the app: the sections listed on the left, the one picked
// on the right. It stays mounted while closed, so nothing half typed in it is lost.
export function SettingsWindow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const closeBtn = useRef<HTMLButtonElement>(null)
  const back = useRef<Element | null>(null)
  const refs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>({})
  const [section, setSection] = useState<SectionId>(savedSection)

  useEffect(() => {
    if (!open) return
    back.current = document.activeElement
    closeBtn.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (back.current instanceof HTMLElement) back.current.focus()
    }
  }, [open, onClose])

  const pick = (id: SectionId, focus = false) => {
    setSection(id)
    try {
      localStorage.setItem(SECTION_KEY, id)
    } catch {
      // Only a convenience: the first section opens next time.
    }
    if (focus) refs.current[id]?.focus()
  }
  // A section asked for from elsewhere, as the search does.
  const asked = useStore(settingsUi, (s) => s.section)
  useEffect(() => {
    const id = SECTIONS.find((x) => x === asked)
    if (!asked) return
    if (id) pick(id)
    settingsUi.set((s) => ({ ...s, section: null }))
  }, [asked])

  // Up and down move between sections, as in any vertical tab list.
  const onNavKey = (e: KeyboardEvent) => {
    const i = SECTIONS.indexOf(section)
    const to = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? SECTIONS.length - 1 : null
    if (to === null) return
    e.preventDefault()
    pick(SECTIONS[(to + SECTIONS.length) % SECTIONS.length], true)
  }

  return (
    <div
      className="modal"
      hidden={!open}
      data-reveal=""
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-box settings-box" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="modal-head">
          <h2 id="settings-title">{t('bar.settings')}</h2>
          <button ref={closeBtn} className="icon-btn small" title={t('bar.close')} aria-label={t('bar.close')} onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="settings-layout">
          <nav className="settings-nav" role="tablist" aria-orientation="vertical" aria-label={t('settings.sections')} onKeyDown={onNavKey}>
            {SECTIONS.map((id) => (
              <button
                key={id}
                ref={(el) => {
                  refs.current[id] = el
                }}
                id={`settingstab-${id}`}
                role="tab"
                className={`settings-tab${section === id ? ' on' : ''}`}
                aria-selected={section === id}
                aria-controls={`settingspanel-${id}`}
                tabIndex={section === id ? 0 : -1}
                onClick={() => pick(id)}
              >
                {t(SECTION_TITLE[id])}
              </button>
            ))}
          </nav>
          <div className="modal-body" id="settings-body">
            {SECTIONS.map((id) => (
              <div key={id} id={`settingspanel-${id}`} role="tabpanel" aria-labelledby={`settingstab-${id}`} hidden={section !== id}>
                <SettingsSection id={id} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
