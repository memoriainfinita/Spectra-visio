import { Camera, ImagePlus, X } from 'lucide-react'
import { useRef } from 'react'
import { openVisualFile, startCamera, stopVisualInput, visualInputStore } from '../app/visualInput'
import type { MessageKey } from '../i18n'
import { useStore } from './useStore'
import { useT } from './useT'

// The layer's visual input from the Inspector: a camera or a file, and taking it off. Live TV
// and what is found online are chosen in Libraries, which fill the selected layer too.
export function InputSources() {
  const t = useT()
  const state = useStore(visualInputStore)
  const fileInput = useRef<HTMLInputElement>(null)
  return (
    <>
      <div className="head-actions">
        <button className={`btn${state.kind === 'camera' ? ' on' : ''}`} onClick={() => void startCamera()}>
          <Camera size={15} /> {t('vinput.camera')}
        </button>
        <button className={`btn${(state.kind === 'video' || state.kind === 'image') && !state.page ? ' on' : ''}`} onClick={() => fileInput.current?.click()}>
          <ImagePlus size={15} /> {t('vinput.file')}
        </button>
        <button className="btn" disabled={state.kind === 'none'} onClick={() => stopVisualInput()}>
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
      <p className="small muted" role="status">
        {state.kind === 'none' ? t('vinput.none') : t(`vinput.status.${state.kind}` as MessageKey, { name: state.name, w: state.width, h: state.height })}
      </p>
      {state.error && (
        <p className="error" role="alert">
          {t(`vinput.error.${state.error}` as MessageKey)}
        </p>
      )}
    </>
  )
}
