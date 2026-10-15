import { createStore } from '../core/store'
import type { AnalysisFrame } from '../engine/analysis/analyzer'
import { OutputStage, bindKey, type ActionId, type OutputState } from '../engine/live/live'
import { toggleAuto } from './auto'
import { moveCrossfader } from './crossfader'
import { analysis, player, renderer } from './engine'
import { toggleRecording } from './record'
import { transport } from './transport'
import { launchColumn, sceneStore, tickLaunches } from './scene'
import { settingsStore } from './settings'

// Live switches and the actions keys and MIDI controls trigger. The switches are not kept
// between visits: the output never starts black or frozen.

export interface LiveState {
  blackout: boolean
  freeze: boolean
  strobe: boolean
}

export const liveStore = createStore<LiveState>({ blackout: false, freeze: false, strobe: false })

const SEEK_STEP_S = 5
const stage = new OutputStage()

export function initLive(): void {
  renderer.output = liveOutput
}

// Called by this window's renderer and by the output window's. Clips waiting for the beat
// are released here too, so they go on time whichever window draws.
export function liveOutput(now: number, frame: AnalysisFrame | null): OutputState {
  const { blackout, freeze, strobe } = liveStore.get()
  const { live, reduceFlashes } = settingsStore.get()
  const phase = frame && frame.bpm > 0 ? frame.phase : null
  tickLaunches(phase)
  return stage.tick({ now, blackout, freeze, strobe, rate: live.strobe, reduceFlashes, phase })
}

export function toggleLive(key: keyof LiveState): void {
  liveStore.set((s) => ({ ...s, [key]: !s[key] }))
}

// Moves the crossfader with the scene's transition time.
function crossTo(x: number): void {
  moveCrossfader(x, sceneStore.get().transition * 1000)
}

export function runAction(id: ActionId): void {
  if (id.startsWith('column')) {
    launchColumn(Number(id.slice(6)) - 1)
    return
  }
  switch (id) {
    case 'play':
      return transport.toggle()
    case 'next':
      return transport.next()
    case 'previous':
      return transport.previous()
    case 'seekForward':
      return player.seek(player.position() + SEEK_STEP_S)
    case 'seekBack':
      return player.seek(player.position() - SEEK_STEP_S)
    case 'tap':
      return analysis.tap()
    case 'auto':
      return toggleAuto()
    case 'crossA':
      return crossTo(0)
    case 'crossB':
      return crossTo(1)
    case 'crossSwap':
      return crossTo(sceneStore.get().crossfade < 0.5 ? 1 : 0)
    case 'blackout':
    case 'freeze':
    case 'strobe':
      return toggleLive(id)
    case 'record':
      return toggleRecording()
  }
}

export function setActionKey(action: ActionId, key: string | null): void {
  settingsStore.set((s) => ({ ...s, live: { ...s.live, keys: bindKey(s.live.keys, action, key) } }))
}
