import { en } from './en'
import { es, type MessageKey, type Messages } from './es'

export const LANGS = ['es', 'en'] as const
export type Lang = (typeof LANGS)[number]

const MESSAGES: Record<Lang, Messages> = { es, en }

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value)
}

// First supported language in the browser's preference list; English otherwise.
export function detectLang(preferred: readonly string[]): Lang {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLang(base)) return base
  }
  return 'en'
}

export type Params = Record<string, string | number>

export function translate(lang: Lang, key: MessageKey, params?: Params): string {
  const text = MESSAGES[lang][key]
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

export type { MessageKey }
