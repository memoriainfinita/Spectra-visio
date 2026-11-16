// A metronome for `frames.ts`: a timer in a worker is not slowed down when the page that
// started it is hidden. `{ every: ms }` starts it (or changes its pace), `{ every: 0 }` stops.

const scope = self as unknown as { onmessage: ((e: MessageEvent<{ every: number }>) => void) | null; postMessage(tick: 0): void }

let timer: ReturnType<typeof setInterval> | undefined

scope.onmessage = (e) => {
  clearInterval(timer)
  timer = undefined
  if (e.data.every > 0) timer = setInterval(() => scope.postMessage(0), e.data.every)
}
