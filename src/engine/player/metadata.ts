import { parseBlob, selectCover } from 'music-metadata'
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
  }
}

export function releaseMeta(meta: TrackMeta | null): void {
  if (meta?.cover) URL.revokeObjectURL(meta.cover)
}
