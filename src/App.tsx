import { useEffect } from 'react'
import { settingsStore } from './app/settings'
import { LANGS, isLang } from './i18n'
import { useStore } from './ui/useStore'
import { useT } from './ui/useT'

const PHASE = 1
const TOTAL_PHASES = 10

export function App() {
  const t = useT()
  const lang = useStore(settingsStore, (s) => s.lang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <main className="shell">
      <h1>{t('app.title')}</h1>
      <p className="tagline">{t('app.tagline')}</p>
      <p className="muted">{t('app.rebuilding', { phase: PHASE, total: TOTAL_PHASES })}</p>
      <label className="field">
        <span>{t('settings.language')}</span>
        <select
          value={lang}
          onChange={(e) => {
            const next = e.target.value
            if (isLang(next)) settingsStore.set((s) => ({ ...s, lang: next }))
          }}
        >
          {LANGS.map((l) => (
            <option key={l} value={l}>
              {t(`lang.${l}`)}
            </option>
          ))}
        </select>
      </label>
    </main>
  )
}
