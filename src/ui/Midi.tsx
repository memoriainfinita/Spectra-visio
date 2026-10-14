import { X } from 'lucide-react'
import { useEffect, useId } from 'react'
import { enableMidi, learnControl, mapTarget, midiStore, midiSupported, setMidiClock, setMidiInput, stopLearning } from '../app/midi'
import { settingsStore } from '../app/settings'
import { isAction } from '../engine/live/live'
import { MIDI_TARGETS, type ControlId, type MidiTarget } from '../engine/midi/midi'
import { actionLabel } from './Live'
import { useStore } from './useStore'
import { useT } from './useT'
import { Hint } from './Hint'
import { Row, Switch } from './SettingRow'

type T = ReturnType<typeof useT>

export function controlName(id: ControlId, t: T): string {
  const [kind, channel, number] = id.split(':')
  return t(kind === 'cc' ? 'midi.cc' : 'midi.note', { n: number, c: Number(channel) + 1 })
}

function targetLabel(target: MidiTarget, t: T): string {
  if (isAction(target)) return actionLabel(target, t)
  if (target === 'crossfader') return t('visuals.crossfade')
  return t('visuals.opacity', { n: target.slice(7) })
}

// A button that shows the control and learns the next one moved.
export function MidiLearn({ control, onLearn, onClear, label }: { control: ControlId | null; onLearn: (c: ControlId) => void; onClear?: () => void; label?: string }) {
  const t = useT()
  const key = useId()
  const learning = useStore(midiStore, (s) => s.learning) === key

  // Waiting stops when the button goes away.
  useEffect(() => () => {
    if (midiStore.get().learning === key) stopLearning()
  }, [key])

  return (
    <span className="midi-learn">
      <button
        className={`btn key${learning ? ' on' : ''}`}
        aria-label={label ? t('midi.learnFor', { name: label }) : t('midi.learn')}
        title={t('midi.learnHint')}
        onClick={() => (learning ? stopLearning() : void learnControl(key, onLearn))}
      >
        {learning ? t('midi.learning') : control ? controlName(control, t) : t('midi.learn')}
      </button>
      {onClear && control && (
        <button className="icon-btn small" title={t('midi.clear')} aria-label={t('midi.clear')} onClick={onClear}>
          <X size={14} />
        </button>
      )}
    </span>
  )
}

export function Midi() {
  const t = useT()
  const state = useStore(midiStore)
  const settings = useStore(settingsStore, (s) => s.midi)
  const on = state.status === 'on'

  const status = !midiSupported
    ? t('midi.unsupported')
    : state.status === 'pending'
      ? t('midi.pending')
      : state.status === 'denied'
        ? t('midi.denied')
        : on
          ? t('midi.onDesc', { n: state.inputs.length })
          : t('midi.offDesc')

  return (
    <section className="panel midi settings-section settings-midi">
      <header className="panel-head">
        <h2>{t('midi.title')}</h2>
      </header>
      <div className="setting-rows">
        <Row title={t('midi.connection')} desc={status} hint={state.status === 'off' && midiSupported ? t('midi.offHint') : undefined}>
          {!on && midiSupported && (
            <button className="btn" disabled={state.status === 'pending'} onClick={() => void enableMidi()}>
              {t('midi.enable')}
            </button>
          )}
        </Row>

        {on && (
          <>
            <Row title={t('midi.input')} desc={t('midi.inputDesc')}>
              <select aria-label={t('midi.input')} value={settings.input ?? ''} onChange={(e) => setMidiInput(e.target.value || null)}>
                <option value="">{t('midi.allInputs', { n: state.inputs.length })}</option>
                {state.inputs.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </Row>
            <Row title={t('midi.clock')} desc={state.clockBpm ? t('midi.clockBpm', { n: state.clockBpm }) : t('midi.noClock')}>
              <Switch label={t('midi.clock')} checked={settings.clock} onChange={setMidiClock} />
            </Row>
            <Row title={t('midi.lastTitle')} desc={<span role="status">{state.last ? t('midi.last', { name: controlName(state.last, t) }) : t('midi.none')}</span>} />
          </>
        )}

        <details className="live-keys setting-group">
          <summary>{t('midi.map')}</summary>
          <Hint text={t('midi.mapHint')} />
          {MIDI_TARGETS.map((target) => {
            const label = targetLabel(target, t)
            return (
              <Row key={target} title={label}>
                <MidiLearn label={label} control={settings.map[target] ?? null} onLearn={(c) => mapTarget(target, c)} onClear={() => mapTarget(target, null)} />
              </Row>
            )
          })}
        </details>
      </div>
    </section>
  )
}
