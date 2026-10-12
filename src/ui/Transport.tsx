import { Pause, Play, Radio, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { inputs, player } from '../app/engine'
import { radioFavoritesStore } from '../app/radio'
import { tvFavoritesStore } from '../app/tv'
import { transport } from '../app/transport'
import type { Repeat as RepeatMode } from '../engine/player/queue'
import { trackTitle } from '../engine/player/types'
import { formatTime } from './format'
import { usePosition } from './hooks'
import { useStore } from './useStore'
import { useT } from './useT'

const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' }
const CROSSFADES = [0, 2, 4, 6, 8, 12]

// Dragging only moves the thumb; the seek happens once, on the native `change` event
// (mouse release or a keyboard step). Seeking on every input event would restart the
// audio dozens of times per drag.
function SeekBar({ position, duration, label }: { position: number; duration: number; label: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState<number | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const commit = () => {
      player.seek(Number(el.value))
      setDrag(null)
    }
    el.addEventListener('change', commit)
    return () => el.removeEventListener('change', commit)
  }, [])
  const shown = drag ?? Math.min(position, duration)
  return (
    <div className="seek-row">
      <span className="time">{formatTime(shown)}</span>
      <input
        ref={ref}
        type="range"
        className="seek"
        aria-label={label}
        min={0}
        max={duration}
        step={0.1}
        value={shown}
        disabled={!duration}
        // React also calls this on `change`, after the commit above has re-rendered the old
        // position into the input: that would start a new drag stuck at the old point.
        onChange={(e) => {
          if (e.nativeEvent.type === 'input') setDrag(Number(e.target.value))
        }}
      />
      <span className="time">{formatTime(duration || null)}</span>
    </div>
  )
}

// While a stream is the source, even paused, the transport shows and controls it.
function useLive() {
  const s = useStore(inputs.state)
  const stations = useStore(radioFavoritesStore)
  const channels = useStore(tvFavoritesStore)
  const source = s.kind === 'stream' && s.status !== 'idle'
  const prev = s.tv ? 'tv.previous' : 'radio.previous'
  const next = s.tv ? 'tv.next' : 'radio.next'
  return { source, playing: source && s.status !== 'paused', status: s.status, name: s.streamName, canStep: (s.tv ? channels : stations).length > 0, prev, next } as const
}

function liveSub(status: string, t: ReturnType<typeof useT>): string {
  return status === 'connecting' ? t('input.connecting') : status === 'paused' ? t('player.livePaused') : t('player.live')
}

export function NowPlaying() {
  const t = useT()
  const s = useStore(player.state)
  const live = useLive()
  const track = s.tracks.find((tr) => tr.id === s.currentId)
  const meta = track?.meta
  if (live.source)
    return (
      <div className="now-playing">
        <div className="cover">
          <Radio size={26} aria-hidden="true" />
        </div>
        <div className="now-text">
          <div className="now-title" title={live.name}>{live.name}</div>
          <div className="now-sub">
            <span className="live-badge">{liveSub(live.status, t)}</span>
          </div>
        </div>
      </div>
    )
  return (
    <div className="now-playing">
      <div className="cover">{meta?.cover ? <img src={meta.cover} alt="" /> : <span aria-hidden="true">♪</span>}</div>
      <div className="now-text">
        <div className="now-title">{track ? trackTitle(track) : t('player.nothing')}</div>
        <div className="now-sub">
          {s.status === 'loading' ? t('player.loading') : [meta?.artist, meta?.album].filter(Boolean).join(' · ')}
        </div>
        {s.error && <div className="error">{t(s.error.key, { name: s.error.name ?? '' })}</div>}
      </div>
    </div>
  )
}

// The top bar's player on wide screens: previous, play, next and the current track.
export function MiniTransport() {
  const t = useT()
  const s = useStore(player.state)
  const position = usePosition()
  const playing = s.status === 'playing' || s.status === 'loading'
  const hasTracks = s.tracks.length > 0
  const track = s.tracks.find((tr) => tr.id === s.currentId)
  const duration = s.duration || track?.meta?.duration || 0
  const live = useLive()
  const on = live.source ? live.playing : playing
  return (
    <div className="mini-transport">
      <button
        className="icon-btn small"
        title={live.source ? t(live.prev) : t('player.previous')}
        aria-label={live.source ? t(live.prev) : t('player.previous')}
        disabled={live.source ? !live.canStep : !hasTracks}
        onClick={() => transport.previous()}
      >
        <SkipBack size={16} />
      </button>
      <button
        className={`icon-btn small${on ? ' on' : ''}`}
        title={on ? t('player.pause') : t('player.play')}
        aria-label={on ? t('player.pause') : t('player.play')}
        disabled={!live.source && !hasTracks}
        onClick={() => transport.toggle()}
      >
        {on ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <button
        className="icon-btn small"
        title={live.source ? t(live.next) : t('player.next')}
        aria-label={live.source ? t(live.next) : t('player.next')}
        disabled={live.source ? !live.canStep : !hasTracks}
        onClick={() => transport.next()}
      >
        <SkipForward size={16} />
      </button>
      <span className="mini-title" title={live.source ? live.name : track ? trackTitle(track) : undefined}>{live.source ? live.name : track ? trackTitle(track) : t('player.nothing')}</span>
      {live.source && <span className="live-badge">{liveSub(live.status, t)}</span>}
      {!live.source && track && (
        <span className="time">
          {formatTime(Math.min(position, duration))} / {formatTime(duration || null)}
        </span>
      )}
    </div>
  )
}

export function Transport() {
  const t = useT()
  const s = useStore(player.state)
  const position = usePosition()
  const playing = s.status === 'playing' || s.status === 'loading'
  const hasTracks = s.tracks.length > 0
  // Before a track is decoded, its tags already give the duration.
  const duration = s.duration || s.tracks.find((tr) => tr.id === s.currentId)?.meta?.duration || 0
  const RepeatIcon = s.repeat === 'one' ? Repeat1 : Repeat
  // A live stream has no position, order or repeat; only play, pause and the stations.
  const live = useLive()
  const on = live.source ? live.playing : playing

  return (
    <div className="transport">
      {!live.source && <SeekBar position={position} duration={duration} label={t('player.seek')} />}

      <div className="controls">
        {!live.source && (
          <button
            className={`icon-btn${s.shuffle ? ' on' : ''}`}
            aria-pressed={s.shuffle}
            title={t('player.shuffle')}
            aria-label={t('player.shuffle')}
            onClick={() => player.setShuffle(!s.shuffle)}
          >
            <Shuffle size={18} />
          </button>
        )}
        <button
          className="icon-btn"
          title={live.source ? t(live.prev) : t('player.previous')}
          aria-label={live.source ? t(live.prev) : t('player.previous')}
          disabled={live.source ? !live.canStep : !hasTracks}
          onClick={() => transport.previous()}
        >
          <SkipBack size={20} />
        </button>
        <button
          className="icon-btn primary"
          title={on ? t('player.pause') : t('player.play')}
          aria-label={on ? t('player.pause') : t('player.play')}
          disabled={!live.source && !hasTracks}
          onClick={() => transport.toggle()}
        >
          {on ? <Pause size={22} /> : <Play size={22} />}
        </button>
        <button
          className="icon-btn"
          title={live.source ? t(live.next) : t('player.next')}
          aria-label={live.source ? t(live.next) : t('player.next')}
          disabled={live.source ? !live.canStep : !hasTracks}
          onClick={() => transport.next()}
        >
          <SkipForward size={20} />
        </button>
        {!live.source && (
          <button
            className={`icon-btn${s.repeat !== 'off' ? ' on' : ''}`}
            title={t(`player.repeat.${s.repeat}`)}
            aria-label={t(`player.repeat.${s.repeat}`)}
            onClick={() => player.setRepeat(NEXT_REPEAT[s.repeat])}
          >
            <RepeatIcon size={18} />
          </button>
        )}
      </div>

      <div className="options-row">
        <button
          className="icon-btn"
          title={s.muted ? t('player.unmute') : t('player.mute')}
          aria-label={s.muted ? t('player.unmute') : t('player.mute')}
          onClick={() => player.setMuted(!s.muted)}
        >
          {s.muted || s.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          type="range"
          className="volume"
          aria-label={t('player.volume')}
          min={0}
          max={1}
          step={0.01}
          value={s.muted ? 0 : s.volume}
          onChange={(e) => {
            player.setVolume(Number(e.target.value))
            if (s.muted) player.setMuted(false)
          }}
        />
        {!live.source && (
          <>
            <label className="crossfade">
              <span>{t('player.crossfade')}</span>
              <select value={s.crossfade} onChange={(e) => player.setCrossfade(Number(e.target.value))}>
                {CROSSFADES.map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? t('player.crossfade.off') : t('player.crossfade.seconds', { n })}
                  </option>
                ))}
              </select>
            </label>
            <label className="check" title={t('player.normalizeHint')}>
              <input type="checkbox" checked={s.normalize} onChange={(e) => player.setNormalize(e.target.checked)} />
              <span>{t('player.normalize')}</span>
            </label>
          </>
        )}
      </div>
    </div>
  )
}
