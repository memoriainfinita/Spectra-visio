import { Ellipsis, Layers, LayoutGrid, Monitor, Music, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react'
import { closeSheet, MOBILE_TABS, mobileUi, openSheet, setMobileTab, SHEET_PANELS, TAB_PANELS, type MobileTab } from '../app/mobile'
import type { MessageKey } from '../i18n'
import { PanelSlot } from './dock/panels'
import { MiniTransport } from './Transport'
import { useStore } from './useStore'
import { useT } from './useT'

const TABS: Record<MobileTab, { label: MessageKey; Icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }> }> = {
  music: { label: 'mobile.music', Icon: Music },
  live: { label: 'mobile.live', Icon: LayoutGrid },
  mix: { label: 'mobile.mix', Icon: Layers },
  out: { label: 'mobile.out', Icon: Monitor },
  more: { label: 'mobile.more', Icon: Ellipsis },
}

const DRAG_CLOSE_PX = 60

// Under 800 px, below the stage: the player and the Inspector's button, the panels of the
// tab that is open, the five tabs along the bottom and the Inspector as a sheet over all
// that, from under the player down.
export function MobileShell() {
  const t = useT()
  const { tab, sheet } = useStore(mobileUi)
  const bar = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState(0)
  const drag = useRef<number | null>(null)

  // The sheet starts where the player ends. The player moves when the stage changes height
  // (width, full screen), so both are watched, and it is measured again on opening.
  useLayoutEffect(() => {
    const el = bar.current
    if (!el) return
    const measure = () => setTop(Math.round(el.getBoundingClientRect().bottom))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    if (el.previousElementSibling) observer.observe(el.previousElementSibling)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [sheet])

  useEffect(() => {
    if (!sheet) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSheet()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet])

  return (
    <>
      <div className="mobile-player" ref={bar}>
        <MiniTransport />
        <button className={`btn mobile-inspector${sheet ? ' on' : ''}`} aria-expanded={sheet} aria-controls="mobile-sheet" onClick={() => (sheet ? closeSheet() : openSheet())}>
          {t('dock.inspector')}
        </button>
      </div>

      <div className="mobile-body">
        {MOBILE_TABS.map((id) => (
          <section key={id} id={`mobile-tab-${id}`} className="mobile-tab" aria-label={t(TABS[id].label)} hidden={tab !== id}>
            {TAB_PANELS[id].map((p) => (
              <PanelSlot key={p} id={p} />
            ))}
          </section>
        ))}
      </div>

      <nav className="mobile-nav" aria-label={t('mobile.nav')}>
        {MOBILE_TABS.map((id) => {
          const { label, Icon } = TABS[id]
          return (
            <button key={id} className={`mobile-nav-btn${tab === id ? ' on' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => setMobileTab(id)}>
              <Icon size={22} aria-hidden />
              <span>{t(label)}</span>
            </button>
          )
        })}
      </nav>

      <div id="mobile-sheet" className="mobile-sheet" role="dialog" aria-label={t('dock.inspector')} hidden={!sheet} style={{ top }}>
        <div
          className="mobile-sheet-head"
          onPointerDown={(e) => {
            drag.current = e.clientY
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerUp={(e) => {
            if (drag.current !== null && e.clientY - drag.current > DRAG_CLOSE_PX) closeSheet()
            drag.current = null
          }}
          onPointerCancel={() => (drag.current = null)}
        >
          <span className="mobile-sheet-grip" aria-hidden="true" />
          <button className="icon-btn" aria-label={t('mobile.closeSheet')} onClick={closeSheet} onPointerDown={(e) => e.stopPropagation()}>
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="mobile-sheet-body">
          {SHEET_PANELS.map((p) => (
            <PanelSlot key={p} id={p} />
          ))}
        </div>
      </div>
    </>
  )
}
