import { useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { mapTarget } from '../app/midi'
import { clearClip, clipboardStore, copyClip, launchClip, launchColumn, pasteClip, renameClip, renameColumn, saveClip, sceneStore } from '../app/scene'
import { settingsStore } from '../app/settings'
import { createStore } from '../core/store'
import type { MidiTarget } from '../engine/midi/midi'
import { getVisual } from '../engine/render/registry'
import { nameOf } from '../engine/render/visual'
import { CLIP_NAME_MAX, type Clip } from '../engine/scene/scene'
import { menuHandlers, useMenuBox, type MenuPlace } from './contextMenu'
import { MidiLearn } from './Midi'
import { useStore } from './useStore'
import { useT } from './useT'

// Right click, long press or the menu key on a clip cell or a column header: what can be
// done with it. Renaming turns the menu into a text field.

type T = ReturnType<typeof useT>

// The name given in the menu, or the visualization's.
export function clipName(clip: Clip, t: T): string {
  if (clip.name) return clip.name
  const v = getVisual(clip.visual)
  return v ? nameOf(v, t) : clip.visual
}

export function columnLabel(names: readonly string[], c: number, t: T): string {
  return names[c] ? t('clips.columnNamed', { n: c + 1, name: names[c] }) : t('clips.column', { n: c + 1 })
}

type What = { kind: 'clip'; layer: string; column: number } | { kind: 'column'; column: number }

interface MenuState extends MenuPlace {
  what: What
}

const menuStore = createStore<MenuState | null>(null)

// Handlers for a cell or a header, as `knobMenu` does for parameters.
export const clipMenu = (what: What) => menuHandlers(menuStore, { what })

export function ClipMenu() {
  const t = useT()
  const menu = useStore(menuStore)
  const scene = useStore(sceneStore)
  const copied = useStore(clipboardStore)
  const map = useStore(settingsStore, (s) => s.midi.map)
  const box = useRef<HTMLDivElement>(null)
  const [renaming, setRenaming] = useState<string | null>(null)

  const close = (refocus = true) => {
    const from = menuStore.get()?.from
    menuStore.set(null)
    setRenaming(null)
    if (refocus) from?.focus()
  }

  const pos = useMenuBox(menu, box, close, renaming !== null)

  if (!menu) return null
  const { what } = menu
  const i = what.kind === 'clip' ? scene.layers.findIndex((l) => l.id === what.layer) : -1
  const clip = what.kind === 'clip' ? (scene.layers[i]?.clips[what.column] ?? null) : null
  // The layer went while the menu was open.
  if (what.kind === 'clip' && i < 0) return null
  const c = what.column
  const title = what.kind === 'clip' ? (clip ? clipName(clip, t) : t('clips.emptyCell', { n: i + 1, c: c + 1 })) : columnLabel(scene.columns, c, t)
  const target = `column${c + 1}` as MidiTarget

  const run = (fn: () => void) => () => {
    fn()
    close()
  }
  const startRename = () => setRenaming(what.kind === 'clip' ? (clip?.name ?? '') : scene.columns[c])
  const commit = () => {
    if (renaming === null) return
    if (what.kind === 'clip') renameClip(i, c, renaming)
    else renameColumn(c, renaming)
    close()
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || (e.key === 'Tab' && renaming === null)) {
      e.preventDefault()
      close()
      return
    }
    if (renaming !== null) return
    const items = [...(box.current?.querySelectorAll<HTMLButtonElement>('[role^=menuitem], .midi-learn button') ?? [])]
    const at = items.indexOf(menu.doc.activeElement as HTMLButtonElement)
    const to = e.key === 'ArrowDown' ? at + 1 : e.key === 'ArrowUp' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null
    if (to === null) return
    e.preventDefault()
    items[(to + items.length) % items.length]?.focus()
  }

  const item = (label: string, onClick: () => void, show = true) =>
    show && (
      <button role="menuitem" className="menu-item" onClick={onClick}>
        {label}
      </button>
    )

  return createPortal(
    <div ref={box} className="knob-menu clip-menu" role="menu" aria-label={t('clips.menu', { what: title })} style={{ left: pos.x, top: pos.y }} onKeyDown={onKey}>
      <p className="knob-menu-what">{title}</p>
      {renaming !== null ? (
        <form
          className="clip-rename"
          onSubmit={(e) => {
            e.preventDefault()
            commit()
          }}
        >
          <input
            type="text"
            aria-label={t('clips.rename')}
            placeholder={what.kind === 'clip' && clip ? clipName({ ...clip, name: undefined }, t) : String(c + 1)}
            maxLength={CLIP_NAME_MAX}
            value={renaming}
            onChange={(e) => setRenaming(e.target.value)}
          />
          <button type="submit" className="btn">
            {t('clips.renameOk')}
          </button>
        </form>
      ) : what.kind === 'clip' ? (
        <>
          {item(t('clips.menuLaunch'), run(() => launchClip(i, c)), !!clip)}
          {item(t('clips.saveHere'), run(() => saveClip(i, c)))}
          {item(t('clips.copy'), run(() => copyClip(i, c)), !!clip)}
          {item(copied ? t('clips.pasteNamed', { name: clipName(copied, t) }) : t('clips.paste'), run(() => pasteClip(i, c)), !!copied)}
          {item(t('clips.rename'), startRename, !!clip)}
          {item(t('clips.clear'), run(() => clearClip(i, c)), !!clip)}
        </>
      ) : (
        <>
          {item(t('clips.menuLaunchColumn'), run(() => launchColumn(c)))}
          {item(t('clips.renameColumn'), startRename)}
          <div className="clip-menu-midi">
            <span>{t('clips.columnMidi')}</span>
            <MidiLearn label={columnLabel(scene.columns, c, t)} control={map[target] ?? null} onLearn={(id) => mapTarget(target, id)} onClear={() => mapTarget(target, null)} />
          </div>
        </>
      )}
    </div>,
    menu.doc.body,
  )
}
