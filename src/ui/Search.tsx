import { Search as SearchIcon } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { revealDock } from '../app/layout'
import { runAction } from '../app/live'
import { settingsStore } from '../app/settings'
import { openSettings, searchStore, shelfRequest } from '../app/ui'
import { DOCKS, type DockId } from '../engine/layout/layout'
import { ACTIONS } from '../engine/live/live'
import type { MessageKey } from '../i18n'
import { dockOfPanel } from './dock/DockBody'
import { panelNodes, type PanelId } from './dock/panels'
import { actionLabel } from './Live'
import { SECTIONS, SECTION_TITLE } from './Settings'
import { keyLabel } from './Shortcuts'
import { useStore } from './useStore'
import { useT } from './useT'

type T = ReturnType<typeof useT>

// Ctrl K: every action, dock, settings section and named control of the app, found by name
// or by where it is. Enter runs an action, or takes the user to the control and marks it.

interface Result {
  name: string
  where: string
  key?: string
  run: () => void
}

const MAX_RESULTS = 50
const FLASH_MS = 1600
const CONTROLS = 'button, input:not([type=hidden]), select, textarea, [role=slider], [role=tab]'

// Lower case and without accents, so "estrobo" finds "Estrobo" and "camara" "Cámara".
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function accessibleName(el: HTMLElement): string {
  const label = el.getAttribute('aria-label') || (el as HTMLInputElement).labels?.[0]?.textContent || el.getAttribute('title') || el.textContent || ''
  return label.replace(/\s+/g, ' ').trim()
}

// Takes the user to a control: shows its dock, shelf, settings section or menu, then
// focuses it and marks it for a moment.
function goTo(el: HTMLElement, panel: PanelId | null, section: string | null): void {
  if (section) openSettings(section)
  else if (panel) {
    const dock = dockOfPanel(panel)
    if (dock) revealDock(dock)
    if (dock === 'library') shelfRequest.set(panel)
    // The top bar's menus hold the sources and the output.
    if (panel === 'sources' || panel === 'output') {
      const pop = document.querySelector<HTMLElement>(panel === 'sources' ? '.bar-source .pop-button' : '.bar-end .pop .pop-button')
      if (pop?.getAttribute('aria-expanded') === 'false') pop.click()
    }
  }
  // Twice: React shows the tab, then the layout settles.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      el.focus({ preventScroll: true })
      el.classList.add('search-flash')
      setTimeout(() => el.classList.remove('search-flash'), FLASH_MS)
    }),
  )
}

// Where a panel's controls are, in words.
function placeOf(panel: PanelId | null, t: T): string {
  const dock = panel && dockOfPanel(panel)
  if (dock) return t(`dock.${dock}` as MessageKey)
  if (panel === 'settings' || panel === 'midi') return t('bar.settings')
  if (panel === 'sources') return t('input.title')
  if (panel === 'output') return t('bar.output')
  return t('search.bar')
}

function buildIndex(t: T): Result[] {
  const keys = settingsStore.get().live.keys
  const out: Result[] = []
  for (const id of ACTIONS) out.push({ name: actionLabel(id, t), where: t('search.action'), key: keys[id] ? keyLabel(keys[id], t) : undefined, run: () => runAction(id) })
  for (const d of DOCKS) out.push({ name: t(`dock.${d}` as MessageKey), where: t('search.dock'), run: () => revealDock(d as DockId) })
  for (const s of SECTIONS) out.push({ name: t(SECTION_TITLE[s]), where: t('bar.settings'), run: () => openSettings(s) })

  // Controls: in every panel on the page, shown or not, and in the settings window, closed
  // or not. A panel not on the page (the narrow layout's settings, on a wide screen) is left.
  const seen = new Set(out.map((r) => `${r.name}|${r.where}`))
  // `skip`: parts of `root` scanned on their own.
  const scan = (root: ParentNode, panel: PanelId | null, skip?: string) => {
    for (const el of root.querySelectorAll<HTMLElement>(CONTROLS)) {
      if (el.closest('.search-dialog, .knob-menu') || (skip && el.closest(skip)) || (el as HTMLButtonElement).disabled) continue
      const name = accessibleName(el)
      if (name.length < 2 || name.length > 80 || /^[\d\s·+−-]+$/.test(name)) continue
      const sectionEl = el.closest<HTMLElement>('[id^=settingspanel-]')
      const section = sectionEl ? sectionEl.id.slice('settingspanel-'.length) : null
      const where = section ? `${t('bar.settings')} › ${t(SECTION_TITLE[section as (typeof SECTIONS)[number]] ?? 'bar.settings')}` : placeOf(panel, t)
      const k = `${name}|${where}`
      if (seen.has(k)) continue
      seen.add(k)
      out.push({ name, where, run: () => goTo(el, panel, section) })
    }
  }
  const settings = document.getElementById('settings-body')
  for (const [id, node] of panelNodes()) {
    // The settings window has its own pass, by section.
    if (!node.isConnected || settings?.contains(node)) continue
    scan(node, id)
  }
  if (settings) scan(settings, null)
  const bar = document.querySelector('.topbar')
  // The top bar's menus hold panels, already scanned.
  if (bar) scan(bar, null, '.pop-body')
  return out
}

// Every word in the name or the place; the name first, then where it starts with them.
function match(index: Result[], query: string): Result[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const scored: [number, Result][] = []
  for (const r of index) {
    const name = fold(r.name)
    const all = `${name} ${fold(r.where)}`
    if (!words.every((w) => all.includes(w))) continue
    const score = name.startsWith(words[0]) ? 0 : words.every((w) => name.includes(w)) ? 1 : 2
    scored.push([score, r])
  }
  return scored
    .sort((a, b) => a[0] - b[0])
    .slice(0, MAX_RESULTS)
    .map(([, r]) => r)
}

// The button in the top bar that opens the search.
export function SearchButton() {
  const t = useT()
  return (
    <button className="btn search-button" aria-keyshortcuts="Control+K" onClick={() => searchStore.set(true)}>
      <SearchIcon size={15} aria-hidden="true" />
      <span>{t('search.button')}</span>
      <kbd>Ctrl K</kbd>
    </button>
  )
}

export function SearchDialog() {
  const t = useT()
  const open = useStore(searchStore)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const back = useRef<HTMLElement | null>(null)
  const listId = useId()
  // Built when it opens, so it finds what is on screen then.
  const index = useMemo(() => (open ? buildIndex(t) : []), [open, t])
  const results = useMemo(() => match(index, query), [index, query])

  useEffect(() => {
    if (!open) return
    back.current = document.activeElement as HTMLElement | null
    setQuery('')
    setActive(0)
    input.current?.focus()
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.('.search-dialog')) close(true)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const close = (refocus: boolean) => {
    searchStore.set(false)
    if (refocus) back.current?.focus()
  }
  const choose = (r: Result | undefined) => {
    if (!r) return
    close(false)
    r.run()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close(true)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (results.length) setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[active])
    }
  }

  if (!open) return null
  const option = (i: number) => `${listId}-${i}`
  return (
    <div className="search-dialog" role="dialog" aria-modal="true" aria-label={t('search.title')}>
      <label className="search-field">
        <SearchIcon size={16} aria-hidden="true" />
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label={t('search.input')}
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-activedescendant={results.length ? option(active) : undefined}
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKey}
        />
      </label>
      <ul id={listId} role="listbox" aria-label={t('search.results')} className="search-results">
        {results.map((r, i) => (
          <li key={`${r.name}|${r.where}|${i}`} id={option(i)} role="option" aria-selected={i === active} className={i === active ? 'on' : undefined} onPointerMove={() => setActive(i)} onClick={() => choose(r)}>
            <span className="search-name">{r.name}</span>
            <span className="search-where">{r.where}</span>
            {r.key && <kbd>{r.key}</kbd>}
          </li>
        ))}
      </ul>
      {query && !results.length && <p className="search-none">{t('search.none')}</p>}
    </div>
  )
}
