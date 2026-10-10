// LRC lyrics: lines with one or more [mm:ss.xx] time tags, an optional [offset:±ms] tag,
// other [tag:value] metadata, and word-level <mm:ss.xx> tags (enhanced LRC), dropped here.

export interface LrcLine {
  // Seconds from the start of the track.
  time: number
  text: string
}

const TIME_TAG = /^\s*\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/
const OFFSET = /^\s*\[offset:\s*([+-]?\d+)\s*\]/im
export const LRC_MAX = 200_000

function seconds(min: string, sec: string): number {
  return Number(min) * 60 + Number(sec.replace(':', '.'))
}

// Lines sorted by time; empty lines are kept (they clear the previous line). The offset tag
// moves every line earlier when positive, as players read it.
export function parseLrc(text: string): LrcLine[] {
  if (text.length > LRC_MAX) return []
  const offset = Number(OFFSET.exec(text)?.[1] ?? 0) / 1000
  const out: LrcLine[] = []
  for (const raw of text.split(/\r?\n/)) {
    const times: number[] = []
    let rest = raw
    for (;;) {
      const m = TIME_TAG.exec(rest)
      if (!m) break
      times.push(seconds(m[1], m[2]))
      rest = rest.slice(m[0].length)
    }
    if (!times.length) continue
    const words = rest.replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, '').replace(/\s+/g, ' ').trim()
    for (const t of times) out.push({ time: Math.max(0, t - offset), text: words })
  }
  return out.sort((a, b) => a.time - b.time)
}

// Index of the line showing at `time`: the last one that started; -1 before the first.
export function lineAt(lines: readonly LrcLine[], time: number): number {
  let lo = 0
  let hi = lines.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].time <= time) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

// Synchronized lyrics from tags (ID3 SYLT and similar), timestamps in milliseconds, as LRC.
export function toLrc(lines: readonly { text: string; timestamp?: number }[]): string {
  return lines
    .filter((l) => typeof l.timestamp === 'number' && Number.isFinite(l.timestamp))
    .map((l) => {
      const cs = Math.round(l.timestamp! / 10)
      return `[${pad(Math.floor(cs / 6000))}:${pad(Math.floor(cs / 100) % 60)}.${pad(cs % 100)}]${l.text.replace(/\s+/g, ' ').trim()}`
    })
    .join('\n')
}
