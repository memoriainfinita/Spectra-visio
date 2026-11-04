import { Plus } from 'lucide-react'
import { useEffect } from 'react'
import { loadThumbnails, thumbsStore } from '../app/library'
import { inspectClip } from '../app/inspector'
import { clearClip, launchClip, launchColumn, queuedStore, saveClip, sceneStore } from '../app/scene'
import { CLIP_COLUMNS } from '../engine/scene/scene'
import { clipMenu, clipName, columnLabel } from './ClipMenu'
import { useStore } from './useStore'
import { useT } from './useT'
import { Hint } from './Hint'

const COLUMNS = Array.from({ length: CLIP_COLUMNS }, (_, c) => c)

// The clip grid: a row per layer, top first, and a column per number key.
export function Clips() {
  const t = useT()
  const layers = useStore(sceneStore, (s) => s.layers)
  const columns = useStore(sceneStore, (s) => s.columns)
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
              {COLUMNS.map((c) => {
                const label = columnLabel(columns, c, t)
                const menu = clipMenu({ kind: 'column', column: c })
                return (
                  <th key={c}>
                    <button className="clip-col" title={label} aria-label={label} onClick={() => launchColumn(c)} onContextMenu={menu.onContextMenu} onKeyDown={menu.onMenuKey}>
                      <span>{c + 1}</span>
                      {columns[c] && <span className="clip-col-name">{columns[c]}</span>}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {order.map((i) => {
              const l = layers[i]
              const n = i + 1
              return (
                <tr key={l.id} className={l.bypass ? 'off' : undefined}>
                  <th scope="row">
                    <span className={`clip-layer${i === selected ? ' on' : ''}`}>{n}</span>
                  </th>
                  {COLUMNS.map((c) => {
                    const clip = l.clips[c]
                    const name = clip ? clipName(clip, t) : ''
                    const label = !clip ? t('clips.save', { n, c: c + 1 }) : queued.get(l.id) === c ? t('clips.waiting', { name, n }) : clip.launch === 'beat' ? t('clips.launchBeat', { name, n }) : t('clips.launch', { name, n })
                    const menu = clipMenu({ kind: 'clip', layer: l.id, column: c })
                    const thumb = clip && thumbs[clip.visual]
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
                          onContextMenu={menu.onContextMenu}
                          onKeyDown={(e) => {
                            if (menu.onMenuKey(e)) return
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
                          {!clip ? <Plus size={14} /> : thumb ? <img src={thumb} alt="" /> : <span className="clip-name">{name}</span>}
                          {clip?.name && thumb && <span className="clip-label">{clip.name}</span>}
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
