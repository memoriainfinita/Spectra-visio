// Free videos and images for the visual input: Wikimedia Commons (free licences) and the
// NASA Image and Video Library (mostly public domain), whose files must come with CORS for
// WebGL to read them. Commons sends it always. NASA's CDN keeps copies without it and gives
// them to CORS requests too (seen 2026-10-12): images fail most of the time, videos, asked in
// ranges that reach the origin server, worked; so NASA is offered for video only. Videos
// come in a reduced size.

export type MediaSource = 'commons' | 'nasa'
export type MediaType = 'video' | 'image'

export interface MediaItem {
  source: MediaSource
  type: MediaType
  id: string
  title: string
  // Small picture for the results.
  thumb: string
  // The file to show; for NASA it is found on choosing (see resolveMedia).
  url: string
  // The file's page, with its licence and author.
  page: string
}

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const NASA_API = 'https://images-api.nasa.gov/search'
export const MEDIA_LIMIT = 30
// Sizes asked for: a thumbnail, and the picture shown.
const THUMB_W = 320
const IMAGE_W = 1920
// Video height preferred among Commons' reduced copies.
const VIDEO_H = 720

export const typeAvailable = (source: MediaSource, type: MediaType) => !(source === 'nasa' && type === 'image')

const https = (u: string) => u.replace(/^http:\/\//, 'https://')

interface CommonsPage {
  pageid?: number
  title?: string
  imageinfo?: { url?: string; thumburl?: string; descriptionurl?: string; width?: number; mime?: string }[]
  videoinfo?: { url?: string; thumburl?: string; descriptionurl?: string; height?: number; derivatives?: { src?: string; type?: string; height?: number }[] }[]
}

// The reduced copy closest to 720 lines without going over, in WebM; the original if none.
export function pickDerivative(original: string, derivatives: { src?: string; type?: string; height?: number }[]): string {
  const webm = derivatives.filter((d) => d.src && d.type?.startsWith('video/webm') && d.height && d.height <= VIDEO_H && !d.src.includes('utm_content=original'))
  webm.sort((a, b) => (b.height ?? 0) - (a.height ?? 0))
  return webm[0]?.src ?? original
}

export function commonsItems(raw: unknown, type: MediaType): MediaItem[] {
  const pages = (raw as { query?: { pages?: Record<string, CommonsPage> } })?.query?.pages
  if (!pages) return []
  const out: MediaItem[] = []
  for (const p of Object.values(pages)) {
    const name = (p.title ?? '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '')
    if (type === 'video') {
      const v = p.videoinfo?.[0]
      if (!v?.url || !v.thumburl) continue
      out.push({ source: 'commons', type, id: String(p.pageid), title: name, thumb: v.thumburl, url: pickDerivative(v.url, v.derivatives ?? []), page: v.descriptionurl ?? '' })
    } else {
      const i = p.imageinfo?.[0]
      if (!i?.url || !i.thumburl) continue
      // The thumbnail address with the width shown, unless the original is smaller.
      const url = i.width && i.width > IMAGE_W ? i.thumburl.replace(`/${THUMB_W}px-`, `/${IMAGE_W}px-`) : i.url
      out.push({ source: 'commons', type, id: String(p.pageid), title: name, thumb: i.thumburl, url, page: i.descriptionurl ?? '' })
    }
  }
  return out
}

interface NasaItem {
  href?: string
  data?: { nasa_id?: string; title?: string; media_type?: string }[]
  links?: { href?: string; rel?: string }[]
}

export function nasaItems(raw: unknown, type: MediaType): MediaItem[] {
  const items = (raw as { collection?: { items?: NasaItem[] } })?.collection?.items ?? []
  const out: MediaItem[] = []
  for (const it of items) {
    const d = it.data?.[0]
    const thumb = it.links?.find((l) => l.rel === 'preview')?.href ?? it.links?.[0]?.href
    if (!d?.nasa_id || !it.href || !thumb) continue
    out.push({ source: 'nasa', type, id: d.nasa_id, title: d.title ?? d.nasa_id, thumb: https(thumb), url: https(it.href), page: `https://images.nasa.gov/details/${encodeURIComponent(d.nasa_id)}` })
  }
  return out
}

// From a NASA asset list, the medium video or the large image, falling back to the others.
export function pickNasaFile(files: string[], type: MediaType): string | null {
  const order = type === 'video' ? ['~medium.mp4', '~small.mp4', '~large.mp4', '~mobile.mp4', '~orig.mp4'] : ['~large.jpg', '~medium.jpg', '~orig.jpg', '~small.jpg']
  for (const end of order) {
    const f = files.find((u) => u.endsWith(end))
    if (f) return https(f)
  }
  return null
}

export async function searchMedia(source: MediaSource, type: MediaType, text: string, signal?: AbortSignal): Promise<MediaItem[]> {
  if (source === 'commons') {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'search',
      gsrsearch: `filetype:${type === 'video' ? 'video' : 'bitmap'} ${text}`,
      gsrnamespace: '6',
      gsrlimit: String(MEDIA_LIMIT),
      prop: type === 'video' ? 'videoinfo' : 'imageinfo',
      [type === 'video' ? 'viprop' : 'iiprop']: type === 'video' ? 'url|size|mime|derivatives' : 'url|size|mime',
      [type === 'video' ? 'viurlwidth' : 'iiurlwidth']: String(THUMB_W),
    })
    const res = await fetch(`${COMMONS_API}?${params}`, { signal })
    if (!res.ok) throw new Error(`commons ${res.status}`)
    return commonsItems(await res.json(), type)
  }
  const params = new URLSearchParams({ q: text, media_type: type, page_size: String(MEDIA_LIMIT) })
  const res = await fetch(`${NASA_API}?${params}`, { signal })
  if (!res.ok) throw new Error(`nasa ${res.status}`)
  return nasaItems(await res.json(), type)
}

// The address of the file to show.
export async function resolveMedia(item: MediaItem, signal?: AbortSignal): Promise<string> {
  if (item.source !== 'nasa') return item.url
  const res = await fetch(item.url, { signal })
  if (!res.ok) throw new Error(`nasa ${res.status}`)
  const files = (await res.json()) as unknown
  const url = Array.isArray(files) ? pickNasaFile(files.filter((f): f is string => typeof f === 'string'), item.type) : null
  if (!url) throw new Error('nasa: no file')
  return url
}
