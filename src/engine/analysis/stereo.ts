export interface StereoStats {
  rmsL: number
  rmsR: number
  // -1 all left, 0 centred, 1 all right.
  balance: number
  // 1 mono, 0 unrelated channels, -1 opposite phase.
  correlation: number
}

export function stereoStats(l: Float32Array, r: Float32Array, out: StereoStats): StereoStats {
  let ll = 0
  let rr = 0
  let lr = 0
  const n = Math.min(l.length, r.length)
  for (let i = 0; i < n; i++) {
    ll += l[i] * l[i]
    rr += r[i] * r[i]
    lr += l[i] * r[i]
  }
  out.rmsL = n ? Math.sqrt(ll / n) : 0
  out.rmsR = n ? Math.sqrt(rr / n) : 0
  const sum = out.rmsL + out.rmsR
  out.balance = sum > 1e-6 ? (out.rmsR - out.rmsL) / sum : 0
  const norm = Math.sqrt(ll * rr)
  out.correlation = norm > 1e-12 ? lr / norm : 0
  return out
}
