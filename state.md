---
created: 2026-09-29
last_updated: 2026-10-22
---

# Spectra-visio — state

Qué es verdad ahora. Lo que ya pasó vive en `state-history.md`.

## Project

Visualizador de audio en tiempo real para navegador, reconstruido desde cero en 10 fases. Funciones en `docs/funciones.md`; diseño técnico en `docs/arquitectura.md`.

## Status

- App completa: las 10 fases de `docs/arquitectura.md`. Desde el 2026-10-14, disposición con muelles (fase 1 del rediseño) en lugar de las pestañas laterales. Base: TypeScript 7, React 19, Vite 8, Vitest 5, store propio, español e inglés, ajustes en IndexedDB, CI con despliegue a Pages
- Todas las funciones de `docs/funciones.md` están hechas. Las dos últimas, del 2026-10-12: «Igualar volumen» entre pistas (A) y el directorio de radios en la fuente Stream (B, diseño aprobado por mykl ese día)
- Marca «sin análisis» en las emisoras encontradas: aprobada por mykl el 2026-10-12
- Ajustes en ventana al estilo de los de Claude (secciones a la izquierda, una fila por opción con nombre, línea que la explica y control a la derecha, interruptores en lugar de casillas): pedido y aprobado por mykl el 2026-10-14 («mucho mejor»). Las descripciones cortas las escribió Claude a partir de las ayudas; mykl no las ha revisado una a una
- Ayudas largas en un globo tras «?» (ratón por encima donde hay ratón, Tab, clic o toque), en lugar de plegadas: pedido por mykl el 2026-10-14
- Aprobado por mykl el 2026-10-12, en este orden: sonido de los canales de TV (hecho), música de Audius (hecho), buscador de vídeo e imagen de Wikimedia Commons y NASA en la entrada visual (hecho; NASA solo vídeo), letras de LRCLIB y carátulas de MusicBrainz y Cover Art Archive (hecho, opcional y desactivado por defecto)
- Control del vídeo en la entrada visual (pausa, posición, recorte, bucle, velocidad): aprobado por mykl el 2026-10-12
- TV en directo de iptv-org como entrada visual, con grupos de su PLAYLISTS.md, comprobación en segundo plano y favoritos: aprobado por mykl el 2026-10-12
- Rediseño de la interfaz: diseño aprobado por mykl el 2026-10-13 («me gusta»); fase 1 hecha el 2026-10-14, fases 2 y 3 el 2026-10-15, fases 4 y 5 el 2026-10-22: el rediseño está completo. Lienzo: https://claude.ai/artifact/FBhdK7Ax88cCEdWscXNa1X, tableros «A2 con muelles» (en uso y moviendo un panel). Decisiones:
  - Una sola interfaz, sin modos Preparar y Directo: en directo se puede editar todo. Lo de directo siempre a la vista, lo seleccionado a un clic, lo de preparar tras un menú o una biblioteca
  - Base A2: barra superior (transporte, fuente de audio desplegable, BPM y tap, diseños guardados, buscador, estado de grabación y OBS, Ajustes); zona izquierda Capas y Bibliotecas; centro escenario, rejilla de clips (capas × columnas 1–9) y Mi panel; zona derecha Inspector, Audio y Moduladores
  - Inspector por niveles Composición, Capa y Clip, como Resolume, con 4 mandos propios por nivel y secciones plegables (visualización, parámetros, efectos, modulación, entrada visual y vídeo, preset)
  - Muelles por zonas, no flotantes: se sueltan como pestaña, debajo partiendo una zona, en la franja bajo el escenario o en otra ventana; el escenario nunca se tapa. Diseños guardados (Directo, Preparar, Dos pantallas), bloquear y restablecer
  - Mi panel: rejilla de 8 × 2 donde se arrastra cualquier control de la app (botones, crossfader, mandos, variaciones)
  - Panel de mandos tipo Resolume y macros de Ableton: varios destinos por mando con rango e inversión, nombre, aprender MIDI, variaciones lanzables
  - Moduladores compartidos tipo Bitwig (LFO, banda, golpe) con «Mapear» que resalta destinos, lista de asignaciones y banda de modulación en cada parámetro; las modulaciones por parámetro actuales siguen funcionando
  - Buscador Ctrl K de controles y acciones; Ctrl Z deshace parámetros, efectos, capas y mandos; confirmación solo en lo destructivo
  - Portátil de 1280 × 800 (tablero «A2 con muelles en portátil»), aprobado por mykl el 2026-10-13 («me convence», con cosas por añadir): una sola zona lateral izquierda con pestañas Capas, Inspector, Audio y Moduladores; Bibliotecas tras el menú ⋯; selector de capas arriba del Inspector; diseños guardados en un desplegable, con «Portátil» como uno más
  - Cuarta ronda del lienzo, aprobada por mykl el 2026-10-13 («me gusta todo»): barra superior completa con menús Fuente, Diseño y Salida; pestañas Audio y Moduladores; Inspector en Composición; Bibliotecas (Visualizaciones, Shaders, Presets, Música, Entrada visual, Grabaciones) como pestaña temporal; Ajustes en ventana con secciones, MIDI y «Salida y OBS» entre ellas; móvil con pestañas abajo e Inspector como hoja. Aprender MIDI con clic derecho sobre cualquier control
  - Quinta ronda del lienzo, aprobada por mykl el 2026-10-13 («me gusta»): Inspector por dentro (nivel Clip con lanzar al pulsar, al golpe o al compás; Efectos; Entrada visual y vídeo; Rótulos), Shaders y Presets con pegar código, diseños Preparar y Dos pantallas, aviso de fotosensibilidad, app vacía con una capa de partida, avisos abajo a la derecha que nunca salen en la salida, medidor de fps, resto de Ajustes; búsqueda en Audius y radios, Grabaciones (varias; hoy la app guarda solo la última), capas con modo de fusión, menú de clip (vaciar pasa a ser una opción), variaciones con transición en golpes o compases, móvil (Más, horizontal), diseño según ancho (< 800 móvil, 800–1279 portátil, ≥ 1280 escritorio) y escenario sin paneles con Tab
  - Funciones nuevas del lienzo revisadas por mykl el 2026-10-14 y pasadas a `docs/funciones.md`: lanzar clips al golpe, menú de clip, columnas con nombre y nota MIDI. Descartadas: lanzar al compás y varias grabaciones guardadas
  - Lienzo reordenado el 2026-10-13: página «Diseño aprobado» por temas y página «Descartadas» con las rondas 1 y 2 y el mapa
  - Logo: el prisma de Spectra, sacado de `3_archived/SPECTRA MASTER ARCHIVE/spectra/SPECTRA LOGO COLOR.svg` (grupo WHITE, sin el texto), junto al nombre en la barra. Pedido por mykl el 2026-10-13
  - Orden de implementación confirmado por mykl el 2026-10-13: 1 muelles y diseños guardados, 2 inspector por niveles, 3 panel de mandos con variaciones, 4 moduladores compartidos, 5 buscador y deshacer
  - Fase 1, hecha el 2026-10-14 con el diseño aprobado por mykl ese día: barra superior (logo, transporte, Fuente, BPM y marcar tempo, Diseño, Salida, Ajustes en ventana con MIDI); zonas izquierda, derecha y bajo el escenario con muelles provisionales (Capas, Bibliotecas, Clips, Efectos, Rótulos, Audio, Directo, Automático, Actuación) que llevan los paneles de antes; diseños Directo, Preparar, Dos pantallas y Portátil, guardar como, bloquear, restablecer y borrar; mover arrastrando en «Editar el diseño» o con el menú ⋯; ancho de zonas; un muelle en otra ventana. Ampliada el mismo día porque mykl pidió más flexibilidad al redimensionar (el asa derecha funcionaba pero no se veía): asas visibles, alto de la zona bajo el escenario y reparto del alto entre pilas, con doble clic para volver al tamaño de serie. Detalle en `docs/arquitectura.md`. El móvil (< 800 px) sigue como antes
  - Ampliaciones de la fase 1 el 2026-10-14, pedidas por mykl: «Soltar aquí» solo en zonas vacías (en las demás equivale a «debajo» de la última pila)
  - Fase 2, hecha el 2026-10-15 con el diseño aprobado por mykl ese día («adelante con todo, reviso al final»): muelle Inspector con selector de capa, niveles Composición, Capa y Clip y secciones plegables; sustituye a los muelles Efectos, Rótulos y Automático, y los diseños guardados se migran solos (versión 2). Capas conserva la pila y el crossfader, más una fila Composición encima de las capas. Clips con modo de lanzar al pulsar o al golpe. Detalle en `docs/arquitectura.md`. Se dejó fuera, con el diseño aprobado: los 4 mandos por nivel (fase 3), el resumen de modulación (fase 4), la entrada visual por capa, el menú de clip y los nombres de columna
  - Revisada a medias por mykl el 2026-10-15 («me gusta mucho»): pidió arreglar la fila Composición de Capas. Desde ese día va encima de las capas, en una línea con el resumen, y pulsar una capa o la Composición trae al frente la pestaña del Inspector; pulsar un clip no (decisión de Claude, para no cambiar la pila en directo)
  - Cambios de la fase 2 respecto al diseño aprobado: el crossfader se queda solo en Capas, no también en Composición; el Inspector muestra el último clip pulsado y no sigue a los clips lanzados con teclas o MIDI
  - Fase 3, hecha el 2026-10-15 con el diseño aprobado por mykl ese día («adelante»): mandos con varios destinos y rango (8 en el muelle nuevo Mandos, 4 de la composición y 4 por capa en el Inspector), menú «Llevar a un mando» con clic derecho, la tecla de menú o Mayús + F10 sobre parámetros, efectos, opacidades y crossfader, MIDI para los mandos y las variaciones, y hasta 8 variaciones de los mandos del panel con transición en golpes (decidido: golpes y no compases, porque la app no sabe dónde empieza el compás). Escena versión 5 y diseños versión 3, con migración. Se dejó fuera, con el diseño aprobado: Mi panel (rejilla libre de controles), aprender MIDI con clic derecho sobre cualquier control y deshacer (fase 5). Detalle en `docs/arquitectura.md`
  - Fase 4, hecha el 2026-10-22 («adelante con todo, reviso al final»): muelle Moduladores (hasta 8; banda, golpe, oscilador o control MIDI) con medidor, Mapear (también al crear uno), lista de asignaciones con cantidad, banda rosa bajo cada parámetro modulado y el resumen del Inspector contando también los compartidos. Diseños versión 4. Diferencias con el lienzo, decididas por Claude: la cantidad se fija en la lista de asignaciones, no arrastrando sobre el parámetro al mapear; solo se mapean parámetros de visualizaciones y efectos (no opacidad ni crossfader), y solo los visibles (un efecto plegado no se marca). Guion nuevo `modulators.mjs`. Detalle en `docs/arquitectura.md`
  - Fase 5, hecha el 2026-10-22 (misma aprobación): deshacer y rehacer con Ctrl Z, Ctrl Mayús Z y Ctrl Y sobre toda la escena (cambios a menos de 600 ms son un paso; elegir capa no es paso; el modo automático no deja pasos), con avisos abajo a la derecha; menú de clic derecho con «Control MIDI» y «Añadir a Mi panel» en parámetros, opacidades, crossfader y botones de acción; muelle Mi panel (8 × 2, diseños versión 5); buscador Ctrl K con botón Buscar en la barra. Diferencias con el lienzo, decididas por Claude: en Mi panel los controles se añaden con el menú de clic derecho o con el + de cada celda en Editar, no arrastrando; quitar una capa no pide confirmación porque se deshace; el buscador no tiene «palabras afines», solo nombre y lugar sin acentos; el aviso de deshacer no describe el cambio. Guiones nuevos `undo.mjs`, `mypanel.mjs` y `search.mjs`
  - Ventana de muelle, arreglado el 2026-10-22: atajos con el foco en ella; menús y globos abiertos en ella se dibujan allí y se cierran al pulsar fuera. Antes, el menú de mandos se abría en la ventana principal
- Probado por mykl en su Firefox: fases 2 a 8 (2026-10-10 y 2026-10-11) y la disposición de pestañas laterales, ya sustituida (2026-10-12)
- Ronda de revisión de mykl en su Firefox empezada el 2026-10-22, sin resultados aún. La lista se dio en el chat, por puntos: 0 migración de diseños a la versión 5 (pestañas Moduladores y Mi panel); 1 menú de clip y columnas con nombre y nota MIDI; 2 ventana de muelle (atajos, menús); 3 guardado al recargar; 4 moduladores (Mapear, banda rosa, cantidades); 5 deshacer, clic derecho con MIDI y Mi panel, Mi panel, buscador Ctrl K; 6 fases 1 a 3; 7 opcional con hardware: MIDI real, OBS y grabación, móvil. En cada punto, mykl dice «bien» o qué cambiar
- Pendiente de la revisión de mykl: fase 9 (OBS real, grabación), fase 10 (móvil real, instalar la app, calidad adaptativa en su equipo) y las fases 1 (muelles), 2 (Inspector), 3 (mandos), 4 (moduladores) y 5 (deshacer, Mi panel, MIDI con clic derecho, buscador) del rediseño, más el menú de clip, las columnas, la ventana de muelle y el guardado al cerrar
- Comprobado por Claude, silenciado, en Chrome y Firefox con Playwright: todas las fases, con el detalle de cada una en `state-history.md` (2026-10-12). Las comprobaciones viven en `tests/e2e/` y se pasan con `pnpm e2e`; batería completa en verde el 2026-10-14 tras la fase 1, con `docks.mjs` en lugar de `tabs.mjs` y `fold.mjs`. Batería completa otra vez el 2026-10-15 tras la fase 2, con el guion nuevo `inspector.mjs`: 64 de 66 en verde a la primera; `inspector` en Chrome falló por recargar antes de que se guardara la escena (corregido en el guion, luego en verde en los dos) y `effects` en Firefox falló una vez sin poder reproducirlo (en verde en tres repeticiones sueltas). Tras la fase 3, el mismo día: guion nuevo `knobs.mjs` y las afectadas (knobs, inspector, docks, layers, effects, visuals, presets, transitions, midi, keyboard, live, settings, touch y output-window) en verde en los dos navegadores. Batería completa el 2026-10-22 tras la fase 5, con los guiones nuevos `clips`, `modulators`, `undo`, `mypanel` y `search`: 78 de 78 en verde a la primera, sin errores de página. 214 tests unitarios en verde
- Guardado de la escena, arreglado el 2026-10-22: lo pendiente al ocultar, cerrar o recargar va a `localStorage` (una escritura en IndexedDB empezada en `pagehide` no termina en Chrome ni en Firefox), y con cambios sin pausa se guarda cada 2 s como mucho; antes, en esos casos no se guardaba nada hasta la pausa
- Sin probar: escuchar a oído emisoras reales del directorio (con emisoras reales, Claude solo comprobó buscar, la comprobación en segundo plano y el arranque); Safari (nada, tampoco `outputLatency`); captura de pestaña en Chrome o Edge; referencias de archivos de Chrome; pistas largas por `<audio>`; stream de otro dominio con CORS real; MIDI con un dispositivo real y con el permiso de Firefox; dos pantallas reales; OBS real y desde GitHub Pages; grabación: sincronía a ojo, Firefox con ventana, sesiones largas; móvil real; instalar la app; calidad adaptativa con una GPU lenta real
- La versión anterior (canvas, 8 visualizaciones) está en `.archive/v0/`, fuera de git, y en el historial hasta `7a63da1`
- Investigación de las sesiones en la nube copiada íntegra en `docs/investigacion/`. Se hizo sobre la v0 del `main` de GitHub. Revisada con mykl el 2026-10-20: lo que queda «a estudiar» está en `docs/investigacion/a-estudiar.md`, sin pasar a `docs/funciones.md`, con el CORS de cada fuente de medios, licencias, librerías y modelos comprobados por Claude el 2026-10-20 y 2026-10-21
- Presets de Milkdrop sin licencia conocida: `butterchurn-presets` solo trae el MIT del autor del paquete (comprobado el 2026-10-21, detalle en R8 de `a-estudiar.md`). Pendiente decidir con mykl antes de publicar
- Menú de clip y columnas con nombre y nota MIDI: hechos el 2026-10-22 (mykl: «adelante con todo, reviso al final»). Decisiones de Claude: guardar encima de un clip quita su nombre y conserva el modo de lanzar; pegar pone el clip con su nombre y su modo; copiar dura la visita; la nota MIDI de una columna es la misma asignación que «Lanzar la columna» en Ajustes › MIDI. Guion nuevo `clips.mjs`
- Orden hasta publicar, acordado por mykl el 2026-10-21: 1 menú de clip y columnas con nombre y nota MIDI; 2 los dos fallos de la ventana de muelle y el guardado al cerrar; 3 fase 4; 4 fase 5 con Mi panel y aprender MIDI con clic derecho; 5 batería e2e completa y una ronda de revisión de mykl; 6 presets de Milkdrop y publicar. La entrada visual por capa (diseño aprobado) no tiene sitio en ese orden
- Repo privado en GitHub, Pages sin activar. Se publicará al terminar la app (decisión de mykl, 2026-10-10). El `main` local no se ha subido: 74 commits por delante de `origin/main` el 2026-10-21. Las sesiones en la nube parten del `main` de GitHub, es decir, de la v0

## Patterns

- [render] Animación por tiempo: todo lo que se mueve depende del tiempo entre fotogramas; las velocidades que dependen del audio se acumulan en fases. Confirmed 2026-10.
- [render] Estelas por fundido siempre a negro: con alfa baja el redondeo de 8 bits deja residuo visible sobre otros fondos. Confirmed 2026-10.
- [pnpm] pnpm 11 con `allowBuilds: esbuild: false` en `pnpm-workspace.yaml`, como nona y sadhana. Confirmed 2026-10.
- [stack] Base como nona: tsconfig estricto, `base: './'` en Vite, CI que publica en Pages solo si pasan typecheck, tests y build. Confirmed 2026-10.
- [audio] Reproducción desde audio decodificado y programada en tiempo del AudioContext; `<audio>` solo para pistas largas. Confirmed 2026-10.
- [audio] Toda acción del reproductor incrementa un contador de operación; el trabajo asíncrono iniciado con un valor anterior se descarta. Confirmed 2026-10.
- [ui] Deslizadores que disparan trabajo caro: valor local mientras se arrastra y acción en el `change` nativo. Confirmed 2026-10.
- [ui] El escenario no se vuelve a montar al cambiar de disposición: la pantalla completa cruza el límite de 800 px y un escenario nuevo la cerraría. Confirmed 2026-10.
- [ui] Cada panel se monta una vez en su nodo (`src/ui/dock/panels.tsx`) y las disposiciones solo lo mueven con `PanelSlot`; un panel en un solo sitio a la vez. Confirmed 2026-10.
- [test] En cada iteración, solo las comprobaciones de lo tocado (`pnpm e2e radio settings`, unos minutos); la batería completa (`pnpm e2e`, unos 40 min) solo antes de la ronda de revisión de mykl o de publicar. Pedido por mykl el 2026-10-12, no por primera vez. Confirmed 2026-10.
- [test] Tras cambiar la interfaz, `pnpm build` y las comprobaciones afectadas: los guiones de `tests/e2e/` llevan el registro de lo que funcionaba. Cada uno sigue la interfaz actual (pestañas, capas numeradas); los paneles de todas las pestañas, los menús de la barra y la ventana de Ajustes se muestran a la vez con `reveal` (`[role=tabpanel]` y `[data-reveal]`). Confirmed 2026-10.
- [test] Pruebas en navegador siempre silenciadas: Chrome `--mute-audio`, Firefox `media.volume_scale` a 0. Confirmed 2026-10.
- [test] Música real para calibrar: pistas CC BY de incompetech, decodificadas con ffmpeg a f32 para probar el análisis en Node. Confirmed 2026-10.
- [test] Capturas del canvas WebGL leídas con `toDataURL` dentro de `requestAnimationFrame`: la captura de elemento de Playwright en Firefox headless puede devolver un fotograma viejo. Confirmed 2026-10.

## TODO

Las revisiones y pruebas manuales pendientes se harán todas juntas en una sola ronda, cuando mykl lo diga (2026-10-12).

- [x] Pasar a `docs/funciones.md` las funciones nuevas del lienzo, con revisión de mykl
- [x] Fase 3 del rediseño: decidir si las variaciones pasan de una a otra en golpes o compases (golpes, aprobado por mykl el 2026-10-15)
- [x] Rediseño de la interfaz: fase 1 (muelles y diseños guardados)
- [ ] Revisión de la fase 1 del rediseño por mykl en su Firefox (probó muelles, tamaños y Ajustes el 2026-10-14; sin confirmar como revisada)
- [ ] Batería e2e completa antes de publicar (última: 2026-10-22, tras la fase 5, toda en verde)
- [x] Rediseño de la interfaz: fase 2 (inspector por niveles)
- [ ] Revisión de la fase 2 del rediseño por mykl en su Firefox
- [x] Rediseño de la interfaz: fase 3 (panel de mandos con variaciones)
- [ ] Revisión de la fase 3 del rediseño por mykl en su Firefox
- [x] Menú de clip con clic derecho: lanzar, guardar la capa aquí, copiar, pegar, renombrar y vaciar
- [x] Columnas de clips con nombre y lanzables con una nota MIDI
- [x] Ventana de muelle: atajos de teclado con el foco en ella y cerrar sus menús al pulsar fuera
- [x] Guardar la escena al cerrar o recargar la pestaña
- [ ] Revisión por mykl del menú de clip, las columnas, la ventana de muelle y el guardado
- [x] Rediseño de la interfaz: fase 4 (moduladores compartidos)
- [ ] Revisión de la fase 4 del rediseño por mykl en su Firefox
- [x] Rediseño de la interfaz: fase 5 (buscador Ctrl K y deshacer), con Mi panel y aprender MIDI con clic derecho sobre cualquier control
- [ ] Revisión de la fase 5 del rediseño por mykl en su Firefox
- [ ] Entrada visual por capa (diseño aprobado, sin sitio en el orden)
- [ ] Decidir con mykl qué hacer con los presets de Milkdrop antes de publicar
- [ ] Al terminar la app: repo público, activar Pages con origen GitHub Actions (`gh api -X POST repos/memoriainfinita/Spectra-visio/pages -f build_type=workflow`) y push
- [ ] Probar la captura de pestaña en Chrome o Edge
- [ ] Probar stream con CORS real de otro dominio
- [ ] Probar MIDI con un controlador real
- [ ] Revisión de la fase 9 por mykl (OBS real, grabación en su Firefox)
- [ ] Revisión de la fase 10 por mykl (móvil real, instalar la app, calidad adaptativa en su equipo)
- [ ] Al publicar: comprobar la conexión a OBS desde GitHub Pages (permiso de red local)
