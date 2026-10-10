import { FolderPlus, GripVertical, Plus, Trash, X } from 'lucide-react'
import { useState } from 'react'
import { addPicked, persistence, player } from '../app/engine'
import { pickFiles, pickFolder } from '../engine/player/pick'
import { trackTitle } from '../engine/player/types'
import { formatTime } from './format'
import { useStore } from './useStore'
import { useT } from './useT'

export function Queue() {
  const t = useT()
  const s = useStore(player.state)
  const pending = useStore(persistence.state, (p) => p.pending)
  const storageFull = useStore(persistence.state, (p) => p.storageFull)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  return (
    <section className="panel queue">
      <header className="panel-head">
        <h2>
          {t('queue.title')} <span className="muted">{s.tracks.length ? t('queue.count', { n: s.tracks.length }) : ''}</span>
        </h2>
        <div className="head-actions">
          <button className="btn" onClick={() => void pickFiles().then(addPicked)}>
            <Plus size={16} /> {t('queue.addFiles')}
          </button>
          <button className="btn" onClick={() => void pickFolder().then(addPicked)}>
            <FolderPlus size={16} /> {t('queue.addFolder')}
          </button>
          <button className="icon-btn" title={t('queue.clear')} aria-label={t('queue.clear')} disabled={!s.tracks.length} onClick={() => player.clear()}>
            <Trash size={16} />
          </button>
        </div>
      </header>

      {pending > 0 && (
        <button className="btn notice" onClick={() => void persistence.regainAccess()}>
          {t('queue.regain', { n: pending })}
        </button>
      )}
      {storageFull && <p className="error">{t('queue.storageFull')}</p>}

      {s.tracks.length === 0 ? (
        <p className="empty">{t('queue.empty')}</p>
      ) : (
        <ol className="tracks">
          {s.tracks.map((track, i) => {
            const current = track.id === s.currentId
            const unavailable = !track.file
            return (
              <li
                key={track.id}
                className={['track', current && 'current', track.failed && 'failed', unavailable && 'unavailable', dragOver === i && 'drag-over']
                  .filter(Boolean)
                  .join(' ')}
                draggable
                onDragStart={(e) => {
                  setDragFrom(i)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', track.id)
                }}
                onDragOver={(e) => {
                  if (dragFrom === null) return
                  e.preventDefault()
                  setDragOver(i)
                }}
                onDrop={(e) => {
                  if (dragFrom === null) return
                  e.preventDefault()
                  e.stopPropagation()
                  player.move(dragFrom, i)
                  setDragFrom(null)
                  setDragOver(null)
                }}
                onDragEnd={() => {
                  setDragFrom(null)
                  setDragOver(null)
                }}
              >
                <GripVertical size={14} className="grip" aria-hidden="true" />
                <button
                  className="track-main"
                  disabled={unavailable}
                  title={track.failed ? t('queue.failed') : unavailable ? t('queue.unavailable') : undefined}
                  onClick={() => void player.play(track.id)}
                >
                  <span className="track-title">{trackTitle(track)}</span>
                  <span className="track-artist">{track.meta?.artist ?? ''}</span>
                </button>
                <span className="track-time">{formatTime(track.meta?.duration ?? null)}</span>
                <button className="icon-btn small" title={t('queue.remove')} aria-label={t('queue.remove')} onClick={() => player.remove(track.id)}>
                  <X size={14} />
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
