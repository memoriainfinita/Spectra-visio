# SpectraVisio - Hallazgos de Investigación

**Versión:** 0.1
**Fecha:** Octubre 10, 2026
**Estado:** Investigación (ningún cambio aplicado al código)

---

## 📖 Propósito del Documento

Recoge la investigación sobre los factores que condicionan el desarrollo de SpectraVisio más allá de las visualizaciones y los motores de render: fuentes de audio, accesibilidad, uso en directo, sincronía, rendimiento, mapeo perceptivo, ecosistema de plugins, pruebas, competencia e IA.

Documentos relacionados:
- `SpectraVisio_Visualization_Ideas.md` — qué dibujar.
- `SpectraVisio_Rendering_Engines.md` — con qué motores y librerías.

**Convenciones**
- **⚠️ sin verificar**: fuentes secundarias, antiguas o contradictorias. Confirmar antes de decidir.
- **Acción**: propuesta concreta para SpectraVisio derivada del hallazgo.
- Las fuentes de cada sección están al final del documento, agrupadas por tema.

---

## 🐞 0. Hallazgos en el Código Actual

Problemas detectados al contrastar la investigación con `src/core/audioEngine.js` y `src/main.js`. Son los más accionables del documento.

| # | Problema | Dónde | Efecto | Acción |
|---|----------|-------|--------|--------|
| C1 | **El analizador no está conectado a `ctx.destination`** | `useFile`, `useStream` | Archivos y streams se analizan pero **no se oyen**. `createMediaElementSource` además desvía el audio del elemento al grafo, silenciándolo | `analyser.connect(ctx.destination)` para archivo y stream (no para micrófono, para evitar realimentación) |
| C2 | **`crossOrigin` se asigna después del `src`** | `useStream`: `new Audio(url)` y luego `audio.crossOrigin = 'anonymous'` | La petición puede salir sin CORS; el analizador recibe ceros aunque el servidor envíe cabeceras correctas | Crear `new Audio()`, asignar `crossOrigin` y después `src` |
| C3 | **Micrófono con procesado de voz activo** | `useMic`: `getUserMedia({ audio: true })` | Cancelación de eco, supresión de ruido y control automático de ganancia activos por defecto en Chrome, Firefox y Safari; deforman el espectro musical | Pedir `echoCancellation`, `noiseSuppression` y `autoGainControl` a `false` y comprobar con `track.getSettings()` |
| C4 | **`smoothingTimeConstant` 0.85** | `ensureContext` | Suavizado temporal alto: retrasa y aplana transitorios; peor detección de golpes | Exponer como parámetro; usar 0 para análisis de onsets propio |
| C5 | **Resolución a `devicePixelRatio` completo y sin límite** | `resize()` en `main.js` | En un móvil con DPR 3 se dibujan 9 veces más píxeles que a DPR 1 | Limitar DPR (p. ej. ≤ 2) y añadir escala adaptativa (sección 5) |
| C6 | **Sin detección de silencio por CORS/DRM** | `useStream` | Si la fuente se silencia, la app muestra la visualización en reposo sin explicar por qué | Detectar N segundos de ceros exactos con reproducción activa y avisar al usuario |

---

## 🎧 1. Fuentes de Audio

**Por qué importa:** el PRD dirige la app a usuarios casuales que escuchan música, podcasts o meditaciones. En la práctica esa música está en Spotify, YouTube o similares, no en un MP3 local. Sin una vía para capturarla, el caso de uso casual no existe.

### 1.1 Audio de pestaña o del sistema (`getDisplayMedia`)
- **Chrome/Chromium (74+)**: captura el **audio de una pestaña** en macOS, Windows, Linux y ChromeOS al compartir una pestaña.
- **Audio de todo el sistema**: solo en **Windows y ChromeOS** al compartir la pantalla completa, con opción explícita del usuario.
- **Firefox y Safari**: implementan `getDisplayMedia` pero, según un informe de desarrollador, ignoran el audio. ⚠️ sin verificar (fuente única y anecdótica).
- La opción `systemAudio` está marcada como experimental en MDN.

**Acción:** añadir la fuente "Capturar pestaña" (Chromium) con instrucciones claras ("comparte la pestaña de Spotify/YouTube y marca *compartir audio*"). Detectar el navegador y ocultarla o explicar la limitación en Firefox y Safari.

### 1.2 Servicios con DRM (Spotify y otros)
- El Web Playback SDK de Spotify requiere `encrypted-media` (EME) y crea un dispositivo Spotify Connect en el navegador.
- En 2014, un ingeniero de Mozilla propuso en la lista de Web Audio que el contenido protegido por EME se trate como recurso de otro origen: **el nodo produce silencio** y se registra un aviso. ⚠️ sin verificar el comportamiento actual de cada navegador.
- Los endpoints de análisis de audio de la Web API de Spotify devuelven metadatos de la pista, no la señal; no sirven para alimentar un analizador en tiempo real.

**Acción:** no planificar integración directa con Spotify. La vía viable es la captura de pestaña (1.1) o una entrada de línea / cable de audio virtual.

### 1.3 Streams por URL y CORS
- Si el servidor no envía `Access-Control-Allow-Origin`, Chrome registra que la fuente "produce ceros por restricciones CORS" y Firefox que "producirá silencio". El cliente no puede evitarlo.
- `crossOrigin = 'anonymous'` debe asignarse **antes** de `src` (ver C2).
- Alternativa: proxy en el mismo origen. Implica un servidor y posibles cuestiones de derechos.

**Acción:** corregir C2, detectar el silencio (C6) y mantener una lista de radios de prueba con CORS para la documentación.

### 1.4 Micrófono para música
- Chrome, Firefox y Safari activan por defecto `echoCancellation`, `noiseSuppression` y `autoGainControl`.
- La W3C reconoce la grabación de música como el caso en que estos filtros colorean el sonido.
- En Firefox, desactivar `echoCancellation` desactiva también los otros dos salvo que se especifiquen.
- **Safari** es el más problemático: en Safari 11 los filtros seguían activos aunque se pidieran a `false`, y en Safari 26 (macOS) hay informes de que `echoCancellation: false` devuelve estéreo aunque se pida un canal. ⚠️ comprobar en versiones actuales.
- `getSupportedConstraints()` da falsos positivos; la comprobación fiable es `track.getSettings()`.

**Acción:** corregir C3 y registrar en consola los valores efectivos de `getSettings()`.

---

## ⚠️ 2. Fotosensibilidad y Accesibilidad

**Por qué importa:** el PRD exige WCAG 2.1 AA. El criterio 2.3.1 es de nivel A (por tanto incluido) y varias visualizaciones planificadas (Strobebloom, flashes por *beat*, transiciones con destello) lo incumplen por diseño. Hay además riesgo real para personas con epilepsia fotosensible.

### 2.1 WCAG 2.3.1 — Tres destellos o por debajo del umbral (Nivel A)
- Nada puede destellar **más de 3 veces en cualquier periodo de 1 segundo**, salvo que el destello esté por debajo de los umbrales general y de rojo.
- **Destello general**: par de cambios opuestos de luminancia relativa de al menos el 10 % del máximo, con la imagen más oscura por debajo de 0,80 de luminancia relativa.
- **Área**: solo cuenta si el área combinada que destella supera 0,006 estereorradianes (25 % de un campo visual de 10°); en pantallas de escritorio se suele aproximar a un rectángulo de 341×256 px.
- **Destello rojo** (definición de trabajo, no normativa): para cualquier estado, `R/(R+G+B) ≥ 0,8` y un cambio en `(R−G−B)×320 > 20` en ambas transiciones.
- Se aplica a **todo** el contenido de la página.
- **2.3.2 (AAA)** prohíbe cualquier destello de más de 3 por segundo, sin umbrales.

### 2.2 Herramientas de análisis
- **PEAT** (Trace Center, algoritmos de Graham Harding y Cambridge Research Systems): gratuita pero no de código abierto; analiza capturas de pantalla.
- Trace anunció en 2022 una versión de código abierto, sin fecha, y existe un proyecto relacionado (D2).
- **EPI-LENS**: extensión de navegador MIT que se presenta como "PEAT de código abierto"; actividad muy baja.
- No se encontraron detalles verificados de ITU-R BT.1702 en esta búsqueda.

### 2.3 Movimiento
- **2.2.2 Pausar, detener, ocultar (Nivel A)**: todo contenido que se mueva o actualice automáticamente durante más de 5 segundos debe poder pausarse, detenerse u ocultarse. Una visualización continua probablemente entra aquí (inferencia).
- **2.3.3 Animación por interacción (AAA)**: el movimiento disparado por interacción debe poder desactivarse salvo que sea esencial.
- `prefers-reduced-motion` (valores `reduce` / `no-preference`) se lee con `matchMedia`. La recomendación general es **reducir** el movimiento (menos amplitud, sin giros grandes) más que eliminarlo.

**Acciones:**
1. **Limitador de destellos** en el núcleo: medir la luminancia media (y el rojo saturado) del frame en una versión reducida del canvas y limitar las transiciones opuestas a ≤ 3 por segundo. Activo por defecto.
2. **Modo seguro** activado por defecto, con aviso explícito para desactivarlo, y Strobebloom solo disponible fuera de él.
3. Respetar `prefers-reduced-motion`: menos amplitud y velocidad, sin flashes.
4. Pausa accesible por teclado (ya existe *Espacio*; verificar que cubre 2.2.2).
5. Aviso de fotosensibilidad en la pantalla de bienvenida.

---

## 🎛️ 3. Uso en Directo y Streaming

**Por qué importa:** VJs, DJs y creadores de contenido son usuarios primarios según el PRD.

### 3.1 OBS Browser Source
- Patrón documentado por otros visualizadores web: fuente de navegador con URL local, tamaño igual al canvas, "apagar fuente cuando no sea visible" y "refrescar navegador al activar la escena".
- La opción **"Controlar audio vía OBS"** da problemas frecuentes en los foros: el medidor no muestra audio, o el audio acaba en la captura de escritorio. Un usuario informa que funciona en macOS pero no en Windows. ⚠️ sin verificar con las versiones actuales.
- No se encontró documentación sobre fondo transparente; depende de que el canvas y el `body` sean transparentes y del CSS personalizado de la fuente.

**Acciones:**
- **Modo "embed"** por parámetros de URL: `?preset=…&ui=0&bg=transparent&source=mic`, sin overlay de bienvenida.
- Probar OBS en Windows y macOS con micrófono / entrada virtual como fuente.
- Página de documentación específica para OBS.

### 3.2 Segunda pantalla
- **Window Management API** (`getScreenDetails`): Chrome y Edge 100+, **no** en Firefox ni Safari; requiere permiso y HTTPS. Permite abrir una ventana a pantalla completa en el proyector y dejar los controles en el portátil.
- **Presentation API**: borrador de Candidata a Recomendación del W3C; no se encontraron datos de soporte actual por navegador. ⚠️ comprobar en MDN.
- Alternativa universal: `window.open` de una ventana de salida controlada por `BroadcastChannel` o `postMessage`.

**Acción:** ventana de salida separada sincronizada con `BroadcastChannel` (funciona en todos los navegadores); posicionarla automáticamente con Window Management API donde exista.

### 3.3 Pantalla siempre encendida
- **Screen Wake Lock API**: Baseline desde marzo 2025 (Chrome, Firefox, Safari).
- En iOS Safari desde 18.4 según MDN, pero **no funciona en apps instaladas en la pantalla de inicio** (bug WebKit 254545).
- El sistema puede revocar el bloqueo (p. ej. con batería baja); hay que detectarlo y reintentar.

**Acción:** pedir el wake lock al iniciar la visualización y en `visibilitychange`.

### 3.4 Pantalla completa en iPhone
- iPhone Safari **sigue sin Fullscreen API para elementos que no sean vídeo**; un bug de WebKit de marzo 2026 sigue abierto. iPad sí la tiene.
- Una PWA con `"display": "fullscreen"` en el manifiesto no entra en pantalla completa real en iOS: las barras siguen visibles.
- Truco documentado: volcar el canvas a un `<video>` (vía `captureStream`) y pedir pantalla completa del vídeo.

**Acción:** detectar iPhone y ofrecer "Añadir a pantalla de inicio" como mejor opción; valorar el truco del `<video>` como experimento.

### 3.5 Control externo
- **Web MIDI**: Chrome y Firefox (108+); **Safari no lo soporta** (bug WebKit 107250 abierto, sin cambios desde 2022). Chrome exige permiso explícito para todo uso de MIDI desde la versión 124.
- **OSC**: los navegadores no hablan UDP. `osc-js` tiene un **modo puente** (UDP ↔ WebSocket) que permite recibir OSC de TouchDesigner, Ableton o Max mediante un proceso Node.
- **Ableton Link**: sin implementación en navegador. En el mundo VJ (Resolume) se usan como alternativas el envío de BPM por OSC o el reloj MIDI, menos preciso.

**Acciones:**
- Web MIDI con modo *learn* (mover un control y asignarlo al parámetro seleccionado); avisar en Safari.
- Puente OSC opcional como herramienta separada (`tools/osc-bridge`), no dentro de la app web.

---

## ⏱️ 4. Sincronía Audio-Vídeo

### 4.1 Umbrales de percepción
- **ITU-R BT.1359-1**: umbral de **detección** aproximado de +45 ms (audio adelantado) a −125 ms (audio retrasado); umbral de **aceptabilidad** de +90 ms a −185/−190 ms.
- Hay fuentes que invierten el signo; comprobar la convención antes de citar.
- ATSC IS-191 es más estricto: el audio no debería adelantarse más de 15 ms ni retrasarse más de 45 ms.
- Estos umbrales vienen de vídeo de presentadores (sincronía labial); para música y golpes visuales no hay datos equivalentes en esta búsqueda.

**Implicación:** una visualización que reacciona **tarde** respecto al golpe es la dirección más tolerada (vídeo retrasado), pero conviene mantenerla por debajo de ~45 ms.

### 4.2 Latencia medible
- `AudioContext.outputLatency`: estimación de la latencia del hardware de salida, incluida la de **auriculares Bluetooth**, y se actualiza si cambia el dispositivo. Soporte: Chrome/Edge 102, Firefox 70, Safari 18.4.
- La especificación permite añadir ruido y cuantización a este valor por privacidad (huella digital).
- `smoothingTimeConstant` (por defecto 0,8; aquí 0,85) promedia con frames anteriores y retrasa los transitorios (ver C4).

**Acciones:**
- **Archivos**: el analizador ve el audio antes de que suene, así que se puede **retrasar el análisis** en `outputLatency` (más un ajuste manual) para que la imagen coincida con lo que se oye.
- **Micrófono**: el sonido ya ha sonado; solo cabe minimizar la latencia de análisis (suavizado bajo, onsets propios).
- Ajuste manual de desfase (ms) en la configuración, al estilo de los juegos de ritmo.

---

## ⚡ 5. Rendimiento en Dispositivos Reales

- **Escala de resolución**: dibujar a una fracción del `devicePixelRatio` (0,5–0,75) y dejar que el navegador escale; en pantallas de alta densidad la pérdida visual es pequeña y el trabajo de GPU baja mucho.
- **Bucle adaptativo**: medir el tiempo de frame con las marcas de `requestAnimationFrame`; bajar escala si se pierden frames de forma sostenida; comprobar cada 300–700 ms; pasos de 0,05–0,15; histéresis distinta para subir y bajar; DPR máximo ≤ 2. La librería `canvas-autoscale` aplica la misma idea.
- **Temperatura y batería**: el navegador no expone la temperatura. El estrangulamiento térmico se infiere de caídas sostenidas del fps. Un estudio de Intel mostró que reducir la resolución a 0,5× bajó el consumo del procesador a ~0,7× manteniendo fps.
- **Límite inferior**: con DPR 3, bajar de 2 puede degradar el texto; probar en dispositivos reales.

**Acciones:**
1. Corregir C5 (limitar DPR).
2. `PerformanceGovernor` en el núcleo: escala de render adaptativa con histéresis y opción "ahorro de energía" manual.
3. Definir dispositivos de referencia (móvil de gama media, portátil con gráfica integrada, sobremesa) y medir fps sostenidos durante 10 minutos, no solo el pico.

---

## 🧠 6. Mapeo Audio-Visual con Base Perceptiva

### 6.1 Correspondencias entre sentidos
- Revisión de **Spence (2011)**: las personas asocian de forma consistente los **sonidos agudos** con objetos **pequeños, claros y situados arriba**.
- **Volumen ↔ brillo**: los sonidos fuertes se asocian a objetos más brillantes (Marks, 1978), en adultos y en niños de 5 años.
- **Volumen ↔ tamaño**: niños de 2 años asocian sonidos fuertes a formas grandes (Smith & Sera, 1992).

### 6.2 Estudios sobre visualización musical
- **Experimento web con 384 personas** (Radboud, 2009): asociaciones fuertes entre **tempo y velocidad visual**, **intensidad y tamaño/brillo**, y **tempo y color**.
- **Sound Signature** (Computer Music Journal, 2018): preferencia por un **mapeo inverso** del centroide espectral al tono (*hue*) en HSV.
- **Berthaut et al.**: 16 músicos, casi sin diferencias significativas entre mapeos; la **escala** de cada mapeo importa más que qué parámetro se mapea.
- **Graf et al. (AES 2021)**: un sistema con extracción de características y una interfaz de mapeo superó a la línea base al complementar la música, pero los usuarios tuvieron problemas con la **terminología técnica** del audio (SUS 58,6).

**Acciones:**
- Mapeos por defecto alineados con las correspondencias: volumen → tamaño y brillo; tono/centroide → altura y claridad; tempo → velocidad.
- Cuidar la **escala** (logarítmica para volumen y frecuencia, curvas suaves) antes que inventar mapeos nuevos.
- En la interfaz, etiquetas en lenguaje llano ("graves", "brillo del sonido") en lugar de "centroide espectral".
- Normalización automática de la ganancia de análisis para que una pista de volumen bajo no se vea apagada.

---

## 🧩 7. Ecosistema de Plugins

### 7.1 Seguridad de plugins de terceros
- **Figma** probó primero un *iframe*, después un *shim* de Realms en el mismo hilo (investigadores encontraron escapes del *sandbox* en semanas) y acabó ejecutando los plugins en **QuickJS compilado a WebAssembly**, sin acceso a APIs del navegador, con la interfaz en un iframe y comunicación por `postMessage`.
- **Grafana** usa `near-membrane` porque **ShadowRealm** seguía siendo una propuesta sin soporte en navegadores. ⚠️ fuente antigua; comprobar el estado en TC39.
- Patrón común: el código del plugin va en un iframe o VM aparte y recibe sus capacidades de forma explícita por mensajes.

**Implicaciones para SpectraVisio:**
- **Plugins de shader (ISF/GLSL)**: seguros por diseño; no ejecutan JavaScript, solo reciben uniforms. Recomendado como formato para contenido de terceros.
- **Plugins JS de terceros**: ejecutarlos en un Worker con `OffscreenCanvas` y API mínima (datos de audio en entrada, frame en salida). El modelo encaja con la arquitectura de un canvas por plugin.
- Plugins JS oficiales: pueden seguir en el hilo principal.

### 7.2 Licencia GPL y plugins
- La **FAQ de la FSF** sostiene que plugins que se enlazan dinámicamente, se llaman entre sí y comparten estructuras de datos forman un único programa (por tanto, obra derivada).
- El **SFLC** concluyó que los temas de WordPress tienen partes derivadas y partes potencialmente independientes; WordPress y Joomla exigen GPL en sus directorios.
- Es una **interpretación**, no jurisprudencia: no se encontró ninguna sentencia que lo resuelva.

**Implicación:** con la app bajo GPL-3.0, los plugins JS que usen la API interna probablemente se considerarían obra derivada. Si se quiere un ecosistema abierto a otras licencias, las opciones son:
1. Una **excepción de plugins** explícita en la licencia (como la "GCC Runtime Library Exception"), o
2. Que el contenido de terceros sea **datos** (shaders ISF, presets JSON), no código enlazado.

Decisión del propietario del proyecto; consultar asesoría si habrá distribución comercial.

### 7.3 Presets compartibles
No se investigó en esta ronda. Propuesta: JSON con versión de esquema, validación y codificación en la URL (base64url comprimido) para compartir con un enlace.

---

## 🧪 8. Calidad y Pruebas

- **OfflineAudioContext**: renderiza audio más rápido que en tiempo real y de forma determinista; no le afectan las políticas de autoplay, útil en navegador *headless*. Los motores (Firefox, WebKit) lo usan en sus propias pruebas.
- Un hilo del W3C de 2013 menciona ruido inexplicado al final del buffer en algunas implementaciones. ⚠️ comprobar si sigue ocurriendo.
- **Regresión visual con Playwright**: `toHaveScreenshot` desactiva animaciones CSS, pero **no** las de canvas guiadas por JavaScript. Chromium *headless* puede usar el renderizado por software (SwiftShader) en WebGL; para la GPU real se recomienda el modo con ventana bajo `xvfb`. Las imágenes base deben generarse siempre en un mismo entorno (una imagen Docker).
- Stack: el proyecto usa Vite, donde **Vitest** es la opción natural; el README menciona Jest y Webpack, que no están en `package.json`.

**Acciones:**
1. Inyectar un **reloj determinista** y **datos de audio fijos** en `render(data)` para que un frame dependa solo de sus entradas.
2. Pruebas unitarias del análisis (bandas, beat, BPM) con señales sintéticas generadas en `OfflineAudioContext` (seno a frecuencia conocida → banda esperada; clicks periódicos → BPM esperado).
3. Regresión visual de cada plugin con Playwright sobre frames fijos, en Docker.
4. Alinear el README con el stack real.

---

## 🏁 9. Referentes y Competencia

| Producto | Plataforma | Rasgos relevantes | Lección para SpectraVisio |
|----------|-----------|-------------------|---------------------------|
| **Synesthesia** | macOS, Windows (de pago) | Escenas basadas en shaders (50+), algoritmos de audio propios, escenas creadas por usuarios, **tienda de contenido** integrada, uso en streams | El modelo shader + escenas + tienda confirma la apuesta por ISF/shaders. Críticas: curva de aprendizaje, consumo de recursos, precio |
| **Magic Music Visuals** | macOS, Windows | Modular: imágenes, 3D, vídeo, cámara, **GLSL**, geometría generativa; parámetros por audio o MIDI | Mapeo de cualquier parámetro a audio/MIDI es lo esperado por profesionales |
| **Resolume Arena/Avenue** | macOS, Windows | FFT de audio aplicable a cualquier parámetro, sincronía de BPM, Ableton Link, entrada OSC | Usuarios piden **control de sensibilidad del FFT** más allá de la ganancia; Link tiene limitaciones; BPM por OSC como alternativa |
| **Plane9** | Windows | 150+ escenas 3D combinables, salvapantallas, multimonitor | Posiblemente descontinuado ⚠️ |
| **Kaleidosync** | Navegador | Orientado a Spotify | Depende de autorizaciones y APIs que cambian: confirma el riesgo de la sección 1.2 |
| **Butterchurn / Webamp** | Navegador | Milkdrop en WebGL | Ver `SpectraVisio_Rendering_Engines.md` |

**Hueco de mercado observado:** las herramientas profesionales son de escritorio y de pago; las opciones web son simples o dependen de Spotify. Una app web con calidad de shaders, MIDI y modo OBS no tiene un competidor directo claro en esta búsqueda.

---

## 🤖 10. "AI Generative" (Especificación #18)

- **Transformers.js** ejecuta modelos en el navegador con ONNX Runtime (WebGPU o WASM de respaldo) y admite **clasificación de audio** y **clasificación de audio sin entrenamiento previo** (*zero-shot*, con etiquetas de género o estado de ánimo definidas en tiempo de ejecución). No se encontró un modelo concreto de género o estado de ánimo ni datos de rendimiento.
- **Generación de imagen en tiempo real**: StreamDiffusion alcanza hasta ~91 fps en una RTX 4090; StreamDiffusionV2 (vídeo) usa 4 GPUs H100. Todo en GPUs NVIDIA de escritorio o centro de datos, no en el navegador.

**Conclusión:**
- **Viable en local**: clasificar el género o el estado de ánimo cada pocos segundos para elegir paleta, preset o visualización (enlaza con el modo automático T-04).
- **No viable en local**: generación de imagen en tiempo real. Requeriría un servidor con GPU y una conexión de baja latencia, fuera del alcance de una app web estática.

**Acción:** redefinir la #18 de la especificación como "selección inteligente de presets" con clasificación en local, y dejar la generación de imagen como exploración futura con servidor.

---

## 🎯 Prioridades

| Prioridad | Tema | Motivo |
|-----------|------|--------|
| 1 | **C1–C3, C5** (código) | Fallos reales con arreglo pequeño: archivos y streams sin sonido, CORS, filtros del micrófono, sobrecarga en móvil |
| 2 | **Limitador de destellos + modo seguro** (2) | Requisito de nivel A del PRD; riesgo para la salud |
| 3 | **Captura de pestaña** (1.1) | Habilita el caso de uso casual (Spotify, YouTube) |
| 4 | **Modo embed para OBS + wake lock** (3.1, 3.3) | Habilita a creadores de contenido con poco esfuerzo |
| 5 | **Escala de resolución adaptativa** (5) | Condiciona la experiencia en móvil |
| 6 | **Compensación de latencia** (4) | Mejora la sensación de sincronía en archivos |
| 7 | **Pruebas deterministas** (8) | Base para crecer sin regresiones |
| 8 | **Ventana de salida, MIDI learn** (3.2, 3.5) | Funciones profesionales |
| 9 | **Decisión de licencia de plugins** (7.2) | Antes de abrir el ecosistema a terceros |
| 10 | **Clasificación con IA** (10) | Cuando exista el modo automático |

---

## 🔗 Fuentes

### 1. Fuentes de audio
- [MDN — getDisplayMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)
- [addpipe — getDisplayMedia demo (audio de pestaña/sistema)](https://addpipe.com/getdisplaymedia-demo/)
- [Chrome — Audio recording and screen capture](https://developer.chrome.com/docs/extensions/mv3/screen_capture)
- [DEV — I tried to capture system audio in the browser](https://dev.to/flo152121063061/i-tried-to-capture-system-audio-in-the-browser-heres-what-i-learned-1f99)
- [MDN — restrictOwnAudio](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings/restrictOwnAudio)
- [Spotify — Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)
- [W3C public-audio — EME y Web Audio (Adenot, 2014)](https://lists.w3.org/Archives/Public/public-audio/2014JanMar/0032.html)
- [W3C public-audio — EME y Web Audio (Schmucker, 2014)](https://lists.w3.org/Archives/Public/public-audio/2014JanMar/0031.html)
- [W3C public-audio — MediaElementAudioSourceNode y orígenes cruzados (2013)](https://lists.w3.org/Archives/Public/public-audio/2013JulSep/0224.html)
- [wavesurfer.js #2014 — salida a ceros por CORS](https://github.com/katspaugh/wavesurfer.js/issues/2014)
- [vue-audio-visual #124 — CORS](https://github.com/staskobzar/vue-audio-visual/issues/124)
- [Chromium — media_element_audio_source_node.h](https://crrev.com/93d25b7e2449ca6fd7b1c3dc003f5bfce1495559/third_party/blink/renderer/modules/webaudio/media_element_audio_source_node.h)
- [Firefox — test_mediaElementAudioSourceNodeCrossOrigin](https://searchfox.org/firefox-main/source/dom/media/webaudio/test/test_mediaElementAudioSourceNodeCrossOrigin.html)
- [addpipe — getUserMedia audio constraints](https://blog.addpipe.com/audio-constraints-getusermedia/)
- [WebKit bug 179411 — filtros de audio en Safari](https://bugs.webkit.org/show_bug.cgi?id=179411)
- [Apple Developer Forums 804765 — Safari 26 y echoCancellation](https://developer.apple.com/forums/thread/804765)
- [W3C public-webrtc-logs — valores por defecto (2021)](https://lists.w3.org/Archives/Public/public-webrtc-logs/2021Mar/0012.html)
- [W3C public-media-capture-logs — grabación de música (2017)](https://lists.w3.org/Archives/Public/public-media-capture-logs/2017Apr/0089.html)
- [Firefox — test_defaultAudioConstraints](https://arai.searchfox.org/firefox-main/source/dom/media/webrtc/tests/mochitests/test_defaultAudioConstraints.html)

### 2. Fotosensibilidad y accesibilidad
- [W3C — Understanding SC 2.3.1 (WCAG 2.2)](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)
- [W3C — Understanding SC 2.3.1 (WCAG 2.0)](https://www.w3.org/WAI/WCAG20/Understanding/three-flashes-or-below-threshold)
- [NYU — SC 2.3.1](https://digitalaccessibility.nyu.edu/testing/sc231.html)
- [DAISY — Three Flashes or Below Threshold](https://kb.daisy.org/publishing/docs/wcag/three-flashes-or-below-threshold.html)
- [Trace Center — D2: Open-Source Photosensitive Epilepsy Analysis Tool](https://trace.umd.edu/?p=2344)
- [UW — Flash and flicker](https://www.washington.edu/accesstech/websites/flash-flicker/)
- [phys.org — PEAT](https://phys.org/news/2009-07-software-tool-web-seizure-causing-content.html)
- [WCAG 2.3.3 Animation from Interactions](https://www.disabilityworld.org/toolkit/standards/wcag/2-3-3-animation-from-interactions/)
- [OpenReplay — prefers-reduced-motion](https://blog.openreplay.com/es/prefers-reduced-motion-animacion-accesible/)

### 3. Directo y streaming
- [OBS forum — "Control audio via OBS" no captura audio](https://obsproject.com/forum/threads/control-audio-via-obs-not-working-to-capture-browser-source-audio.176341)
- [OBS forum — sin audio en browser source](https://obsproject.com/forum/threads/no-audio-in-browser-source-when-using-control-audio-via-obs.161356)
- [audioviz — configuración en OBS](https://github.com/stringtheoryaccelerator/audioviz)
- [web.dev — How to use multiple screens](https://web.dev/articles/web-apps/multiple-screens)
- [W3C — Presentation API](https://www.w3.org/TR/presentation-api/)
- [MDN — WakeLock](https://developer.mozilla.org/en-US/docs/Web/API/WakeLock)
- [web.dev — Screen Wake Lock supported in all browsers](https://web.dev/blog/screen-wake-lock-supported-in-all-browsers)
- [What PWA Can Do Today — Wake Lock](https://whatpwacando.today/wake-lock)
- [Apple Developer Forums 133248 — Fullscreen API en iOS](https://developer.apple.com/forums/thread/133248)
- [WebKit bug 280181](https://bugs.webkit.org/show_bug.cgi?id=280181)
- [WebKit bug 272392](https://bugs.webkit.org/show_bug.cgi?id=272392)
- [Chrome — Web MIDI permission prompt](https://developer.chrome.com/blog/web-midi-permission-prompt)
- [WebKit bug 107250 — Web MIDI API](https://bugs.webkit.org/show_bug.cgi?id=107250)
- [osc-js](https://github.com/rm8x/osc-js)
- [osc-web (puente Node)](https://github.com/chairaudio/osc-web)

### 4. Sincronía
- [web.dev — Synchronize audio and video playback on the web](https://web.dev/articles/audio-output-latency)
- [webkit-dev — AudioContext.outputLatency](https://lists.webkit.org/pipermail/webkit-dev/2021-December/032073.html)
- [arXiv 2212.01686 — aceptabilidad de desincronización](https://arxiv.org/pdf/2212.01686)
- [TV Technology — AV synchronization: how bad is bad](https://www.tvtechnology.com/opinions/av-synchronization-how-bad-is-bad)
- [Fora Soft — ITU-R BT.1359 tolerance windows](https://www.forasoft.com/learn/audio-for-video/articles-audio/lip-sync-itu-r-bt-1359-tolerance-windows)
- [NTIA report 11-474](https://its.ntia.gov/publications/download/11-474.pdf)
- [MDN — smoothingTimeConstant](https://developer.mozilla.org/docs/Web/API/AnalyserNode/smoothingTimeConstant)

### 5. Rendimiento
- [WebGL en móvil — escala de resolución](https://abratabia.com/webgl/webgl-mobile.php)
- [dynamic-res-scaler](https://openskillindex.com/skills/majiayu000-claude-skill-registry-dynamic-res-scaler)
- [canvas-autoscale](https://nodei.co/npm/canvas-autoscale/)
- [PlayCanvas forum — device pixel ratio](https://forum.playcanvas.com/t/what-is-actually-device-pixel-ratio/29386)
- [Intel — Dynamic Resolution Rendering](https://www.intel.com/content/dam/develop/external/us/en/documents/dynamicresolutionrendering-183334.pdf)

### 6. Mapeo perceptivo
- [Spence (2011) — Crossmodal correspondences: a tutorial review](https://www.psy.ox.ac.uk/publications/115721/modal)
- [KTH — Multisensory perception (lecture)](https://www.kth.se/social/files/57e3af9af27654603413acbc/Lecture8_Multisensory_perception-Sensory_substitution_2016.pdf)
- [Graf et al. — An Audio-Driven System For Real-Time Music Visualisation](https://arxiv.org/pdf/2106.10134)
- [Sound Signature — Computer Music Journal](https://muse.jhu.edu/article/691462)
- [Berthaut et al. — Audiovisual mappings in 3D musical interaction](https://hal.archives-ouvertes.fr/hal-00530076)
- [Radboud — Expressing the Inexpressible (preferencias de visualización)](https://theses.ubn.ru.nl/items/f9ed0f5a-fd61-4d64-aae2-939688ff6f04)

### 7. Plugins
- [Figma — How we built the Figma plugin system](https://www.figma.com/blog/how-we-built-the-figma-plugin-system/)
- [Seed Hypermedia — plugin architecture (resumen de Figma)](https://delibera.ethosfera.org/hm/z6MkuBbsB1HbSNXLvJCRCrPhimY6g7tzhr4qvcYKPuSZzhno/discussions/seed-hypermedia-plugin-architecture)
- [Grafana — sandbox de plugins frontend](https://forger.sitiv.fr/apitech/grafana/commit/ed5a697825465d2a3c4a1bcbc317551dc2ac4557)
- [ShadowRealms para sandboxing](https://leapcell.io/blog/delving-into-javascript-s-shadow-realms-for-secure-sandboxing)
- [GPL, plug-ins, themes and derivative works](https://2jk.org/english/2009/07/04/gpl-plug-ins-themes-and-derivative-works-the-case-of-free-as-in-pizza/)
- [Slashdot — WordPress: los temas deben ser GPL](https://yro.slashdot.org/story/10/07/22/1935248/wordpress-creator-gpl-says-wp-template-must-be-gpld)

### 8. Pruebas
- [Firefox — test_OfflineAudioContext](https://searchfox.org/firefox-main/source/dom/media/webaudio/test/test_OfflineAudioContext.html)
- [WebKit — LayoutTests OfflineAudioContext](https://webkit.googlesource.com/WebKit/+/master/LayoutTests/webaudio/OfflineAudioContext/)
- [W3C web-platform-tests — ruido en OfflineAudioContext (2013)](https://lists.w3.org/Archives/Public/public-web-platform-tests-notifications/2013Oct/0225.html)
- [createIT — Headless Chrome: testing WebGL using Playwright](https://www.createit.com/?p=3319)
- [Argos — How to fix flaky visual tests](https://argos-ci.com/blog/fix-flaky-visual-tests)
- [How to reduce flaky Playwright screenshot tests](https://macmyths.com/how-to-reduce-flaky-playwright-screenshot-tests/)

### 9. Competencia
- [HeavyM — Best software for live music visuals](https://www.heavym.net/best-software-for-live-music-visuals/)
- [Neural Frames — music visualizers](https://www.neuralframes.com/post/music-visualizers)
- [SaaSHub — Synesthesia](https://www.saashub.com/compare-synesthesia-vs-disco)
- [Wikipedia — Magic Music Visuals](https://en.wikipedia.org/wiki/Magic_Music_Visuals)
- [AlternativeTo — Plane9](https://alternativeto.net/software/plane9/)
- [SaaSHub — Kaleidosync](https://www.saashub.com/compare-kaleidosync-vs-inbuilt-spotify-music-visualizer)
- [Resolume forum — efectos audio-reactivos](https://resolume.com/forum/viewtopic.php?p=70304)
- [Resolume forum — sincronía BPM](https://resolume.com/forum/viewtopic.php?p=84352)
- [Resolume forum — BPM desde entrada de audio](https://resolume.com/forum/viewtopic.php?p=88495)
- [Toolfarm — Resolume tips (DocOptic)](https://www.toolfarm.com/?p=15397)

### 10. IA
- [Transformers.js (GitHub)](https://github.com/xenova/transformers.js/)
- [Transformers.js — documentación](https://huggingface.co/docs/transformers.js/v3.8.1/index)
- [StreamDiffusion — ICCV 2025](https://openaccess.thecvf.com/content/ICCV2025/papers/Kodaira_StreamDiffusion_A_Pipeline-level_Solution_for_Real-Time_Interactive_Generation_ICCV_2025_paper.pdf)
- [StreamDiffusionV2](https://arxiv.org/abs/2511.07399v1)
