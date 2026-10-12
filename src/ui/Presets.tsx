import { Download, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { deletePreset, downloadPresets, importPresets, loadPreset, presetsStore, savePreset } from '../app/presets'
import { sceneStore } from '../app/scene'
import { getVisual } from '../engine/render/registry'
import { nameOf } from '../engine/render/visual'
import { NAME_MAX } from '../engine/scene/preset'
import { Hint } from './Hint'
import { useStore } from './useStore'
import { useT } from './useT'


export function Presets() {
  const t = useT()
  const presets = useStore(presetsStore)
  const layer = useStore(sceneStore, (s) => s.selected) + 1
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const save = () => {
    if (savePreset(name)) setName('')
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return
    const r = await importPresets(file)
    if (r.invalid) setMessage(t('presets.importInvalid'))
    else setMessage(t(r.rejected ? 'presets.importedSome' : 'presets.imported', { n: r.added, m: r.rejected }))
  }

  return (
    <section className="panel presets">
      <header className="panel-head">
        <h2>{t('presets.title')}</h2>
        <div className="head-actions">
          <button className="btn" onClick={() => fileInput.current?.click()}>
            <Upload size={15} /> {t('presets.import')}
          </button>
          <button className="btn" disabled={!presets.length} onClick={() => downloadPresets()}>
            <Download size={15} /> {t('presets.exportAll')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              void onImport(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </header>

      <form
        className="preset-form"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <input type="text" aria-label={t('presets.name')} placeholder={t('presets.name')} maxLength={NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" type="submit" disabled={!name.trim()}>
          {t('presets.save')}
        </button>
      </form>
      <Hint text={t('presets.hint', { n: layer })} />
      {message && <p className="muted small" role="status">{message}</p>}

      {presets.length === 0 ? (
        <p className="empty">{t('presets.empty')}</p>
      ) : (
        <ul className="preset-list">
          {presets.map((p) => {
            const v = getVisual(p.visual)
            const fx = p.effects.length
            return (
              <li key={p.id} className="preset">
                <button className="preset-main" title={t('presets.load', { n: layer })} onClick={() => loadPreset(p.id)}>
                  <span className="preset-name">{p.name}</span>
                  <span className="preset-sub">
                    {v ? nameOf(v, t) : p.visual}
                    {fx > 0 && ` · ${fx === 1 ? t('presets.effect') : t('presets.effects', { n: fx })}`}
                  </span>
                </button>
                <button className="icon-btn small" title={t('presets.export')} aria-label={t('presets.export')} onClick={() => downloadPresets(p.id)}>
                  <Download size={15} />
                </button>
                <button className="icon-btn small" title={t('presets.delete')} aria-label={t('presets.delete')} onClick={() => deletePreset(p.id)}>
                  <Trash2 size={15} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
