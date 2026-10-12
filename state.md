---
created: 2026-09-29
last_updated: 2026-10-12
---

# Spectra-visio — state

Qué es verdad ahora. Lo que ya pasó vive en `state-history.md`.

## Project

Visualizador de audio en tiempo real para navegador, reconstruido desde cero en 10 fases. Funciones en `docs/funciones.md`; diseño técnico en `docs/arquitectura.md`.

## Status

- App completa: las 10 fases de `docs/arquitectura.md` y la disposición de escritorio con pestañas laterales (diseño B, aprobado por mykl el 2026-10-12; lienzo en https://claude.ai/artifact/YQZeJBzbvudQkcqn84u8ow). Base: TypeScript 7, React 19, Vite 8, Vitest 5, store propio, español e inglés, ajustes en IndexedDB, CI con despliegue a Pages
- Funciones de `docs/funciones.md` sin hacer: directorio de radios por internet (B; solo hay URL de stream) y normalización de volumen entre pistas (A; la sonoridad medida por el análisis previo solo fija el nivel del análisis)
- Probado por mykl en su Firefox: fases 2 a 8 (2026-10-10 y 2026-10-11) y la disposición de escritorio (2026-10-12)
- Pendiente de la revisión de mykl: fase 9 (OBS real, grabación) y fase 10 (móvil real, instalar la app, calidad adaptativa en su equipo)
- Comprobado por Claude, silenciado, en Chrome y Firefox con Playwright: todas las fases, con el detalle de cada una en `state-history.md` (2026-10-12). 150 tests unitarios en verde
- Sin probar: Safari (nada, tampoco `outputLatency`); captura de pestaña en Chrome o Edge; referencias de archivos de Chrome; pistas largas por `<audio>`; stream de otro dominio con CORS real; MIDI con un dispositivo real y con el permiso de Firefox; dos pantallas reales; OBS real y desde GitHub Pages; grabación: sincronía a ojo, Firefox con ventana, sesiones largas; móvil real; instalar la app; calidad adaptativa con una GPU lenta real
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
- [ui] El escenario no se vuelve a montar al cambiar de disposición: la pantalla completa cruza el límite de 800 px y un escenario nuevo la cerraría. Confirmed 2026-10.
- [test] Pruebas en navegador siempre silenciadas: Chrome `--mute-audio`, Firefox `media.volume_scale` a 0. Confirmed 2026-10.
- [test] Música real para calibrar: pistas CC BY de incompetech, decodificadas con ffmpeg a f32 para probar el análisis en Node. Confirmed 2026-10.
- [test] Capturas del canvas WebGL leídas con `toDataURL` dentro de `requestAnimationFrame`: la captura de elemento de Playwright en Firefox headless puede devolver un fotograma viejo. Confirmed 2026-10.

## TODO

Las revisiones y pruebas manuales pendientes se harán todas juntas en una sola ronda, cuando mykl lo diga (2026-10-12).

- [ ] Al terminar la app: repo público, activar Pages con origen GitHub Actions (`gh api -X POST repos/memoriainfinita/Spectra-visio/pages -f build_type=workflow`) y push
- [ ] Probar la captura de pestaña en Chrome o Edge
- [ ] Probar stream con CORS real de otro dominio
- [ ] Probar MIDI con un controlador real
- [ ] Revisión de la fase 9 por mykl (OBS real, grabación en su Firefox)
- [ ] Revisión de la fase 10 por mykl (móvil real, instalar la app, calidad adaptativa en su equipo)
- [ ] Al publicar: comprobar la conexión a OBS desde GitHub Pages (permiso de red local)
