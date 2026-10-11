import { useEffect } from 'react'
import { setKeepFiles } from './app/engine'
import { settingsStore } from './app/settings'
import { LANGS, isLang } from './i18n'
import { AnalysisPanel } from './ui/Analysis'
import { Auto } from './ui/Auto'
import { Browser } from './ui/Browser'
import { Clips } from './ui/Clips'
import { Live } from './ui/Live'
import { Midi } from './ui/Midi'
import { Output } from './ui/Output'
import { opfsSupported } from './storage/opfs'
import { useFileDrop, usePlayerShortcuts } from './ui/hooks'
import { Queue } from './ui/Queue'
import { Sources } from './ui/Sources'
import { Stage } from './ui/Stage'
import { Visuals } from './ui/Visuals'
import { Effects } from './ui/Effects'
import { Presets } from './ui/Presets'
import { Overlays } from './ui/Overlays'
import { Shaders } from './ui/Shaders'
import { VisualInput } from './ui/VisualInput'
import { NowPlaying, Transport } from './ui/Transport'
import { useStore } from './ui/useStore'
import { useT } from './ui/useT'

const PHASE = 9
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
        <Stage />
        <section className="panel player">
          <NowPlaying />
          <Transport />
        </section>
        <Queue />
        <Browser />
        <Clips />
        <Live />
        <Midi />
        <Output />
        <Visuals />
        <Auto />
        <Effects />
        <Presets />
        <Shaders />
        <VisualInput />
        <Overlays />
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
