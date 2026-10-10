import { byName, isAudioFile } from './files'

// Files chosen by the user, with their handles when the browser provides them (Chrome).
// Handles let the list come back after a reload without copying the files.
export interface Picked {
  files: File[]
  handles: (FileSystemFileHandle | null)[]
}

type PickerWindow = Window & {
  showOpenFilePicker?: (o: object) => Promise<FileSystemFileHandle[]>
  showDirectoryPicker?: (o?: object) => Promise<FileSystemDirectoryHandle>
}
type HandleItem = DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemHandle | null> }

const EMPTY: Picked = { files: [], handles: [] }

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

async function fromHandles(handles: FileSystemFileHandle[]): Promise<Picked> {
  const pairs = await Promise.all(handles.map(async (h) => ({ file: await h.getFile(), handle: h })))
  const audio = pairs.filter((p) => isAudioFile(p.file))
  return { files: audio.map((p) => p.file), handles: audio.map((p) => p.handle) }
}

async function walkDirectory(dir: FileSystemDirectoryHandle): Promise<FileSystemFileHandle[]> {
  const out: FileSystemFileHandle[] = []
  const entries = (dir as FileSystemDirectoryHandle & { values(): AsyncIterable<FileSystemHandle> }).values()
  for await (const entry of entries) {
    if (entry.kind === 'file') out.push(entry as FileSystemFileHandle)
    else out.push(...(await walkDirectory(entry as FileSystemDirectoryHandle)))
  }
  return out
}

function sortPicked(p: Picked): Picked {
  const pairs = p.files.map((file, i) => ({ name: file.name, file, handle: p.handles[i] })).sort(byName)
  return { files: pairs.map((x) => x.file), handles: pairs.map((x) => x.handle) }
}

function inputPick(directory: boolean): Promise<Picked> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    if (directory) input.webkitdirectory = true
    else input.accept = 'audio/*'
    input.addEventListener('change', () => {
      const files = [...(input.files ?? [])].filter(isAudioFile)
      resolve(sortPicked({ files, handles: files.map(() => null) }))
    })
    input.addEventListener('cancel', () => resolve(EMPTY))
    input.click()
  })
}

export async function pickFiles(): Promise<Picked> {
  const w = window as PickerWindow
  if (!w.showOpenFilePicker) return inputPick(false)
  try {
    const handles = await w.showOpenFilePicker({
      multiple: true,
      types: [{ description: 'Audio', accept: { 'audio/*': [] } }],
    })
    return fromHandles(handles)
  } catch (err) {
    return isAbort(err) ? EMPTY : inputPick(false)
  }
}

export async function pickFolder(): Promise<Picked> {
  const w = window as PickerWindow
  if (!w.showDirectoryPicker) return inputPick(true)
  try {
    const dir = await w.showDirectoryPicker()
    return sortPicked(await fromHandles(await walkDirectory(dir)))
  } catch (err) {
    return isAbort(err) ? EMPTY : inputPick(true)
  }
}

// Old-style entries: the only way to read dropped folders outside Chrome.
async function walkEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => (entry as FileSystemFileEntry).file((f) => resolve([f]), () => resolve([])))
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader()
  const out: File[] = []
  // readEntries returns batches; an empty batch means done.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve, () => resolve([])))
    if (batch.length === 0) break
    for (const e of batch) out.push(...(await walkEntry(e)))
  }
  return out
}

export async function fromDrop(data: DataTransfer): Promise<Picked> {
  // Items must be read synchronously, before the first await.
  const items = [...data.items].filter((i) => i.kind === 'file') as HandleItem[]
  if (items.length && items[0].getAsFileSystemHandle) {
    const handles = await Promise.all(items.map((i) => i.getAsFileSystemHandle!()))
    const files: FileSystemFileHandle[] = []
    for (const h of handles) {
      if (!h) continue
      if (h.kind === 'file') files.push(h as FileSystemFileHandle)
      else files.push(...(await walkDirectory(h as FileSystemDirectoryHandle)))
    }
    return sortPicked(await fromHandles(files))
  }
  const entries = items.map((i) => i.webkitGetAsEntry()).filter((e): e is FileSystemEntry => e !== null)
  const files = entries.length
    ? (await Promise.all(entries.map(walkEntry))).flat()
    : [...data.files]
  const audio = files.filter(isAudioFile)
  return sortPicked({ files: audio, handles: audio.map(() => null) })
}
