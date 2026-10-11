import { useEffect, useRef } from 'react'
import { settingsStore } from '../app/settings'
import { useStore } from './useStore'
import { useT } from './useT'

// Shown once, on the first visit: the image can flash. Modal, so it takes the focus and
// Escape answers it like Continue.
export function FlashNotice() {
  const t = useT()
  const shown = useStore(settingsStore, (s) => !s.flashNotice)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (shown && d && !d.open) d.showModal()
  }, [shown])

  if (!shown) return null
  const answer = (reduce: boolean | null) =>
    settingsStore.set((s) => ({ ...s, flashNotice: true, reduceFlashes: reduce ?? s.reduceFlashes }))

  return (
    <dialog ref={ref} className="notice-dialog" aria-labelledby="flash-title" aria-describedby="flash-text" onCancel={() => answer(null)}>
      <h2 id="flash-title">{t('safety.title')}</h2>
      <p id="flash-text">{t('safety.text')}</p>
      <div className="head-actions">
        <button className="btn primary" autoFocus onClick={() => answer(true)}>
          {t('safety.reduce')}
        </button>
        <button className="btn" onClick={() => answer(null)}>
          {settingsStore.get().reduceFlashes ? t('safety.continueReduced') : t('safety.continue')}
        </button>
      </div>
    </dialog>
  )
}
