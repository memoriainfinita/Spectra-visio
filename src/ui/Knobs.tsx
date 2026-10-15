import { MoreHorizontal, Plus } from 'lucide-react'
import { PANEL, deleteVariation, launchVariation, panelRef, renameVariation, saveVariation, setVariationBeats, updateVariation, variationStore } from '../app/knobs'
import { mapTarget } from '../app/midi'
import { sceneStore } from '../app/scene'
import { settingsStore } from '../app/settings'
import type { MidiTarget } from '../engine/midi/midi'
import { MAX_VARIATIONS, NAME_MAX, VARIATION_BEATS, type Variation } from '../engine/scene/knobs'
import { Popover } from './dock/Popover'
import { Hint } from './Hint'
import { KnobDial } from './Knob'
import { MidiLearn } from './Midi'
import { useStore } from './useStore'
import { useT } from './useT'

type T = ReturnType<typeof useT>

const variationName = (v: Variation, i: number, t: T) => v.name || t('knobs.variationDefault', { n: i + 1 })

// The knob panel: eight knobs for anything in the app, and variations that bring them back.
export function Knobs() {
  const t = useT()
  const variations = useStore(sceneStore, (s) => s.variations)
  const state = useStore(variationStore)
  const full = variations.length >= MAX_VARIATIONS

  return (
    <section className="panel knobs">
      <header className="panel-head">
        <h2>{t('knobs.title')}</h2>
      </header>
      <div className="knobs-body">
        <div className="knob-row" role="group" aria-label={t('knobs.panel')}>
          {PANEL.map((i) => (
            <KnobDial key={i} knobRef={panelRef(i)} n={i + 1} midi={`knob${i + 1}` as MidiTarget} />
          ))}
        </div>
        <div className="variations" role="group" aria-label={t('knobs.variations')}>
          {variations.map((v, i) => {
            const name = variationName(v, i, t)
            const on = state.active === v.id
            return (
              <div key={v.id} className={`variation${on ? ' on' : ''}${on && state.moving ? ' moving' : ''}`}>
                <button className="variation-launch" aria-pressed={on} aria-label={t('knobs.launch', { name })} title={t('knobs.launch', { name })} onClick={() => launchVariation(v.id)}>
                  {name}
                </button>
                <Popover label={t('knobs.variationEditor', { name })} button={<MoreHorizontal size={15} />} buttonClass="icon-btn small" buttonLabel={t('knobs.variationEdit', { name })} align="end" floating>
                  {(close) => <VariationEditor v={v} index={i} close={close} />}
                </Popover>
              </div>
            )
          })}
          <button className="btn variation-add" disabled={full} title={full ? t('knobs.variationsFull', { n: MAX_VARIATIONS }) : undefined} onClick={saveVariation}>
            <Plus size={15} /> {t('knobs.saveVariation')}
          </button>
        </div>
      </div>
      <Hint text={t('knobs.hint')} />
    </section>
  )
}

function VariationEditor({ v, index, close }: { v: Variation; index: number; close: () => void }) {
  const t = useT()
  const map = useStore(settingsStore, (s) => s.midi.map)
  const name = variationName(v, index, t)
  const target = `variation${index + 1}` as MidiTarget
  return (
    <div className="variation-editor">
      <label className="field">
        <span>{t('knobs.name')}</span>
        <input type="text" maxLength={NAME_MAX} placeholder={t('knobs.variationDefault', { n: index + 1 })} value={v.name} onChange={(e) => renameVariation(v.id, e.target.value)} />
      </label>
      <div className="field">
        <span>{t('knobs.beats')}</span>
        <div className="segmented" role="group" aria-label={t('knobs.beatsOf', { name })}>
          {VARIATION_BEATS.map((b) => (
            <button key={b} className={`seg${v.beats === b ? ' on' : ''}`} aria-pressed={v.beats === b} onClick={() => setVariationBeats(v.id, b)}>
              {b === 0 ? t('knobs.cut') : String(b)}
            </button>
          ))}
        </div>
      </div>
      <p className="small muted">{v.beats ? t('knobs.beatsHint', { n: v.beats }) : t('knobs.cutHint')}</p>
      <div className="field">
        <span>MIDI</span>
        <MidiLearn label={name} control={map[target] ?? null} onLearn={(c) => mapTarget(target, c)} onClear={() => mapTarget(target, null)} />
      </div>
      <p className="small muted">{t('knobs.keyHint', { n: index + 1 })}</p>
      <div className="variation-actions">
        <button className="btn" onClick={() => updateVariation(v.id)}>
          {t('knobs.update')}
        </button>
        <button
          className="btn danger"
          onClick={() => {
            close()
            deleteVariation(v.id)
          }}
        >
          {t('knobs.deleteVariation')}
        </button>
      </div>
    </div>
  )
}
