// Docked panels on wide screens: zones left and right of the stage and a strip under it.
// Each zone holds stacks one above the other; a stack shows one of its docks at a time,
// with tabs. The stage itself is never part of a layout, so nothing can cover it.

export const DOCKS = ['layers', 'library', 'clips', 'effects', 'overlays', 'audio', 'live', 'auto', 'perform'] as const
export type DockId = (typeof DOCKS)[number]

export const ZONES = ['left', 'right', 'strip'] as const
export type ZoneId = (typeof ZONES)[number]
export type Side = 'left' | 'right'

// Laptop: 800–1279 px; desktop: 1280 px and up. Each remembers its own layout.
export const WIDTHS = ['desktop', 'laptop'] as const
export type WidthClass = (typeof WIDTHS)[number]

export const BUILT_IN = ['live', 'prepare', 'two', 'laptop'] as const
export type BuiltInId = (typeof BUILT_IN)[number]

export const LAYOUTS_VERSION = 1
export const WIDTH_MIN = 220
export const WIDTH_MAX = 640
export const NAME_MAX = 40
export const CUSTOM_MAX = 20

export interface Stack {
  tabs: DockId[]
  // Index of the tab shown.
  active: number
}

export interface Layout {
  id: string
  // Empty for the built-in ones: the interface names them in its language.
  name: string
  zones: Record<ZoneId, Stack[]>
  // Width of the side zones, in CSS pixels.
  widths: Record<Side, number>
}

export interface Layouts {
  version: typeof LAYOUTS_VERSION
  // The built-in layouts, as edited, then the saved ones.
  list: Layout[]
  active: Record<WidthClass, string>
  // Nothing moves or resizes while locked.
  locked: boolean
}

// Where a dragged dock lands: as a tab of a stack, as a new stack below one, or as a new
// stack at the end of a zone (the only choice in an empty zone).
export type DropTarget = { zone: ZoneId; stack: number; mode: 'tab' | 'below' } | { zone: ZoneId; mode: 'end' }

const stack = (...tabs: DockId[]): Stack => ({ tabs, active: 0 })

const FACTORY: Record<BuiltInId, Omit<Layout, 'id' | 'name'>> = {
  // Everything for a show at hand: layers on the left, the rest on the right, clips and
  // the perform controls under the stage.
  live: {
    zones: { left: [stack('layers', 'library')], right: [stack('effects', 'audio', 'overlays', 'live', 'auto')], strip: [stack('clips'), stack('perform')] },
    widths: { left: 320, right: 360 },
  },
  // Building a set: the libraries first, two stacks on the right.
  prepare: {
    zones: { left: [stack('library', 'layers')], right: [stack('effects', 'overlays'), stack('audio', 'auto', 'live')], strip: [stack('clips', 'perform')] },
    widths: { left: 380, right: 360 },
  },
  // The image on the projector: the clips get the room.
  two: {
    zones: { left: [stack('layers', 'audio', 'library')], right: [stack('effects', 'overlays', 'live', 'auto')], strip: [stack('clips'), stack('perform')] },
    widths: { left: 300, right: 340 },
  },
  // One zone with every dock, for narrower screens.
  laptop: {
    zones: { left: [stack('layers', 'effects', 'audio', 'library', 'overlays', 'live', 'auto')], right: [], strip: [stack('clips'), stack('perform')] },
    widths: { left: 340, right: 340 },
  },
}

const DEFAULT_ACTIVE: Record<WidthClass, BuiltInId> = { desktop: 'live', laptop: 'laptop' }

export const isBuiltIn = (id: string): id is BuiltInId => (BUILT_IN as readonly string[]).includes(id)
const isDock = (v: unknown): v is DockId => typeof v === 'string' && (DOCKS as readonly string[]).includes(v)

export function builtIn(id: BuiltInId): Layout {
  const f = FACTORY[id]
  return {
    id,
    name: '',
    zones: { left: f.zones.left.map(copyStack), right: f.zones.right.map(copyStack), strip: f.zones.strip.map(copyStack) },
    widths: { ...f.widths },
  }
}

export function defaultLayouts(): Layouts {
  return { version: LAYOUTS_VERSION, list: BUILT_IN.map(builtIn), active: { ...DEFAULT_ACTIVE }, locked: false }
}

const copyStack = (s: Stack): Stack => ({ tabs: [...s.tabs], active: s.active })
const copyZones = (l: Layout): Record<ZoneId, Stack[]> => ({ left: l.zones.left.map(copyStack), right: l.zones.right.map(copyStack), strip: l.zones.strip.map(copyStack) })

export function docksOf(layout: Layout): DockId[] {
  return ZONES.flatMap((z) => layout.zones[z].flatMap((s) => s.tabs))
}

export function locate(layout: Layout, dock: DockId): { zone: ZoneId; stack: number; tab: number } | null {
  for (const zone of ZONES) {
    const stacks = layout.zones[zone]
    for (let i = 0; i < stacks.length; i++) {
      const tab = stacks[i].tabs.indexOf(dock)
      if (tab >= 0) return { zone, stack: i, tab }
    }
  }
  return null
}

// Takes `dock` out of `s`, keeping the same tab shown when it was another one.
function without(s: Stack, dock: DockId): void {
  const i = s.tabs.indexOf(dock)
  if (i < 0) return
  s.tabs.splice(i, 1)
  if (s.active > i || s.active >= s.tabs.length) s.active = Math.max(0, s.active - 1)
}

const pruned = (zones: Record<ZoneId, Stack[]>): Record<ZoneId, Stack[]> => ({
  left: zones.left.filter((s) => s.tabs.length),
  right: zones.right.filter((s) => s.tabs.length),
  strip: zones.strip.filter((s) => s.tabs.length),
})

export function removeDock(layout: Layout, dock: DockId): Layout {
  if (!locate(layout, dock)) return layout
  const zones = copyZones(layout)
  for (const z of ZONES) for (const s of zones[z]) without(s, dock)
  return { ...layout, zones: pruned(zones) }
}

// Moves `dock` (in the layout or not) to `target`; it becomes the tab shown there.
export function moveDock(layout: Layout, dock: DockId, target: DropTarget): Layout {
  const zones = copyZones(layout)
  const list = zones[target.zone]
  const into = target.mode === 'end' ? null : list[target.stack]
  if (target.mode !== 'end' && !into) return layout
  const from = locate(layout, dock)
  if (from && into && target.mode !== 'end' && from.zone === target.zone && from.stack === target.stack) {
    // Onto its own stack: as a tab it only shows; below itself it needs a tab left behind.
    if (target.mode === 'tab' || into.tabs.length === 1) return selectTab(layout, from.zone, from.stack, from.tab)
  }
  for (const z of ZONES) for (const s of zones[z]) without(s, dock)
  if (target.mode === 'tab' && into) {
    into.tabs.push(dock)
    into.active = into.tabs.length - 1
  } else {
    const fresh = stack(dock)
    if (into) list.splice(list.indexOf(into) + 1, 0, fresh)
    else list.push(fresh)
  }
  return { ...layout, zones: pruned(zones) }
}

// A dock missing from the layout goes back as a tab on the right, or on the left when the
// right zone is empty.
export function addDock(layout: Layout, dock: DockId): Layout {
  if (locate(layout, dock)) return layout
  const zone: ZoneId = layout.zones.right.length ? 'right' : layout.zones.left.length ? 'left' : 'right'
  return layout.zones[zone].length ? moveDock(layout, dock, { zone, stack: 0, mode: 'tab' }) : moveDock(layout, dock, { zone, mode: 'end' })
}

export function selectTab(layout: Layout, zone: ZoneId, stackIndex: number, tab: number): Layout {
  const s = layout.zones[zone][stackIndex]
  if (!s || tab < 0 || tab >= s.tabs.length || s.active === tab) return layout
  const list = layout.zones[zone].map((x, i) => (i === stackIndex ? { ...x, active: tab } : x))
  return { ...layout, zones: { ...layout.zones, [zone]: list } }
}

export const clampWidth = (px: number): number => Math.round(Math.max(WIDTH_MIN, Math.min(WIDTH_MAX, px)))

export function setWidth(layout: Layout, side: Side, px: number): Layout {
  const w = clampWidth(px)
  return layout.widths[side] === w ? layout : { ...layout, widths: { ...layout.widths, [side]: w } }
}

export const cleanName = (name: string): string => name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)

export function activeLayout(state: Layouts, width: WidthClass): Layout {
  return state.list.find((l) => l.id === state.active[width]) ?? state.list.find((l) => l.id === DEFAULT_ACTIVE[width]) ?? builtIn(DEFAULT_ACTIVE[width])
}

export function replaceLayout(state: Layouts, layout: Layout): Layouts {
  return { ...state, list: state.list.map((l) => (l.id === layout.id ? layout : l)) }
}

// A copy of `from` under a new name becomes the layout of that width. Null without a name
// or with too many saved.
export function saveAs(state: Layouts, from: Layout, name: string, id: string, width: WidthClass): Layouts | null {
  const clean = cleanName(name)
  if (!clean || state.list.filter((l) => !isBuiltIn(l.id)).length >= CUSTOM_MAX) return null
  const copy: Layout = { id, name: clean, zones: copyZones(from), widths: { ...from.widths } }
  return { ...state, list: [...state.list, copy], active: { ...state.active, [width]: id } }
}

// Back to how it shipped; saved layouts have nothing to go back to.
export function resetLayout(state: Layouts, id: string): Layouts {
  return isBuiltIn(id) ? replaceLayout(state, builtIn(id)) : state
}

export function deleteLayout(state: Layouts, id: string): Layouts {
  if (isBuiltIn(id)) return state
  const active = { ...state.active }
  for (const w of WIDTHS) if (active[w] === id) active[w] = DEFAULT_ACTIVE[w]
  return { ...state, list: state.list.filter((l) => l.id !== id), active }
}

// --- Normalization of stored data ---

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// Unknown docks and repeated ones go; a stack left empty goes too.
export function normalizeLayout(raw: unknown, fallback: Layout): Layout {
  if (!isObj(raw) || !isObj(raw.zones)) return fallback
  const seen = new Set<DockId>()
  const zones = { left: [], right: [], strip: [] } as Record<ZoneId, Stack[]>
  for (const z of ZONES) {
    const list = (raw.zones as Record<string, unknown>)[z]
    if (!Array.isArray(list)) continue
    for (const s of list) {
      if (!isObj(s) || !Array.isArray(s.tabs)) continue
      const tabs = s.tabs.filter((d): d is DockId => isDock(d) && !seen.has(d) && (seen.add(d), true))
      if (!tabs.length) continue
      const active = typeof s.active === 'number' && Number.isInteger(s.active) ? Math.max(0, Math.min(tabs.length - 1, s.active)) : 0
      zones[z].push({ tabs, active })
    }
  }
  const w = isObj(raw.widths) ? raw.widths : {}
  const width = (side: Side) => (typeof w[side] === 'number' && Number.isFinite(w[side]) ? clampWidth(w[side] as number) : fallback.widths[side])
  return {
    id: fallback.id,
    name: isBuiltIn(fallback.id) ? '' : typeof raw.name === 'string' && cleanName(raw.name) ? cleanName(raw.name) : fallback.name,
    zones,
    widths: { left: width('left'), right: width('right') },
  }
}

export function normalizeLayouts(raw: unknown): Layouts {
  const d = defaultLayouts()
  if (!isObj(raw) || raw.version !== LAYOUTS_VERSION || !Array.isArray(raw.list)) return d
  const stored = raw.list.filter(isObj)
  const byId = (id: string) => stored.find((l) => l.id === id)
  // Every built-in layout is there, as stored when it was edited.
  const list: Layout[] = BUILT_IN.map((id) => normalizeLayout(byId(id), builtIn(id)))
  const ids = new Set<string>(BUILT_IN)
  for (const l of stored) {
    if (typeof l.id !== 'string' || !l.id || ids.has(l.id) || typeof l.name !== 'string' || !cleanName(l.name)) continue
    if (list.length - BUILT_IN.length >= CUSTOM_MAX) break
    ids.add(l.id)
    list.push(normalizeLayout(l, { id: l.id, name: cleanName(l.name), zones: { left: [], right: [], strip: [] }, widths: { left: 320, right: 360 } }))
  }
  const act = isObj(raw.active) ? raw.active : {}
  const active = { ...d.active }
  for (const w of WIDTHS) if (typeof act[w] === 'string' && ids.has(act[w] as string)) active[w] = act[w] as string
  return { version: LAYOUTS_VERSION, list, active, locked: raw.locked === true }
}
