import { createStore } from '../core/store'
import type { PanelId } from '../ui/dock/panels'

// The narrow layout (under 800 px): five tabs along the bottom and the Inspector as a sheet
// over them, with the stage and the player always in view. Every panel is in exactly one
// of them; the panels of a tab that is not shown stay mounted, hidden, so what is half
// typed or scrolled in them is kept and the search can still find their controls.

export const MOBILE_TABS = ['music', 'live', 'mix', 'out', 'more'] as const
export type MobileTab = (typeof MOBILE_TABS)[number]

export const TAB_PANELS: Record<MobileTab, PanelId[]> = {
  music: ['player', 'sources', 'queue', 'analysis'],
  live: ['clips', 'perform', 'knobs', 'mypanel'],
  mix: ['visuals', 'browser', 'modulators', 'presets'],
  out: ['output', 'midi'],
  more: ['shaders', 'settings'],
}

export const SHEET_PANELS: PanelId[] = ['inspector']
// Panels that sit inside another one.
const INSIDE: Partial<Record<PanelId, PanelId>> = { overlays: 'inspector', auto: 'inspector' }

export const mobileUi = createStore<{ tab: MobileTab; sheet: boolean }>({ tab: 'music', sheet: false })

export const setMobileTab = (tab: MobileTab) => mobileUi.set((s) => (s.tab === tab && !s.sheet ? s : { tab, sheet: false }))
export const openSheet = () => mobileUi.set((s) => (s.sheet ? s : { ...s, sheet: true }))
export const closeSheet = () => mobileUi.set((s) => (s.sheet ? { ...s, sheet: false } : s))

// Set by the app on every render: whether the narrow layout is the one on screen.
let active = false
export function setMobile(on: boolean): void {
  active = on
}

// Brings the panel into view: the Inspector's sheet, or the tab that holds the panel. Does
// nothing on wider screens, where the docks do this.
export function revealOnMobile(panel: PanelId): void {
  if (!active) return
  panel = INSIDE[panel] ?? panel
  if (SHEET_PANELS.includes(panel)) {
    openSheet()
    return
  }
  const tab = MOBILE_TABS.find((id) => TAB_PANELS[id].includes(panel))
  if (tab) setMobileTab(tab)
}
