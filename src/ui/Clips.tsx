import { Plus } from 'lucide-react'
import { useEffect } from 'react'
import { loadThumbnails, thumbsStore } from '../app/library'
import { inspectClip, inspectLayer } from '../app/inspector'
import { clearClip, launchClip, launchColumn, queuedStore, saveClip, sceneStore } from '../app/scene'
import { getVisual } from '../engine/render/registry'
import { nameOf } from '../engine/render/visual'
import { CLIP_COLUMNS } from '../engine/scene/scene'
import { useStore } from './useStore'
import { useT } from './useT'
import { Hint } from './Hint'

const COLUMNS = Array.from({ length: CLIP_COLUMNS }, (_, c) => c)

// The clip grid: a row per layer, top first, and a column per number key.
export function Clips() {
  const t = useT()
  const layers = useStore(sceneStore, (s) => s.layers)
  const selected = useStore(sceneStore, (s) => s.selected)
  const thumbs = useStore(thumbsStore)
  const queued = useStore(queuedStore)
  const order = layers.map((_, i) => i).reverse()

  useEffect(() => {
    void loadThumbnails()
  }, [])

  return (
    <section className="panel clips">
      <header className="panel-head">
        <h2>{t('clips.title')}</h2>
      </header>
      <div className="clip-scroll">
        <table className="clip-grid">
          <thead>
            <tr>
              <th />
              {COLUMNS.map((c) => (
                <th key={c}>
                  <button className="clip-col" title={t('clips.column', { n: c + 1 })} aria-label={t('clips.column', { n: c + 1 })} onClick={() => launchColumn(c)}>
                    {c + 1}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.map((i) => {
              const l = layers[i]
              const n = i + 1
              return (
                <tr key={l.id} className={l.bypass ? 'off' : undefined}>
                  <th scope="row">
                    <button className={`clip-layer${i === selected ? ' on' : ''}`} aria-pressed={i === selected} title={t('visuals.select', { n })} onClick={() => inspectLayer(i)}>
                      {n}
                    </button>
                  </th>
                  {COLUMNS.map((c) => {
                    const clip = l.clips[c]
                    const v = clip ? getVisual(clip.visual) : undefined
                    const name = clip ? (v ? nameOf(v, t) : clip.visual) : ''
                    const label = !clip ? t('clips.save', { n, c: c + 1 }) : queued.get(l.id) === c ? t('clips.waiting', { name, n }) : clip.launch === 'beat' ? t('clips.launchBeat', { name, n }) : t('clips.launch', { name, n })
                    return (
                      <td key={c}>
                        <button
                          className={`clip${clip ? '' : ' empty'}${clip && l.active === c ? ' active' : ''}${queued.get(l.id) === c ? ' queued' : ''}${clip?.launch === 'beat' ? ' on-beat' : ''}`}
                          title={label}
                          aria-label={label}
                          onClick={(e) => {
                            if (clip && !e.shiftKey) launchClip(i, c)
                            else saveClip(i, c)
                            inspectClip(i, c)
                          }}
                          onContextMenu={(e) => {
                            if (!clip) return
                            e.preventDefault()
                            clearClip(i, c)
                          }}
                          onKeyDown={(e) => {
                            // Shift + Enter saves over a clip, as Shift + click does.
                            if (e.key === 'Enter' && e.shiftKey) {
                              e.preventDefault()
                              saveClip(i, c)
                              return
                            }
                            if (!clip || (e.key !== 'Delete' && e.key !== 'Backspace')) return
                            e.preventDefault()
                            clearClip(i, c)
                          }}
                        >
                          {!clip ? <Plus size={14} /> : thumbs[clip.visual] ? <img src={thumbs[clip.visual]} alt="" /> : <span className="clip-name">{v ? nameOf(v, t) : clip.visual}</span>}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Hint text={t('clips.hint')} />
    </section>
  )
}
