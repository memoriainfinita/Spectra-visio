---
created: 2026-09-29
last_updated: 2026-11-10
---


# Spectra-visio — state

Qué es verdad ahora. Lo que ya pasó vive en `state-history.md`.

## Project

Visualizador de audio en tiempo real para navegador, reconstruido desde cero en 10 fases. Funciones en `docs/funciones.md`; diseño técnico en `docs/arquitectura.md`.

## Status

- Revisión de proyecto del 2026-11-10 (Claude, a petición de mykl; documentos, git y código contrastados, y la app local ejecutada en Chromium a 1440, 1280, 900, 820 y 375 px, sin audio, MIDI, OBS ni Firefox). Conclusión: construida, no terminada. No entra ninguna función nueva hasta cerrar la ronda de revisión de mykl
- Publicada por detrás de local: `main` va 4 commits por delante de `origin/main` (desde `163c1b5`, «one place per control»); la app de Pages conserva los duplicados
- Defectos vistos el 2026-11-10:
  - A 1280 × 800 (diseño Directo) la barra Actuación se corta: el crossfader a medias y Auto fuera, tras un scroll. A 900 y 820 px, igual en Portátil
  - En Directo, Actuación comparte pila con Mandos y Mi panel y se oculta al abrirlos; lo aprobado el 2026-10-13 es «lo de directo siempre a la vista»
  - La escena «Espectáculo completo», en silencio, se quema a blanco en pocos segundos
  - A 820 px la barra superior se pisa: el transporte queda bajo «Audio: Reproductor» y el BPM no se ve
  - Clips necesita scroll horizontal a 1280 px o menos (columnas 8 y 9) y vertical con dos capas
  - Móvil (375 px): una columna de 16 pantallas de scroll con 444 controles y el escenario fuera de la vista; lo aprobado el 2026-10-13 (pestañas abajo, Inspector como hoja) no está hecho
  - Por comprobar: la app abre con dos capas y la 2 oculta por el crossfader (puede ser estado guardado); «Importar» y «Exportar todos» en Escenas y presets no dicen a qué se aplican
- Rumbo decidido por mykl el 2026-11-10: app completa (reproductor con visuales, directo y fuente para OBS al mismo nivel; se corrige `0_draft/spectra-ecosystem/vision.md`, que dice «no es un motor de reproducción»); una sola ronda de revisión con los tres usos; el show lo guarda todo (hoy una escena no guarda rótulos, shaders importados, fuente visual ni MIDI) y se exporta como `.spectra`; móvil con el diseño aprobado el 2026-10-13; Safari fuera, así que el móvil es Android
- Decisiones abiertas, de mykl:
  - La fuente visual no llega a OBS
  - Identidad del ecosistema (Roboto, `#1C2932`, verde) sin aplicar en la app
  - Nombre: «Spectra-visio» o «SpectraVisio»
  - Control externo: `funciones.md` deja fuera OSC y control remoto y la visión del ecosistema prevé que Cue, Core y Remote manejen Visio
  - Decisiones de Claude sin revisar: los efectos de composición leen la fuente de la capa más alta; el sonido de TV es el del último canal; el Inspector no sigue a los clips lanzados por teclas o MIDI
  - De `a-estudiar.md`, dos que son calidad y no ideas: H6 (el limitador de destellos no cumple WCAG 2.3.1) y H1 (aviso de silencio)
- Documentación desalineada:
  - `state.md`: Status es un registro fechado y TODO guarda las tareas hechas; se contradice («ronda sin resultados aún» seguido de resultados; «batería antes de publicar» abierta con la app publicada)
  - `funciones.md`: se presenta como confirmada el 2026-10-10 y lleva añadidos posteriores sin revisar y líneas caducadas («gestos para cambiar de modo», «cadena de efectos global», «MIDI mediante la modulación», Safari)
  - `arquitectura.md`: dice 38 guiones e2e y hay 47; lista «envolvente» como fuente de modulación y el código tiene banda, golpe, oscilador y MIDI; mezcla «entrada visual» y «fuente visual»; «Universal y proyecto» es especificación de interfaz; quedan dos `[PENDIENTE]` con las fases cerradas
  - Visualizaciones: README 21, `state.md` y `funciones.md` 22, `vision.md` 23; el registro tiene 23 entradas (21 propias, Milkdrop y la fuente visual)
  - «En verde» en e2e significa que el guion no se colgó ni imprimió `FAIL` (`tests/e2e/README.md`: no son aserciones)
  - El botón «Copiar … a tus shaders» se llama así porque cinco guiones buscan «Añadir»
- App completa: las 10 fases de `docs/arquitectura.md`. Desde el 2026-10-14, disposición con muelles (fase 1 del rediseño) en lugar de las pestañas laterales. Base: TypeScript 7, React 19, Vite 8, Vitest 5, store propio, español e inglés, ajustes en IndexedDB, CI con despliegue a Pages
- Todas las funciones de `docs/funciones.md` están hechas. Las dos últimas, del 2026-10-12: «Igualar volumen» entre pistas (A) y el directorio de radios en la fuente Stream (B, diseño aprobado por mykl ese día)
- Marca «sin análisis» en las emisoras encontradas: aprobada por mykl el 2026-10-12
- Ajustes en ventana al estilo de los de Claude (secciones a la izquierda, una fila por opción con nombre, línea que la explica y control a la derecha, interruptores en lugar de casillas): pedido y aprobado por mykl el 2026-10-14 («mucho mejor»). Las descripciones cortas las escribió Claude a partir de las ayudas; mykl no las ha revisado una a una
- Ayudas en un globo tras «?» (ratón por encima donde hay ratón, Tab, clic o toque), en lugar de plegadas: pedido por mykl el 2026-10-14. Desde el 2026-11-02, todas, también las de menos de 90 caracteres que se veían como línea de texto, y el «?» va sin el texto «Más información» (pedido por mykl)
- Aprobado por mykl el 2026-10-12, en este orden: sonido de los canales de TV (hecho), música de Audius (hecho), buscador de vídeo e imagen de Wikimedia Commons y NASA en la entrada visual (hecho; NASA solo vídeo), letras de LRCLIB y carátulas de MusicBrainz y Cover Art Archive (hecho, opcional y desactivado por defecto)
- Control del vídeo en la entrada visual (pausa, posición, recorte, bucle, velocidad): aprobado por mykl el 2026-10-12
- TV en directo de iptv-org como entrada visual, con grupos de su PLAYLISTS.md, comprobación en segundo plano y favoritos: aprobado por mykl el 2026-10-12
- Lienzo de la disposición de escritorio, tableros A, B y C (mykl eligió B el 2026-10-12): https://claude.ai/artifact/YQZeJBzbvudQkcqn84u8ow
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
  - Fase 4, hecha el 2026-10-22 («adelante con todo, reviso al final»): muelle Moduladores (hasta 8; banda, golpe, oscilador o control MIDI) con medidor, Mapear (también al crear uno), lista de asignaciones con cantidad, banda rosa bajo cada parámetro modulado y el resumen del Inspector contando también los compartidos. Diseños versión 4. Decisiones revisadas con mykl el 2026-11-02: la cantidad se fija en la lista de asignaciones y también arrastrando de lado sobre el parámetro al mapear; se mapean parámetros de visualizaciones y efectos y la opacidad de capa (no el crossfader), y solo los visibles (un efecto plegado no se marca). Guion nuevo `modulators.mjs`. Detalle en `docs/arquitectura.md`
  - Fase 5, hecha el 2026-10-22 (misma aprobación): deshacer y rehacer con Ctrl Z, Ctrl Mayús Z y Ctrl Y sobre toda la escena (cambios a menos de 600 ms son un paso; elegir capa no es paso; el modo automático no deja pasos), con avisos abajo a la derecha; menú de clic derecho con «Control MIDI» y «Añadir a Mi panel» en parámetros, opacidades, crossfader y botones de acción; muelle Mi panel (8 × 2, diseños versión 5); buscador Ctrl K con botón Buscar en la barra. Decisiones: en Mi panel los controles se añaden con el menú de clic derecho, con el + de cada celda o, desde el 2026-11-02 (pedido por mykl), arrastrándolos en Editar (las celdas llenas se reordenan arrastrándolas y se quitan arrastrándolas fuera, sin flechas ni X; el botón Editar y la ayuda van en la barra de pestañas del muelle; la rejilla tiene tantas columnas como caben, con nombres de hasta tres líneas, ajustado el 2026-11-02 a petición de mykl); quitar una capa no pide confirmación porque se deshace; el buscador no tiene «palabras afines», solo nombre y lugar sin acentos (decididas por Claude, revisadas con mykl el 2026-11-02); el aviso de deshacer nombra el cambio cuando fue una sola cosa («Deshecho: opacidad de la capa 2»). Guiones nuevos `undo.mjs`, `mypanel.mjs` y `search.mjs`
  - Ventana de muelle, arreglado el 2026-10-22: atajos con el foco en ella; menús y globos abiertos en ella se dibujan allí y se cierran al pulsar fuera. Antes, el menú de mandos se abría en la ventana principal
- Probado por mykl en su Firefox: fases 2 a 8 (2026-10-10 y 2026-10-11) y la disposición de pestañas laterales, ya sustituida (2026-10-12)
- Ronda de revisión de mykl en su Firefox empezada el 2026-10-22, sin resultados aún. El 2026-11-02 Claude comprobó los puntos 0 a 6 sin tu Firefox (navegador integrado y guiones e2e en verde): mykl miró en su Firefox, el 2026-11-02, los cambios de ese día (opacidad modulable, cantidad arrastrable, arrastrar a Mi panel, Editar y ayudas en la barra de pestañas, ayudas con solo «?») y los dio por buenos («todo ok»). Sigue pendiente de mykl: la ventana de muelle real y el punto 7 (MIDI real, OBS y grabación, móvil). La lista se dio en el chat, por puntos: 0 migración de diseños a la versión 5 (pestañas Moduladores y Mi panel); 1 menú de clip y columnas con nombre y nota MIDI; 2 ventana de muelle (atajos, menús); 3 guardado al recargar; 4 moduladores (Mapear, banda rosa, cantidades); 5 deshacer, clic derecho con MIDI y Mi panel, Mi panel, buscador Ctrl K; 6 fases 1 a 3; 7 opcional con hardware: MIDI real, OBS y grabación, móvil. En cada punto, mykl dice «bien» o qué cambiar
- Pendiente de la revisión de mykl: fase 9 (OBS real, grabación), fase 10 (móvil real, instalar la app, calidad adaptativa en su equipo) y las fases 1 (muelles), 2 (Inspector), 3 (mandos), 4 (moduladores) y 5 (deshacer, Mi panel, MIDI con clic derecho, buscador) del rediseño, más el menú de clip, las columnas, la ventana de muelle y el guardado al cerrar
- Comprobado por Claude, silenciado, en Chrome y Firefox con Playwright: todas las fases, con el detalle de cada una en `state-history.md` (2026-10-12). Las comprobaciones viven en `tests/e2e/` y se pasan con `pnpm e2e`; batería completa en verde el 2026-10-14 tras la fase 1, con `docks.mjs` en lugar de `tabs.mjs` y `fold.mjs`. Batería completa otra vez el 2026-10-15 tras la fase 2, con el guion nuevo `inspector.mjs`: 64 de 66 en verde a la primera; `inspector` en Chrome falló por recargar antes de que se guardara la escena (corregido en el guion, luego en verde en los dos) y `effects` en Firefox falló una vez sin poder reproducirlo (en verde en tres repeticiones sueltas). Tras la fase 3, el mismo día: guion nuevo `knobs.mjs` y las afectadas (knobs, inspector, docks, layers, effects, visuals, presets, transitions, midi, keyboard, live, settings, touch y output-window) en verde en los dos navegadores. Batería completa el 2026-10-22 tras la fase 5, con los guiones nuevos `clips`, `modulators`, `undo`, `mypanel` y `search`: 78 de 78 en verde a la primera, sin errores de página. 222 tests unitarios en verde. El 2026-11-02, tras los cambios de opacidad modulable, arrastre de cantidad, arrastre a Mi panel, nombre de clip y aviso de deshacer: guion nuevo `drag.mjs` y clips, undo, modulators, mypanel, search, docks, knobs, inspector, layers y midi en verde en los dos navegadores. El 2026-11-04, tras el repaso de duplicados: typecheck, 255 tests unitarios y e2e de lo tocado en Chrome (Firefox solo layer-content, media y tv); batería completa en verde ese mismo día (la excepción, `pwa` en Firefox, pasó sola)
- Guardado de la escena, arreglado el 2026-10-22: lo pendiente al ocultar, cerrar o recargar va a `localStorage` (una escritura en IndexedDB empezada en `pagehide` no termina en Chrome ni en Firefox), y con cambios sin pausa se guarda cada 2 s como mucho; antes, en esos casos no se guardaba nada hasta la pausa
- Sin probar: escuchar a oído emisoras reales del directorio (con emisoras reales, Claude solo comprobó buscar, la comprobación en segundo plano y el arranque); Safari (nada, tampoco `outputLatency`); captura de pestaña en Chrome o Edge; referencias de archivos de Chrome; pistas largas por `<audio>`; stream de otro dominio con CORS real; MIDI con un dispositivo real y con el permiso de Firefox; dos pantallas reales; OBS real y desde GitHub Pages; grabación: sincronía a ojo, Firefox con ventana, sesiones largas; móvil real; instalar la app; calidad adaptativa con una GPU lenta real
- La versión anterior (canvas, 8 visualizaciones) está en `.archive/v0/`, fuera de git, y en el historial hasta `7a63da1`
- Investigación de las sesiones en la nube copiada íntegra en `docs/investigacion/`. Se hizo sobre la v0 del `main` de GitHub. Revisada con mykl el 2026-10-20: lo que queda «a estudiar» está en `docs/investigacion/a-estudiar.md`, sin pasar a `docs/funciones.md`, con el CORS de cada fuente de medios, licencias, librerías y modelos comprobados por Claude el 2026-10-20 y 2026-10-21
- Presets de Milkdrop sin licencia conocida: `butterchurn-presets` solo trae el MIT del autor del paquete (comprobado el 2026-10-21, detalle en R8 de `a-estudiar.md`). Los 100 presets no están en el repo, solo la dependencia; se sirven en el build de Pages. Decidido por mykl el 2026-11-02: mantenerlos con atribución y vía de retirada. Hecho: `NOTICE.md` (retirada por incidencia en GitHub) y nota en el README; sin línea visible en la app, porque el autor ya va en el nombre del preset
- Menú de clip y columnas con nombre y nota MIDI: hechos el 2026-10-22 (mykl: «adelante con todo, reviso al final»). Decisiones: guardar encima de un clip conserva su nombre y su modo de lanzar (cambiado el 2026-11-02 a petición de mykl); pegar pone el clip con su nombre y su modo; copiar dura la visita; la nota MIDI de una columna es la misma asignación que «Lanzar la columna» en Ajustes › MIDI. Guion nuevo `clips.mjs`
- Entrada visual por capa, hecha el 2026-11-02 con el diseño aprobado del lienzo (mykl: «adelante»): cada capa tiene su cámara, archivo, TV o vídeo en línea; no hay entrada global. El reparto entre Inspector y Bibliotecas cambió el 2026-11-02 (ver la entrada siguiente). Decisiones de Claude: los efectos de la composición leen la entrada de la capa más alta que tenga una; el modo automático solo ofrece la visualización de entrada en una capa que tenga entrada; el control de vídeo vigila todos los vídeos de entrada con su propio tramo, bucle y velocidad; el sonido de la TV es el del último canal abierto. Guion nuevo `layer-input.mjs` y los de entrada visual, vídeo, TV, salida, OBS, Inspector, clips, auto, touch y docks en verde en los dos navegadores. Detalle en `docs/arquitectura.md`
- Hecho el 2026-11-02 a petición de mykl, tras probar la app publicada: al abrir una entrada visual (cámara, archivo, TV, en línea) la capa pasa sola a la visualización Entrada visual, salvo que corra un shader (importado o Milkdrop); si el crossfader oculta el lado de la capa, un aviso lo dice y no lo mueve. Guion nuevo `input-surface.mjs`. También tres escenas de ejemplo en Bibliotecas › Presets (`engine/scene/demos.ts`, tests `demos.test.ts`, guion `demos.mjs`): Primeros pasos, Moduladores y mandos, Clips y directo; reemplazan la escena y Ctrl Z las deshace. Ajustadas por capturas con la pista sintética de las pruebas, que satura a cualquier visualización: no se han visto con música real
- Fuente por capa, reorganizada el 2026-11-02 a petición de mykl («me parece más claro así»; no entendía qué eran las fuentes ni cómo iban a las capas ni dónde se configuraban): el contenido de una capa es Visualización o Fuente (selector en el Inspector, nivel Capa, igual que el del clip); la sección «Fuente» del Inspector lleva cámara, archivo, TV, en línea, quitar, vista previa y los controles del vídeo, y se abre sola si la capa muestra la fuente. «Entrada visual» ya no sale en el navegador ni en el selector de visualización; por dentro sigue siendo `media`. Bibliotecas ya no tiene pestaña de fuentes (quitada el 2026-11-04). La fuente sigue en la capa si esta pasa a una visualización, y la leen los shaders; `setLayerContent` recuerda la visualización anterior para volver. Guion nuevo `layer-content.mjs`; los de entrada visual, vídeo, TV, medios, salida y shaders reescritos al nuevo flujo y en verde en los dos navegadores. Sin revisar por mykl
- Ejecutor de pruebas (`tests/e2e/run.mjs`), 2026-11-02: añade `--jobs N` para correr a la vez las comprobaciones que no miden tiempos, pero en este PC de 4 núcleos no ahorró nada (43 min para 72 de ejecuciones) y hizo fallar cuatro que pasan solas; por defecto sigue en serie, unos 40 min. Ahora también marca como fallo cualquier línea `FAIL` que impriman las comprobaciones (antes solo contaba el código de salida). Para ir rápido: nombrar solo lo tocado y `--chrome`. `demos`, `input-surface` y `shader-examples` entran ya en la batería completa
- Muelles Actuación y Efectos en vivo unidos el 2026-11-02, a propuesta de mykl y con mi acuerdo: queda Actuación, que ahora lleva también el ritmo del estrobo y las letras A y B del crossfader como botones que saltan a ese lado; «Cambiar de lado» sigue en el atajo (X) y en Mi panel, y «Reducir destellos» solo en Ajustes › Accesibilidad. `Live.tsx` se borró (copia en `.archive/`, `actionLabel` pasó a `ui/actionLabel.ts`) y el muelle sale de `DOCKS` y de los cuatro diseños; los diseños guardados con esa pestaña la pierden al cargar, sin subir de versión. Ojo para revisar: en el diseño Directo la barra comparte pila con Mandos y Mi panel, así que se oculta al abrirlos
- Escenas de ejemplo ampliadas el 2026-11-02 a petición de mykl («una muestra total de la capacidad de la app, no importa tener pocos»): de tres a siete en `engine/scene/demos.ts`, la séptima «Espectáculo completo» (a petición de mykl, que quería una que combinara todo): las 22 visualizaciones en ocho columnas que lanzan una de cada capa, con efectos y osciladores en los clips, golpes, moduladores compartidos, mandos, dos variaciones, crossfader, transición y Mi panel. Nuevas: Fuentes de modulación (banda, golpe y oscilador de cada forma, sincronizado y libre, con curvas y suavizado), Todos los efectos (una columna por efecto y una con tres encadenados) y Todas las visualizaciones (las 22 como clips en tres capas con fundido); «Clips y directo» suma Mi panel y transición. Los nombres que llevan (columnas, mandos, moduladores) salen en el idioma de la app. Quedan fuera lo que una escena no guarda: los rótulos, los shaders importados, la fuente visual y MIDI. Sin revisar por mykl
- Revisión de flujos confusos, hecha el 2026-11-02 a petición de mykl («arreglemos todo; qué me recomiendas»; se aplicaron mis recomendaciones sin preguntar más): (1) «Fuente visual» para la imagen de la capa y «Audio: …» en la barra superior para el sonido, y «Fuente visual» en todos los textos, la visualización interna y el efecto «Mezcla con la fuente»; (2) las capas que el crossfader u otro ajuste deja sin verse salen atenuadas en Capas, con aviso en el título; (3) los shaders que leen la fuente lo dicen en su fila y avisan si la capa no tiene ninguna; añadir un ejemplo ya lo pone en la capa; (4) la Lista pasa al muelle Audio, junto al reproductor, y sale de Bibliotecas; (5) el muelle «Directo» se llama «Efectos en vivo» para no chocar con el diseño Directo; Apagón, Congelar, Estrobo y el crossfader quedan solo en Actuación (se unieron los dos muelles el 2026-11-02); (6) Bibliotecas › Escenas y presets separa las escenas (ejemplos y las que guarda el usuario, con copia de seguridad) de los presets de una capa; (7) Fuentes visuales dice en qué capa carga y el nivel Clip explica qué es un clip. Guiones nuevo `scenes.mjs` y reescritos al nuevo reparto. Sin revisar por mykl
- Shaders de ejemplo, aprobados por mykl y hechos el 2026-11-02 (`engine/shaders/examples.ts`): cuatro escritos desde cero para la app, con la licencia del proyecto. Túnel de espectro y Aberración sobre la entrada (Shadertoy); Rayas al golpe (ISF con evento y pasada persistente) y Flujo de ruido (ISF con audio y paleta). Se copian a la lista con el botón de «Shaders de ejemplo» en Bibliotecas › Shaders. Guion nuevo `shader-examples.mjs`; el botón se llama «Copiar … a tus shaders» y no «Añadir», porque cinco guiones antiguos buscan el botón «Añadir» por nombre parcial
- Orden hasta publicar, acordado por mykl el 2026-10-21: 1 menú de clip y columnas con nombre y nota MIDI; 2 los dos fallos de la ventana de muelle y el guardado al cerrar; 3 fase 4; 4 fase 5 con Mi panel y aprender MIDI con clic derecho; 5 batería e2e completa y una ronda de revisión de mykl; 6 presets de Milkdrop y publicar. La entrada visual por capa se hizo después, el 2026-11-02
- Publicada el 2026-11-02 a petición de mykl, para ir probándola: repo público `memoriainfinita/Spectra-visio`, `main` subido (`80cceb7`), Pages activo con origen GitHub Actions en https://memoriainfinita.github.io/Spectra-visio/ y CI en verde. Antes de hacerlo público Claude buscó secretos en el historial: ninguno
- Regla de la interfaz, acordada con mykl el 2026-11-04: cada control tiene un solo sitio; solo se repite por Mi panel, Ctrl K, atajos y MIDI. Dónde vive cada cosa: crossfader en Actuación (Capas solo tiene el lado A/B de cada capa); en pantalla ancha, el tempo (BPM, Auto) en la barra superior y no en Análisis; el interruptor del modo automático en Actuación y sus ajustes en Inspector › Composición; fuentes visuales solo en Inspector › Capa (Bibliotecas no tiene pestaña de fuentes); presets de capa solo en Bibliotecas › Escenas y presets; el número de fila en Clips es cabecera, no botón. En móvil (<800 px) no hay Actuación ni barra superior, así que conserva el BPM en Análisis y el interruptor en Automático. Se dejan a propósito: el reproductor en la barra superior y en Audio (acceso rápido, aprobado el 2026-10-13) y Visualizaciones en el navegador y en el selector del Inspector. Sin revisar por mykl

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

Orden acordado el 2026-11-10. Lo de abajo de esta lista es anterior.

Antes de la ronda:
- [ ] Barra Actuación: que quepa a 1280 × 800 y no se oculte tras Mandos y Mi panel en Directo
- [ ] Escena «Espectáculo completo»: no quemarse a blanco en silencio
- [ ] Barra superior a 820 px: transporte y BPM sin pisarse
- [ ] Clips: columnas 8 y 9 a la vista a 1280 px
- [ ] Comprobar la escena de arranque (capa 2 oculta por el crossfader) y a qué se aplican «Importar» y «Exportar todos»
- [ ] Subir a GitHub los commits pendientes

Ronda de revisión de mykl, los tres usos a la vez, con música real:
- [ ] Reproductor: lista, gapless, radios, Audius, letras
- [ ] Directo: MIDI con controlador, dos pantallas, clips, mandos, moduladores, Mi panel
- [ ] OBS y grabación, también desde Pages
- [ ] Durante la ronda, anotar qué controles se usan y cuáles no
- [ ] Revisar las decisiones de Claude pendientes (fuente que leen los efectos de composición, sonido de TV, Inspector y clips lanzados por teclas o MIDI)

Después de la ronda:
- [ ] Decidir qué controles sobran, con lo anotado
- [ ] Show completo: diseño de qué guarda (rótulos, shaders importados, fuentes visuales, MIDI) y de la carpeta `visio/` de `.spectra`; aprobación de mykl antes de implementar
- [ ] Móvil: pestañas abajo e Inspector como hoja, escenario siempre a la vista; probar en Android real
- [ ] Limitador de destellos según WCAG 2.3.1 (H6) y aviso de silencio (H1)

Documentación:
- [ ] `vision.md` del ecosistema: Visio es app completa, no solo instrumento
- [ ] `funciones.md`: Safari fuera, móvil, show `.spectra`, líneas caducadas; reconfirmar con mykl
- [ ] `arquitectura.md`: cifras y nombres al día; especificación de interfaz aparte
- [ ] `state.md` a estado actual; lo pasado, a `state-history.md`
- [ ] README: número de visualizaciones y navegadores soportados

Sin decidir:
- [ ] La fuente visual no llega a OBS
- [ ] Identidad del ecosistema (Roboto, `#1C2932`, verde) en la app
- [ ] Nombre: «Spectra-visio» o «SpectraVisio»
- [ ] Control externo (OSC, remoto): `funciones.md` lo deja fuera y el ecosistema lo prevé

Anterior al 2026-11-10:

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
- [x] Entrada visual por capa
- [x] Revisión por mykl de la entrada visual por capa (2026-11-02, todo bien en su Firefox)
- [x] Presets de Milkdrop: mantener con atribución y vía de retirada (2026-11-02)
- [x] Repo público, Pages con origen GitHub Actions y push (2026-11-02)
- [ ] Probar la captura de pestaña en Chrome o Edge
- [ ] Probar stream con CORS real de otro dominio
- [ ] Probar MIDI con un controlador real
- [ ] Revisión de la fase 9 por mykl (OBS real, grabación en su Firefox)
- [ ] Revisión de la fase 10 por mykl (móvil real, instalar la app, calidad adaptativa en su equipo)
- [ ] Revisión por mykl de las escenas de ejemplo y del cambio de la entrada visual, con música real
- [ ] Revisión por mykl de la reorganización de Fuente por capa (Contenido y Fuente en el Inspector)
- [ ] Revisión por mykl de la revisión de flujos (nombres, Lista en Audio, Efectos en vivo, Escenas guardadas, shaders que leen la fuente)
- [x] Shaders de ejemplo (2026-11-02)
- [ ] Revisión por mykl de los shaders de ejemplo, en su Firefox
- [ ] Revisión por mykl del repaso de duplicados (2026-11-04): crossfader, tempo, automático, fuentes, presets, Clips; probar en móvil real
- [x] Terminar el inventario de duplicados (2026-11-04): sin más duplicados; se deja la barra del escenario (reproducir y siguiente al pasar el ratón o tocar) como excepción del reproductor
- [x] Barra Actuación en portátil (2026-11-04, aprobado por mykl): el botón dice «Auto» (estado en el color, el tooltip y el aria-label) y el crossfader baja su mínimo a 120 px; cabe en una fila a 1024 px. A 900 y 820 px vuelve a dos filas y la segunda puede quedar cortada
- [x] Batería e2e completa tras el repaso de duplicados (2026-11-04): 90 de 91 en verde; `pwa` en Firefox falló una vez en la batería y pasó sola
- [ ] Comprobar la conexión a OBS desde GitHub Pages (permiso de red local); Pages ya está activo
