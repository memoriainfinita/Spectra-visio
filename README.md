# SpectraVisio

Real-time audio visualizer for the browser, being rebuilt from scratch.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

## Status

Phase 1 of 10: TypeScript, React and Vite base, settings storage, Spanish and English interface, deployment to GitHub Pages. There is no visualizer in this version yet.

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
