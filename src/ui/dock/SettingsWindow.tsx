import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useT } from '../useT'
import { PanelSlot } from './panels'

// Settings and MIDI in a window over the app. It stays mounted while closed, so nothing
// half typed in it is lost.
export function SettingsWindow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const closeBtn = useRef<HTMLButtonElement>(null)
  const back = useRef<Element | null>(null)

  useEffect(() => {
    if (!open) return
    back.current = document.activeElement
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (back.current instanceof HTMLElement) back.current.focus()
    }
  }, [open, onClose])

  return (
    <div
      className="modal"
      hidden={!open}
      data-reveal=""
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="modal-head">
          <h2 id="settings-title">{t('bar.settings')}</h2>
          <button ref={closeBtn} className="icon-btn small" title={t('bar.close')} aria-label={t('bar.close')} onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="modal-body" id="settings-body">
          <PanelSlot id="settings" />
          <PanelSlot id="midi" />
        </div>
      </div>
    </div>
  )
}
