import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { renderer } from '../app/engine'
import { addModulator, mappingStore, removeModDest, removeModulator, renameModulator, setModDestAmount, setModulatorSource, stopMapping, toggleMapping } from '../app/modulators'
import { sceneStore } from '../app/scene'
import type { ModSource, SourceKind } from '../engine/modulation/modulation'
import { MAX_MODULATORS, MOD_NAME_MAX, type SharedModulator } from '../engine/modulation/shared'
import type { MessageKey } from '../i18n'
import { Hint } from './Hint'
import { describeTarget } from './Knob'
import { controlName } from './Midi'
import { modulatorName } from './modulatorName'
import { SOURCE_KINDS, SourceFields } from './ParamList'
import { useStore } from './useStore'
import { useT } from './useT'

type T = ReturnType<typeof useT>

// What the source is, in a few words: "Graves", "Seno · 1 por pulso", "CC 21 · canal 1".
function sourceMeta(src: ModSource, t: T): string {
  if (src.kind === 'band') return t(`band.${src.band}` as MessageKey)
  if (src.kind === 'beat') return `${t(`band.${src.band}` as MessageKey)} · ${src.decay} ms`
  if (src.kind === 'midi') return src.control ? controlName(src.control, t) : t('modulators.unlearned')
  return `${t(`shape.${src.shape}` as MessageKey)} · ${src.sync ? t('mod.perBeat', { n: src.rate }) : `${src.rate} Hz`}`
}

// The Modulators dock: shared modulators, each with its live output and "Map", and the list
// of what each one moves.
export function Modulators() {
  const t = useT()
  const modulators = useStore(sceneStore, (s) => s.modulators)
  const scene = useStore(sceneStore)
  const mapping = useStore(mappingStore)
  const [kind, setKind] = useState<SourceKind>('lfo')
  const meters = useRef(new Map<string, HTMLElement>())
  const mapper = modulators.find((m) => m.id === mapping)

  // Each modulator's output, drawn outside React.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      for (const [id, el] of meters.current) el.style.transform = `scaleY(${renderer.modValues.get(id) ?? 0})`
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Escape ends the mapping, wherever the focus is in the app.
  useEffect(() => {
    if (!mapping) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      stopMapping()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mapping])

  // A mapping whose modulator went ends.
  useEffect(() => {
    if (mapping && !mapper) stopMapping()
  }, [mapping, mapper])

  const dests = modulators.flatMap((m) => m.dests.map((d, i) => ({ m, d, i })))

  return (
    <section className="panel modulators">
      <header className="panel-head">
        <h2>{t('modulators.title')}</h2>
      </header>
      {mapper && (
        <div className="mapping-banner" role="status">
          <span>{t('modulators.mapping', { mod: modulatorName(mapper, modulators, t) })}</span>
          <button className="btn" onClick={stopMapping}>
            {t('modulators.done')}
          </button>
        </div>
      )}
      {modulators.length === 0 && <p className="empty">{t('modulators.empty')}</p>}
      <ul className="mod-cards">
        {modulators.map((m) => (
          <ModCard
            key={m.id}
            m={m}
            name={modulatorName(m, modulators, t)}
            mapping={mapping === m.id}
            meter={(el) => {
              if (el) meters.current.set(m.id, el)
              else meters.current.delete(m.id)
            }}
          />
        ))}
      </ul>
      <div className="mod-add">
        <select aria-label={t('modulators.kind')} value={kind} onChange={(e) => setKind(e.target.value as SourceKind)}>
          {SOURCE_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`mod.kind.${k}` as MessageKey)}
            </option>
          ))}
        </select>
        <button className="btn" disabled={modulators.length >= MAX_MODULATORS} onClick={() => addModulator(kind)}>
          <Plus size={15} /> {t('modulators.add')}
        </button>
      </div>

      {dests.length > 0 && (
        <div className="mod-assign">
          <h3>{t('modulators.assignments')}</h3>
          <ul>
            {dests.map(({ m, d, i }) => {
              const what = describeTarget(scene, d.target, t)
              return (
                <li key={`${m.id}:${i}`} className="mod-assign-row">
                  <span className="mod-assign-src">{modulatorName(m, modulators, t)}</span>
                  <span className="mod-assign-dst" title={what}>
                    {what}
                  </span>
                  <input type="range" min={-100} max={100} value={Math.round(d.amount * 100)} aria-label={t('modulators.amountOf', { what })} onChange={(e) => setModDestAmount(m.id, i, Number(e.target.value) / 100)} />
                  <span className="mono">
                    {d.amount > 0 ? '+' : ''}
                    {Math.round(d.amount * 100)} %
                  </span>
                  <button className="icon-btn small" title={t('modulators.removeDest')} aria-label={t('modulators.removeDestOf', { what })} onClick={() => removeModDest(m.id, i)}>
                    <X size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <Hint text={t('modulators.hint')} />
    </section>
  )
}

function ModCard({ m, name, mapping, meter }: { m: SharedModulator; name: string; mapping: boolean; meter: (el: HTMLElement | null) => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const n = m.dests.length
  return (
    <li className={`mod-card${mapping ? ' mapping' : ''}`}>
      <div className="mod-card-head">
        <span className="mod-meter" aria-hidden="true">
          <span ref={meter} />
        </span>
        <div className="mod-card-name">
          <input
            key={m.name}
            type="text"
            aria-label={t('modulators.name')}
            defaultValue={m.name}
            placeholder={name}
            maxLength={MOD_NAME_MAX}
            onBlur={(e) => renameModulator(m.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
          />
          <span className="small muted">
            {sourceMeta(m.source, t)} · {n ? t('knobs.dests', { n }) : t('modulators.noDests')}
          </span>
        </div>
        <button className={`btn map-btn${mapping ? ' on' : ''}`} aria-pressed={mapping} aria-label={t('modulators.mapOf', { name })} onClick={() => toggleMapping(m.id)}>
          {t('modulators.map')}
        </button>
        <button className="icon-btn small" aria-expanded={open} title={t('modulators.edit', { name })} aria-label={t('modulators.edit', { name })} onClick={() => setOpen(!open)}>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <button className="icon-btn small" title={t('modulators.remove', { name })} aria-label={t('modulators.remove', { name })} onClick={() => removeModulator(m.id)}>
          <X size={15} />
        </button>
      </div>
      {open && (
        <div className="mod">
          <SourceFields value={m} onChange={(patch) => setModulatorSource(m.id, patch)} />
        </div>
      )}
    </li>
  )
}
