// Messages between a recording and the worker that writes it into OPFS.

export const RECORDINGS_DIR = 'recordings'

export type FileCommand = { kind: 'open'; name: string } | { kind: 'write'; data: ArrayBuffer } | { kind: 'close' } | { kind: 'abort' }

export type FileRequest = FileCommand & { id: number }

export type FileReply = { id: number; error?: string }
