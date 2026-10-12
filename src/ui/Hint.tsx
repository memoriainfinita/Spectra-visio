import { useT } from './useT'

// Up to one short line shows as it is.
const SHORT = 90

// A panel's explanation. Short ones show as they are; longer ones fold behind a button, so
// the controls are not buried in text.
export function Hint({ text }: { text: string }) {
  const t = useT()
  if (text.length <= SHORT) return <p className="muted small">{text}</p>
  return (
    <details className="hint">
      <summary className="muted small">
        <span className="hint-mark" aria-hidden="true">
          ?
        </span>
        {t('hint.more')}
      </summary>
      <p className="muted small">{text}</p>
    </details>
  )
}
