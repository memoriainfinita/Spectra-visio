// Pure play-order logic. `order` holds track ids in the sequence they will play:
// the list order, or a shuffled copy of it.

export type Repeat = 'off' | 'all' | 'one'

// Track after `current`. `auto` is true when the current track simply ended: only then does
// repeat-one replay it; a manual "next" always moves on.
export function following(order: readonly string[], current: string | null, repeat: Repeat, auto: boolean): string | null {
  if (order.length === 0) return null
  if (current === null) return order[0]
  if (auto && repeat === 'one') return current
  const i = order.indexOf(current)
  if (i < 0) return order[0]
  if (i + 1 < order.length) return order[i + 1]
  return repeat === 'off' ? null : order[0]
}

export function preceding(order: readonly string[], current: string | null, repeat: Repeat): string | null {
  if (order.length === 0) return null
  if (current === null) return order[0]
  const i = order.indexOf(current)
  if (i < 0) return order[0]
  if (i > 0) return order[i - 1]
  return repeat === 'off' ? null : order[order.length - 1]
}

// Fisher-Yates over the ids, with `first` (the playing track) kept at the front.
export function shuffled(ids: readonly string[], first: string | null, random: () => number = Math.random): string[] {
  const rest = ids.filter((id) => id !== first)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return first !== null && ids.includes(first) ? [first, ...rest] : rest
}

// Keeps a shuffled order in step with a changed list: drops removed ids, inserts new ones
// at random positions after the current track so they still come up in this pass.
export function syncShuffled(
  order: readonly string[],
  ids: readonly string[],
  current: string | null,
  random: () => number = Math.random,
): string[] {
  const present = new Set(ids)
  const next = order.filter((id) => present.has(id))
  const known = new Set(next)
  const start = current !== null && next.includes(current) ? next.indexOf(current) + 1 : 0
  for (const id of ids) {
    if (known.has(id)) continue
    const at = start + Math.floor(random() * (next.length - start + 1))
    next.splice(at, 0, id)
  }
  return next
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice()
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
