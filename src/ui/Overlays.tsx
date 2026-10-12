import { FileText, ImagePlus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { player } from '../app/engine'
import { loadLyrics, lyricsSource, lyricsStore, removeLyrics } from '../app/lyrics'
import { logoStore, removeLogo, setLogo, setOverlay, setOverlayStyle } from '../app/overlays'
import { sceneStore } from '../app/scene'
import { ANCHORS, FONTS, HOLD_MAX, SIZE_MAX, SIZE_MIN, TEXT_MAX, type OverlayItem, type OverlayKind } from '../engine/overlay/settings'
import type { MessageKey } from '../i18n'
import { Hint } from './Hint'
import { useStore } from './useStore'
import { useT } from './useT'

// Visibility, place, size and opacity: the same for every overlay.
function ItemControls({ kind, item }: { kind: OverlayKind; item: OverlayItem }) {
  const t = useT()
  const name = t(kind === 'title' ? 'overlay.titleItem' : (`overlay.${kind}` as MessageKey))
  return (
    <>
      <label className="check">
        <input type="checkbox" checked={item.enabled} onChange={(e) => setOverlay(kind, { enabled: e.target.checked })} />
        <span>{t('overlay.show', { name })}</span>
      </label>
      <div className="overlay-grid">
        <label className="field">
          <span>{t('overlay.position')}</span>
          <select aria-label={t('overlay.positionOf', { name })} value={item.anchor} onChange={(e) => setOverlay(kind, { anchor: Number(e.target.value) })}>
            {ANCHORS.map((a, i) => (
              <option key={a} value={i}>
                {t(`anchor.${a}` as MessageKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('overlay.size')}</span>
          <input type="range" aria-label={t('overlay.sizeOf', { name })} min={SIZE_MIN} max={SIZE_MAX} step={0.05} value={item.size} onChange={(e) => setOverlay(kind, { size: Number(e.target.value) })} />
        </label>
        <label className="field">
          <span>{t('overlay.opacity')}</span>
          <input type="range" aria-label={t('overlay.opacityOf', { name })} min={0} max={1} step={0.01} value={item.opacity} onChange={(e) => setOverlay(kind, { opacity: Number(e.target.value) })} />
        </label>
      </div>
    </>
  )
}

export function Overlays() {
  const t = useT()
  const o = useStore(sceneStore, (s) => s.overlays)
  const logo = useStore(logoStore)
  const ps = useStore(player.state)
  useStore(lyricsStore)
  const track = ps.tracks.find((x) => x.id === ps.currentId)
  const source = lyricsSource(track)
  const [lrcError, setLrcError] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const lrcInput = useRef<HTMLInputElement>(null)
  const logoInput = useRef<HTMLInputElement>(null)

  return (
    <section className="panel overlays">
      <header className="panel-head">
        <h2>{t('overlay.title')}</h2>
      </header>

      <div className="overlay-grid">
        <label className="field">
          <span>{t('overlay.font')}</span>
          <select value={o.font} onChange={(e) => setOverlayStyle({ font: Number(e.target.value) })}>
            {FONTS.map((f, i) => (
              <option key={f} value={i}>
                {t(`font.${f}` as MessageKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('overlay.color')}</span>
          <input type="color" value={o.color} onChange={(e) => setOverlayStyle({ color: e.target.value })} />
        </label>
      </div>

      <fieldset className="overlay-item">
        <legend>{t('overlay.titleItem')}</legend>
        <ItemControls kind="title" item={o.title} />
        <label className="field">
          <span>{t('overlay.hold')}</span>
          <input type="range" min={0} max={HOLD_MAX} step={1} value={o.title.hold} onChange={(e) => setOverlay('title', { hold: Number(e.target.value) })} />
          <span className="mono">{o.title.hold > 0 ? `${o.title.hold} s` : t('overlay.always')}</span>
        </label>
      </fieldset>

      <fieldset className="overlay-item">
        <legend>{t('overlay.lyrics')}</legend>
        <ItemControls kind="lyrics" item={o.lyrics} />
        <p className="small muted">{track ? t(`overlay.lyricsFrom.${source ?? 'none'}` as MessageKey, { name: track.meta?.title || track.name }) : t('overlay.noTrack')}</p>
        <div className="head-actions">
          <button className="btn" disabled={!track} onClick={() => lrcInput.current?.click()}>
            <FileText size={15} /> {t('overlay.loadLrc')}
          </button>
          {source === 'file' && track && (
            <button className="btn" onClick={() => removeLyrics(track.id)}>
              <X size={15} /> {t('overlay.removeLrc')}
            </button>
          )}
          <input
            ref={lrcInput}
            type="file"
            accept=".lrc,text/plain"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file && track) void loadLyrics(track.id, file).then((ok) => setLrcError(!ok))
            }}
          />
        </div>
        <Hint text={t('overlay.lrcHint')} />
        {lrcError && (
          <p className="error" role="alert">
            {t('overlay.badLrc')}
          </p>
        )}
      </fieldset>

      <fieldset className="overlay-item">
        <legend>{t('overlay.text')}</legend>
        <ItemControls kind="text" item={o.text} />
        <textarea aria-label={t('overlay.text')} rows={2} maxLength={TEXT_MAX} value={o.text.content} onChange={(e) => setOverlay('text', { content: e.target.value })} />
      </fieldset>

      <fieldset className="overlay-item">
        <legend>{t('overlay.logo')}</legend>
        <ItemControls kind="logo" item={o.logo} />
        <div className="head-actions">
          <button className="btn" onClick={() => logoInput.current?.click()}>
            <ImagePlus size={15} /> {t('overlay.chooseLogo')}
          </button>
          {logo.image && (
            <button className="btn" onClick={removeLogo}>
              <X size={15} /> {t('overlay.removeLogo')}
            </button>
          )}
          <input
            ref={logoInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void setLogo(file).then((ok) => setLogoError(!ok))
            }}
          />
        </div>
        <p className="small muted">{logo.image ? logo.name : t('overlay.noLogo')}</p>
        {logoError && (
          <p className="error" role="alert">
            {t('overlay.badLogo')}
          </p>
        )}
      </fieldset>
    </section>
  )
}
