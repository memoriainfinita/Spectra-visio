import { createStore } from '../core/store'

// Parts of the interface that others open: the settings window at a section, a shelf of
// the libraries, the search. The search uses them to take the user to a control.

// `section`: one to show when it opens, taken by the window and cleared.
export const settingsUi = createStore<{ open: boolean; section: string | null }>({ open: false, section: null })
export const openSettings = (section: string | null = null) => settingsUi.set({ open: true, section })
export const closeSettings = () => settingsUi.set((s) => (s.open ? { ...s, open: false } : s))

// A shelf of the libraries to show, taken by the dock and cleared.
export const shelfRequest = createStore<string | null>(null)

export const searchStore = createStore(false)
