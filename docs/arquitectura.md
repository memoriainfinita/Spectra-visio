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
- Metadatos y carátula: `music-metadata` 12.1.0, MIT
- Análisis previo (C): decodificación a 22 050 Hz en un `OfflineAudioContext`, cálculo propio en un Web Worker: tempo por autocorrelación de la curva de ataques, rejilla ajustada a toda la pista, secciones por novedad espectral y sonoridad BS.1770. `web-audio-beat-detector` 8.2.39 descartado el 2026-10-11: fallaba con el `AudioBuffer` nativo y fija el desfase con un solo pico, tarde
- Essentia.js descartado: AGPL v3
- Bandas logarítmicas configurables calculadas desde la FFT
- Compensación de latencia: latencia que informa el navegador más ajuste manual en ms, aplicada retrasando los datos de análisis que llegan al render. [PENDIENTE: soporte en Safari]

## Render

- Un único canvas WebGL2 de salida. Cada visualización dibuja en una textura: las de Canvas 2D en un canvas oculto que se sube a la GPU, las WebGL directamente
- Compositor como Resolume: pila de hasta 8 capas, cada una con opacidad, modo de fusión sobre las de abajo, anular, solo, lado del crossfader (A, B o fuera) y su cadena de efectos → efectos de composición → capas de texto y letras (E, F). Rejilla de clips: 9 por capa; una columna lanza un clip por capa
- Butterchurn 2.6.7, MIT, en su propio canvas, usado como textura de entrada. API: `createVisualizer(audioContext, canvas, opciones)`, `connectAudio(nodo)`, `loadPreset(preset, segundosDeFundido)`, `render()` por fotograma, `setRendererSize(ancho, alto)`. `butterchurn-presets` 2.4.7 es de 2022
- ISF con lector propio: la cabecera JSON da los parámetros; el audio llega como textura, una fila por canal
- Fondo transparente en el modo fuente para OBS (G)
- Calidad adaptativa variando la resolución interna según los fps (H)
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

- PWA con `vite-plugin-pwa` 2.0.0, MIT, compatible con Vite 8
- Dos idiomas con diccionarios propios, sin librería
- Wake Lock y Media Session. Firefox solo activa las teclas multimedia con un elemento multimedia sonando (bug 2067534): un `<audio>` silencioso en bucle mientras reproduce. Teclas comprobadas por mykl en su Firefox
- Despliegue en GitHub Pages con GitHub Actions, ruta base relativa `./` como nona, activo desde la fase 1 (I)
- Código anterior a la reconstrucción en `.archive/v0/`, fuera de git; en el historial hasta el commit `7a63da1`
- Tests con Vitest: análisis, modulación, lectores ISF y LRC, presets (I)

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
- [music-metadata](https://github.com/borewit/music-metadata)
- [essentia.js](https://unpkg.com/essentia.js@0.1.1/README.md)
- [web-audio-beat-detector](https://cdn.jsdelivr.net/npm/web-audio-beat-detector@8.2.37/README.md)
- [vite-plugin-pwa](https://npmjs.com/package/vite-plugin-pwa)
- [ISF: visualizadores de audio](https://docs.isf.video/primer_chapter_8)
- Versiones y licencias: registro npm, consultado el 2026-10-10
