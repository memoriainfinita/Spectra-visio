---
created: 2026-09-29
last_updated: 2026-10-10
---

# Spectra-visio — state

Qué es verdad ahora. Lo que ya pasó vive en `state-history.md`.

## Project

Visualizador de audio en tiempo real para navegador, con arquitectura de plugins. Vite 5, JavaScript sin framework, versión 0.1.0.

## Status

- Implementado: `audioEngine`, `pluginManager`, `capabilities` y `baseVisualizer`, más cinco plugins: `idle`, `tunnel`, `plasma`, `ribbons` y `oscilloscope`
- `oscilloscope` arreglado el 2026-09-27: no recibía `canvas` y `ctx`
- Capturas del README en `docs/`, generadas con una pista sintética
- Los `SpectraVisio_*.md` son la especificación (PRD, TDD, API, visualizaciones), no lo implementado. El README describe 18+ visualizaciones y un stack con Webpack 5 y Jest que no coinciden con `package.json`
- `claude.md` es una guía de prompts, no de estado
- Remoto público en GitHub, `main` sincronizada

## TODO

- [ ] Revisar el slop: el README describe 18+ visualizaciones y Webpack/Jest que no existen
