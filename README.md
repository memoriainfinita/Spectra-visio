# SpectraVisio

Real-time audio visualizer for the browser, being rebuilt from scratch.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

## Status

Phase 2 of 10: audio engine and player. There is no visualizer in this version yet.

- Player: queue from files, folders or drag and drop; gapless playback and optional crossfade; seek, volume, shuffle, repeat; tags and cover art; media keys
- Sources: microphone (device choice, no voice processing), tab or system audio, stream URL (needs CORS)
- Input gain and a level meter of what the analysers receive; volume does not change the analysis
- The queue, position and player options survive a reload: files can be kept in the app's storage (opt-in), and Chrome can also reopen the originals

- Features: [docs/funciones.md](docs/funciones.md) (Spanish)
- Technical design and phases: [docs/arquitectura.md](docs/arquitectura.md) (Spanish)
- The previous canvas version (8 visualizations, microphone, file and stream input) is in the git history up to commit `7a63da1`

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
