---
created: 2026-09-29
last_updated: 2026-11-20
---

# Spectra-visio — state

Qué es verdad ahora. Lo que ya pasó vive en `state-history.md`.

## Project

Visualizador de audio en tiempo real para navegador, reconstruido desde cero en 10 fases. Funciones en `docs/funciones.md`; diseño técnico en `docs/arquitectura.md`.

## Status

**Retomar por:** esperar lo que digan los usuarios y arreglar lo que salga. Lo que mykl no llegó a probar está en «Sin probar» (reproductor con música real, OBS y grabación, móvil real, sonido por fuente con un canal de TV real). Mykl revisó el 2026-11-17: Firefox (arreglos del 11-16, H6, H1, ventana minimizada), uso libre como directo, MIDI y dos pantallas: todo bien.

**Fase:** terminado por ahora (dicho por mykl el 2026-11-20: queda publicada y se espera a ver qué dicen los usuarios; antes, en progreso). Las funciones nuevas, las decisiones abiertas y el «show completo» esperan a ese uso real.

- Las 10 fases de `docs/arquitectura.md`, el rediseño de la interfaz (5 fases) y todas las funciones de `docs/funciones.md` están hechos. Base: TypeScript 7, React 19, Vite 8, Vitest 5, store propio, español e inglés, ajustes en IndexedDB, disposición con muelles, CI con despliegue a Pages
- Repo público `memoriainfinita/Spectra-visio`; Pages en https://memoriainfinita.github.io/Spectra-visio/. Subido el 2026-11-17 a petición de mykl: `origin/main` y `main` coinciden (hasta la decisión de la escena de arranque); los arreglos de la auditoría, de los defectos de diseño y el estado ya están en GitHub y Pages los despliega por CI El 2026-11-17 se subió hasta `f80cf89` a petición de mykl, con la escena de ejemplo única; antes de ese push, GitHub estaba en `c8c38f0`.
- Guía de uso en inglés: `docs/guide/` (índice «quiero… → página» y seis páginas), con capturas en `docs/guide/img/` y la principal en `docs/Spectra-visio-demo.png`, hechas por `scripts/screenshots.mjs` (Playwright, Firefox, inglés, silenciado, pista sintética; `pnpm build`, `pnpm exec vite preview --port 4181` y `node scripts/screenshots.mjs`). Si cambia la interfaz, relanzarlo. Escrita a partir de `funciones.md` y de la interfaz; sin revisar por mykl
- Comprobaciones del 2026-11-20, sobre `b472d67` (cierre): typecheck, 288 tests unitarios, build y `pnpm audit --prod` (sin vulnerabilidades conocidas) en verde. Batería completa de e2e en Firefox y Chrome: 90 de 92 ejecuciones `ok`; `layers` en Firefox (400 s, `SIGTERM`) y `obs` en Firefox (todas sus comprobaciones pasaron y el guion se quedó colgado cerrando el servidor falso) fallaron, y pasaron los dos al repetirlos solos: intermitentes con la máquina cargada, no de la versión. «En verde» significa que el guion no se colgó ni imprimió `FAIL` (`tests/e2e/README.md`: no son aserciones). Los e2e corren contra `dist`: `pnpm build` antes. Historial de comprobaciones anteriores en `state-history.md`
- Auditoría del 2026-11-16 (Claude, a petición de mykl): arreglados tres fallos y cuatro riesgos, cada uno reproducido antes en Chrome silenciado. Sin leer: `src/ui`, visualizaciones, efectos, lectores de shaders, análisis previo y muelles (solo barrido automático de claves de traducción, clases CSS y exportaciones). Firefox con la ventana principal oculta no se pudo medir (sin CDP en el Playwright de Firefox). Detalle en `state-history.md`

- Escenas de ejemplo (2026-11-17, a petición de mykl): las siete se sustituyeron por una sola, «Espectáculo» (`src/engine/scene/demos.ts`), con una paleta por columna. Mirada en Chrome silenciado y sin música: en silencio varias columnas se ven oscuras, y cómo queda con sonido real no se ha visto. Sin revisar por mykl. `DEMOS` sigue siendo una lista, por si se añade otra. Los presets de Milkdrop no se han tocado
- Defectos vistos el 2026-11-10, arreglados el 2026-11-16 sin que mykl los haya visto en su Firefox (medidos en Chrome a 1280 × 800, 1000 y 820 px; el porqué en `state-history.md`): barra Actuación cortada y oculta tras Mandos y Mi panel; barra superior pisada a 820 px; Clips con scroll horizontal; escena «Espectáculo completo» quemada a blanco en silencio; «Importar» y «Exportar todos» sin decir que son de presets. Los diseños de fábrica nuevos solo los ve quien no ha tocado los diseños o pulsa Restablecer: el navegador guarda los cuatro de fábrica en cuanto cambia algo, y esos conservan la disposición antigua (mykl, que los tiene guardados, debe restablecer Directo y Portátil). Quedan vistos de esa lista:
  - Clips: con tres capas ya no hace scroll vertical a 1280 × 800 (celdas de 30 px); sigue con cuatro capas o pantallas más bajas. Actuación en dos filas a 1280 px
  - Móvil (<800 px): hecho el 2026-11-17 con la opción A del lienzo que mykl eligió (cinco pestañas abajo, Inspector como hoja, escenario y reproductor siempre a la vista); medido en Chrome emulado a 375 × 812, 360 × 640 y 740 × 360 y en los guiones e2e `touch`, `inspector` y `docks`. No visto en un Android real ni por mykl
  - Escena de arranque: decidido por mykl el 2026-11-17, dos capas (Caleidoscopio en A, Túnel en B, crossfader en A, la 2 no se ve), porque la app arrancará con una visita guiada que la presente. Sustituye al «una capa de partida» del diseño del 2026-10-13. Es el valor de `defaultScene()`
- Rumbo decidido por mykl el 2026-11-10: app completa (reproductor con visuales, directo y fuente para OBS al mismo nivel; se corrige `0_draft/spectra-ecosystem/vision.md`, que dice «no es un motor de reproducción»); una sola ronda de revisión con los tres usos; el show lo guarda todo (hoy una escena no guarda rótulos, shaders importados, fuente visual ni MIDI) y se exporta como `.spectra`; móvil con el diseño aprobado el 2026-10-13; Safari fuera, así que el móvil es Android
- Decisiones abiertas, de mykl:
  - La fuente visual no llega a OBS
  - Identidad del ecosistema (Roboto, `#1C2932`, verde) sin aplicar en la app
  - Nombre: decidido por mykl el 2026-11-17, «SpectraVisio» (ya lo es en la app, el manifiesto y los documentos); «Spectra-visio» queda solo como nombre del repositorio y de la carpeta
  - Control externo: `funciones.md` deja fuera OSC y control remoto y la visión del ecosistema prevé que Cue, Core y Remote manejen Visio
  - Decisiones de Claude, revisadas por mykl el 2026-11-17: los efectos de composición leen la fuente de la capa que se elija (selector, por defecto la más alta con fuente); el sonido de cada vídeo o canal es propio y se mezcla (ya no hay un solo sonido de TV); el Inspector sigue sin saltar a los clips lanzados por teclas o MIDI
  - De `a-estudiar.md`, H6 (limitador de destellos) y H1 (aviso de silencio): hechos el 2026-11-17; ver `state-history.md`
- Documentación desalineada (puesta al día en parte el 2026-11-16 y el 2026-11-20):
  - `funciones.md`: revisada con mykl el 2026-11-17 (líneas caducadas corregidas)
  - `arquitectura.md`: corregidos el 2026-11-16 «envolvente» como fuente de modulación (el código tiene banda, golpe, oscilador y MIDI) y el `[PENDIENTE]` de Safari (fuera del alcance, decidido el 2026-11-10). El 2026-11-17 se unificó «entrada visual» en «fuente visual», el término de la interfaz. Quedan: «Universal y proyecto» es especificación de interfaz; un `[PENDIENTE]` (OBS desde GitHub Pages)
  - Visualizaciones: el registro (`src/engine/render/registry.ts`) tiene 23 entradas: 21 propias, Milkdrop y la fuente visual. El README dice 21 propias, que es correcto; `vision.md` del ecosistema dice 23; el texto de la escena de ejemplo (`demo.show.hint`) y `funciones.md` dicen 22, que es la cuenta de las visualizaciones sin la fuente visual (21 propias más Milkdrop)
  - El botón «Copiar … a tus shaders» se llama así porque cinco guiones buscan «Añadir»
- Revisados por mykl el 2026-11-17, todo bien: menú de clip, columnas con nombre y lanzables por teclas y nota MIDI, ventana de muelle real y guardado al cerrar, escenas de ejemplo con Ctrl Z, uso libre como directo.
- Sin revisar por mykl (en la ronda): fases 1 a 5 del rediseño (la 1 la probó el 2026-10-14 sin confirmarla como revisada); cambio de la fuente visual con música real; fuente por capa (Contenido y Fuente en el Inspector); revisión de flujos (nombres, Lista en Audio, Escenas guardadas, shaders que leen la fuente); shaders de ejemplo; repaso de duplicados; descripciones cortas de Ajustes (las escribió Claude a partir de las ayudas); fases 9 y 10 (OBS real, grabación, móvil real, instalar la app, calidad adaptativa)
- Ronda de revisión de mykl en su Firefox empezada el 2026-10-22, sin resultados aparte de lo que mykl dio por bueno (2026-11-02: opacidad modulable, cantidad arrastrable, arrastrar a Mi panel, Editar y ayudas en la barra de pestañas, ayudas con solo «?», entrada visual por capa). Probado antes por mykl: fases 2 a 8 (2026-10-10 y 2026-10-11)
- Sin probar: escuchar a oído emisoras reales del directorio (con emisoras reales, Claude solo comprobó buscar, la comprobación en segundo plano y el arranque); Safari (nada, tampoco `outputLatency`); captura de pestaña en Chrome o Edge; referencias de archivos de Chrome; pistas largas por `<audio>`; stream de otro dominio con CORS real; MIDI con un dispositivo real y con el permiso de Firefox; dos pantallas reales; OBS real y desde GitHub Pages; grabación: sincronía a ojo, Firefox con ventana, sesiones largas; móvil real; instalar la app; calidad adaptativa con una GPU lenta real
- La versión anterior (canvas, 8 visualizaciones) está en `.archive/v0/`, fuera de git, y en el historial hasta `7a63da1`
- Investigación de las sesiones en la nube copiada íntegra en `docs/investigacion/`. Se hizo sobre la v0 del `main` de GitHub. Revisada con mykl el 2026-10-20: lo que queda «a estudiar» está en `docs/investigacion/a-estudiar.md`, sin pasar a `docs/funciones.md`, con el CORS de cada fuente de medios, licencias, librerías y modelos comprobados por Claude el 2026-10-20 y 2026-10-21
- Presets de Milkdrop sin licencia conocida: `butterchurn-presets` solo trae el MIT del autor del paquete (comprobado el 2026-10-21, detalle en R8 de `a-estudiar.md`). Los 100 presets no están en el repo, solo la dependencia; se sirven en el build de Pages. Decidido por mykl el 2026-11-02: mantenerlos con atribución y vía de retirada. Hecho: `NOTICE.md` (retirada por incidencia en GitHub) y nota en el README; sin línea visible en la app, porque el autor ya va en el nombre del preset
- Rediseño de la interfaz, completo (fase 1 el 2026-10-14, fases 2 y 3 el 2026-10-15, fases 4 y 5 el 2026-10-22). Decisiones, fases y por qué en `state-history.md` (2026-11-16) y en `docs/arquitectura.md`. Lienzo vigente: https://claude.ai/artifact/FBhdK7Ax88cCEdWscXNa1X, tablero «A2 con muelles» (el de la disposición con pestañas, https://claude.ai/artifact/YQZeJBzbvudQkcqn84u8ow, quedó sustituido)
- Regla de la interfaz, acordada con mykl el 2026-11-04: cada control tiene un solo sitio; solo se repite por Mi panel, Ctrl K, atajos y MIDI. Dónde vive cada cosa: crossfader en Actuación (Capas solo tiene el lado A/B de cada capa); en pantalla ancha, el tempo (BPM, Auto) en la barra superior y no en Análisis; el interruptor del modo automático en Actuación y sus ajustes en Inspector › Composición; fuentes visuales solo en Inspector › Capa (Bibliotecas no tiene pestaña de fuentes); presets de capa solo en Bibliotecas › Escenas y presets; el número de fila en Clips es cabecera, no botón. En móvil (<800 px) hay Actuación (pestaña Directo) pero no barra superior, así que el interruptor de Auto también está solo en Actuación y el BPM sigue en Análisis. Se dejan a propósito: el reproductor en la barra superior y en Audio (acceso rápido, aprobado el 2026-10-13) y Visualizaciones en el navegador y en el selector del Inspector. Sin revisar por mykl

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

## Preferences

- Las revisiones y pruebas manuales que queden se hacen todas juntas, en una sola ronda, cuando mykl lo diga. Pedido el 2026-10-12.
- Funciones nuevas solo tras ver qué dicen los usuarios. Dicho el 2026-11-10 («sin funciones nuevas hasta cerrar la ronda») y el 2026-11-20 («terminada por ahora»).

## TODO

- [ ] Atender lo que salga del uso real: issues de GitHub y lo que mykl vea al usarla
- [ ] `vision.md` del ecosistema (`0_draft/spectra-ecosystem`): editado el 2026-11-17 (Visio es app completa) y sin commit en ese proyecto
- [ ] `arquitectura.md`: resto de cifras y nombres al día; especificación de interfaz aparte

## Aparcado

- Resto de la ronda de revisión de mykl con música real: reproductor (lista, gapless, radios, Audius, letras), OBS y grabación también desde Pages (pide el permiso de red local; mykl vio llegar la imagen a OBS el 2026-11-17), móvil real (instalar la app falla con «ya está instalada»: revisar por adb qué hay instalado; falta la calidad adaptativa en su equipo), lo de «Sin revisar por mykl» y el sonido por fuente con un canal de TV real. Aparcado el 2026-11-20 al dar la app por terminada por ahora
- Show completo: diseño de qué guarda (rótulos, shaders importados, fuentes visuales, MIDI) y de la carpeta `visio/` de `.spectra`; aprobación de mykl antes de implementar
- Decisiones abiertas de Status (fuente visual a OBS, identidad del ecosistema, control externo)
- Más de 9 columnas de clips (preguntado por mykl el 2026-11-17). Hoy el límite es de diseño: `CLIP_COLUMNS = 9` en `src/engine/scene/limits.ts`, porque cada columna se lanza con una tecla del 1 al 9 y tiene su nota MIDI. Esquema pensado: páginas de nueve columnas, con las teclas 1 a 9 y el MIDI siempre sobre la página activa y un control para cambiar de página. Hay que decidir teclas, MIDI, rejilla y migración de escenas guardadas
