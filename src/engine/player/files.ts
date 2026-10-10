// Which files the player accepts. Files read from folders often come without a MIME type,
// so the extension decides when the type is empty.
const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'aac', 'mp4', 'ogg', 'oga', 'opus', 'flac', 'wav', 'webm', 'weba', 'aif', 'aiff']

export function isAudioFile(file: { name: string; type: string }): boolean {
  if (file.type.startsWith('audio/')) return true
  if (file.type !== '' && file.type !== 'video/mp4' && file.type !== 'video/webm' && file.type !== 'application/ogg') return false
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  return AUDIO_EXTENSIONS.includes(ext)
}

// "03 - Song name.mp3" -> "03 - Song name": shown until the tags are read.
export function baseName(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

// Natural order so "2 - x" comes before "10 - x" when adding a folder.
export function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
}

export function isLyricsFile(file: { name: string }): boolean {
  return file.name.toLowerCase().endsWith('.lrc')
}

// Lyrics file for each audio file with the same name, ignoring case and extension:
// audio index → lyrics index.
export function matchLyrics(audio: readonly { name: string }[], lyrics: readonly { name: string }[]): Map<number, number> {
  const byBase = new Map(lyrics.map((l, i) => [baseName(l.name).toLowerCase(), i]))
  const out = new Map<number, number>()
  audio.forEach((a, i) => {
    const j = byBase.get(baseName(a.name).toLowerCase())
    if (j !== undefined) out.set(i, j)
  })
  return out
}
