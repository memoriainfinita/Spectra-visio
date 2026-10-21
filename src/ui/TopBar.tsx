import { Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { analysis, inputs } from '../app/engine'
import { deleteLayout, layoutsStore, resetLayout, saveLayoutAs, setEditing, setLocked, useLayout } from '../app/layout'
import { obsStore } from '../app/obs'
import { recordStore } from '../app/record'
import { isBuiltIn, type Layout, type WidthClass } from '../engine/layout/layout'
import { activeLayout } from '../engine/layout/layout'
import { PanelSlot } from './dock/panels'
import { Popover } from './dock/Popover'
import { SearchButton } from './Search'
import logo from './logo.svg'
import { MiniTransport } from './Transport'
import { useStore } from './useStore'
import { useT } from './useT'

type T = ReturnType<typeof useT>
export const layoutName = (t: T, l: Layout) => (isBuiltIn(l.id) ? t(`layout.${l.id}`) : l.name)

// Wide screens: what is always at hand, and the menus for the rest.
export function TopBar({ width, onSettings }: { width: WidthClass; onSettings: () => void }) {
  const t = useT()
  const kind = useStore(inputs.state, (s) => s.kind)
  const recording = useStore(recordStore, (s) => s.status === 'recording')
  const obs = useStore(obsStore, (s) => s.status)
  return (
    <header className="topbar bar">
      <div className="brand">
        <img src={logo} alt="" width={26} height={23} />
        <h1>{t('app.title')}</h1>
      </div>
      <MiniTransport />
      <Popover label={t('input.title')} button={t('bar.source', { name: t(`input.${kind}`) })} className="bar-source">
        <PanelSlot id="sources" />
      </Popover>
      <Tempo />
      <LayoutMenu width={width} />
      <div className="bar-end">
        <SearchButton />
        <Popover
          label={t('bar.output')}
          align="end"
          button={
            <>
              {t('bar.output')}
              {recording && <span className="rec-dot">{t('bar.rec')}</span>}
              {obs === 'on' && <span className="obs-dot">{t('bar.obs')}</span>}
            </>
          }
        >
          <PanelSlot id="output" />
        </Popover>
        <button className="btn" onClick={onSettings}>
          <SettingsIcon size={16} aria-hidden="true" />
          {t('bar.settings')}
        </button>
      </div>
    </header>
  )
}

function Tempo() {
  const t = useT()
  const bpm = useStore(analysis.tempo, (s) => s.bpm)
  return (
    <div className="bar-tempo">
      <span className="mono">{bpm === null ? t('analysis.bpmUnknown') : t('analysis.bpm', { n: bpm.toFixed(1) })}</span>
      {/* pointerdown: a click fires on release and would lag every tap. */}
      <button
        className="btn"
        title={t('analysis.tapHint')}
        onPointerDown={() => analysis.tap()}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          e.stopPropagation()
          if (!e.repeat) analysis.tap()
        }}
      >
        {t('analysis.tap')}
      </button>
    </div>
  )
}

function LayoutMenu({ width }: { width: WidthClass }) {
  const t = useT()
  const state = useStore(layoutsStore)
  const current = activeLayout(state, width)
  const [name, setName] = useState('')
  const [full, setFull] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const custom = !isBuiltIn(current.id)

  return (
    <Popover label={t('layout.menu')} button={t('layout.button', { name: layoutName(t, current) })} className="bar-layout">
      {(close) => (
        <div className="layout-menu">
          <div className="menu" role="group" aria-label={t('layout.list')}>
            {state.list.map((l) => (
              <button
                key={l.id}
                className={`menu-item${l.id === current.id ? ' on' : ''}`}
                aria-pressed={l.id === current.id}
                onClick={() => {
                  useLayout(l.id)
                  setConfirm(false)
                }}
              >
                {layoutName(t, l)}
              </button>
            ))}
          </div>
          <div className="menu sep">
            <button
              className="menu-item"
              disabled={state.locked}
              onClick={() => {
                setEditing(true)
                close()
              }}
            >
              {t('layout.edit')}
            </button>
            <label className="check menu-check">
              <input type="checkbox" checked={state.locked} onChange={(e) => setLocked(e.target.checked)} />
              <span>{t('layout.lock')}</span>
            </label>
            {!custom && (
              <button className="menu-item" disabled={state.locked} onClick={() => resetLayout()}>
                {t('layout.reset')}
              </button>
            )}
            {custom && !confirm && (
              <button className="menu-item" onClick={() => setConfirm(true)}>
                {t('layout.delete')}
              </button>
            )}
            {custom && confirm && (
              <div className="confirm">
                <span>{t('layout.deleteConfirm', { name: current.name })}</span>
                <button
                  className="btn danger"
                  onClick={() => {
                    deleteLayout()
                    setConfirm(false)
                  }}
                >
                  {t('layout.deleteYes')}
                </button>
                <button className="btn" onClick={() => setConfirm(false)}>
                  {t('settings.cancel')}
                </button>
              </div>
            )}
          </div>
          <form
            className="preset-form sep"
            onSubmit={(e) => {
              e.preventDefault()
              const ok = saveLayoutAs(name)
              setFull(!ok && name.trim() !== '')
              if (ok) setName('')
            }}
          >
            <input type="text" aria-label={t('layout.name')} placeholder={t('layout.name')} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            <button className="btn" type="submit" disabled={!name.trim()}>
              {t('layout.saveAs')}
            </button>
          </form>
          {full && <p className="error">{t('layout.full')}</p>}
        </div>
      )}
    </Popover>
  )
}
