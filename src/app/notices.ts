import { createStore } from '../core/store'

// Short notices at the bottom right of the app, never on the output: one at a time, gone
// after NOTICE_MS.

const NOTICE_MS = 2500

export const noticeStore = createStore<{ id: number; text: string } | null>(null)
let seq = 0
let timer = 0

export function notify(text: string): void {
  clearTimeout(timer)
  const id = ++seq
  noticeStore.set({ id, text })
  timer = window.setTimeout(() => {
    if (noticeStore.get()?.id === id) noticeStore.set(null)
  }, NOTICE_MS)
}
