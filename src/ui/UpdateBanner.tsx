import { X } from 'lucide-react'
import { recordStore } from '../app/record'
import { applyUpdate, dismissOffline, updateStore } from '../app/update'
import { useStore } from './useStore'
import { useT } from './useT'

// A new version waiting, or the first time the app is ready offline.
export function UpdateBanner() {
  const t = useT()
  const u = useStore(updateStore)
  const recording = useStore(recordStore, (s) => s.status !== 'idle')
  if (u.ready)
    return (
      <div className="banner" role="status">
        <span>{recording ? t('update.readyRecording') : t('update.ready')}</span>
        <button className="btn primary" disabled={recording} onClick={applyUpdate}>
          {t('update.reload')}
        </button>
      </div>
    )
  if (u.offline)
    return (
      <div className="banner" role="status">
        <span>{t('update.offline')}</span>
        <button className="icon-btn small" title={t('update.close')} aria-label={t('update.close')} onClick={dismissOffline}>
          <X size={15} />
        </button>
      </div>
    )
  return null
}
