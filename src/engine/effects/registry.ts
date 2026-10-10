import { bloom } from './defs/bloom'
import { color } from './defs/color'
import { feedback } from './defs/feedback'
import { inputMix } from './defs/inputMix'
import { kaleidoFx } from './defs/kaleido'
import { mirror } from './defs/mirror'
import { palette } from './defs/palette'
import { trails } from './defs/trails'
import type { EffectDef } from './effect'

export const EFFECTS: EffectDef[] = [bloom, feedback, trails, mirror, kaleidoFx, color, palette, inputMix]

// Longest chain the scene keeps.
export const MAX_EFFECTS = 12

const BY_ID = new Map(EFFECTS.map((e) => [e.id, e]))

export function getEffect(id: string): EffectDef | undefined {
  return BY_ID.get(id)
}
