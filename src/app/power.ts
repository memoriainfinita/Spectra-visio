import { applyPerformance } from '../engine/render/quality'
import { keepAwake } from '../engine/power/wakeLock'
import { inputs, player, renderer } from './engine'
import { settingsStore } from './settings'

// Frame cap, adaptive resolution and low power on the renderer; the screen kept awake
// while something plays.
export function initPower(): void {
  const apply = () => applyPerformance(renderer, settingsStore.get().performance)
  settingsStore.subscribe(apply)
  apply()

  const playing = () => player.state.get().status === 'playing' || inputs.state.get().status === 'active'
  keepAwake(playing, (fn) => {
    player.state.subscribe(fn)
    inputs.state.subscribe(fn)
  })
}
