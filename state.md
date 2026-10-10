---
created: 2026-09-29
last_updated: 2026-10-10
---

# Spectra-visio — state

Qué es verdad ahora. Lo que ya pasó vive en `state-history.md`.

## Project

Visualizador de audio en tiempo real para navegador, en reconstrucción desde cero. Funciones en `docs/funciones.md`; diseño técnico y fases en `docs/arquitectura.md`.

## Status

- Fase 1 de 10 hecha: TypeScript 7, React 19, Vite 8, Vitest 5; store propio, idiomas español e inglés, ajustes en IndexedDB, CI con despliegue a GitHub Pages
- Comprobado el 2026-10-10: typecheck, 9 tests y build en verde; en Chrome headless el idioma se detecta, cambia y persiste tras recargar, sin errores
- Aún no hay visualizador: la página es un armazón con selector de idioma
- La versión anterior (canvas, 8 visualizaciones) está en `.archive/v0/`, fuera de git, y en el historial hasta `7a63da1`
- Sin push: GitHub Pages aún no está activado en el repo

## Patterns

- [render] Animación por tiempo: todo lo que se mueve depende del tiempo entre fotogramas; las velocidades que dependen del audio se acumulan en fases. Confirmed 2026-10.
- [render] Estelas por fundido siempre a negro: con alfa baja el redondeo de 8 bits deja residuo visible sobre otros fondos. Confirmed 2026-10.
- [pnpm] pnpm 11 con `allowBuilds: esbuild: false` en `pnpm-workspace.yaml`, como nona y sadhana. Confirmed 2026-10.
- [stack] Base como nona: tsconfig estricto, `base: './'` en Vite, CI que publica en Pages solo si pasan typecheck, tests y build. Confirmed 2026-10.

## TODO

- [ ] Activar GitHub Pages (origen: GitHub Actions) y hacer push
- [ ] Fase 2: motor de audio nuevo, reproductor completo, metadatos, fuentes
- [ ] Probar stream con CORS real (fase 2)
