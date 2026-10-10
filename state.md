---
created: 2026-09-29
last_updated: 2026-10-10
---

# Spectra-visio — state

Qué es verdad ahora. Lo que ya pasó vive en `state-history.md`.

## Project

Visualizador de audio en tiempo real para navegador, con arquitectura de plugins. Vite 5, JavaScript sin framework, versión 0.1.0.

## Status

- Fuentes: micrófono (sin filtros de voz), archivo y stream por URL (exige CORS). Pausa, parada y fin de archivo gestionados
- Ocho visualizaciones: `tunnel`, `ribbons`, `plasma`, `oscilloscope`, `kaleido`, `orbitals`, `gridwarp`, `strobebloom`, más `idle` sin fuente
- Probado en Chrome headless por CDP (2026-10-10): todos los modos a ~60 fps en 1600x900, salvo `gridwarp` (~50); fuentes, teclado y errores sin excepciones en consola
- README reescrito según lo implementado; especificación original y prototipo en `docs/archive/`
- Revisión del 2026-10-10 probada por mykl en Firefox y en commit
- Rediseño en curso: lista de funciones confirmada y ampliada en `docs/funciones.md`; se publicará en GitHub Pages; falta el diseño técnico antes de implementar

## Patterns

- [render] Animación por tiempo: los plugins usan `data.dt`; velocidades que dependen del audio van en acumuladores de fase. Confirmed 2026-10.
- [render] Estelas con `fade()` de `BaseVisualizer`, siempre a negro. Confirmed 2026-10.
- [plugins] Visualización nueva: clase que extiende `BaseVisualizer` y entrada en `MODES` de `src/main.js`. Confirmed 2026-10.
- [pnpm] pnpm 11 con `allowBuilds: esbuild: false` en `pnpm-workspace.yaml`, como nona y sadhana. Confirmed 2026-10.

## TODO

- [ ] Diseño técnico de la base (motor de render, parámetros y modulación, almacenamiento, i18n) y orden de implementación
- [ ] Probar stream con CORS real
