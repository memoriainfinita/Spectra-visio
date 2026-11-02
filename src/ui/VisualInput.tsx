import { Camera, Globe, ImagePlus, Tv, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { sceneStore } from '../app/scene'
import { cameraDevices, openVisualFile, previewStore, startCamera, stopVisualInput, visualInputStore } from '../app/visualInput'
import type { MessageKey } from '../i18n'
import { useStore } from './useStore'
import { useT } from './useT'
import { Hint } from './Hint'
import { MediaBrowser } from './Media'
import { TvBrowser } from './Tv'

// The source of the selected layer: camera, file, live TV or what is found online. The
// Inspector shows it whole; the Libraries panel only has the two catalogs, which fill the
// selected layer too.
export function Source({ catalog = false }: { catalog?: boolean }) {
  const t = useT()
  const state = useStore(visualInputStore)
  const preview = useStore(previewStore)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  // The online browser open below: live TV or free videos and images.
  const [browser, setBrowser] = useState<'tv' | 'media' | null>(null)
  const toggle = (b: 'tv' | 'media') => setBrowser(browser === b ? null : b)
  const box = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // The element that feeds the input is shown as it is: no second decoder.
  useEffect(() => {
    const el = box.current
    if (!el) return
    el.replaceChildren(...(preview ? [preview] : []))
  }, [preview])

  // Device names are only known once the camera was allowed.
  useEffect(() => {
    if (!catalog && state.kind === 'camera') void cameraDevices().then(setDevices)
  }, [catalog, state.kind])

  const size = { name: state.name, w: state.width, h: state.height }
  return (
    <div className="source">
      <div className="head-actions">
        {!catalog && (
          <>
            <button className={`btn${state.kind === 'camera' ? ' on' : ''}`} onClick={() => void startCamera()}>
              <Camera size={15} /> {t('vinput.camera')}
            </button>
            <button className={`btn${(state.kind === 'video' || state.kind === 'image') && !state.page ? ' on' : ''}`} onClick={() => fileInput.current?.click()}>
              <ImagePlus size={15} /> {t('vinput.file')}
            </button>
          </>
        )}
        <button className={`btn${state.kind === 'tv' ? ' on' : ''}`} aria-expanded={browser === 'tv'} onClick={() => toggle('tv')}>
          <Tv size={15} /> {t('vinput.tv')}
        </button>
        <button className={`btn${state.page ? ' on' : ''}`} aria-expanded={browser === 'media'} onClick={() => toggle('media')}>
          <Globe size={15} /> {t('vinput.online')}
        </button>
        {!catalog && (
          <button className="btn" disabled={state.kind === 'none'} onClick={() => stopVisualInput()}>
            <X size={15} /> {t('vinput.stop')}
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void openVisualFile(file)
            e.target.value = ''
          }}
        />
      </div>
      {!catalog && state.kind === 'camera' && devices.length > 1 && (
        <label className="field">
          <span>{t('vinput.device')}</span>
          <select value={devices.find((d) => d.label === state.name)?.deviceId ?? ''} onChange={(e) => void startCamera(e.target.value)}>
            {devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `${t('vinput.camera')} ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="small muted" role="status">
        {state.kind === 'none' ? t('vinput.none') : t(`vinput.status.${state.kind}` as MessageKey, size)}
      </p>
      {state.error && (
        <p className="error" role="alert">
          {t(`vinput.error.${state.error}` as MessageKey)}
        </p>
      )}
      {!catalog && <div className="input-preview" ref={box} hidden={!preview} />}
      {browser === 'tv' && <TvBrowser />}
      {browser === 'media' && <MediaBrowser />}
    </div>
  )
}

// Libraries › Sources: the catalogs of the selected layer.
export function VisualInput() {
  const t = useT()
  const selected = useStore(sceneStore, (s) => s.selected)
  return (
    <section className="panel visual-input">
      <header className="panel-head">
        <h2>{t('vinput.titleLayer', { n: selected + 1 })}</h2>
      </header>
      <Hint text={t('vinput.hint')} />
      <p className="small">{t('vinput.loadsIn', { n: selected + 1 })}</p>
      <Source catalog />
    </section>
  )
}
