import { ListMusic, Mic, Monitor, Radio } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { inputs } from '../app/engine'
import { MAX_INPUT_GAIN, type InputKind } from '../engine/audio/inputs'
import { peekGraph } from '../engine/audio/graph'
import { useStore } from './useStore'
import { useT } from './useT'

export function Sources() {
  const t = useT()
  const s = useStore(inputs.state)
  const [url, setUrl] = useState(s.streamUrl)
  const [showStream, setShowStream] = useState(false)

  const tabs: { kind: InputKind; icon: ReactNode; label: string; supported: boolean; onSelect: () => void }[] = [
    { kind: 'player', icon: <ListMusic size={16} />, label: t('input.player'), supported: true, onSelect: () => inputs.usePlayer() },
    { kind: 'mic', icon: <Mic size={16} />, label: t('input.mic'), supported: inputs.micSupported, onSelect: () => void inputs.useMic() },
    { kind: 'screen', icon: <Monitor size={16} />, label: t('input.screen'), supported: inputs.screenSupported, onSelect: () => void inputs.useScreen() },
    { kind: 'stream', icon: <Radio size={16} />, label: t('input.stream'), supported: true, onSelect: () => setShowStream(true) },
  ]

  return (
    <section className="panel sources">
      <header className="panel-head">
        <h2>{t('input.title')}</h2>
      </header>
      <div className="segmented" role="group" aria-label={t('input.title')}>
        {tabs.map((tab) => (
          <button
            key={tab.kind}
            className={`seg${s.kind === tab.kind ? ' on' : ''}`}
            aria-pressed={s.kind === tab.kind}
            disabled={!tab.supported}
            title={tab.supported ? tab.label : t('input.unsupported')}
            onClick={tab.onSelect}
          >
            {tab.icon} <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {s.status === 'connecting' && <p className="muted">{t('input.connecting')}</p>}
      {s.error && <p className="error">{t(s.error)}</p>}

      {s.kind === 'mic' && (
        <label className="field">
          <span>{t('input.device')}</span>
          <select value={s.deviceId} onChange={(e) => void inputs.useMic(e.target.value)}>
            <option value="">{t('input.deviceDefault')}</option>
            {s.devices
              .filter((d) => d.id !== 'default' && d.id !== '')
              .map((d, i) => (
                <option key={d.id} value={d.id}>
                  {d.label || t('input.deviceN', { n: i + 1 })}
                </option>
              ))}
          </select>
        </label>
      )}
      {s.kind === 'screen' && s.status !== 'active' && <p className="muted">{t('input.screenHint')}</p>}

      {(showStream || s.kind === 'stream') && (
        <form
          className="stream-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (url.trim()) void inputs.useStream(url.trim())
          }}
        >
          <input type="url" required placeholder="https://…" aria-label={t('input.streamUrl')} value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn" type="submit">
            {t('input.connect')}
          </button>
        </form>
      )}

      <label className="field">
        <span>{t('input.gain')}</span>
        <input type="range" min={0} max={MAX_INPUT_GAIN} step={0.05} value={s.gain} onChange={(e) => inputs.setGain(Number(e.target.value))} />
        <span className="muted mono">{s.gain.toFixed(2)}×</span>
      </label>
      <LevelMeter />
    </section>
  )
}

// Left and right RMS of what the analysers receive, with a slowly falling peak mark.
function LevelMeter() {
  const t = useT()
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const data = new Float32Array(2048)
    const peaks = [0, 0]
    let raf = 0
    const level = (analyser: AnalyserNode) => {
      analyser.getFloatTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
      return Math.min(1, Math.sqrt(sum / data.length) * 2.5)
    }
    const draw = () => {
      const graph = peekGraph()
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      const levels = graph ? [level(graph.analyserL), level(graph.analyserR)] : [0, 0]
      const bar = height / 2 - 2
      levels.forEach((v, i) => {
        peaks[i] = Math.max(v, peaks[i] - 0.01)
        const y = i * (bar + 4)
        ctx.fillStyle = 'rgba(255,255,255,0.06)'
        ctx.fillRect(0, y, width, bar)
        ctx.fillStyle = v > 0.9 ? '#ff6b6b' : '#6ef7ff'
        ctx.fillRect(0, y, v * width, bar)
        ctx.fillStyle = '#ff8bf1'
        ctx.fillRect(Math.min(width - 2, peaks[i] * width), y, 2, bar)
      })
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="meter">
      <span className="muted">{t('level.title')}</span>
      <canvas ref={ref} width={300} height={20} aria-hidden="true" />
    </div>
  )
}
