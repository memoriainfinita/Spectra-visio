import { getGraph } from '../engine/audio/graph'

// The sound of a video or a TV channel in a layer's visual source. Each is routed through its
// own gain into the player's bus, so it joins whatever else sounds (the song, the other
// sources), goes through the volume, and is heard by the analysis and the recording.
// A media element is joined to the graph once, for good, and then heard only through it; the
// elements start muted, and a muted element gives the graph silence, so the mute is the switch.

interface Route {
  node: MediaElementAudioSourceNode
  gain: GainNode
}

const routes = new WeakMap<HTMLMediaElement, Route>()

export function applySourceSound(el: HTMLMediaElement, on: boolean, volume: number): void {
  const graph = getGraph()
  let route = routes.get(el)
  if (!route) {
    // Never joined and not wanted: the element stays as it is.
    if (!on) return
    const node = graph.ctx.createMediaElementSource(el)
    const gain = graph.ctx.createGain()
    gain.gain.value = 0
    node.connect(gain).connect(graph.playerBus)
    route = { node, gain }
    routes.set(el, route)
  }
  el.muted = !on
  graph.setGain(route.gain.gain, on ? Math.max(0, Math.min(1, volume)) : 0)
  void graph.resume()
}

// The element is going away: its route goes with it.
export function dropSourceSound(el: HTMLMediaElement): void {
  const route = routes.get(el)
  if (!route) return
  route.node.disconnect()
  route.gain.disconnect()
  routes.delete(el)
}
