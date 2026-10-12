import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { setKeepFiles } from './app/engine'
import { settingsStore } from './app/settings'
import { LANGS, isLang } from './i18n'
import { AnalysisPanel } from './ui/Analysis'
import { Auto } from './ui/Auto'
import { Browser } from './ui/Browser'
import { Clips } from './ui/Clips'
import { Live } from './ui/Live'
import { Midi } from './ui/Midi'
import { Output } from './ui/Output'
import { opfsSupported } from './storage/opfs'
import { useFileDrop, usePlayerShortcuts } from './ui/hooks'
import { Queue } from './ui/Queue'
import { Sources } from './ui/Sources'
import { Stage } from './ui/Stage'
import { Visuals } from './ui/Visuals'
import { Effects } from './ui/Effects'
import { FlashNotice } from './ui/FlashNotice'
import { PerformBar } from './ui/PerformBar'
import { Presets } from './ui/Presets'
import { Overlays } from './ui/Overlays'
import { Shaders } from './ui/Shaders'
import { VisualInput } from './ui/VisualInput'
import { MiniTransport, NowPlaying, Transport } from './ui/Transport'
import { UpdateBanner } from './ui/UpdateBanner'
import { useStore } from './ui/useStore'
import { useT } from './ui/useT'

const PHASE = 10
const TOTAL_PHASES = 10

// Wide screens get the stage with the side tabs; narrow ones one column of panels.
const WIDE = '(min-width: 801px)'
const TABS = ['audio', 'visual', 'effects', 'live', 'output'] as const
type Tab = (typeof TABS)[number]
const TAB_KEY = 'spectra.tab'

function useWide(): boolean {
  const [wide, setWide] = useState(() => typeof matchMedia === 'function' && matchMedia(WIDE).matches)
  useEffect(() => {
    const mq = matchMedia(WIDE)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

function savedTab(): Tab {
  try {
    const v = localStorage.getItem(TAB_KEY)
    return TABS.find((t) => t === v) ?? 'visual'
  } catch {
    return 'visual'
  }
}

function Settings() {
  const t = useT()
  const keepFiles = useStore(settingsStore, (s) => s.keepFiles)
  if (!opfsSupported) return null
  return (
    <section className="panel settings">
      <label className="check">
        <input type="checkbox" checked={keepFiles} onChange={(e) => void setKeepFiles(e.target.checked)} />
        <span>{t('settings.keepFiles')}</span>
      </label>
      <p className="muted small">{t('settings.keepFilesHint')}</p>
    </section>
  )
}

const player = (
  <section className="panel player">
    <NowPlaying />
    <Transport />
  </section>
)

// The panels of each tab. Hidden tabs stay mounted, so nothing half-typed is lost.
const GROUPS: Record<Tab, ReactNode> = {
  audio: (
    <>
      <Sources />
      {player}
      <Queue />
      <AnalysisPanel />
    </>
  ),
  visual: (
    <>
      <Visuals />
      <Browser />
      <Presets />
      <Shaders />
      <VisualInput />
      <Overlays />
    </>
  ),
  effects: <Effects />,
  live: (
    <>
      <Live />
      <Clips />
      <Auto />
      <Midi />
    </>
  ),
  output: (
    <>
      <Output />
      <Settings />
    </>
  ),
}

function SideTabs() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(savedTab)
  const refs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({})
  const pick = (next: Tab, focus = false) => {
    setTab(next)
    try {
      localStorage.setItem(TAB_KEY, next)
    } catch {
      // Only a convenience: the first tab opens next time.
    }
    if (focus) refs.current[next]?.focus()
  }
  // Arrow keys move between tabs, as in any tab list.
  const onKey = (e: KeyboardEvent) => {
    const i = TABS.indexOf(tab)
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : null
    if (to === null) return
    e.preventDefault()
    pick(TABS[(to + TABS.length) % TABS.length], true)
  }
  return (
    <aside className="side">
      <div className="side-tabs" role="tablist" aria-label={t('tabs.label')} onKeyDown={onKey}>
        {TABS.map((id) => (
          <button
            key={id}
            ref={(el) => {
              refs.current[id] = el
            }}
            id={`tab-${id}`}
            role="tab"
            className={`side-tab${tab === id ? ' on' : ''}`}
            aria-selected={tab === id}
            aria-controls={`tabpanel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => pick(id)}
          >
            {t(`tabs.${id}`)}
          </button>
        ))}
      </div>
      {TABS.map((id) => (
        <div key={id} id={`tabpanel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} className="side-body" hidden={tab !== id}>
          {GROUPS[id]}
        </div>
      ))}
    </aside>
  )
}

export function App() {
  const t = useT()
  const lang = useStore(settingsStore, (s) => s.lang)
  const dropping = useFileDrop()
  const wide = useWide()
  usePlayerShortcuts()

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <div className={`app${wide ? ' wide' : ''}`}>
      <header className="topbar">
        <div>
          <h1>{t('app.title')}</h1>
          <p className="muted small">{t('app.rebuilding', { phase: PHASE, total: TOTAL_PHASES })}</p>
        </div>
        {wide && <MiniTransport />}
        <label className="field">
          <span>{t('settings.language')}</span>
          <select
            value={lang}
            onChange={(e) => {
              const next = e.target.value
              if (isLang(next)) settingsStore.set((s) => ({ ...s, lang: next }))
            }}
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {t(`lang.${l}`)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <UpdateBanner />

      {/* The stage keeps its place in the tree in both layouts: going fullscreen resizes
          the window across the breakpoint, and a remounted stage would leave fullscreen. */}
      <main className={wide ? 'layout-wide' : 'layout'}>
        <div className="main-col">
          <Stage />
          {wide && <PerformBar />}
        </div>
        {wide ? (
          <SideTabs />
        ) : (
          <>
            {player}
            <Queue />
            <Browser />
            <Clips />
            <Live />
            <Midi />
            <Output />
            <Visuals />
            <Auto />
            <Effects />
            <Presets />
            <Shaders />
            <VisualInput />
            <Overlays />
            <Sources />
            <AnalysisPanel />
            <Settings />
          </>
        )}
      </main>

      <FlashNotice />

      {dropping && (
        <div className="drop-overlay" aria-hidden="true">
          {t('drop.hint')}
        </div>
      )}
    </div>
  )
}
