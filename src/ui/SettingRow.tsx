import type { ReactNode } from 'react'
import { Hint } from './Hint'

// One option: its name with a short line under it on the left, its control on the right.
// The control carries its own label; the row only lays them out.
export function Row({ title, desc, hint, children }: { title: string; desc?: ReactNode; hint?: string; children?: ReactNode }) {
  return (
    <div className="setting-row">
      <div className="setting-text">
        <div className="setting-title">{title}</div>
        {desc && <p className="setting-desc">{desc}</p>}
        {hint && <Hint text={hint} />}
      </div>
      {children && <div className="setting-control">{children}</div>}
    </div>
  )
}

// An on and off option, as a switch.
export function Switch({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="switch-hit">
      <input type="checkbox" role="switch" className="switch" aria-label={label} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}
