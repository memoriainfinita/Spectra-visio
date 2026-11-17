import { SilenceWatch } from '../engine/audio/silence'
import { translate } from '../i18n'
import { analysis, inputs } from './engine'
import { notify } from './notices'
import { settingsStore } from './settings'

// A live input (mic, tab or system, stream) that sends nothing is said so once, with what
// usually causes it. Files are left alone: a silence between tracks is the music's.

const CHECK_MS = 500
const SHOWN_MS = 9000

export function initSilenceWatch(): void {
  const watch = new SilenceWatch()
  window.setInterval(() => {
    const s = inputs.state.get()
    // A gain of zero silences the analysis by choice.
    const listening = s.kind !== 'player' && s.status === 'active' && s.gain > 0
    if (!watch.update(analysis.silent, listening, performance.now())) return
    const key = s.kind === 'mic' ? 'input.silent.mic' : s.kind === 'screen' ? 'input.silent.screen' : 'input.silent.stream'
    notify(translate(settingsStore.get().lang, key), SHOWN_MS)
  }, CHECK_MS)
}
