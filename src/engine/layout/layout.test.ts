import { describe, expect, test } from 'vitest'
import {
  BUILT_IN,
  CUSTOM_MAX,
  DOCKS,
  LAYOUTS_VERSION,
  SIZE_MAX,
  STRIP_MIN,
  WIDTH_MAX,
  WIDTH_MIN,
  activeLayout,
  addDock,
  builtIn,
  defaultLayouts,
  defaultWidths,
  deleteLayout,
  docksOf,
  locate,
  moveDock,
  normalizeLayouts,
  removeDock,
  resetLayout,
  saveAs,
  selectTab,
  setStackSizes,
  setZoneSizes,
  setStripHeight,
  setWidth,
  type Layout,
} from './layout'

const live = () => builtIn('live')

describe('built-in layouts', () => {
  test('each one holds every dock once', () => {
    for (const id of BUILT_IN) {
      const docks = docksOf(builtIn(id))
      expect(new Set(docks).size).toBe(docks.length)
      expect([...docks].sort()).toEqual([...DOCKS].sort())
    }
  })

  test('the defaults: Live on desktops, Laptop on laptops', () => {
    const d = defaultLayouts()
    expect(activeLayout(d, 'desktop').id).toBe('live')
    expect(activeLayout(d, 'laptop').id).toBe('laptop')
    expect(activeLayout(d, 'laptop').zones.right).toEqual([])
  })
})

describe('moving docks', () => {
  test('as a tab of another stack, shown there; the stack it left keeps its tab', () => {
    const l = moveDock(live(), 'audio', { zone: 'left', stack: 0, mode: 'tab' })
    expect(l.zones.left[0]).toEqual({ tabs: ['layers', 'library', 'audio'], active: 2 })
    expect(l.zones.right[0].tabs).toEqual(['inspector', 'live'])
    expect(l.zones.right[0].active).toBe(0)
  })

  test('below a stack, splitting the zone', () => {
    const l = moveDock(live(), 'library', { zone: 'left', stack: 0, mode: 'below' })
    expect(l.zones.left).toEqual([
      { tabs: ['layers'], active: 0 },
      { tabs: ['library'], active: 0 },
    ])
  })

  test('the last tab of a stack takes the stack with it', () => {
    const l = moveDock(live(), 'perform', { zone: 'right', stack: 0, mode: 'tab' })
    expect(l.zones.strip).toEqual([{ tabs: ['clips'], active: 0 }])
    expect(locate(l, 'perform')).toEqual({ zone: 'right', stack: 0, tab: 3 })
  })

  test('into an empty zone, and to the end of one', () => {
    const lap = builtIn('laptop')
    const l = moveDock(lap, 'inspector', { zone: 'right', mode: 'end' })
    expect(l.zones.right).toEqual([{ tabs: ['inspector'], active: 0 }])
    const m = moveDock(live(), 'layers', { zone: 'strip', mode: 'end' })
    expect(m.zones.strip.map((s) => s.tabs)).toEqual([['clips'], ['perform'], ['layers']])
  })

  test('onto its own stack it only shows; below itself only with tabs left behind', () => {
    const l = moveDock(live(), 'live', { zone: 'right', stack: 0, mode: 'tab' })
    expect(l.zones.right).toEqual([{ tabs: ['inspector', 'audio', 'live'], active: 2 }])
    const alone = moveDock(live(), 'clips', { zone: 'strip', stack: 0, mode: 'below' })
    expect(alone.zones.strip).toEqual(live().zones.strip)
    const split = moveDock(live(), 'live', { zone: 'right', stack: 0, mode: 'below' })
    expect(split.zones.right.map((s) => s.tabs)).toEqual([['inspector', 'audio'], ['live']])
  })

  test('the tab shown stays the same when one before it leaves', () => {
    let l = selectTab(live(), 'right', 0, 2)
    expect(l.zones.right[0].tabs[2]).toBe('live')
    l = moveDock(l, 'inspector', { zone: 'left', stack: 0, mode: 'tab' })
    const r = l.zones.right[0]
    expect(r.tabs[r.active]).toBe('live')
  })

  test('a target that is not there changes nothing', () => {
    const l = live()
    expect(moveDock(l, 'audio', { zone: 'left', stack: 5, mode: 'tab' })).toBe(l)
  })

  test('removing and adding back', () => {
    let l = removeDock(live(), 'live')
    expect(locate(l, 'live')).toBeNull()
    l = addDock(l, 'live')
    expect(locate(l, 'live')?.zone).toBe('right')
    const empty: Layout = { ...live(), zones: { left: [], right: [], strip: [] } }
    expect(addDock(empty, 'clips').zones.right).toEqual([{ tabs: ['clips'], active: 0 }])
  })
})

describe('widths', () => {
  test('clamped and rounded', () => {
    expect(setWidth(live(), 'left', 10).widths.left).toBe(WIDTH_MIN)
    expect(setWidth(live(), 'right', 5000).widths.right).toBe(WIDTH_MAX)
    expect(setWidth(live(), 'left', 300.6).widths.left).toBe(301)
  })
})

describe('heights', () => {
  test('two neighbouring stacks share the height; null puts one back to the default', () => {
    const p = builtIn('prepare')
    let l = setStackSizes(p, 'right', 0, 1.5, 0.5)
    expect(l.zones.right.map((s) => s.size)).toEqual([1.5, 0.5])
    l = setStackSizes(l, 'right', 0, null, 99)
    expect(l.zones.right[0]).toEqual({ tabs: ['inspector'], active: 0 })
    expect(l.zones.right[1].size).toBe(SIZE_MAX)
    expect(setStackSizes(p, 'right', 1, 1, 1)).toBe(p)
  })

  test('every share of a zone at once, only with one per stack', () => {
    const l = setZoneSizes(builtIn('live'), 'strip', [1.4, null])
    expect(l.zones.strip).toEqual([
      { tabs: ['clips'], active: 0, size: 1.4 },
      { tabs: ['perform'], active: 0 },
    ])
    const live = builtIn('live')
    expect(setZoneSizes(live, 'strip', [1])).toBe(live)
  })

  test('a stack keeps its share when a dock moves into it', () => {
    const l = moveDock(setStackSizes(builtIn('prepare'), 'right', 0, 2, 0.5), 'clips', { zone: 'right', stack: 1, mode: 'tab' })
    expect(l.zones.right[1].size).toBe(0.5)
  })

  test('the strip: a height in pixels, clamped, or fitting its content', () => {
    expect(builtIn('live').strip).toBeNull()
    expect(setStripHeight(builtIn('live'), 10).strip).toBe(STRIP_MIN)
    expect(setStripHeight(builtIn('live'), 300.4).strip).toBe(300)
    expect(setStripHeight(setStripHeight(builtIn('live'), 300), null).strip).toBeNull()
  })

  test('default widths come from the factory', () => {
    expect(defaultWidths('prepare')).toEqual(builtIn('prepare').widths)
    expect(defaultWidths('u1')).toEqual({ left: 320, right: 360 })
  })
})

describe('saved layouts', () => {
  test('save as a copy that becomes the active one, then delete it', () => {
    const d = defaultLayouts()
    const s = saveAs(d, activeLayout(d, 'desktop'), '  Mi  sesión ', 'u1', 'desktop')!
    expect(s.list.at(-1)?.name).toBe('Mi sesión')
    expect(s.active.desktop).toBe('u1')
    expect(saveAs(d, activeLayout(d, 'desktop'), '   ', 'u2', 'desktop')).toBeNull()
    const gone = deleteLayout(s, 'u1')
    expect(gone.list.find((l) => l.id === 'u1')).toBeUndefined()
    expect(gone.active.desktop).toBe('live')
    expect(deleteLayout(s, 'live')).toBe(s)
  })

  test('a limit on saved layouts', () => {
    let s = defaultLayouts()
    for (let i = 0; i < CUSTOM_MAX; i++) s = saveAs(s, builtIn('live'), `n${i}`, `u${i}`, 'desktop')!
    expect(saveAs(s, builtIn('live'), 'one more', 'ux', 'desktop')).toBeNull()
  })

  test('reset brings a built-in layout back', () => {
    const d = defaultLayouts()
    const edited = { ...d, list: d.list.map((l) => (l.id === 'live' ? removeDock(l, 'clips') : l)) }
    expect(locate(activeLayout(edited, 'desktop'), 'clips')).toBeNull()
    expect(activeLayout(resetLayout(edited, 'live'), 'desktop')).toEqual(builtIn('live'))
  })
})

describe('normalization', () => {
  test('nothing usable gives the defaults', () => {
    expect(normalizeLayouts(null)).toEqual(defaultLayouts())
    expect(normalizeLayouts({ version: 99, list: [] })).toEqual(defaultLayouts())
  })

  test('round trip', () => {
    const d = defaultLayouts()
    const edited = setStripHeight(setStackSizes(moveDock(builtIn('live'), 'audio', { zone: 'strip', mode: 'end' }), 'strip', 0, 0.75, 1.25), 240)
    const s = { ...saveAs(d, edited, 'Uno', 'u1', 'laptop')!, locked: true }
    expect(normalizeLayouts(JSON.parse(JSON.stringify(s)))).toEqual(s)
  })

  test('unknown or repeated docks, empty stacks and bad values are dropped', () => {
    const raw = {
      version: LAYOUTS_VERSION,
      list: [
        { id: 'live', zones: { left: [{ tabs: ['layers', 'nope', 'layers'], active: 9 }, { tabs: [] }], right: 'x', strip: [{ tabs: ['clips'] }] }, widths: { left: 'wide', right: 9000 } },
        { id: 'u1', name: '', zones: {} },
        { id: 'u2', name: 'Dos', zones: { left: [{ tabs: ['audio'] }] } },
        { id: 'u2', name: 'Repetido', zones: {} },
      ],
      active: { desktop: 'u1', laptop: 'u2' },
      locked: 'yes',
    }
    const s = normalizeLayouts(raw)
    const l = s.list[0]
    expect(l.zones).toEqual({ left: [{ tabs: ['layers'], active: 0 }], right: [], strip: [{ tabs: ['clips'], active: 0 }] })
    expect(l.widths).toEqual({ left: builtIn('live').widths.left, right: WIDTH_MAX })
    expect(s.list.map((x) => x.id)).toEqual([...BUILT_IN, 'u2'])
    expect(s.active).toEqual({ desktop: 'live', laptop: 'u2' })
    expect(s.locked).toBe(false)
  })

  test('version 1: the Inspector takes the place of Effects, Overlays and Auto go', () => {
    const raw = {
      version: 1,
      list: [
        { id: 'live', zones: { left: [{ tabs: ['layers', 'library'], active: 1 }], right: [{ tabs: ['effects', 'audio', 'overlays', 'live', 'auto'], active: 3 }], strip: [{ tabs: ['clips'], active: 0 }] }, widths: { left: 300, right: 400 } },
        { id: 'u1', name: 'Mío', zones: { left: [{ tabs: ['auto', 'overlays'], active: 1 }, { tabs: ['audio', 'effects'], active: 1 }], right: [], strip: [] } },
      ],
      active: { desktop: 'u1', laptop: 'laptop' },
      locked: true,
    }
    const s = normalizeLayouts(raw)
    expect(s.version).toBe(LAYOUTS_VERSION)
    expect(s.list[0].zones.right).toEqual([{ tabs: ['inspector', 'audio', 'live'], active: 2 }])
    expect(s.list[0].zones.left).toEqual([{ tabs: ['layers', 'library'], active: 1 }])
    expect(s.list[0].widths).toEqual({ left: 300, right: 400 })
    const mine = s.list.find((l) => l.id === 'u1')!
    expect(mine.zones.left).toEqual([{ tabs: ['audio', 'inspector'], active: 1 }])
    expect(s.active.desktop).toBe('u1')
    expect(s.locked).toBe(true)
  })
})
