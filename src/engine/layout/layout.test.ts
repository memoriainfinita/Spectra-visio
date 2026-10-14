import { describe, expect, test } from 'vitest'
import {
  BUILT_IN,
  CUSTOM_MAX,
  DOCKS,
  LAYOUTS_VERSION,
  WIDTH_MAX,
  WIDTH_MIN,
  activeLayout,
  addDock,
  builtIn,
  defaultLayouts,
  deleteLayout,
  docksOf,
  locate,
  moveDock,
  normalizeLayouts,
  removeDock,
  resetLayout,
  saveAs,
  selectTab,
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
    expect(l.zones.right[0].tabs).toEqual(['effects', 'overlays', 'live', 'auto'])
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
    expect(locate(l, 'perform')).toEqual({ zone: 'right', stack: 0, tab: 5 })
  })

  test('into an empty zone, and to the end of one', () => {
    const lap = builtIn('laptop')
    const l = moveDock(lap, 'effects', { zone: 'right', mode: 'end' })
    expect(l.zones.right).toEqual([{ tabs: ['effects'], active: 0 }])
    const m = moveDock(live(), 'layers', { zone: 'strip', mode: 'end' })
    expect(m.zones.strip.map((s) => s.tabs)).toEqual([['clips'], ['perform'], ['layers']])
  })

  test('onto its own stack it only shows; below itself only with tabs left behind', () => {
    const l = moveDock(live(), 'auto', { zone: 'right', stack: 0, mode: 'tab' })
    expect(l.zones.right).toEqual([{ tabs: ['effects', 'audio', 'overlays', 'live', 'auto'], active: 4 }])
    const alone = moveDock(live(), 'clips', { zone: 'strip', stack: 0, mode: 'below' })
    expect(alone.zones.strip).toEqual(live().zones.strip)
    const split = moveDock(live(), 'auto', { zone: 'right', stack: 0, mode: 'below' })
    expect(split.zones.right.map((s) => s.tabs)).toEqual([['effects', 'audio', 'overlays', 'live'], ['auto']])
  })

  test('the tab shown stays the same when one before it leaves', () => {
    let l = selectTab(live(), 'right', 0, 3)
    expect(l.zones.right[0].tabs[3]).toBe('live')
    l = moveDock(l, 'effects', { zone: 'left', stack: 0, mode: 'tab' })
    const r = l.zones.right[0]
    expect(r.tabs[r.active]).toBe('live')
  })

  test('a target that is not there changes nothing', () => {
    const l = live()
    expect(moveDock(l, 'audio', { zone: 'left', stack: 5, mode: 'tab' })).toBe(l)
  })

  test('removing and adding back', () => {
    let l = removeDock(live(), 'overlays')
    expect(locate(l, 'overlays')).toBeNull()
    l = addDock(l, 'overlays')
    expect(locate(l, 'overlays')?.zone).toBe('right')
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
    const s = { ...saveAs(d, moveDock(builtIn('live'), 'audio', { zone: 'strip', mode: 'end' }), 'Uno', 'u1', 'laptop')!, locked: true }
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
})
