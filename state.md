---
created: 2026-09-29
last_updated: 2026-10-13
---

# Spectra-visio — state

Qué es verdad ahora. Lo que ya pasó vive en `state-history.md`.

## Project

Visualizador de audio en tiempo real para navegador, reconstruido desde cero en 10 fases. Funciones en `docs/funciones.md`; diseño técnico en `docs/arquitectura.md`.

## Status

- App completa: las 10 fases de `docs/arquitectura.md` y la disposición de escritorio con pestañas laterales (diseño B, aprobado por mykl el 2026-10-12; lienzo en https://claude.ai/artifact/YQZeJBzbvudQkcqn84u8ow). Base: TypeScript 7, React 19, Vite 8, Vitest 5, store propio, español e inglés, ajustes en IndexedDB, CI con despliegue a Pages
- Todas las funciones de `docs/funciones.md` están hechas. Las dos últimas, del 2026-10-12: «Igualar volumen» entre pistas (A) y el directorio de radios en la fuente Stream (B, diseño aprobado por mykl ese día)
- Pestaña Ajustes (general, accesibilidad, rendimiento, atajos, copia de seguridad, restablecer), textos de ayuda largos plegados y marca «sin análisis» en las emisoras encontradas: propuestos y aprobados por mykl el 2026-10-12
- Aprobado por mykl el 2026-10-12, en este orden: sonido de los canales de TV (hecho), música de Audius (hecho), buscador de vídeo e imagen de Wikimedia Commons y NASA en la entrada visual (hecho; NASA solo vídeo), letras de LRCLIB y carátulas de MusicBrainz y Cover Art Archive (hecho, opcional y desactivado por defecto)
- Control del vídeo en la entrada visual (pausa, posición, recorte, bucle, velocidad): aprobado por mykl el 2026-10-12
- TV en directo de iptv-org como entrada visual, con grupos de su PLAYLISTS.md, comprobación en segundo plano y favoritos: aprobado por mykl el 2026-10-12
- Rediseño de la interfaz: diseño aprobado por mykl el 2026-10-13 («me gusta»), sin implementar. Lienzo: https://claude.ai/artifact/FBhdK7Ax88cCEdWscXNa1X, tableros «A2 con muelles» (en uso y moviendo un panel). Decisiones:
  - Una sola interfaz, sin modos Preparar y Directo: en directo se puede editar todo. Lo de directo siempre a la vista, lo seleccionado a un clic, lo de preparar tras un menú o una biblioteca
  - Base A2: barra superior (transporte, fuente de audio desplegable, BPM y tap, diseños guardados, buscador, estado de grabación y OBS, Ajustes); zona izquierda Capas y Bibliotecas; centro escenario, rejilla de clips (capas × columnas 1–9) y Mi panel; zona derecha Inspector, Audio y Moduladores
  - Inspector por niveles Composición, Capa y Clip, como Resolume, con 4 mandos propios por nivel y secciones plegables (visualización, parámetros, efectos, modulación, entrada visual y vídeo, preset)
  - Muelles por zonas, no flotantes: se sueltan como pestaña, debajo partiendo una zona, en la franja bajo el escenario o en otra ventana; el escenario nunca se tapa. Diseños guardados (Directo, Preparar, Dos pantallas), bloquear y restablecer
  - Mi panel: rejilla de 8 × 2 donde se arrastra cualquier control de la app (botones, crossfader, mandos, variaciones)
  - Panel de mandos tipo Resolume y macros de Ableton: varios destinos por mando con rango e inversión, nombre, aprender MIDI, variaciones lanzables
  - Moduladores compartidos tipo Bitwig (LFO, banda, golpe) con «Mapear» que resalta destinos, lista de asignaciones y banda de modulación en cada parámetro; las modulaciones por parámetro actuales siguen funcionando
  - Buscador Ctrl K de controles y acciones; Ctrl Z deshace parámetros, efectos, capas y mandos; confirmación solo en lo destructivo
  - Pendiente de dibujar: el diseño para portátil de 1280 × 800 (inspector como pestaña junto a Capas)
  - Orden de implementación propuesto, por confirmar: 1 muelles y diseños guardados, 2 inspector por niveles, 3 panel de mandos con variaciones, 4 moduladores compartidos, 5 buscador y deshacer
- Probado por mykl en su Firefox: fases 2 a 8 (2026-10-10 y 2026-10-11) y la disposición de escritorio (2026-10-12)
- Pendiente de la revisión de mykl: fase 9 (OBS real, grabación) y fase 10 (móvil real, instalar la app, calidad adaptativa en su equipo)
- Comprobado por Claude, silenciado, en Chrome y Firefox con Playwright: todas las fases, con el detalle de cada una en `state-history.md` (2026-10-12). Las comprobaciones viven en `tests/e2e/` y se pasan con `pnpm e2e`. 170 tests unitarios en verde
- Sin probar: escuchar a oído emisoras reales del directorio (con emisoras reales, Claude solo comprobó buscar, la comprobación en segundo plano y el arranque); Safari (nada, tampoco `outputLatency`); captura de pestaña en Chrome o Edge; referencias de archivos de Chrome; pistas largas por `<audio>`; stream de otro dominio con CORS real; MIDI con un dispositivo real y con el permiso de Firefox; dos pantallas reales; OBS real y desde GitHub Pages; grabación: sincronía a ojo, Firefox con ventana, sesiones largas; móvil real; instalar la app; calidad adaptativa con una GPU lenta real
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
- [test] En cada iteración, solo las comprobaciones de lo tocado (`pnpm e2e radio settings`, unos minutos); la batería completa (`pnpm e2e`, unos 40 min) solo antes de la ronda de revisión de mykl o de publicar. Pedido por mykl el 2026-10-12, no por primera vez. Confirmed 2026-10.
- [test] Tras cambiar la interfaz, `pnpm build` y las comprobaciones afectadas: los guiones de `tests/e2e/` llevan el registro de lo que funcionaba. Cada uno sigue la interfaz actual (pestañas, capas numeradas); los paneles de todas las pestañas se muestran a la vez con `reveal`. Confirmed 2026-10.
- [test] Pruebas en navegador siempre silenciadas: Chrome `--mute-audio`, Firefox `media.volume_scale` a 0. Confirmed 2026-10.
- [test] Música real para calibrar: pistas CC BY de incompetech, decodificadas con ffmpeg a f32 para probar el análisis en Node. Confirmed 2026-10.
- [test] Capturas del canvas WebGL leídas con `toDataURL` dentro de `requestAnimationFrame`: la captura de elemento de Playwright en Firefox headless puede devolver un fotograma viejo. Confirmed 2026-10.

## TODO

Las revisiones y pruebas manuales pendientes se harán todas juntas en una sola ronda, cuando mykl lo diga (2026-10-12).

- [ ] Rediseño de la interfaz: confirmar con mykl el orden por fases y empezar por la fase 1 (muelles y diseños guardados)
- [ ] Al terminar la app: repo público, activar Pages con origen GitHub Actions (`gh api -X POST repos/memoriainfinita/Spectra-visio/pages -f build_type=workflow`) y push
- [ ] Probar la captura de pestaña en Chrome o Edge
- [ ] Probar stream con CORS real de otro dominio
- [ ] Probar MIDI con un controlador real
- [ ] Revisión de la fase 9 por mykl (OBS real, grabación en su Firefox)
- [ ] Revisión de la fase 10 por mykl (móvil real, instalar la app, calidad adaptativa en su equipo)
- [ ] Al publicar: comprobar la conexión a OBS desde GitHub Pages (permiso de red local)
