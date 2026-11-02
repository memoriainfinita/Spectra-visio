# SpectraVisio

Real-time audio visualizer for the browser: a music player with visuals, a VJ tool for live shows and a source for OBS. Everything runs locally, with no accounts and no telemetry.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

**Try it:** https://memoriainfinita.github.io/Spectra-visio/

## Features

- **Player:** files, folders or drag and drop; gapless playback, optional crossfade and volume levelling between tracks; tags and cover art; media keys; the queue survives a reload
- **Sources:** music from Audius into the list, microphone, tab or system audio (Chrome and Edge), internet radio from the radio-browser.info directory or any stream URL (needs CORS)
- **Analysis:** logarithmic bands in left, right and centre; beats per band; BPM with tap tempo; latency compensation. Files are pre-analysed in the background for tempo grid, sections and loudness
- **Visuals:** 21 built-in visualizations on a WebGL2 compositor, Milkdrop presets through Butterchurn, and imported ISF or Shadertoy shaders. Camera, video, image, a live TV channel from the iptv-org lists, or free videos and images from Wikimedia Commons and NASA as visual input
- **Modulation:** any parameter of a visualization or effect can follow a band, a beat, an oscillator or a MIDI control; up to 8 shared modulators with a Map mode that highlights the targets
- **Control:** an inspector at composition, layer and clip level; macro knobs with several targets each, range and invert, and launchable variations; a My panel grid for any control of the app; MIDI learn from the right-click menu; undo and redo; a Ctrl K search for controls and actions
- **Effects, presets and browser:** effect chains per layer and on the composition, colour palettes, saved and exported presets, three example scenes to try everything at once, thumbnails with categories, search and favourites
- **Live:** up to 8 layers with blend modes and an A/B crossfader, a clip grid, blackout, freeze and strobe, configurable shortcuts, MIDI learn and MIDI clock, auto mode, and an output window for a projector
- **Overlays:** track title, synced lyrics (LRC, or looked up on LRCLIB if turned on), text and logo
- **Output:** fixed resolutions up to 4K, recording to video with sound, and a transparent source for OBS through obs-websocket
- **Layout:** docks around the stage that move by dragging or from their menu, built-in layouts for a show, for preparing, for two screens and for laptops, saved layouts, a lock, and any dock in a window of its own
- **Everywhere:** installable and offline, touch gestures, keyboard access, photosensitivity notice with a flash limiter, adaptive quality, frame cap and low power mode, Spanish and English, and a backup file to move settings, presets, shaders, favourite stations and channels and saved layouts to another browser

Built and tested on Firefox and Chrome. Safari is untested.

Feature list and technical design, in Spanish: [docs/funciones.md](docs/funciones.md), [docs/arquitectura.md](docs/arquitectura.md).

## Run

Requires Node.js 20.19+ or 22.12+ and pnpm.

```bash
pnpm install
pnpm dev         # development server
pnpm test        # unit tests
pnpm typecheck
pnpm build       # production build in dist/
```

Every push to `main` runs the checks and, if they pass, publishes to GitHub Pages.

## License

GPL-3.0. See [LICENSE](LICENSE).

## Credits

Developed by [@memoriainfinita](https://github.com/memoriainfinita) with the assistance of Claude (Anthropic).

Milkdrop presets are by members of the Milkdrop community and are not covered by the GPL-3.0 license. See [NOTICE.md](NOTICE.md).
