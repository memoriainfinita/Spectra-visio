import { describe, expect, test } from 'vitest'
import { commonsItems, nasaItems, pickDerivative, pickNasaFile } from './media'

const W = 'https://upload.wikimedia.org/wikipedia/commons'

describe('media', () => {
  test('Commons video: the WebM copy closest to 720 lines without going over', () => {
    const d = [
      { src: `${W}/a/ab/F.webm?utm_content=original`, type: 'video/webm; codecs="vp9"', height: 2160 },
      { src: `${W}/transcoded/a/ab/F.webm/F.webm.480p.vp9.webm`, type: 'video/webm; codecs="vp9"', height: 480 },
      { src: `${W}/transcoded/a/ab/F.webm/F.webm.360p.mpeg4.mov`, type: 'video/quicktime', height: 360 },
      { src: `${W}/transcoded/a/ab/F.webm/F.webm.1080p.vp9.webm`, type: 'video/webm; codecs="vp9"', height: 1080 },
      { src: `${W}/transcoded/a/ab/F.webm/F.webm.720p.vp9.webm`, type: 'video/webm; codecs="vp9"', height: 720 },
    ]
    expect(pickDerivative(`${W}/a/ab/F.webm`, d)).toBe(`${W}/transcoded/a/ab/F.webm/F.webm.720p.vp9.webm`)
    expect(pickDerivative(`${W}/a/ab/F.webm`, [])).toBe(`${W}/a/ab/F.webm`)
  })

  test('Commons image: a 1920 wide copy of a large original, the original of a small one', () => {
    const page = (width: number) => ({ query: { pages: { '1': { pageid: 1, title: 'File:Flame Nebula.jpg', imageinfo: [{ url: `${W}/f/f9/N.jpg`, thumburl: `${W}/thumb/f/f9/N.jpg/320px-N.jpg`, descriptionurl: 'https://commons.wikimedia.org/wiki/File:N.jpg', width }] } } } })
    expect(commonsItems(page(12564), 'image')[0]).toMatchObject({ title: 'Flame Nebula', url: `${W}/thumb/f/f9/N.jpg/1920px-N.jpg`, thumb: `${W}/thumb/f/f9/N.jpg/320px-N.jpg` })
    expect(commonsItems(page(800), 'image')[0].url).toBe(`${W}/f/f9/N.jpg`)
  })

  test('NASA: items over https, and the medium video or large image of an asset', () => {
    const items = nasaItems({ collection: { items: [{ href: 'https://images-assets.nasa.gov/video/S/collection.json', data: [{ nasa_id: 'S', title: 'Steve' }], links: [{ href: 'http://images-assets.nasa.gov/video/S/S~small.jpg', rel: 'preview' }] }, { data: [{ title: 'no id' }] }] } }, 'video')
    expect(items).toEqual([{ source: 'nasa', type: 'video', id: 'S', title: 'Steve', thumb: 'https://images-assets.nasa.gov/video/S/S~small.jpg', url: 'https://images-assets.nasa.gov/video/S/collection.json', page: 'https://images.nasa.gov/details/S' }])
    const files = ['http://x/S~orig.mp4', 'http://x/S~medium.mp4', 'http://x/S~small.mp4', 'http://x/S~large.jpg']
    expect(pickNasaFile(files, 'video')).toBe('https://x/S~medium.mp4')
    expect(pickNasaFile(files, 'image')).toBe('https://x/S~large.jpg')
    expect(pickNasaFile(['http://x/S.vtt'], 'video')).toBeNull()
  })
})
