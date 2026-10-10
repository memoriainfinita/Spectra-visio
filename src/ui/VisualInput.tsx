import { Camera, ImagePlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cameraDevices, openVisualFile, previewStore, startCamera, stopVisualInput, visualInputStore } from '../app/visualInput'
import type { MessageKey } from '../i18n'
import { useStore } from './useStore'
import { useT } from './useT'

export function VisualInput() {
  const t = useT()
  const state = useStore(visualInputStore)
  const preview = useStore(previewStore)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
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
    if (state.kind === 'camera') void cameraDevices().then(setDevices)
  }, [state.kind])

  const size = { name: state.name, w: state.width, h: state.height }
  return (
    <section className="panel visual-input">
      <header className="panel-head">
        <h2>{t('vinput.title')}</h2>
        <div className="head-actions">
          <button className={`btn${state.kind === 'camera' ? ' on' : ''}`} onClick={() => void startCamera()}>
            <Camera size={15} /> {t('vinput.camera')}
          </button>
          <button className={`btn${state.kind === 'video' || state.kind === 'image' ? ' on' : ''}`} onClick={() => fileInput.current?.click()}>
            <ImagePlus size={15} /> {t('vinput.file')}
          </button>
          <button className="btn" disabled={state.kind === 'none'} onClick={stopVisualInput}>
            <X size={15} /> {t('vinput.stop')}
          </button>
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
      </header>
      <p className="muted small">{t('vinput.hint')}</p>
      {state.kind === 'camera' && devices.length > 1 && (
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
      <div className="input-preview" ref={box} hidden={!preview} />
    </section>
  )
}
