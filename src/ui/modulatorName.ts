import type { SharedModulator } from '../engine/modulation/shared'
import type { MessageKey } from '../i18n'
import type { useT } from './useT'

type T = ReturnType<typeof useT>

// The name given, or its kind and its place among those of that kind: "Oscilador 2".
export function modulatorName(m: SharedModulator, all: readonly SharedModulator[], t: T): string {
  if (m.name) return m.name
  const n = all.filter((x) => x.source.kind === m.source.kind).indexOf(m) + 1
  return `${t(`mod.kind.${m.source.kind}` as MessageKey)} ${n}`
}
