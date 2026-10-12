import { describe, expect, test } from 'vitest'
import { parseGroups, parsePlaylist } from './tv'

// Lines as PLAYLISTS.md and the playlists had them on 2026-10-12.
const MD = `### Grouped by category
    <tr><td>Music</td><td align="right">872</td><td nowrap><code>https://iptv-org.github.io/iptv/categories/music.m3u</code></td></tr>
    <tr><td>XXX</td><td align="right">0</td><td nowrap><code>https://iptv-org.github.io/iptv/categories/xxx.m3u</code></td></tr>
    <tr><td>Undefined</td><td align="right">1502</td><td nowrap><code>https://iptv-org.github.io/iptv/categories/undefined.m3u</code></td></tr>
    <tr><td align="left">Spanish</td><td align="right">1200</td><td align="left" nowrap><code>https://iptv-org.github.io/iptv/languages/spa.m3u</code></td></tr>
- 🇦🇱 Albania <code>https://iptv-org.github.io/iptv/countries/al.m3u</code>
  - Fier <code>https://iptv-org.github.io/iptv/subdivisions/al-04.m3u</code>
- 🇪🇸 Spain <code>https://iptv-org.github.io/iptv/countries/es.m3u</code>
- Northern Europe <code>https://iptv-org.github.io/iptv/regions/neu.m3u</code>
`

const M3U = `#EXTM3U
#EXTINF:-1 tvg-id="3CatExclusiu1.es@SD" tvg-logo="https://i.imgur.com/YQvLPT1.png" group-title="News;Public",3Cat Exclusiu 1 (1080p) [Geo-blocked]
https://example.test/3cat/master.m3u8
#EXTINF:-1 tvg-id="12tv.es@SD" tvg-logo="https://i.imgur.com/VSTgXsh.png" http-referrer="https://player.test/" group-title="General",12tv (720p)
#EXTVLCOPT:http-referrer=https://player.test/
https://example.test/12tv.m3u8
#EXTINF:-1 tvg-id="Plain.es@SD" group-title="Undefined",Plain, with a comma
http://example.test/plain.m3u8
#EXTINF:-1 tvg-id="Music.es@SD" group-title="Music",Música 24h
https://example.test/music.m3u8
#EXTINF:-1 tvg-id="Music.es@SD" group-title="Music",Música 24h copy
https://example.test/music.m3u8
`

describe('tv groups', () => {
  test('categories, languages and countries, without empty, undefined, subdivisions or regions', () => {
    const g = parseGroups(MD)
    expect(g.map((x) => `${x.by}:${x.id}:${x.name}:${x.count}`)).toEqual(['category:music:Music:872', 'language:spa:Spanish:1200', 'country:al:Albania:0', 'country:es:Spain:0'])
    expect(g[0].url).toBe('https://iptv-org.github.io/iptv/categories/music.m3u')
  })
})

describe('tv playlist', () => {
  test('https streams without request headers, once each, with quality and labels apart', () => {
    const c = parsePlaylist(M3U)
    expect(c.map((x) => x.name)).toEqual(['3Cat Exclusiu 1', 'Música 24h'])
    expect(c[0]).toMatchObject({ quality: '1080p', labels: ['Geo-blocked'], categories: ['News', 'Public'], url: 'https://example.test/3cat/master.m3u8' })
    expect(c[1]).toMatchObject({ quality: '', labels: [], categories: ['Music'] })
  })

  test('a title with commas keeps them', () => {
    const c = parsePlaylist('#EXTINF:-1 group-title="Music",Rock, Pop & Más\nhttps://e.test/a.m3u8\n')
    expect(c[0].name).toBe('Rock, Pop & Más')
  })
})
