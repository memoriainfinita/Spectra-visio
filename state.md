---
created: 2026-09-29
last_updated: 2026-10-10
---

# Spectra-visio — state

Qué es verdad ahora. Lo que ya pasó vive en `state-history.md`.

## Project

Visualizador de audio en tiempo real para navegador, en reconstrucción desde cero. Funciones en `docs/funciones.md`; diseño técnico y fases en `docs/arquitectura.md`.

## Status

- Fases 1 a 4 de 10 hechas. Fase 4 probada por mykl en su Firefox (2026-10-10). Base: TypeScript 7, React 19, Vite 8, Vitest 5, store propio, español e inglés, ajustes en IndexedDB, CI con despliegue a Pages
- Fase 2: reproductor con gapless y fundido, lista con archivos, carpetas y arrastre, etiquetas y carátula (`music-metadata`), Media Session; fuentes micrófono, pestaña o sistema y stream; ganancia de entrada y medidor de nivel; sesión que sobrevive a recargar (copias en OPFS opcionales, referencias en Chrome)
- Comprobado el 2026-10-10, silenciado, en Chrome headless (CDP) y Firefox (Playwright): gapless al sample, fundido de 2 s, pausa, atajos, micrófono falso, stream del mismo origen y error CORS, archivo roto, restauración tras recargar. 26 tests unitarios en verde
- Probado por mykl en su Firefox (2026-10-10): añadir carpeta, arrastrar archivos, reordenar y teclas multimedia funcionan. La captura de pestaña no existe en Firefox ni Safari (sin audio); la app ahora lo explica en vez de intentarlo
- Sin probar: captura de pestaña en Chrome o Edge, referencias de archivos de Chrome, pistas largas por `<audio>`, Safari, móvil
- Fase 3 (`src/engine/analysis/`, panel `src/ui/Analysis.tsx`): bandas logarítmicas configurables (8 a 64, de 20 Hz a 16 kHz) en L, R y centro; 7 bandas con nombre de subgraves a brillo; nivelado automático; suavizado por tiempo ajustable; golpes por banda y bombo; BPM estimado desde los golpes del bombo, con fiabilidad; tap tempo (botón y tecla T); fase del pulso; balance y correlación; retraso de los visuales = latencia que informa el navegador (opcional) + ajuste manual de -200 a +500 ms
- Comprobado el 2026-10-10, silenciado, en Firefox (Playwright) y Chrome del sistema (Playwright, headless) con un WAV de bombo a 120 BPM: 120 BPM con fiabilidad de 90 a 95 %, 9 destellos del bombo en 4 s, tap a ~100 BPM y vuelta al estimado, balance negativo con platos a la izquierda, bandas guardadas tras recargar, sin errores. Latencia informada: Firefox 22 ms, Chrome 50 ms. 54 tests unitarios en verde
- Probado por mykl en su Firefox con música real (2026-10-10): fase 3 correcta
- Sin probar: fase 3 en Safari (si informa `outputLatency`; sin él, la app ofrece solo el ajuste manual)
- Fase 4 (`src/engine/render/`, `src/engine/modulation/`, `src/engine/scene/`, paneles `Stage` y `Visuals`): canvas WebGL2 de salida con capas A y B, crossfader y 6 modos de fusión (normal, suma, trama, multiplicar, diferencia, aclarar); las 8 visualizaciones de la v0 portadas (plasma como shader GLSL, el resto en Canvas 2D subido como textura); parámetros comunes (velocidad, sensibilidad, intensidad, tono) y propios por visualización; modulación por banda, golpe (envolvente con caída) u oscilador (libre o al tempo), con cantidad, curva y suavizado, varias por parámetro y marca del valor efectivo en vivo; escena guardada en IndexedDB; pantalla completa con doble clic o botón
- Comprobado el 2026-10-10, silenciado, en Firefox (Playwright) y Chrome del sistema (Playwright, headless) con un WAV de 60 s: las 8 visualizaciones pintan y se mueven, los 6 modos de fusión dan resultados distintos, el crossfader en B muestra solo B, la modulación mueve su marca, la escena se recupera al recargar, sin errores. 69 tests unitarios en verde
- Fase 5, diseño aprobado por mykl el 2026-10-10: cuatro partes (efectos y paletas, transiciones, presets, navegador). Preset = una visualización con sus valores y modulaciones más la cadena de efectos; al cargarlo va a la capa seleccionada y sustituye los efectos
- Fase 5, parte 1 (`src/engine/effects/`, panel `src/ui/Effects.tsx`): cadena global tras el compositor, hasta 12 entradas, cada una activable, reordenable y modulable como los parámetros de las visualizaciones. Efectos: brillo difuso, realimentación, estelas, espejo, caleidoscopio, corrección de color, paleta (8 paletas, recolorea por brillo). Escena en versión 2; la 1 carga con la cadena vacía
- Comprobado el 2026-10-10, silenciado, en Firefox (Playwright) y Chrome del sistema (Playwright, headless): los 7 efectos pintan sin errores, espejo simétrico exacto en cada modo, paleta monocromo y saturación 0 sin color, orden, desactivar, modulación con marca en vivo y recuperación tras recargar. 76 tests unitarios en verde
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
- [ ] Probar la captura de pestaña en Chrome o Edge
- [ ] Probar stream con CORS real de otro dominio
- [ ] Fase 5: transiciones, presets, navegador de visualizaciones
