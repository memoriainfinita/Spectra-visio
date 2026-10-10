# Spectra-visio — history

### 2026-10-10 — Revisión completa del proyecto

- Archivo y stream no sonaban: la fuente solo iba al analizador. Ahora pasan por un `<audio>` conectado al analizador y a `destination`; el micrófono va solo al analizador para no realimentar
- `plasma` medido a 387 ms por fotograma en 1080p con cálculo por píxel a tamaño completo. Ahora se calcula en un buffer de 240 px de ancho y se escala
- Fundido de estelas a negro: con alfa baja el redondeo de 8 bits deja residuo que sobre `#05060f` se veía como fantasmas azulados
- Kaleido, orbitals, gridwarp y strobe bloom portados del prototipo `psychedelic_audio_visualizer_canvas_fullscreen.html`, que tenía mejores prácticas que la app (micrófono sin filtros, animación por tiempo)
- Los nueve `SpectraVisio_*.md` y `claude.md` describían un producto no construido (MIDI, capas, escenas, PWA, Webpack, Jest). Movidos a `docs/archive/`; `claude.md` renombrado a `prompting-guide.md` porque Claude Code lo cargaba como instrucciones del proyecto

### 2026-10-10 — Reconstrucción desde cero

- La lista de funciones de `docs/funciones.md` cambia la base entera (compositor WebGL2, React, parámetros modulables, TypeScript); del código canvas solo valía la matemática de las visualizaciones
- La app anterior, sus capturas, la especificación de enero y el prototipo pasan a `.archive/v0/`, fuera de git como en nona; siguen en el historial hasta `7a63da1`
- Patterns retirados por referirse a código archivado: `BaseVisualizer` y `MODES` de `src/main.js`. Las ideas de animación por tiempo y fundido a negro siguen en Patterns
- Ruta base de Vite: `./` en lugar de `/Spectra-visio/`, por el patrón de nona

### 2026-10-10 — Fase 2: decisiones del reproductor

- Gapless: se midió antes de elegir. Con dos `<audio>` alternos quedaban de 4 a 13 ms de silencio en la unión según el formato; con audio decodificado y programado, ninguno. Por eso se reproduce desde memoria y `<audio>` queda solo para pistas largas
- Firefox encontró dos fallos que Chrome headless no mostraba: el deslizador de posición buscaba dos veces (por el valor que React repone entre `input` y `change`) y `navigator.storage.persist()` dejaba esperando la copia de archivos tras una pregunta que solo hace Firefox
- Las primeras pruebas headless en Chrome sonaron por los altavoces; desde entonces van silenciadas

### 2026-10-10 — Fase 3: decisiones del análisis

- Analizadores de 2048 a 4096 muestras: bins de 11,7 Hz a 48 kHz, para separar subgraves de graves; ventana de 85 ms
- `smoothingTimeConstant` del navegador a 0: el suavizado depende de los fotogramas, y el propio va por tiempo y con ajuste
- Golpes como contadores acumulados en cada fotograma: quien lee con retraso o salta fotogramas no pierde ninguno
- BPM por intervalos entre todos los pares de golpes del bombo (no solo vecinos), rango 70 a 180: un golpe perdido o de más no mueve la estimación
