import { ChevronDown, ChevronRight, Play, RotateCcw, Save } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { autoStore } from '../app/auto'
import { renderer } from '../app/engine'
import { LEVELS, inspectLayer, inspectedColumn, inspectorStore, isFolded, setFolded, setLevel, type Level } from '../app/inspector'
import { loadPreset, presetsStore, savePreset } from '../app/presets'
import {
  addClipModulation,
  addModulation,
  launchClip,
  queuedStore,
  removeClipModulation,
  removeModulation,
  resetParams,
  saveClip,
  sceneStore,
  setClipLaunch,
  setClipParam,
  setParam,
  setTransition,
  setVisual,
  updateClipModulation,
  updateModulation,
} from '../app/scene'
import { videoControlStore } from '../app/videoControl'
import { getEffect } from '../engine/effects/registry'
import { getVisual, paramsOf, visualsStore } from '../engine/render/registry'
import { nameOf } from '../engine/render/visual'
import { NAME_MAX } from '../engine/scene/preset'
import { LAUNCH_MODES, TRANSITION_MAX, visualSettings, type EffectState, type VisualSettings } from '../engine/scene/scene'
import type { MessageKey } from '../i18n'
import { PanelSlot } from './dock/panels'
import type { MidiTarget } from '../engine/midi/midi'
import { LEVEL_KNOBS, type KnobRef } from '../engine/scene/knobs'
import { clipName } from './ClipMenu'
import { EffectChain } from './Effects'
import { KnobDial } from './Knob'
import { Hint } from './Hint'
import { ParamList } from './ParamList'
import { useStore } from './useStore'
import { useT } from './useT'
import { VideoControls } from './VideoControls'

type T = ReturnType<typeof useT>

// What is selected, at three levels as in Resolume: the composition, a layer and one of
// its clips. Each level is a column of sections that fold.
export function Inspector() {
  const t = useT()
  const state = useStore(inspectorStore)
  const layers = useStore(sceneStore, (s) => s.layers)
  const sel = useStore(sceneStore, (s) => s.selected)
  const column = inspectedColumn(state, layers[sel]?.active ?? null)
  const tabs = useRef<Partial<Record<Level, HTMLButtonElement | null>>>({})
  const n = sel + 1

  const label: Record<Level, string> = {
    comp: t('inspector.comp'),
    layer: t('visuals.layer', { n }),
    clip: column === null ? t('inspector.clip') : t('inspector.clipAt', { n, c: column + 1 }),
  }
  const onKey = (e: KeyboardEvent) => {
    const i = LEVELS.indexOf(state.level)
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? LEVELS.length - 1 : null
    if (to === null) return
    e.preventDefault()
    const next = LEVELS[(to + LEVELS.length) % LEVELS.length]
    setLevel(next)
    tabs.current[next]?.focus()
  }

  return (
    <section className="panel inspector">
      <header className="panel-head">
        <h2>{t('inspector.title')}</h2>
      </header>
      <div className="insp-layers" role="group" aria-label={t('inspector.layers')}>
        {layers.map((l, i) => (
          <button key={l.id} className={`insp-layer${i === sel ? ' on' : ''}`} aria-pressed={i === sel} aria-label={t('inspector.pickLayer', { n: i + 1 })} title={t('inspector.pickLayer', { n: i + 1 })} onClick={() => inspectLayer(i, 'keep')}>
            {i + 1}
          </button>
        ))}
      </div>
      <div className="segmented insp-levels" role="tablist" aria-label={t('inspector.level')} onKeyDown={onKey}>
        {LEVELS.map((lv) => (
          <button
            key={lv}
            ref={(el) => {
              tabs.current[lv] = el
            }}
            id={`insp-tab-${lv}`}
            role="tab"
            className={`seg${state.level === lv ? ' on' : ''}`}
            aria-selected={state.level === lv}
            aria-controls={lv === 'clip' && state.level !== 'clip' ? undefined : `insp-${lv}`}
            tabIndex={state.level === lv ? 0 : -1}
            onClick={() => setLevel(lv)}
          >
            {label[lv]}
          </button>
        ))}
      </div>
      <div id="insp-comp" role="tabpanel" aria-labelledby="insp-tab-comp" className="insp-level" hidden={state.level !== 'comp'}>
        <CompLevel />
      </div>
      <div id="insp-layer" role="tabpanel" aria-labelledby="insp-tab-layer" className="insp-level" hidden={state.level !== 'layer'}>
        <LayerLevel />
      </div>
      {/* Only while shown: its parameters carry the same names as the layer's. */}
      {state.level === 'clip' && (
        <div id="insp-clip" role="tabpanel" aria-labelledby="insp-tab-clip" className="insp-level">
          <ClipLevel column={column} />
        </div>
      )}
    </section>
  )
}

function Fold({ id, title, meta, folded: byDefault = false, children }: { id: string; title: string; meta?: string; folded?: boolean; children: ReactNode }) {
  const folded = useStore(inspectorStore, (s) => isFolded(s, id, byDefault))
  const body = `fold-${id.replace('.', '-')}`
  return (
    <div className="fold">
      <h3 className="fold-head">
        <button aria-expanded={!folded} aria-controls={body} onClick={() => setFolded(id, !folded)}>
          {folded ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          <span className="fold-title">{title}</span>
          {meta && <span className="fold-meta">{meta}</span>}
        </button>
      </h3>
      <div id={body} className="fold-body" hidden={folded} data-reveal>
        {children}
      </div>
    </div>
  )
}

// Names of the effects switched on, or `none` when there are none.
export function effectNames(t: T, list: EffectState[], none = t('inspector.none')): string {
  const on = list.filter((e) => e.enabled).map((e) => (getEffect(e.type) ? t(getEffect(e.type)!.label) : e.type))
  return on.length ? on.join(', ') : none
}

function CompLevel() {
  const t = useT()
  const effects = useStore(sceneStore, (s) => s.effects)
  const transition = useStore(sceneStore, (s) => s.transition)
  const auto = useStore(autoStore, (s) => s.enabled)
  const time = transition > 0 ? `${transition.toFixed(1)} s` : t('visuals.cut')
  return (
    <>
      <KnobRow refs={LEVEL.map((i) => ({ bank: 'comp', i }))} midi="compKnob" label={t('inspector.knobsOf', { name: t('inspector.comp') })} />
      <Fold id="comp.effects" title={t('inspector.compEffects')} meta={effectNames(t, effects)}>
        <EffectChain target="comp" />
      </Fold>
      <Fold id="comp.transition" title={t('visuals.transition')} meta={time}>
        <label className="field">
          <span>{t('visuals.transition')}</span>
          <input type="range" min={0} max={TRANSITION_MAX} step={0.1} value={transition} onChange={(e) => setTransition(Number(e.target.value))} />
          <span className="mono">{time}</span>
        </label>
        <Hint text={t('inspector.transitionHint')} />
      </Fold>
      <Fold id="comp.overlays" title={t('overlay.title')} folded>
        <PanelSlot id="overlays" />
      </Fold>
      <Fold id="comp.auto" title={t('auto.title')} meta={auto ? t('inspector.on') : t('inspector.off')} folded>
        <PanelSlot id="auto" />
      </Fold>
    </>
  )
}

function modulated(s: VisualSettings): number {
  return Object.values(s.mods).filter((m) => m.length).length
}

function LayerLevel() {
  const t = useT()
  const sel = useStore(sceneStore, (s) => s.selected)
  const layer = useStore(sceneStore, (s) => s.layers[s.selected])
  const visuals = useStore(visualsStore)
  const video = useStore(videoControlStore, (s) => s.active)
  const def = getVisual(layer.visual)
  const settings = visualSettings(layer)
  const params = def ? paramsOf(def) : []
  const n = sel + 1
  return (
    <>
      <KnobRow refs={LEVEL.map((i) => ({ bank: 'layer', layer: layer.id, i }))} midi="layerKnob" label={t('inspector.knobsOf', { name: t('visuals.layer', { n }) })} />
      <Fold id="layer.visual" title={t('inspector.visual')} meta={def ? nameOf(def, t) : layer.visual}>
        <div className="field">
          <select aria-label={t('inspector.visualOf', { n })} value={layer.visual} onChange={(e) => setVisual(sel, e.target.value)}>
            {visuals.map((v) => (
              <option key={v.id} value={v.id}>
                {nameOf(v, t)}
              </option>
            ))}
          </select>
          <button className="icon-btn small" title={t('visuals.reset')} aria-label={t('visuals.reset')} onClick={() => resetParams(sel)}>
            <RotateCcw size={15} />
          </button>
        </div>
      </Fold>
      <Fold id="layer.params" title={t('inspector.params')} meta={t('inspector.paramsMeta', { n: params.length, m: modulated(settings) })}>
        {def && (
          <ParamList
            defs={params}
            values={settings.params}
            mods={settings.mods}
            scope={`${layer.id}:${layer.visual}`}
            live={() => renderer.live.get(layer.id)}
            onParam={(id, v) => setParam(sel, id, v)}
            onAddMod={(id) => addModulation(sel, id)}
            onUpdateMod={(id, m) => updateModulation(sel, id, m)}
            onRemoveMod={(id, mid) => removeModulation(sel, id, mid)}
            knobTarget={(param) => ({ kind: 'param', layer: layer.id, visual: layer.visual, param })}
          />
        )}
      </Fold>
      <Fold id="layer.effects" title={t('effects.title')} meta={effectNames(t, layer.effects)}>
        <EffectChain target={sel} />
      </Fold>
      {video && (
        <Fold id="layer.video" title={t('inspector.video')}>
          <VideoControls />
        </Fold>
      )}
      <Fold id="layer.preset" title={t('inspector.preset')} folded>
        <LayerPreset n={n} />
      </Fold>
    </>
  )
}

function LayerPreset({ n }: { n: number }) {
  const t = useT()
  const presets = useStore(presetsStore)
  const [name, setName] = useState('')
  return (
    <>
      <form
        className="preset-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (savePreset(name)) setName('')
        }}
      >
        <input type="text" aria-label={t('inspector.presetName', { n })} placeholder={t('presets.name')} maxLength={NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" type="submit" disabled={!name.trim()}>
          <Save size={15} /> {t('inspector.presetSave')}
        </button>
      </form>
      <label className="field">
        <span>{t('inspector.presetLoad')}</span>
        <select
          value=""
          disabled={!presets.length}
          onChange={(e) => {
            if (e.target.value) loadPreset(e.target.value)
          }}
        >
          <option value="">{presets.length ? t('inspector.presetPick') : t('inspector.presetNone')}</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

function ClipLevel({ column }: { column: number | null }) {
  const t = useT()
  const sel = useStore(sceneStore, (s) => s.selected)
  const layer = useStore(sceneStore, (s) => s.layers[s.selected])
  const waiting = useStore(queuedStore, (q) => (column !== null && q.get(layer.id) === column))
  const n = sel + 1
  if (column === null) return <p className="empty">{t('inspector.noClip', { n })}</p>
  const clip = layer.clips[column]
  const c = column + 1
  const save = (
    <button className="btn" onClick={() => saveClip(sel, column)}>
      <Save size={15} /> {t('inspector.saveHere')}
    </button>
  )
  if (!clip) {
    return (
      <div className="insp-clip-empty">
        <p className="empty">{t('inspector.emptyCell', { n, c })}</p>
        {save}
      </div>
    )
  }
  const def = getVisual(clip.visual)
  const playing = layer.active === column
  const live = playing && layer.visual === clip.visual
  const status = waiting ? t('inspector.waiting') : playing ? t('inspector.playing') : ''
  return (
    <>
      <Fold id="clip.clip" title={clipName(clip, t)} meta={status}>
        <div className="segmented" role="group" aria-label={t('inspector.launch')}>
          {LAUNCH_MODES.map((m) => {
            const on = (clip.launch ?? 'press') === m
            return (
              <button key={m} className={`seg${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setClipLaunch(sel, column, m)}>
                {t(`inspector.launch.${m}` as MessageKey)}
              </button>
            )
          })}
        </div>
        <Hint text={t('inspector.launchHint')} />
        <div className="insp-actions">
          <button className="btn" onClick={() => launchClip(sel, column)}>
            <Play size={15} /> {t('inspector.launchNow')}
          </button>
          {save}
        </div>
        <p className="small muted">{clip.effects.length ? t('inspector.clipEffects', { list: effectNames(t, clip.effects) }) : t('inspector.clipNoEffects')}</p>
        <Hint text={playing ? t('inspector.clipPlayingHint') : t('inspector.clipHint')} />
      </Fold>
      <Fold id="clip.params" title={t('inspector.params')} meta={t('inspector.paramsMeta', { n: def ? paramsOf(def).length : 0, m: modulated(clip.settings) })}>
        {def && (
          <ParamList
            defs={paramsOf(def)}
            values={clip.settings.params}
            mods={clip.settings.mods}
            scope={`${layer.id}:${column}:${clip.visual}`}
            live={() => (live ? renderer.live.get(layer.id) : undefined)}
            onParam={(id, v) => setClipParam(sel, column, id, v)}
            onAddMod={(id) => addClipModulation(sel, column, id)}
            onUpdateMod={(id, m) => updateClipModulation(sel, column, id, m)}
            onRemoveMod={(id, mid) => removeClipModulation(sel, column, id, mid)}
          />
        )}
      </Fold>
    </>
  )
}

const LEVEL = Array.from({ length: LEVEL_KNOBS }, (_, i) => i)

// The level's own knobs, above its sections.
function KnobRow({ refs, midi, label }: { refs: KnobRef[]; midi: 'compKnob' | 'layerKnob'; label: string }) {
  return (
    <div className="insp-knobs" role="group" aria-label={label}>
      {refs.map((ref, i) => (
        <KnobDial key={i} knobRef={ref} n={i + 1} midi={`${midi}${i + 1}` as MidiTarget} />
      ))}
    </div>
  )
}
