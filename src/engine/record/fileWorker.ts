import { RECORDINGS_DIR, type FileReply, type FileRequest } from './fileProtocol'

// Writes a recording into the browser's private storage (OPFS) as it comes. A sync access
// handle writes straight into the file, so what was written survives a crash or a reload;
// `createWritable` would keep it in a temporary file until closed.

interface SyncHandle {
  write(data: ArrayBuffer, options: { at: number }): number
  flush(): void
  close(): void
}

// The project's types are the DOM's; inside the worker only these are used.
const scope = self as unknown as { onmessage: ((e: MessageEvent<FileRequest>) => void) | null; postMessage(reply: FileReply): void }

let handle: SyncHandle | null = null
let name = ''
let at = 0

async function dir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle(RECORDINGS_DIR, { create: true })
}

async function run(r: FileRequest): Promise<void> {
  switch (r.kind) {
    case 'open': {
      const d = await dir()
      // Only the last recording is kept.
      for await (const key of (d as unknown as { keys(): AsyncIterable<string> }).keys()) await d.removeEntry(key)
      const file = await d.getFileHandle(r.name, { create: true })
      handle = await (file as unknown as { createSyncAccessHandle(): Promise<SyncHandle> }).createSyncAccessHandle()
      name = r.name
      at = 0
      return
    }
    case 'write':
      if (!handle) throw new Error('not open')
      at += handle.write(r.data, { at })
      return
    case 'close':
      handle?.flush()
      handle?.close()
      handle = null
      return
    case 'abort':
      handle?.close()
      handle = null
      if (name) await (await dir()).removeEntry(name).catch(() => {})
      name = ''
  }
}

// One request at a time, in order.
let queue = Promise.resolve()
scope.onmessage = (e) => {
  const r = e.data
  queue = queue.then(() =>
    run(r).then(
      () => scope.postMessage({ id: r.id }),
      (err) => scope.postMessage({ id: r.id, error: String(err) }),
    ),
  )
}
