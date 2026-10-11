// Holds a screen wake lock while `wanted()` and the page is visible. The browser drops the
// lock when the page hides, so it is asked for again on coming back.
export function keepAwake(wanted: () => boolean, onChange: (fn: () => void) => void): void {
  const wakeLock = navigator.wakeLock
  if (!wakeLock) return
  let lock: WakeLockSentinel | null = null
  let asking = false
  const release = async () => {
    const l = lock
    lock = null
    await l?.release().catch(() => {})
  }
  const update = () => {
    const want = wanted() && document.visibilityState === 'visible'
    if (want && !lock && !asking) {
      asking = true
      wakeLock
        .request('screen')
        .then((l) => {
          lock = l
          l.addEventListener('release', () => {
            if (lock === l) lock = null
          })
          // Wanted no more while asking.
          if (!wanted()) void release()
        })
        .catch(() => {
          // Refused (battery saver, page not active): the screen may sleep.
        })
        .finally(() => {
          asking = false
        })
    } else if (!want && lock) void release()
  }
  onChange(update)
  document.addEventListener('visibilitychange', update)
  update()
}
