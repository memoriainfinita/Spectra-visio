import { TimestampFormat, parseBlob, selectCover, type ILyricsTag } from 'music-metadata'
import { parseLrc, toLrc } from '../overlay/lrc'
import type { TrackMeta } from './types'

export async function readMeta(file: File): Promise<TrackMeta> {
  const { common, format } = await parseBlob(file)
  const picture = selectCover(common.picture)
  return {
    title: common.title || undefined,
    artist: common.artist || common.albumartist || undefined,
    album: common.album || undefined,
    duration: format.duration && Number.isFinite(format.duration) ? format.duration : undefined,
    cover: picture ? URL.createObjectURL(new Blob([picture.data.slice()], { type: picture.format })) : undefined,
    lyrics: syncedLyrics(common.lyrics),
  }
}

// Synced lyrics in the tags: a timed lyrics frame (milliseconds), or plain lyrics that are
// themselves LRC, as many taggers write them. Unsynced lyrics are left out.
export function syncedLyrics(tags: ILyricsTag[] | undefined): string | undefined {
  for (const tag of tags ?? []) {
    if (tag.timeStampFormat === TimestampFormat.milliseconds && tag.syncText?.length) {
      const lrc = toLrc(tag.syncText)
      if (lrc) return lrc
    }
    if (tag.text && parseLrc(tag.text).length) return tag.text
  }
  return undefined
}

export function releaseMeta(meta: TrackMeta | null): void {
  if (meta?.cover) URL.revokeObjectURL(meta.cover)
}
