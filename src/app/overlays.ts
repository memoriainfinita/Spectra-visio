import { del, get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import type { OverlayData } from '../engine/overlay/overlay'
import type { OverlayItem, OverlayKind, OverlaySettings } from '../engine/overlay/settings'
import { analysis, player, renderer } from './engine'
import { initLyrics, keepLyricsOf, lyricsOf } from './lyrics'
import { sceneStore } from './scene'

// The logo image, the overlay settings in the scene, and what the overlays read each frame.

const LOGO_KEY = 'overlayLogo'

export const logoStore = createStore<{ image: HTMLImageElement | null; name: string }>({ image: null, name: '' })

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const img = new Image()
  img.src = URL.createObjectURL(blob)
  try {
    await img.decode()
  } catch (err) {
    URL.revokeObjectURL(img.src)
    throw err
  }
  return img
}

export async function initOverlays(): Promise<void> {
  await initLyrics()
  try {
    const logo: unknown = await get(LOGO_KEY)
    if (logo && typeof logo === 'object' && (logo as { blob?: unknown }).blob instanceof Blob) {
      const { blob, name } = logo as { blob: Blob; name?: string }
      logoStore.set({ image: await loadImage(blob), name: typeof name === 'string' ? name : '' })
    }
  } catch {
    // IndexedDB unavailable or a broken image: start without a logo.
  }
  player.state.subscribe(() => keepLyricsOf(new Set(player.state.get().tracks.map((t) => t.id))))
  renderer.overlaySource = overlayData
}

export function overlayData(): OverlayData {
  const s = player.state.get()
  const track = s.tracks.find((t) => t.id === s.currentId)
  return {
    trackId: track?.id ?? null,
    title: track ? track.meta?.title || track.name : '',
    artist: track?.meta?.artist ?? '',
    lyrics: lyricsOf(track),
    // What is heard now left the player the output delay ago.
    time: player.position() - analysis.delayMs() / 1000,
    logo: logoStore.get().image,
  }
}

// False when the file is not an image the browser can decode.
export async function setLogo(file: File): Promise<boolean> {
  let image: HTMLImageElement
  try {
    image = await loadImage(file)
  } catch {
    return false
  }
  const old = logoStore.get().image
  if (old) URL.revokeObjectURL(old.src)
  logoStore.set({ image, name: file.name })
  set(LOGO_KEY, { blob: file, name: file.name }).catch(() => {})
  return true
}

export function removeLogo(): void {
  const old = logoStore.get().image
  if (old) URL.revokeObjectURL(old.src)
  logoStore.set({ image: null, name: '' })
  del(LOGO_KEY).catch(() => {})
}

function editOverlays(change: (o: OverlaySettings) => OverlaySettings): void {
  sceneStore.set((s) => ({ ...s, overlays: change(s.overlays) }))
}

export function setOverlay<K extends OverlayKind>(kind: K, patch: Partial<OverlaySettings[K] & OverlayItem>): void {
  editOverlays((o) => ({ ...o, [kind]: { ...o[kind], ...patch } }))
}

export function setOverlayStyle(patch: Partial<Pick<OverlaySettings, 'font' | 'color'>>): void {
  editOverlays((o) => ({ ...o, ...patch }))
}
