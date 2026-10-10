import { useEffect } from 'react'
import { setKeepFiles } from './app/engine'
import { settingsStore } from './app/settings'
import { LANGS, isLang } from './i18n'
import { AnalysisPanel } from './ui/Analysis'
import { opfsSupported } from './storage/opfs'
import { useFileDrop, usePlayerShortcuts } from './ui/hooks'
import { Queue } from './ui/Queue'
import { Sources } from './ui/Sources'
import { NowPlaying, Transport } from './ui/Transport'
import { useStore } from './ui/useStore'
import { useT } from './ui/useT'

const PHASE = 3
const TOTAL_PHASES = 10

export function App() {
  const t = useT()
  const settings = useStore(settingsStore)
  const dropping = useFileDrop()
  usePlayerShortcuts()

  useEffect(() => {
    document.documentElement.lang = settings.lang
  }, [settings.lang])

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>{t('app.title')}</h1>
          <p className="muted small">{t('app.rebuilding', { phase: PHASE, total: TOTAL_PHASES })}</p>
        </div>
        <label className="field">
          <span>{t('settings.language')}</span>
          <select
            value={settings.lang}
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
      </header>

      <main className="layout">
        <section className="panel player">
          <NowPlaying />
          <Transport />
        </section>
        <Queue />
        <Sources />
        <AnalysisPanel />
        {opfsSupported && (
          <section className="panel settings">
            <label className="check">
              <input type="checkbox" checked={settings.keepFiles} onChange={(e) => void setKeepFiles(e.target.checked)} />
              <span>{t('settings.keepFiles')}</span>
            </label>
            <p className="muted small">{t('settings.keepFilesHint')}</p>
          </section>
        )}
      </main>

      {dropping && (
        <div className="drop-overlay" aria-hidden="true">
          {t('drop.hint')}
        </div>
      )}
    </div>
  )
}
