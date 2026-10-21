import { useEffect, useState } from 'react'
import { dockUi, layoutsStore, resetLayout, setWidthClass } from './app/layout'
import { settingsStore } from './app/settings'
import { closeSettings, openSettings, settingsUi } from './app/ui'
import { activeLayout, isBuiltIn, type WidthClass } from './engine/layout/layout'
import { DockWindows } from './ui/dock/DockWindows'
import { EditBar, Splitter, StripSplitter, Zone, zoneGrid } from './ui/dock/Docks'
import { PanelPortals, PanelSlot, type PanelId } from './ui/dock/panels'
import { SettingsWindow } from './ui/dock/SettingsWindow'
import { FlashNotice } from './ui/FlashNotice'
import { ClipMenu } from './ui/ClipMenu'
import { KnobMenu } from './ui/KnobMenu'
import { Notices } from './ui/Notices'
import { SearchDialog } from './ui/Search'
import { useFileDrop, usePlayerShortcuts } from './ui/hooks'
import { Stage } from './ui/Stage'
import { layoutName, TopBar } from './ui/TopBar'
import { UpdateBanner } from './ui/UpdateBanner'
import { useStore } from './ui/useStore'
import { useT } from './ui/useT'

// Under 800 px one column of panels; from 800 the docks, with a layout of their own for
// laptops (up to 1279 px) and for desktops.
const WIDE = '(min-width: 800px)'
const DESKTOP = '(min-width: 1280px)'
type Width = 'narrow' | WidthClass

function measure(): Width {
  if (typeof matchMedia !== 'function' || !matchMedia(WIDE).matches) return 'narrow'
  return matchMedia(DESKTOP).matches ? 'desktop' : 'laptop'
}

function useWidth(): Width {
  const [width, setWidth] = useState(measure)
  useEffect(() => {
    const queries = [matchMedia(WIDE), matchMedia(DESKTOP)]
    const on = () => setWidth(measure())
    for (const q of queries) q.addEventListener('change', on)
    return () => {
      for (const q of queries) q.removeEventListener('change', on)
    }
  }, [])
  return width
}

// The narrow column, in the order the panels were always shown.
const COLUMN: PanelId[] = ['player', 'queue', 'browser', 'clips', 'mypanel', 'knobs', 'modulators', 'live', 'midi', 'output', 'visuals', 'inspector', 'presets', 'shaders', 'vinput', 'sources', 'analysis', 'settings']

export function App() {
  const t = useT()
  const lang = useStore(settingsStore, (s) => s.lang)
  const dropping = useFileDrop()
  const width = useWidth()
  const wide = width !== 'narrow'
  const layouts = useStore(layoutsStore)
  const editing = useStore(dockUi, (u) => u.editing)
  const layout = activeLayout(layouts, wide ? width : 'desktop')
  const settings = useStore(settingsUi, (s) => s.open)
  // A side zone's width while its edge is dragged; stored when released.
  const [live, setLive] = useState<{ left: number | null; right: number | null }>({ left: null, right: null })
  usePlayerShortcuts()
  setWidthClass(wide ? width : null)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const widths = { left: live.left ?? layout.widths.left, right: live.right ?? layout.widths.right }
  const sides = (['left', 'right'] as const).filter((s) => layout.zones[s].length > 0 && !layouts.locked)

  return (
    <div className={`app${wide ? ' wide' : ''}`}>
      <PanelPortals />
      {wide ? (
        <>
          <TopBar width={width} onSettings={() => openSettings()} />
          {editing && <EditBar layout={layout} name={layoutName(t, layout)} canReset={isBuiltIn(layout.id)} onReset={resetLayout} />}
        </>
      ) : (
        <header className="topbar">
          <div>
            <h1>{t('app.title')}</h1>
            <p className="muted small">{t('app.tagline')}</p>
          </div>
        </header>
      )}

      <UpdateBanner />

      {/* The stage keeps its place in the tree in every layout: going fullscreen resizes
          the window across the breakpoint, and a remounted stage would leave fullscreen. */}
      <main className={wide ? 'layout-docks' : 'layout'} style={wide ? zoneGrid(layout, editing, widths) : undefined}>
        <div className="main-col">
          <Stage />
          {wide && layout.zones.strip.length > 0 && !layouts.locked && <StripSplitter height={layout.strip} />}
          {wide && <Zone zone="strip" layout={layout} locked={layouts.locked} />}
        </div>
        {wide ? (
          <>
            <Zone zone="left" layout={layout} locked={layouts.locked} />
            <Zone zone="right" layout={layout} locked={layouts.locked} />
            {sides.map((s) => (
              <Splitter key={s} side={s} width={widths[s]} onLive={(px) => setLive((w) => ({ ...w, [s]: px }))} />
            ))}
          </>
        ) : (
          COLUMN.map((id) => <PanelSlot key={id} id={id} />)
        )}
      </main>

      {wide && <SettingsWindow open={settings} onClose={closeSettings} />}
      {wide && <DockWindows />}
      <FlashNotice />
      <KnobMenu />
      <ClipMenu />
      <Notices />
      <SearchDialog />

      {dropping && (
        <div className="drop-overlay" aria-hidden="true">
          {t('drop.hint')}
        </div>
      )}
    </div>
  )
}
