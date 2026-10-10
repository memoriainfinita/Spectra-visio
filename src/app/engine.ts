import { Analysis } from '../engine/analysis/analysis'
import { Inputs } from '../engine/audio/inputs'
import { connectMediaSession } from '../engine/player/mediaSession'
import { Persistence } from '../engine/player/persistence'
import type { Picked } from '../engine/player/pick'
import { Player } from '../engine/player/player'
import { Renderer } from '../engine/render/renderer'
import { sceneStore } from './scene'
import { settingsStore } from './settings'

export const player = new Player()
export const inputs = new Inputs(player)
export const persistence = new Persistence(player, () => settingsStore.get().keepFiles)
export const analysis = new Analysis(() => settingsStore.get().analysis)
export const renderer = new Renderer(() => sceneStore.get(), (now) => analysis.frame(now))

export async function initEngine(): Promise<void> {
  connectMediaSession(player)
  await persistence.start()
  analysis.start()
  // Playing a track takes the analysis back from the mic, screen or stream.
  player.state.subscribe(() => {
    const status = player.state.get().status
    if (status !== 'playing' && status !== 'loading') return
    const input = inputs.state.get()
    if (input.kind !== 'player' || input.error) inputs.usePlayer()
  })
}

export function addPicked(picked: Picked): void {
  const ids = player.add(picked.files)
  const withHandles = ids.map((id, i) => [id, picked.handles[i]] as const).filter((p): p is readonly [string, FileSystemFileHandle] => p[1] !== null)
  if (withHandles.length) persistence.rememberHandles(withHandles.map((p) => p[0]), withHandles.map((p) => p[1]))
}

export async function setKeepFiles(on: boolean): Promise<void> {
  settingsStore.set((s) => ({ ...s, keepFiles: on }))
  await persistence.setKeepFiles(on)
}
