// Internet radio directory: radio-browser.info, a free, open directory with no account and
// CORS on its API. Only https stations are listed (an https page cannot play http), and the
// ones the directory has seen down are left out.

export interface Station {
  id: string
  name: string
  url: string
  country: string
  codec: string
  // kbit/s; 0 when unknown.
  bitrate: number
  tags: string[]
}

export type SearchBy = 'name' | 'tag' | 'country'

const SERVERS_URL = 'https://all.api.radio-browser.info/json/servers'
// Used when the server list cannot be read.
const FALLBACK_SERVER = 'de1.api.radio-browser.info'
export const SEARCH_LIMIT = 40
// Long enough for a slow stream server to answer with its headers.
const PROBE_TIMEOUT_MS = 8000

let server: Promise<string> | null = null

// The directory asks clients to spread over its servers: one at random per visit.
function pickServer(): Promise<string> {
  server ??= fetch(SERVERS_URL)
    .then((r) => r.json() as Promise<{ name?: unknown }[]>)
    .then((list) => {
      const names = [...new Set(list.map((s) => s.name).filter((n): n is string => typeof n === 'string' && n.length > 0))]
      return names.length ? names[Math.floor(Math.random() * names.length)] : FALLBACK_SERVER
    })
    .catch(() => FALLBACK_SERVER)
  return server
}

// A directory entry as a station, or null when it cannot be played from an https page.
export function toStation(raw: unknown): Station | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const url = typeof r.url_resolved === 'string' && r.url_resolved ? r.url_resolved : typeof r.url === 'string' ? r.url : ''
  if (!url.startsWith('https://') || typeof r.stationuuid !== 'string') return null
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  return {
    id: r.stationuuid,
    name: name || url,
    url,
    country: typeof r.country === 'string' ? r.country : '',
    codec: typeof r.codec === 'string' ? r.codec : '',
    bitrate: typeof r.bitrate === 'number' && r.bitrate > 0 ? r.bitrate : 0,
    tags: typeof r.tags === 'string' ? r.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 4) : [],
  }
}

// Most listened first; one entry per stream address.
export async function searchStations(text: string, by: SearchBy, signal?: AbortSignal): Promise<Station[]> {
  const host = await pickServer()
  const params = new URLSearchParams({ [by]: text, limit: String(SEARCH_LIMIT), hidebroken: 'true', is_https: 'true', order: 'clickcount', reverse: 'true' })
  const res = await fetch(`https://${host}/json/stations/search?${params}`, { signal })
  if (!res.ok) throw new Error(`radio-browser ${res.status}`)
  const seen = new Set<string>()
  const out: Station[] = []
  for (const raw of (await res.json()) as unknown[]) {
    const s = toStation(raw)
    if (s && !seen.has(s.url)) {
      seen.add(s.url)
      out.push(s)
    }
  }
  return out
}

// Whether the stream sends CORS headers, without which the analysers would only get silence.
// Only the headers are read; the request is dropped as soon as they arrive.
export async function canAnalyse(url: string, signal?: AbortSignal): Promise<boolean> {
  const ctrl = new AbortController()
  const stop = () => ctrl.abort()
  signal?.addEventListener('abort', stop)
  const timer = setTimeout(stop, PROBE_TIMEOUT_MS)
  try {
    const res = await fetch(url, { mode: 'cors', signal: ctrl.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
    ctrl.abort()
    signal?.removeEventListener('abort', stop)
  }
}
