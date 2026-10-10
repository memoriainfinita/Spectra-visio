// Copies of added files in the browser's private storage (OPFS), one file per track id.
const DIR = 'tracks'

export const opfsSupported = typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory

async function tracksDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle(DIR, { create: true })
}

export async function storeFile(id: string, file: File): Promise<void> {
  const handle = await (await tracksDir()).getFileHandle(id, { create: true })
  const writable = await handle.createWritable()
  // Streamed: Firefox loads a whole Blob into memory when it is written in one call.
  await file.stream().pipeTo(writable)
}

// The stored copy has no name or type of its own: they come from the saved list.
export async function readStoredFile(id: string, name: string, type: string): Promise<File | null> {
  try {
    const file = await (await (await tracksDir()).getFileHandle(id)).getFile()
    return new File([file], name, { type })
  } catch {
    return null
  }
}

export async function deleteStoredFile(id: string): Promise<void> {
  try {
    await (await tracksDir()).removeEntry(id)
  } catch {
    // Already gone.
  }
}

export async function clearStoredFiles(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory()
    await root.removeEntry(DIR, { recursive: true })
  } catch {
    // Nothing stored.
  }
}
