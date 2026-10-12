// Volume levelling between tracks: every analysed track is brought to the same loudness.
// Loud tracks come down as far as needed; quiet ones go up only while their peak stays
// under full scale, so nothing clips.

export const LEVEL_TARGET = -14
// Most a quiet track is raised, and how far below full scale its peak has to stay.
export const LEVEL_MAX_BOOST = 6
export const LEVEL_HEADROOM = 1
export const LEVEL_MAX_CUT = 18

// dB to add to a track of this loudness (LUFS) and sample peak (dBFS).
export function levelGain(loudness: number, peak: number | null): number {
  const gain = LEVEL_TARGET - loudness
  if (gain <= 0) return Math.max(gain, -LEVEL_MAX_CUT)
  // Without a known peak it is not raised.
  const room = peak === null ? 0 : -LEVEL_HEADROOM - peak
  return Math.max(0, Math.min(gain, LEVEL_MAX_BOOST, room))
}
