import { ClipboardPaste, Play, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { sceneStore, setVisual } from '../app/scene'
import { SHADER_NAME_MAX, addShader, deleteShader, importShaderFiles, shadersStore } from '../app/shaders'
import { settingsStore } from '../app/settings'
import { getVisual } from '../engine/render/registry'
import { USER_PREFIX } from '../engine/shaders/userVisual'
import { useStore } from './useStore'
import { useT } from './useT'

const LAYER_NAMES = ['A', 'B'] as const

export function Shaders() {
  const t = useT()
  const lang = useStore(settingsStore, (s) => s.lang)
  const shaders = useStore(shadersStore)
  const selected = useStore(sceneStore, (s) => s.selected)
  const [pasting, setPasting] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const onImport = async (files: File[]) => {
    if (!files.length) return
    const r = await importShaderFiles(files, lang)
    const lines = [...(r.added ? [t('shaders.added', { n: r.added })] : []), ...r.errors]
    setMessage({ text: lines.join('\n'), error: r.errors.length > 0 })
  }

  const onAdd = () => {
    const error = addShader(name, code, lang)
    if (error) {
      setMessage({ text: error, error: true })
      return
    }
    setMessage({ text: t('shaders.added', { n: 1 }), error: false })
    setName('')
    setCode('')
    setPasting(false)
  }

  return (
    <section className="panel shaders">
      <header className="panel-head">
        <h2>{t('shaders.title')}</h2>
        <div className="head-actions">
          <button className="btn" onClick={() => fileInput.current?.click()}>
            <Upload size={15} /> {t('shaders.import')}
          </button>
          <button className={`btn${pasting ? ' on' : ''}`} aria-expanded={pasting} onClick={() => setPasting(!pasting)}>
            <ClipboardPaste size={15} /> {t('shaders.paste')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".fs,.frag,.glsl,.isf,.txt"
            multiple
            hidden
            onChange={(e) => {
              void onImport([...(e.target.files ?? [])])
              e.target.value = ''
            }}
          />
        </div>
      </header>
      <p className="muted small">{t('shaders.hint')}</p>

      {pasting && (
        <form
          className="shader-form"
          onSubmit={(e) => {
            e.preventDefault()
            onAdd()
          }}
        >
          <input type="text" aria-label={t('shaders.name')} placeholder={t('shaders.name')} maxLength={SHADER_NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} />
          <textarea aria-label={t('shaders.code')} placeholder={t('shaders.code')} spellCheck={false} rows={10} value={code} onChange={(e) => setCode(e.target.value)} />
          <div className="shader-form-actions">
            <button className="btn" type="button" onClick={() => setPasting(false)}>
              {t('shaders.cancel')}
            </button>
            <button className="btn primary" type="submit" disabled={!code.trim()}>
              {t('shaders.add')}
            </button>
          </div>
        </form>
      )}
      {message && (
        <p className={`small shader-message${message.error ? ' error' : ' muted'}`} role={message.error ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}

      {shaders.length === 0 ? (
        <p className="empty">{t('shaders.empty')}</p>
      ) : (
        <ul className="preset-list">
          {shaders.map((s) => {
            const usable = !!getVisual(USER_PREFIX + s.id)
            return (
              <li key={s.id} className="preset">
                <div className="preset-main static">
                  <span className="preset-name">{s.name}</span>
                  <span className="preset-sub">{s.format === 'isf' ? 'ISF' : 'Shadertoy'}</span>
                </div>
                <button
                  className="icon-btn small"
                  disabled={!usable}
                  title={t('shaders.use', { name: s.name, n: LAYER_NAMES[selected] })}
                  aria-label={t('shaders.use', { name: s.name, n: LAYER_NAMES[selected] })}
                  onClick={() => setVisual(selected, USER_PREFIX + s.id)}
                >
                  <Play size={15} />
                </button>
                <button className="icon-btn small" title={t('shaders.delete', { name: s.name })} aria-label={t('shaders.delete', { name: s.name })} onClick={() => deleteShader(s.id)}>
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
