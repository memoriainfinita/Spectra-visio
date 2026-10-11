import { DEFAULT_OBS_URL } from './websocket'

export interface ObsSettings {
  // Connect on every visit.
  enabled: boolean
  url: string
  // obs-websocket's server password; kept in this browser's settings only.
  password: string
}

export const DEFAULT_OBS: ObsSettings = { enabled: false, url: DEFAULT_OBS_URL, password: '' }

export function normalizeObs(raw: unknown): ObsSettings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_OBS }
  const r = raw as Record<string, unknown>
  const url = typeof r.url === 'string' && /^wss?:\/\/./.test(r.url) && r.url.length < 300 ? r.url : DEFAULT_OBS.url
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : DEFAULT_OBS.enabled,
    url,
    password: typeof r.password === 'string' && r.password.length < 300 ? r.password : '',
  }
}
