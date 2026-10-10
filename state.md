---
created: 2026-09-29
last_updated: 2026-10-10
---

# Spectra-visio — state

Qué es verdad ahora. Lo que ya pasó vive en `state-history.md`.

## Project

Visualizador de audio en tiempo real para navegador, en reconstrucción desde cero. Funciones en `docs/funciones.md`; diseño técnico y fases en `docs/arquitectura.md`.

## Status

- Fases 1 y 2 de 10 hechas. Base: TypeScript 7, React 19, Vite 8, Vitest 5, store propio, español e inglés, ajustes en IndexedDB, CI con despliegue a Pages
- Fase 2: reproductor con gapless y fundido, lista con archivos, carpetas y arrastre, etiquetas y carátula (`music-metadata`), Media Session; fuentes micrófono, pestaña o sistema y stream; ganancia de entrada y medidor de nivel; sesión que sobrevive a recargar (copias en OPFS opcionales, referencias en Chrome)
- Comprobado el 2026-10-10, silenciado, en Chrome headless (CDP) y Firefox (Playwright): gapless al sample, fundido de 2 s, pausa, atajos, micrófono falso, stream del mismo origen y error CORS, archivo roto, restauración tras recargar. 26 tests unitarios en verde
- Sin probar: captura de pestaña o sistema, añadir carpeta, arrastrar archivos y reordenar arrastrando, referencias de archivos de Chrome (la prueba forzó el selector clásico), pistas largas por `<audio>`, teclas multimedia reales, Safari, móvil
- Aún no hay visualizaciones
- La versión anterior (canvas, 8 visualizaciones) está en `.archive/v0/`, fuera de git, y en el historial hasta `7a63da1`
- Repo privado en GitHub, Pages sin activar. Se publicará al terminar la app (decisión de mykl, 2026-10-10)

## Patterns

- [render] Animación por tiempo: todo lo que se mueve depende del tiempo entre fotogramas; las velocidades que dependen del audio se acumulan en fases. Confirmed 2026-10.
- [render] Estelas por fundido siempre a negro: con alfa baja el redondeo de 8 bits deja residuo visible sobre otros fondos. Confirmed 2026-10.
- [pnpm] pnpm 11 con `allowBuilds: esbuild: false` en `pnpm-workspace.yaml`, como nona y sadhana. Confirmed 2026-10.
- [stack] Base como nona: tsconfig estricto, `base: './'` en Vite, CI que publica en Pages solo si pasan typecheck, tests y build. Confirmed 2026-10.
- [audio] Reproducción desde audio decodificado y programada en tiempo del AudioContext; `<audio>` solo para pistas largas. Confirmed 2026-10.
- [audio] Toda acción del reproductor incrementa un contador de operación; el trabajo asíncrono iniciado con un valor anterior se descarta. Confirmed 2026-10.
- [ui] Deslizadores que disparan trabajo caro: valor local mientras se arrastra y acción en el `change` nativo. Confirmed 2026-10.
- [test] Pruebas en navegador siempre silenciadas: Chrome `--mute-audio`, Firefox `media.volume_scale` a 0. Confirmed 2026-10.

## TODO

- [ ] Al terminar la app: repo público, activar Pages con origen GitHub Actions (`gh api -X POST repos/memoriainfinita/Spectra-visio/pages -f build_type=workflow`) y push
- [ ] Revisión de mykl de la fase 2 en su Firefox: añadir carpeta, arrastrar, teclas multimedia, captura de pestaña
- [ ] Probar stream con CORS real de otro dominio
- [ ] Fase 3: análisis (bandas logarítmicas, golpes, BPM, estéreo, suavizado) y compensación de latencia
