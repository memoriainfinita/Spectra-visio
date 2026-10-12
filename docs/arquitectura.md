# SpectraVisio — arquitectura

Diseño técnico confirmado por mykl el 2026-10-10. Implementa la lista de `docs/funciones.md`; las letras entre paréntesis remiten a sus secciones.

## Stack

- TypeScript, React 19, Vite 8 y Vitest 5, como nona. Vite pasa de 5 a 8 (8.3.4 el 2026-10-10); Vitest 5 exige Vite 6.4 o superior
- Motor (audio, render, modulación) en TypeScript sin React. React solo para paneles, conectado al motor con un store propio sobre `useSyncExternalStore`, sin dependencias
- pnpm 11

## Audio

- Grafo: fuente → ganancia de entrada → analizadores izquierdo y derecho. En paralelo: fuente → volumen → salida. El volumen no afecta al análisis (A)
- Reproductor sobre audio decodificado: la pista siguiente se programa al sample exacto, o antes con fundido cruzado. Solo se guardan decodificadas la actual y la siguiente (unos 23 MB por minuto estéreo a 48 kHz). Pistas de más de 20 min, o de más de 100 MB sin duración conocida: `<audio>`, sin gapless
- Prototipo del 2026-10-10 en Chrome, dos mitades de un mismo tono: con dos `<audio>` alternos quedan 3,9 ms (WAV), 12,6 ms (MP3), 3,9 ms (AAC) y 5,4 ms (Opus) de silencio en la unión; con audio decodificado, ninguno. El decodificador recorta el relleno del codificador (mitades de 1,5000 s exactos)
- Igualar volumen (A), activado por defecto: cada pista analizada se lleva a −14 LUFS con una ganancia propia tras su fundido. Las fuertes bajan lo necesario (18 dB como mucho); las flojas suben 6 dB como mucho y sin pasar de −1 dBFS de pico, medido en el análisis previo a 22 050 Hz. Sin análisis (aún no hecho, o pista larga) no cambia. Si el análisis acaba con la pista sonando, el nivel entra con una constante de 0,3 s. Va antes de la división entre análisis y salida, así que el análisis y las grabaciones oyen la pista igualada; «Nivel de la pista» lo tiene en cuenta
- Directorio de radios (B): [radio-browser.info](https://api.radio-browser.info/), libre, sin cuenta y con CORS en su API; un servidor al azar de su lista por visita, como pide. Búsqueda por nombre, género o país (nombre en inglés), las más escuchadas primero, solo emisoras https (una página https no reproduce http) y sin las que el directorio ve caídas. Antes de sonar, una petición que solo lee las cabeceras comprueba que el stream envía CORS; si no, la emisora se rechaza con aviso y no sustituye a la fuente actual. En una muestra del 2026-10-12, más del 90 % de las emisoras https que respondieron lo enviaban. Tras cada búsqueda, la misma comprobación pasa en segundo plano por las emisoras encontradas, cuatro a la vez, y marca «sin análisis» o «no responde» las que no sirven; los resultados duran la visita y una nueva búsqueda detiene la anterior. Favoritas en IndexedDB (clave `radioFavorites`). La app solo contacta con el directorio al buscar y no le notifica las escuchas
- Transporte común (`src/app/transport.ts`): reproducir, pausa, anterior y siguiente siguen a lo que suena. Con un stream como fuente (también en pausa), la barra superior, el panel Reproductor, los atajos, la barra táctil y los controles del sistema muestran la emisora con «En directo» y la manejan: pausa desconecta y reanudar vuelve a conectar en el punto en directo; anterior y siguiente recorren las emisoras favoritas. Sin barra de posición, aleatorio, repetición, fundido ni igualar volumen. Pulsar una pista o la fuente Reproductor devuelve el control a la lista
- Metadatos y carátula: `music-metadata` 12.1.0, MIT
- Análisis previo (C): decodificación a 22 050 Hz en un `OfflineAudioContext`, cálculo propio en un Web Worker: tempo por autocorrelación de la curva de ataques, rejilla ajustada a toda la pista, secciones por novedad espectral y sonoridad BS.1770. `web-audio-beat-detector` 8.2.39 descartado el 2026-10-11: fallaba con el `AudioBuffer` nativo y fija el desfase con un solo pico, tarde
- Essentia.js descartado: AGPL v3
- Bandas logarítmicas configurables calculadas desde la FFT
- Compensación de latencia: latencia que informa el navegador más ajuste manual en ms, aplicada retrasando los datos de análisis que llegan al render. [PENDIENTE: soporte en Safari]

## Render

- Un único canvas WebGL2 de salida. Cada visualización dibuja en una textura: las de Canvas 2D en un canvas oculto que se sube a la GPU, las WebGL directamente
- Compositor como Resolume: pila de hasta 8 capas, cada una con opacidad, modo de fusión sobre las de abajo, anular, solo, lado del crossfader (A, B o fuera) y su cadena de efectos → efectos de composición → capas de texto y letras (E, F). Rejilla de clips: 9 por capa; una columna lanza un clip por capa
- Butterchurn 2.6.7, MIT, con los 100 presets del paquete principal de `butterchurn-presets` 2.4.7 (de 2022). Pinta con el contexto WebGL de la app a través de un proxy que lleva su salida a una textura y anota lo que crea para borrarlo, porque no tiene `dispose`; con canvas propio, la copia entre contextos costaba a Firefox 18-19 ms por fotograma. Recibe la onda del análisis de la app, sin `AudioContext` propio. Código y presets (unos 840 KB) se cargan solo al usarlo
- ISF con lector propio: la cabecera JSON da los parámetros; el audio llega como textura, una fila por canal
- Fondo transparente en el modo fuente para OBS (G)
- Calidad adaptativa (H): la resolución interna baja en pasos (100, 85, 70, 50 %) tras 2 s por debajo del 85 % de los fps objetivo (el límite, o 60) y sube tras 5 s por encima del 95 %. Un paso que no da al menos un 10 % más de fps se deshace y no se repite en 60 s: el límite estaba en otra parte (CPU, ritmo del navegador). No actúa con formato fijo
- Límite de fps (60 o 30) saltando fotogramas de animación; bajo consumo = 30 fps y 75 % de resolución
- Reducir destellos (H): el brillo medio de la imagen (copia de 256 × 144 promediada por mipmaps) puede bajar de golpe pero solo subir 1 por segundo; un fotograma más brillante se escala entero. Va en el estado de salida, así que llega a la ventana de salida, a OBS y a las grabaciones. Anula el estrobo
- Miniaturas del navegador de visualizaciones: render de cada una en pequeño con audio de prueba, en caché

## Parámetros y modulación

- Cada visualización y cada efecto declara sus parámetros: tipo, rango y valor por defecto, como las entradas de ISF
- Modulación (D): fuente (banda, golpe, oscilador lento, control MIDI, envolvente) → transformación (rango, curva, suavizado) → parámetro. Evaluación en cada fotograma
- Preset: visualización, valores, modulaciones y efectos, en JSON versionado para exportar (E)

## Almacenamiento

- Ajustes y presets en IndexedDB con `idb-keyval` 6.3.0, Apache-2.0
- Archivos copiados, solo si el usuario lo elige, en OPFS. En Chrome, además, referencias a los archivos originales (A)
- OPFS con `createWritable`: Chrome, Firefox 111 y Safari 26. La copia va por stream porque Firefox carga en memoria un Blob escrito de una vez. Probado en Firefox el 2026-10-10
- `navigator.storage.persist()` no se espera: Firefox pregunta al usuario y la copia no puede quedar parada hasta la respuesta

## Salidas

- Segunda ventana: la misma app con `?output`, abierta por la principal con `window.open`; carga solo el renderer. Audio y análisis siguen en la principal. Las dos ventanas comparten bucle de eventos y memoria, así que la salida lee de la principal por un puente (`window.opener`) en cada fotograma: escena, análisis, apagón y estrobo, controles MIDI, capas de texto, shaders importados y el mismo elemento de la entrada visual. Sin copias ni cámara abierta dos veces; a cambio, la salida tiene que abrirse desde la app. Sustituye a `BroadcastChannel` (decidido en la fase 8)
- Fuente para OBS (G): la misma app con `?source` como fuente de navegador; carga solo el renderer, con fondo transparente (el brillo es el alfa: el negro no tapa y lo claro se suma) o negro con `&background=black`. La fuente de navegador de OBS no recibe micrófono de forma fiable ([foro de OBS](https://obsproject.com/forum/threads/cant-get-mediastream-permissions-in-browser-source.143858)) y tiene su propio almacenamiento, así que audio y análisis siguen en la app del navegador, que envía a OBS por obs-websocket 5 (incluido desde OBS 28) la petición `CallVendorRequest` → `obs-browser` → `emit_event`; obs-browser la entrega en cada fuente de navegador como `CustomEvent` con el dato en `detail` (comprobado en su código el 2026-10-11). El dato pasa por `obs_data`, que solo guarda listas de objetos: cada mensaje viaja como una cadena JSON. Cada fotograma: análisis (bandas en 16 bits, ondas en 16 bits, base64, unos 6 KB), apagón y estrobo, controles MIDI, posición de la pista; la escena, los shaders, el tamaño fijo, la pista y el logo al cambiar y cada 2 s. La entrada visual no llega a OBS
- Una página https puede abrir `ws://127.0.0.1` y `ws://localhost` en Firefox y Chrome (comprobado el 2026-10-11 con la página también en 127.0.0.1). Desde un sitio público, Chrome 142 pide permiso de acceso a la red local; en junio de 2025 los WebSocket aún no estaban sujetos a ese permiso ([Chrome](https://developer.chrome.com/blog/local-network-access)). [PENDIENTE: comprobar desde GitHub Pages]
- Formato de salida automático o fijo (720p a 4K; 16:9, 9:16, 1:1); fijo, se pinta a ese tamaño en cualquier ventana con bandas negras (G)
- Grabación con `MediaRecorder` sobre el canvas más el sonido analizado, retrasado como los visuales (G). Contenedores que entregan datos mientras graban primero (MKV H.264 en Chrome, WebM en Firefox); el MP4 de Chrome lo retiene todo hasta parar. Trozos escritos en OPFS desde un worker con `createSyncAccessHandle`, que sobreviven a un cierre

## Universal y proyecto

- PWA con `vite-plugin-pwa` 2.0.0 (MIT) y `workbox-window` 7.4.1: todo precacheado (unos 1,7 MB, Milkdrop incluido); versión nueva en espera hasta pulsar Recargar, que se desactiva mientras graba; comprobación de versión cada hora. Iconos PNG generados una vez desde `favicon.svg`
- Pantalla encendida (Wake Lock) mientras suena el reproductor o una entrada, y en la ventana de salida conectada; se pide de nuevo al volver a la pestaña
- Táctil: deslizar en horizontal sobre la imagen cambia de visualización en la capa seleccionada, un toque muestra una barra grande (visualización anterior y siguiente, reproducir, siguiente pista, apagón) y el doble toque pone pantalla completa. Con puntero grueso, controles de al menos 44 px
- TV en directo en la entrada visual: listas públicas de [iptv-org](https://github.com/iptv-org/iptv). Los grupos (categorías, países e idiomas, sin los vacíos ni «undefined») salen de su `PLAYLISTS.md`, que se descarga al abrir el buscador; cada grupo es un `.m3u` que se descarga al elegirlo, y «Todos» (`index.m3u`, unos 2,5 MB) solo con su botón. Se quitan los streams que no son https y los que piden referrer o user agent, que una página no puede poner. Se muestran 50 canales cada vez y solo esos pasan la comprobación de CORS en segundo plano, cuatro a la vez, con las marcas «no disponible» y «no responde»; sin CORS, WebGL no puede leer los fotogramas. En una muestra de 120 streams https del 2026-10-12, desde España: 63 con CORS, 27 con 403, 22 caídos o inexistentes, 4 sin CORS. Los streams son HLS: con reproducción nativa donde el navegador la tiene y con hls.js 1.7.3 (Apache-2.0, versión ligera, unos 114 KB comprimido) en los demás, cargado al primer uso. El vídeo va sin sonido salvo con «Usar también su sonido»: entonces el mismo elemento entra en el grafo como un stream (sin abrir el canal dos veces), con «En directo» en el transporte; pausa detiene imagen y sonido y reanudar vuelve al punto en directo; anterior y siguiente recorren los canales favoritos; cambiar de canal o de entrada visual devuelve el audio al reproductor. Si no empieza en 20 s se abandona. Favoritos en IndexedDB (clave `tvFavorites`), también en la copia de seguridad. Como el resto de la entrada visual, no llega a OBS
- Disposición en pantallas de más de 800 px: la ventana no se desplaza; el escenario ocupa el espacio libre, con una barra de actuación debajo (apagón, congelar, estrobo, crossfader, columnas de clips, modo automático) y el reproductor reducido en la barra superior; los paneles van en una barra lateral con pestañas Audio, Imagen, Efectos, Directo, Salida y Ajustes, que se desplaza por dentro. En Imagen, Presets, Shaders, Entrada visual y Rótulos van plegados. Las pestañas ocultas siguen montadas; la pestaña elegida y los plegados abiertos se recuerdan en `localStorage`. En 800 px o menos, una columna con todos los paneles. El escenario conserva su sitio en el árbol en las dos disposiciones, porque la pantalla completa cruza el límite y volver a montarlo la cerraría
- Dos idiomas con diccionarios propios, sin librería
- Textos de ayuda de más de 90 caracteres plegados tras «Más información» (`src/ui/Hint.tsx`)
- Pestaña Ajustes: idioma y guardar archivos; reducir destellos (también en Directo) y volver a mostrar el aviso; rendimiento; atajos de teclado; copia de seguridad; restablecer
- Copia de seguridad (`src/app/backup.ts`): un JSON con ajustes, presets, shaders importados y emisoras y canales favoritos, sin la contraseña de OBS ni los archivos de la lista. Al importar, los ajustes se sustituyen salvo la contraseña de OBS, guardar archivos y el aviso ya contestado; presets, shaders y favoritas se añaden sin repetir identificadores
- Restablecer los ajustes conserva presets, shaders, favoritas, guardar archivos y el aviso contestado. Borrar todos los datos deja una marca en `localStorage` y recarga; el borrado (IndexedDB, almacenamiento privado de archivos y claves `spectra.*`) corre al arrancar, antes de cargar nada, para que nada en marcha vuelva a escribir sus datos
- Media Session. Firefox solo activa las teclas multimedia con un elemento multimedia sonando (bug 2067534): un `<audio>` silencioso en bucle mientras reproduce. Teclas comprobadas por mykl en su Firefox
- Despliegue en GitHub Pages con GitHub Actions, ruta base relativa `./` como nona, activo desde la fase 1 (I)
- Código anterior a la reconstrucción en `.archive/v0/`, fuera de git; en el historial hasta el commit `7a63da1`
- Tests con Vitest de la lógica sin navegador: análisis y análisis previo, modulación, efectos, escena y presets, lista y sesión, lectores ISF y LRC, MIDI, acciones de directo, modo automático, OBS, grabación, formato de salida, calidad adaptativa, igualar volumen, idiomas y ajustes (I)
- Comprobaciones en navegador en `tests/e2e/` (Playwright 1.63.0): 28 guiones que manejan la app compilada en Firefox y Chrome, silenciados, e imprimen lo medido; `pnpm e2e` los pasa todos y marca los que fallan o informan errores de la página

## Orden de implementación

1. Migración a TypeScript, React y Vite 8; estructura, store, idiomas, almacenamiento, despliegue en Pages
2. Motor de audio nuevo, reproductor completo, metadatos, fuentes (A, B)
3. Análisis y latencia (C)
4. Compositor WebGL2 con capas A/B, port de las 8 visualizaciones, parámetros y modulación (D)
5. Efectos, paletas, transiciones, presets, navegador de visualizaciones
6. Familias nuevas, Butterchurn, ISF, entradas visuales, capas y letras
7. Análisis previo y modo automático
8. Directo: capas y clips al estilo Resolume, MIDI, reloj MIDI, crossfader, segunda ventana, apagón
9. OBS y grabación
10. PWA, móvil, accesibilidad, calidad adaptativa, ahorro de energía

Los `[PENDIENTE]` se resuelven con pruebas cortas al llegar a su fase.

## Fuentes

- [Gapless 5](https://cdn.jsdelivr.net/npm/@regosen/gapless-5@1.6.2/README.md)
- [Butterchurn](https://github.com/jberg/butterchurn)
- [iptv-org: listas](https://github.com/iptv-org/iptv/blob/master/PLAYLISTS.md) y [hls.js](https://github.com/video-dev/hls.js)
- [music-metadata](https://github.com/borewit/music-metadata)
- [essentia.js](https://unpkg.com/essentia.js@0.1.1/README.md)
- [web-audio-beat-detector](https://cdn.jsdelivr.net/npm/web-audio-beat-detector@8.2.37/README.md)
- [vite-plugin-pwa](https://npmjs.com/package/vite-plugin-pwa)
- [ISF: visualizadores de audio](https://docs.isf.video/primer_chapter_8)
- Versiones y licencias: registro npm, consultado el 2026-10-10
