// Live TV channels from iptv-org (github.com/iptv-org/iptv): public playlists, grouped by
// category, country and language, served with CORS. The groups come from the project's
// PLAYLISTS.md; each group is one M3U file, downloaded when chosen.

export type GroupBy = 'category' | 'country' | 'language'

export interface TvGroup {
  by: GroupBy
  // Category id, country code (lower case) or ISO 639-3 language code.
  id: string
  // English name, as the project lists it.
  name: string
  // Channels in the group; 0 when the list does not say.
  count: number
  url: string
}

export interface Channel {
  // The stream address: one channel can have several, each listed apart.
  id: string
  name: string
  url: string
  // '1080p' and the like; empty when unknown.
  quality: string
  // The project's notes, such as 'Geo-blocked' or 'Not 24/7'.
  labels: string[]
  categories: string[]
}

export const PLAYLISTS_URL = 'https://raw.githubusercontent.com/iptv-org/iptv/master/PLAYLISTS.md'
// Every channel in one file, about 2.5 MB.
export const ALL_URL = 'https://iptv-org.github.io/iptv/index.m3u'

const FOLDERS: Record<string, GroupBy> = { categories: 'category', countries: 'country', languages: 'language' }
const LINK = /<code>(https:\/\/iptv-org\.github\.io\/iptv\/(categories|countries|languages)\/([a-z0-9_-]+)\.m3u)<\/code>/
// Groups that are not one: no category, no country, and the adult one, empty since 2024.
const SKIP = new Set(['undefined', 'xxx'])

const stripTags = (s: string) => s.replace(/<[^>]*>/g, '').trim()

// The groups listed in PLAYLISTS.md: table rows for categories and languages, list items
// with a flag for countries. Subdivisions and cities are left out.
export function parseGroups(markdown: string): TvGroup[] {
  const out: TvGroup[] = []
  for (const line of markdown.split('\n')) {
    const m = LINK.exec(line)
    if (!m || SKIP.has(m[3])) continue
    let name: string
    let count = 0
    if (line.includes('<td')) {
      const cells = [...line.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((c) => stripTags(c[1]))
      name = cells[0] ?? ''
      count = Number(cells[1]) || 0
      if (cells[1] === '0') continue
    } else {
      // "- 🇦🇱 Albania <code>": only top-level items, without the flag.
      if (!line.startsWith('- ')) continue
      name = line.slice(2, line.indexOf('<code>')).replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '').trim()
    }
    if (name) out.push({ by: FOLDERS[m[2]], id: m[3], name, count, url: m[1] })
  }
  return out
}

// One M3U playlist as channels. Only https streams that need no special request headers:
// a page can neither play http nor set a referrer or user agent.
export function parsePlaylist(text: string): Channel[] {
  const out: Channel[] = []
  const seen = new Set<string>()
  let info: string | null = null
  let headers = false
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('#EXTINF')) {
      info = line
      headers = false
    } else if (line.startsWith('#EXTVLCOPT') || line.startsWith('#KODIPROP') || line.startsWith('#EXTHTTP')) {
      headers = true
    } else if (!line.startsWith('#')) {
      if (info && !headers && !/http-(referrer|user-agent)=/.test(info) && line.startsWith('https://') && !seen.has(line)) {
        seen.add(line)
        out.push(channelFrom(info, line))
      }
      info = null
      headers = false
    }
  }
  return out
}

function attr(info: string, name: string): string {
  return new RegExp(`${name}="([^"]*)"`).exec(info)?.[1] ?? ''
}

function channelFrom(info: string, url: string): Channel {
  // The title follows the last comma outside the attributes.
  const afterAttrs = info.replace(/[\w-]+="[^"]*"/g, '')
  let title = afterAttrs.slice(afterAttrs.indexOf(',') + 1).trim()
  const labels = [...title.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1])
  title = title.replace(/\[[^\]]+\]/g, '').trim()
  const q = /\((\d{3,4}[pi])\)\s*$/.exec(title)
  if (q) title = title.slice(0, q.index).trim()
  const groups = attr(info, 'group-title')
  return {
    id: url,
    name: title || url,
    url,
    quality: q?.[1] ?? '',
    labels,
    categories: groups ? groups.split(';').map((g) => g.trim()).filter((g) => g && g !== 'Undefined') : [],
  }
}

export async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  return res.text()
}
