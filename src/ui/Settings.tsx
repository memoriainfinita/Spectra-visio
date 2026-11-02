import { Download, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { downloadBackup, eraseAllData, resetSettings, restoreBackup } from '../app/backup'
import { setKeepFiles } from '../app/engine'
import { setReduceFlashes, settingsStore } from '../app/settings'
import { FPS_CAPS, type FpsCap } from '../engine/render/quality'
import { LANGS, isLang, type MessageKey } from '../i18n'
import type { Settings as SettingsData } from '../storage/settings'
import { opfsSupported } from '../storage/opfs'
import { Hint } from './Hint'
import { Midi } from './Midi'
import { Row, Switch } from './SettingRow'
import { Shortcuts } from './Shortcuts'
import { useStore } from './useStore'
import { useT } from './useT'

const setPerformance = (value: Partial<SettingsData['performance']>) => settingsStore.set((s) => ({ ...s, performance: { ...s.performance, ...value } }))
const setOnline = (value: Partial<SettingsData['online']>) => settingsStore.set((s) => ({ ...s, online: { ...s.online, ...value } }))

// A button that asks once more, in place, before doing something that cannot be undone.
function Confirm({ label, question, yes, icon, danger, onYes }: { label: MessageKey; question: MessageKey; yes: MessageKey; icon: ReactNode; danger?: boolean; onYes: () => void }) {
  const t = useT()
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <button className={`btn${danger ? ' danger' : ''}`} onClick={() => setAsking(true)}>
        {icon} {t(label)}
      </button>
    )
  return (
    <div className="confirm" role="group" aria-label={t(label)}>
      <span>{t(question)}</span>
      <button
        className="btn danger"
        onClick={() => {
          setAsking(false)
          onYes()
        }}
      >
        {t(yes)}
      </button>
      <button className="btn" autoFocus onClick={() => setAsking(false)}>
        {t('settings.cancel')}
      </button>
    </div>
  )
}

function General() {
  const t = useT()
  const lang = useStore(settingsStore, (s) => s.lang)
  const keepFiles = useStore(settingsStore, (s) => s.keepFiles)
  return (
    <>
      <Row title={t('settings.language')} desc={t('settings.languageDesc')}>
        <select
          aria-label={t('settings.language')}
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
      </Row>
      {opfsSupported && (
        <Row title={t('settings.keepFilesTitle')} desc={t('settings.keepFilesHint')}>
          <Switch label={t('settings.keepFiles')} checked={keepFiles} onChange={(on) => void setKeepFiles(on)} />
        </Row>
      )}
    </>
  )
}

function Online() {
  const t = useT()
  const online = useStore(settingsStore, (s) => s.online)
  return (
    <>
      <Row title={t('settings.lyricsTitle')} desc={t('settings.lyricsDesc')}>
        <Switch label={t('settings.onlineLyrics')} checked={online.lyrics} onChange={(lyrics) => setOnline({ lyrics })} />
      </Row>
      <Row title={t('settings.coversTitle')} desc={t('settings.coversDesc')}>
        <Switch label={t('settings.onlineCovers')} checked={online.covers} onChange={(covers) => setOnline({ covers })} />
      </Row>
    </>
  )
}

function Accessibility() {
  const t = useT()
  const reduceFlashes = useStore(settingsStore, (s) => s.reduceFlashes)
  return (
    <>
      <Row title={t('safety.reduce')} desc={t('safety.reduceDesc')} hint={t('safety.reduceHint')}>
        <Switch label={t('safety.reduce')} checked={reduceFlashes} onChange={setReduceFlashes} />
      </Row>
      <Row title={t('settings.noticeTitle')} desc={t('settings.noticeDesc')}>
        <button className="btn" aria-label={t('settings.showNotice')} onClick={() => settingsStore.set((s) => ({ ...s, flashNotice: false }))}>
          {t('settings.noticeShow')}
        </button>
      </Row>
    </>
  )
}

function Performance() {
  const t = useT()
  const perf = useStore(settingsStore, (s) => s.performance)
  return (
    <>
      <Row title={t('perf.adaptive')} desc={t('perf.adaptiveDesc')}>
        <Switch label={t('perf.adaptive')} checked={perf.adaptive} onChange={(adaptive) => setPerformance({ adaptive })} />
      </Row>
      <Row title={t('perf.lowPowerTitle')} desc={t('perf.lowPowerDesc')}>
        <Switch label={t('perf.lowPower')} checked={perf.lowPower} onChange={(lowPower) => setPerformance({ lowPower })} />
      </Row>
      <Row title={t('perf.showFps')} desc={t('perf.showFpsDesc')}>
        <Switch label={t('perf.showFps')} checked={perf.showFps} onChange={(showFps) => setPerformance({ showFps })} />
      </Row>
      <Row title={t('perf.maxFps')} desc={t('perf.maxFpsDesc')}>
        <select aria-label={t('perf.maxFps')} value={perf.maxFps} onChange={(e) => setPerformance({ maxFps: Number(e.target.value) as FpsCap })}>
          {FPS_CAPS.map((c) => (
            <option key={c} value={c}>
              {c ? t('record.fpsN', { n: c }) : t('perf.unlimited')}
            </option>
          ))}
        </select>
      </Row>
    </>
  )
}

function Backup() {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  return (
    <>
      <Row title={t('settings.export')} desc={t('settings.exportDesc')}>
        <button className="btn" onClick={downloadBackup}>
          <Download size={15} /> {t('settings.export')}
        </button>
      </Row>
      <Row title={t('settings.import')} desc={message ? <span role="status">{message}</span> : t('settings.importDesc')}>
        <button className="btn" onClick={() => input.current?.click()}>
          <Upload size={15} /> {t('settings.import')}
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            const r = await restoreBackup(file)
            setMessage(r.invalid ? t('settings.importInvalid') : t('settings.imported', { presets: r.presets, scenes: r.scenes, shaders: r.shaders, favorites: r.favorites, channels: r.channels, layouts: r.layouts }))
          }}
        />
      </Row>
    </>
  )
}

function Reset() {
  const t = useT()
  return (
    <>
      <Row title={t('settings.resetSettings')} desc={t('settings.resetDesc')}>
        <Confirm label="settings.resetSettings" question="settings.resetQuestion" yes="settings.resetYes" icon={<RotateCcw size={15} />} onYes={resetSettings} />
      </Row>
      <Row title={t('settings.erase')} desc={t('settings.eraseDesc')}>
        <Confirm label="settings.erase" question="settings.eraseQuestion" yes="settings.eraseYes" icon={<Trash2 size={15} />} danger onYes={eraseAllData} />
      </Row>
    </>
  )
}

export const SECTIONS = ['general', 'online', 'access', 'perf', 'keys', 'midi', 'backup', 'reset'] as const
export type SectionId = (typeof SECTIONS)[number]

export const SECTION_TITLE: Record<SectionId, MessageKey> = {
  general: 'settings.general',
  online: 'settings.online',
  access: 'settings.access',
  perf: 'perf.title',
  keys: 'live.keys',
  midi: 'midi.title',
  backup: 'settings.backup',
  reset: 'settings.reset',
}

// Long explanations that belong to a whole section, under its title.
const SECTION_HINT: Partial<Record<SectionId, MessageKey>> = {
  online: 'settings.onlineHint',
  perf: 'perf.hint',
  keys: 'live.keyHint',
  backup: 'settings.backupHint',
}

const BODY: Record<Exclude<SectionId, 'midi'>, () => ReactNode> = {
  general: () => <General />,
  online: () => <Online />,
  access: () => <Accessibility />,
  perf: () => <Performance />,
  keys: () => <Shortcuts />,
  backup: () => <Backup />,
  reset: () => <Reset />,
}

// One section with its title. MIDI is a panel of its own, also shown elsewhere on phones.
export function SettingsSection({ id }: { id: SectionId }) {
  const t = useT()
  if (id === 'midi') return <Midi />
  const hint = SECTION_HINT[id]
  return (
    <section className={`panel settings-section settings-${id}`}>
      <header className="panel-head">
        <h2>{t(SECTION_TITLE[id])}</h2>
      </header>
      {hint && <Hint text={t(hint)} />}
      <div className="setting-rows">{BODY[id]()}</div>
    </section>
  )
}

// Phones: every section one after another, MIDI apart.
export function Settings() {
  return (
    <>
      {SECTIONS.filter((s) => s !== 'midi').map((s) => (
        <SettingsSection key={s} id={s} />
      ))}
    </>
  )
}
