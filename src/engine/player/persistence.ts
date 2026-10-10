import { get, set } from 'idb-keyval'
import { createStore } from '../../core/store'
import { clearStoredFiles, deleteStoredFile, opfsSupported, readStoredFile, storeFile } from '../../storage/opfs'
import { normalizeSession, SESSION_VERSION, type SavedTrack, type Session } from '../../storage/session'
import type { Player } from './player'
import type { Track } from './types'

const KEY = 'session'
const SAVE_DELAY_MS = 400
const POSITION_EVERY_MS = 5000

type ReadPermission = { queryPermission?(d: { mode: 'read' }): Promise<PermissionState>; requestPermission?(d: { mode: 'read' }): Promise<PermissionState> }

export interface PersistenceState {
  // Restored tracks whose original files need the user's permission again (Chrome).
  pending: number
  storageFull: boolean
}

// Keeps the list, the current track and the player options across reloads.
// Files survive in two ways: copies in the app's storage (opt-in, every browser) or
// references to the originals (Chrome, when added through its file pickers).
export class Persistence {
  readonly state = createStore<PersistenceState>({ pending: 0, storageFull: false })
  private readonly handles = new Map<string, FileSystemFileHandle>()
  private readonly pending = new Map<string, FileSystemFileHandle>()
  private readonly stored = new Set<string>()
  private readonly meta = new Map<string, { fileName: string; type: string }>()
  private known = new Set<string>()
  private saveTimer: ReturnType<typeof setTimeout> | undefined
  private readonly player: Player
  private readonly keepFiles: () => boolean

  constructor(player: Player, keepFiles: () => boolean) {
    this.player = player
    this.keepFiles = keepFiles
  }

  async start(): Promise<void> {
    await this.restore()
    this.known = new Set(this.player.state.get().tracks.map((t) => t.id))
    this.player.state.subscribe(() => {
      this.syncFiles()
      this.scheduleSave()
    })
    setInterval(() => {
      if (this.player.state.get().status === 'playing') void this.save()
    }, POSITION_EVERY_MS)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.save()
    })
  }

  // Tracks added through a picker that returned file handles (Chrome).
  rememberHandles(ids: string[], handles: FileSystemFileHandle[]): void {
    ids.forEach((id, i) => this.handles.set(id, handles[i]))
    this.scheduleSave()
  }

  // Must run inside a user gesture: the browser asks again for read access.
  async regainAccess(): Promise<void> {
    for (const [id, handle] of [...this.pending]) {
      try {
        const h = handle as FileSystemFileHandle & ReadPermission
        const state = (await h.requestPermission?.({ mode: 'read' })) ?? 'granted'
        if (state !== 'granted') continue
        this.player.attachFile(id, await handle.getFile())
        this.pending.delete(id)
        this.handles.set(id, handle)
        const track = this.player.state.get().tracks.find((t) => t.id === id)
        if (track) void this.copy(track)
      } catch {
        // The original file was moved or deleted: the track stays unavailable.
      }
    }
    this.state.set((s) => ({ ...s, pending: this.pending.size }))
  }

  async setKeepFiles(on: boolean): Promise<void> {
    if (on) {
      // Not awaited: Firefox asks the user, and the copies must not wait for the answer.
      void navigator.storage?.persist?.().catch(() => false)
      for (const t of this.player.state.get().tracks) void this.copy(t)
    } else {
      await clearStoredFiles()
      this.stored.clear()
      this.state.set((s) => ({ ...s, storageFull: false }))
    }
    this.scheduleSave()
  }

  private async restore(): Promise<void> {
    let session: Session
    try {
      session = normalizeSession(await get(KEY))
    } catch {
      return
    }
    this.player.applyPrefs(session.prefs)
    const tracks: Track[] = []
    for (const saved of session.tracks) {
      const track = await this.restoreTrack(saved)
      if (track) tracks.push(track)
    }
    const currentId = tracks.some((t) => t.id === session.currentId) ? session.currentId : null
    if (tracks.length) this.player.restore(tracks, currentId, session.position)
    this.state.set((s) => ({ ...s, pending: this.pending.size }))
  }

  private async restoreTrack(saved: SavedTrack): Promise<Track | null> {
    this.meta.set(saved.id, { fileName: saved.fileName, type: saved.type })
    const base = { id: saved.id, name: saved.name, size: saved.size, meta: null, failed: false }
    if (saved.source === 'opfs') {
      if (!opfsSupported || !this.keepFiles()) return null
      const file = await readStoredFile(saved.id, saved.fileName, saved.type)
      if (!file) return null
      this.stored.add(saved.id)
      return { ...base, file }
    }
    const handle = saved.handle
    if (!handle) return null
    try {
      const h = handle as FileSystemFileHandle & ReadPermission
      const state = (await h.queryPermission?.({ mode: 'read' })) ?? 'prompt'
      if (state === 'granted') {
        this.handles.set(saved.id, handle)
        return { ...base, file: await handle.getFile() }
      }
    } catch {
      return null
    }
    this.pending.set(saved.id, handle)
    return { ...base, file: null }
  }

  // Copies new tracks into storage and drops the copies and references of removed ones.
  private syncFiles(): void {
    const tracks = this.player.state.get().tracks
    const ids = new Set(tracks.map((t) => t.id))
    for (const t of tracks) {
      if (this.known.has(t.id)) continue
      if (t.file) this.meta.set(t.id, { fileName: t.file.name, type: t.file.type })
      void this.copy(t)
    }
    for (const id of this.known) {
      if (ids.has(id)) continue
      this.handles.delete(id)
      this.pending.delete(id)
      this.meta.delete(id)
      if (this.stored.delete(id)) void deleteStoredFile(id)
    }
    this.known = ids
    if (this.state.get().pending !== this.pending.size) this.state.set((s) => ({ ...s, pending: this.pending.size }))
  }

  private async copy(track: Track): Promise<void> {
    if (!opfsSupported || !this.keepFiles() || !track.file || this.stored.has(track.id)) return
    try {
      await storeFile(track.id, track.file)
      this.stored.add(track.id)
      this.scheduleSave()
    } catch {
      // Usually the storage quota.
      await deleteStoredFile(track.id)
      this.state.set((s) => ({ ...s, storageFull: true }))
    }
  }

  private scheduleSave(): void {
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => void this.save(), SAVE_DELAY_MS)
  }

  private async save(): Promise<void> {
    const s = this.player.state.get()
    const keep = this.keepFiles()
    const tracks: SavedTrack[] = []
    for (const t of s.tracks) {
      const info = this.meta.get(t.id) ?? { fileName: t.file?.name ?? t.name, type: t.file?.type ?? '' }
      const common = { id: t.id, name: t.name, fileName: info.fileName, type: info.type, size: t.size }
      const handle = this.handles.get(t.id) ?? this.pending.get(t.id)
      if (keep && this.stored.has(t.id)) tracks.push({ ...common, source: 'opfs' })
      else if (handle) tracks.push({ ...common, source: 'handle', handle })
    }
    const currentId = tracks.some((t) => t.id === s.currentId) ? s.currentId : null
    const session: Session = {
      version: SESSION_VERSION,
      prefs: this.player.prefs(),
      tracks,
      currentId,
      position: currentId ? this.player.position() : 0,
    }
    try {
      await set(KEY, session)
    } catch {
      // Not persisted this time.
    }
  }
}
