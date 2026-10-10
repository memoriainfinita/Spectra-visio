import { COMMON_PARAMS, type ParamDef, type Params, type VisualDef } from './visual'
import { bars, radialBars } from './visuals/bars'
import { julia, kifs } from './visuals/fractals'
import { cells, polygons } from './visuals/geometry'
import { gridWarp } from './visuals/gridWarp'
import { kaleido } from './visuals/kaleido'
import { orbitals } from './visuals/orbitals'
import { oscilloscope } from './visuals/oscilloscope'
import { plasma } from './visuals/plasma'
import { ribbons } from './visuals/ribbons'
import { spectrogram } from './visuals/spectrogram'
import { fireworks, starfield } from './visuals/starfield'
import { strobeBloom } from './visuals/strobeBloom'
import { terrain } from './visuals/terrain'
import { tunnel } from './visuals/tunnel'
import { warpTunnel } from './visuals/warpTunnel'
import { milkdrop } from './visuals/milkdrop'
import { lissajous, radialWave } from './visuals/waves'

export const VISUALS: VisualDef[] = [
  kaleido,
  orbitals,
  gridWarp,
  strobeBloom,
  tunnel,
  plasma,
  ribbons,
  oscilloscope,
  bars,
  radialBars,
  spectrogram,
  lissajous,
  radialWave,
  starfield,
  fireworks,
  terrain,
  warpTunnel,
  polygons,
  cells,
  julia,
  kifs,
  milkdrop,
]

const BY_ID = new Map(VISUALS.map((v) => [v.id, v]))

export function getVisual(id: string): VisualDef | undefined {
  return BY_ID.get(id)
}

// Common parameters first, then the visualization's own.
export function paramsOf(def: VisualDef): ParamDef[] {
  return [...COMMON_PARAMS, ...def.params]
}

export function clampParam(def: ParamDef, value: number): number {
  const v = Math.max(def.min, Math.min(def.max, value))
  return def.int ? Math.round(v) : v
}

export function defaultParams(def: VisualDef): Params {
  return Object.fromEntries(paramsOf(def).map((p) => [p.id, p.default]))
}

export function toUnit(def: ParamDef, value: number): number {
  return def.max === def.min ? 0 : (value - def.min) / (def.max - def.min)
}

export function fromUnit(def: ParamDef, unit: number): number {
  return clampParam(def, def.min + Math.max(0, Math.min(1, unit)) * (def.max - def.min))
}
