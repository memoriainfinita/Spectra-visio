import { RECORDINGS_DIR, type FileCommand, type FileReply } from './fileProtocol'
import type { RecordSink } from './recorder'

// A recording written into OPFS by the file worker. Only the last one is kept there, to
// download again or to recover after a crash.
export class OpfsSink implements RecordSink {
  private readonly worker = new Worker(new URL('./fileWorker.ts', import.meta.url), { type: 'module' })
  private readonly waiting = new Map<number, { resolve: () => void; reject: (e: Error) => void }>()
  private nextId = 0

  private constructor(
    private readonly name: string,
    private readonly type: string,
  ) {
    this.worker.onmessage = (e: MessageEvent<FileReply>) => {
      const job = this.waiting.get(e.data.id)
      if (!job) return
      this.waiting.delete(e.data.id)
      if (e.data.error) job.reject(new Error(e.data.error))
      else job.resolve()
    }
  }

  static async open(name: string, type: string): Promise<OpfsSink> {
    const sink = new OpfsSink(name, type)
    try {
      await sink.send({ kind: 'open', name })
    } catch (err) {
      sink.worker.terminate()
      throw err
    }
    return sink
  }

  private send(body: FileCommand, transfer: Transferable[] = []): Promise<void> {
    const id = ++this.nextId
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject })
      this.worker.postMessage({ ...body, id }, transfer)
    })
  }

  async write(chunk: Blob): Promise<void> {
    const data = await chunk.arrayBuffer()
    await this.send({ kind: 'write', data }, [data])
  }

  async close(): Promise<File> {
    await this.send({ kind: 'close' })
    this.worker.terminate()
    const file = await lastRecording()
    if (!file) throw new Error('recording missing')
    return new File([file], this.name, { type: this.type })
  }

  async abort(): Promise<void> {
    await this.send({ kind: 'abort' }).catch(() => {})
    this.worker.terminate()
  }
}

// The recording kept in OPFS, finished or cut short; null when there is none.
export async function lastRecording(): Promise<File | null> {
  try {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle(RECORDINGS_DIR)
    for await (const handle of (dir as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) {
      if (handle.kind === 'file') return (handle as FileSystemFileHandle).getFile()
    }
  } catch {
    // No directory yet, or no OPFS.
  }
  return null
}

export async function deleteLastRecording(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory()
    await root.removeEntry(RECORDINGS_DIR, { recursive: true })
  } catch {
    // Nothing kept.
  }
}
