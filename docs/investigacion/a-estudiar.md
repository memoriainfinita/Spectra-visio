# SpectraVisio — investigación a estudiar

Revisión con mykl, el 2026-10-20, de los cuatro documentos de esta carpeta, hechos por sesiones en la nube sobre la v0. Cada propuesta se contrastó con la app actual. Aquí queda lo que mykl marcó «a estudiar»: no es contrato. Nada pasa a `docs/funciones.md` sin decidirlo antes.

Origen de cada código:
- M, B, C, A (fuentes): `SpectraVisio_Media_Sources.md`
- I: `SpectraVisio_Visualization_Ideas.md`
- R, A (análisis): `SpectraVisio_Rendering_Engines.md`
- H: `SpectraVisio_Research_Findings.md`
- N: recuperado en una segunda lectura de los cuatro; N2 de `_Rendering_Engines.md`, N3 y N5 de `_Research_Findings.md`

Orientación de la investigación de medios: el hueco frente a otros visualizadores web es mezclar medios reales con audio.

## Fuentes de medios

CORS comprobado por Claude el 2026-10-20 desde España, con el origen de GitHub Pages: peticiones reales con cabecera `Origin` a la API y a unos pocos archivos de resultados reales de cada fuente; los casos dudosos, repetidos con `fetch` en modo CORS en el navegador integrado. Para WebGL, el análisis y la grabación cuenta el CORS de los archivos, no el de la API. Muestra pequeña por fuente.

| Fuente | Qué ofrece | API | Archivos con CORS | Clave | Condiciones |
|---|---|---|---|---|---|
| Wikimedia Commons, audio | Audio Ogg y FLAC | Sí | Sí | No | Imagen y vídeo ya integrados |
| NASA, audio | Audio MP3 de la Image and Video Library | Sí | Sí | No | No estaba en la investigación |
| NASA, imágenes | Image and Video Library | Sí | No (`images-assets.nasa.gov`) | No | Solo con proxy. Imágenes de la NASA llegan con CORS por Openverse, vía Flickr |
| NASA APOD | Imagen del día | Sí | Sí (`science.nasa.gov`) | `DEMO_KEY` muy limitada; clave gratuita | Sin logos ni sugerir respaldo de la NASA |
| NASA EPIC | Tierra completa a diario | Sí | No | No | Solo con proxy |
| Openverse, imagen | Agregador de unos 900 M de imágenes | Sí | Sí: Flickr, iNaturalist, Wikimedia, rawpixel, Geograph, Met, DigitaltMuseum, Museums Victoria, NASA (vía Flickr). No: svgsilh, Science Museum, Wellcome | No; límites bajos sin registrar (varias peticiones seguidas fallaron) | Filtrar o marcar proveedores sin CORS y licencias NC y ND, frecuentes en Flickr e iNaturalist |
| Openverse, audio | Freesound, Jamendo, Wikimedia | Sí | Sí en Freesound (`cdn.freesound.org`); no en Jamendo | No | |
| Met | Obras en Open Access | Sí; búsqueda en `/public/collection/v1.1/search` (la `/v1/search` se retiró el 2026-10-01) | Sí (`images.metmuseum.org`) | No | Una petición por obra para su imagen |
| Rijksmuseum | Obras en Open Access, CC0 | Sí (Linked Art, `data.rijksmuseum.nl`) | Sí (IIIF en `iiif.micr.io`) | No | Tres peticiones encadenadas por obra hasta la imagen |
| Smithsonian | Open Access | Sí | Sí (`ids.si.edu`) | Clave gratuita de api.data.gov | |
| Europeana | Imagen de museos europeos | Sí | Según el museo de origen: Flickr sí, otros no | Clave; hay una de demostración | Comprobar el CORS de cada resultado, como con la TV |
| Cleveland | Obras CC0 | Sí | No (`openaccess-cdn.clevelandart.org`) | No | Solo con proxy |
| Art Institute of Chicago | Dominio público por IIIF | Sí | No: Cloudflare bloquea las imágenes desde otras webs, también sin CORS | No | No viable |
| Internet Archive | Prelinger, animación antigua, Live Music Archive, libros | Sí | No (vídeo de Prelinger) | No | Solo con proxy. Licencia por ítem, muchos sin declarar |
| Pexels | Imagen y vídeo de stock | Pide clave | Sí (`images.pexels.com`, `videos.pexels.com`) | Sí, 200/h | Con la clave del usuario en Ajustes, sin proxy. Crédito obligatorio |
| Pixabay | Imagen y vídeo | Pide clave | Sí (`cdn.pixabay.com`) | Sí | Con la clave del usuario. Caché de 24 h; desaconseja enlazar directo |
| Giphy | GIF, MP4, WebP | Pide clave | Sí | Sí | Con la clave del usuario. La investigación la descartaba por derechos dudosos |
| Tenor | GIF | Pide clave | Sí (`media.tenor.com`) | Sí (Google) | Igual que Giphy; Tenor redujo su API |
| Unsplash | Imagen | Pide clave | Sí (`images.unsplash.com`) | Sí | Con la clave del usuario. Requisitos de enlace y seguimiento de descargas |
| Datos en vivo | USGS (terremotos), Open-Meteo (tiempo), posición de la ISS (`wheretheiss.at`) | Sí, con CORS | Son datos | No | Para visualizar |
| YouTube, Vimeo | Vídeo | — | Sin probar | — | El iframe no da fotogramas ni audio; solo por captura de pestaña |

### Condiciones transversales

- B1 Marcar cada resultado del buscador como «se puede procesar» o «solo ver», en lugar de esconder lo que no tiene CORS
- B2 Proxy propio opcional: la app funciona sin él; quien lo quiera pone su URL en Ajustes. Reenvía solo a una lista de servidores y añade CORS. Según la comprobación del 2026-10-20 solo hace falta para Internet Archive, Cleveland, EPIC e imágenes de la NASA
- B8 Claves propias del usuario en Ajustes, como la contraseña de OBS, para Pexels, Pixabay, Giphy, Tenor, Unsplash, Smithsonian, Europeana y APOD: sus archivos envían CORS, así que no hace falta proxy
- B9 Audio para el reproductor desde Commons, NASA y Freesound, como entra hoy Audius
- B3 Filtro de licencia en el buscador: «apto para streams» (sin NC), «sin restricciones», «todas». ND: una visualización que deforma la imagen es probablemente obra derivada
- B4 Créditos en la imagen como rótulo automático y opcional (autor, título, licencia, enlace), con modo «créditos al final» para directo
- B5 Gestor de medios común para todas las fuentes, con caché sin conexión para preparar un directo sin depender de la red
- B7 Medios empaquetados: solo CC0, dominio público o CC BY con archivo de créditos

### Contenido descargable y referencias

- C1 Clips VJ de Beeple: bucles 1080p CC BY, uso comercial en los packs revisados; licencia por pack
- C2 Electric Sheep: vídeos de fractal flames bajo CC
- C3 Prelinger: cine de archivo, en su mayoría dominio público
- C4 Packs como descarga opcional en la caché de la PWA (cientos de MB)
- C5 Webvs (AVS de Winamp en la web, MIT): segundo motor de presets por capas en JSON; poca actividad
- C6 Presets de AVS originales: miles, licencia de cada uno desconocida
- C7 TiXL (antes Tooll3, MIT): referencia de interfaz por nodos

## Motores sobre medios

| # | Motor | Mecánica |
|---|---|---|
| M-01 | Auto-VJ por golpes | Cortes entre clips o saltos dentro de un clip en cada golpe; transición según energía; velocidad del vídeo al tempo |
| M-02 | Slit-scan | Memoria de N fotogramas; cada fila o banda muestra un instante distinto del pasado. Cubre la webcam con slit-scan (I-33) |
| M-03 | Rutt-Etra | El brillo levanta líneas horizontales en 3D; el audio modula la altura |
| M-04 | Desplazamiento por espectro | Deformación de la imagen por el espectro: graves en ondas grandes, agudos en vibración fina. Como efecto para cualquier capa |
| M-05 | Datamosh simulado | Fotogramas retenidos con movimiento falso en cada golpe |
| M-06 | Partículas desde imagen | Cada partícula toma posición y color de un píxel; el audio dispersa y recompone |
| M-07 | Zoom profundo IIIF | Viaje de cámara por una obra pidiendo teselas; zoom con la energía, detalle nuevo en cada sección. IIIF con CORS comprobado: Rijksmuseum; el Art Institute no es viable |
| M-09 | Mosaico por bandas | Celdas que reaccionan cada una a una banda con escala, brillo o giro |
| M-10 | Fractal flames | Algoritmo de flam3 en shader; el audio modula sus variaciones. Caro: acumulación por histograma en la GPU |

## Visualizaciones

| # | Idea | Nota |
|---|---|---|
| I-02 | Analizador pro | Opciones de `bars`: resolución por octava o tercio, escala en dB, ponderaciones A/B/C. Referencia: audioMotion-analyzer (A7) |
| I-03 | Cromagrama y rueda de notas | 12 notas en el círculo de quintas. Necesita FFT mayor (A6) |
| I-05 | Atractor por retardo | x(t) frente a x(t+τ); variante 3D girando |
| I-07 | Crestas (*Unknown Pleasures*) | Modo plano de `terrain` |
| I-09 | Patrones de Chladni | Partículas a las líneas nodales según la nota dominante. Necesita tono (A2) |
| I-10 | Campo de flujo | Partículas sobre un campo de ruido deformado por el audio |
| I-11 | Juego de la vida por golpes | Cada golpe siembra; la banda dominante elige la regla |
| I-12 | Glitch y ordenación de píxeles | Como efecto |
| I-13 | Membrana vibrante | Masas y resortes; cada banda empuja un punto |
| I-14 | Fluido 2D | *Stable Fluids*; cada golpe inyecta tinta |
| I-15 | Gravedad de N cuerpos | Atractores con masa por banda; caótico |
| I-16 | Arena que cae | Cada frecuencia, un grifo; paisaje sedimentado de la canción |
| I-17 | Péndulo doble o múltiple | Impulsos en el pivote; estela caótica |
| I-18 | Espirógrafo y epiciclos | Armónicos como radios: serie de Fourier visible |
| I-19 | Rosas y curvas paramétricas | Superfórmula de Gielis, armonógrafos; el golpe cambia de forma |
| I-20 | Teselado de Penrose o Truchet | Piezas que giran por energía; onda de volteo en el golpe |
| I-21 | L-system o árbol fractal | Profundidad por energía, ángulo por medios |
| I-22 | Hipercubo 4D | Teselacto, 24-cell, 600-cell; cada banda gira un plano 4D |
| I-23 | Curva de Hilbert del espectro | 1024 frecuencias en 32 × 32 |
| I-24 | Piano roll | Primero de una voz. Necesita tono (A2) |
| I-25 | Tonnetz | Notas y triángulos de acordes en hexágonos; va con I-03 |
| I-26 | Línea de estructura | Capa encima con las secciones del análisis previo |
| I-27 | Matriz de autosimilitud | Repeticiones como diagonales; con archivos, en el análisis previo |
| I-28 | CRT | Como efecto: fósforo, persistencia, curvatura, barrido |
| I-29 | Synthwave | Rejilla al horizonte, montañas del espectro, sol que late con el bajo |
| I-30 | ASCII / ANSI | Como efecto |
| I-31 | Demoscene clásica | Rotozoomer, copper bars, plasma por paleta, scroller sinusoidal |
| I-32 | Tinta / sumi-e | Trazos de pincel sobre papel |
| I-34 | Texto cinético | Animación de los rótulos con el audio |
| I-35 | Control por puntero o táctil | Ratón o dedo como atractor en partículas y fluido |

## Motores y librerías

- R2 WebGPU: solo si I-10, I-14, I-15 o M-10 se quedan cortos en WebGL2. Hoy fuera de alcance en `funciones.md`
- R3 Three.js (MIT): para la primera visualización 3D con luces
- R8 Licencia de los presets de Milkdrop: el MIT de Butterchurn cubre el código, no necesariamente los presets. La app incluye 100. Prioritario antes de publicar. Butterchurn lleva años sin versión nueva: el mantenimiento es nuestro
- R11 Pack de shaders ISF con licencia libre, incluido o descargable
- R13 Hydra y Essentia.js (AGPL-3.0): comprobar la compatibilidad con la GPL-3.0 de la app, que se publicará con su código
- R15 cables.gl (MIT): para prototipar visualizaciones, fuera de la app

## Análisis

- A1 Centroide espectral, croma y MFCC, con Meyda (MIT) o propios: fuentes de modulación nuevas
- A2 Tono con pitchy (MIT, McLeod) o pitchfinder (YIN): desbloquea I-09, I-24 y una fuente de modulación «nota»
- A5 AudioWorklet propio, si la FFT grande o el tono pesan en el hilo principal
- A6 FFT de 8192 a 16384: requisito de I-03, I-24 e I-25. La app usa 4096
- A7 audioMotion-analyzer (AGPL) como referencia de I-02
- A8 Render en un worker con OffscreenCanvas, para que la interfaz y el MIDI no afecten a los fps. Cambio de arquitectura grande
- N2 Grabar con WebCodecs en lugar de MediaRecorder, con control de códec, calidad y bitrate
- N5 Sensibilidad del análisis por banda, más allá de la ganancia: lo que más piden los usuarios de Resolume. La app tiene ganancia, nivelado y suavizado

## Accesibilidad, directo y plataformas

- H1 Aviso de silencio: ceros exactos durante varios segundos con la reproducción en marcha. Sobre todo para la captura de pestaña sin audio o con DRM
- H5 Micrófono en Safari: comprobar con `track.getSettings()` que los filtros de voz están desactivados y avisar si no
- H6 Limitador de destellos según WCAG 2.3.1: no más de 3 por segundo, cambio de al menos el 10 % de luminancia, área de unos 341 × 256 px, destello rojo aparte. El actual mira el brillo medio, no zonas ni rojo saturado
- N3 WCAG 2.3.3 (AAA): poder desactivar el movimiento que dispara una interacción
- H7 PEAT y EPI-LENS para probar el limitador con grabaciones de la app
- H13 Página de ayuda para OBS. Incluir los ajustes de la fuente de navegador «apagar la fuente cuando no esté visible» y «refrescar al activar la escena». Probar OBS en Windows y en macOS: el comportamiento cambia entre sistemas
- H14 Salida en el proyector con un clic en Chrome y Edge (`getScreenDetails`)
- H16 Wake Lock en el iPhone con la app instalada (WebKit 254545): comprobar y avisar
- H17 Pantalla completa en el iPhone volcando el canvas a un `<video>` con `captureStream`. Una PWA con `display: fullscreen` tampoco la da
- H19 Puente OSC opcional como herramienta aparte (`osc-js`), como el proxy de B2; también BPM por OSC en lugar de Ableton Link. Hoy fuera de alcance en `funciones.md`
- H20 Umbrales de sincronía como criterio para comprobar la compensación de latencia: ITU-R BT.1359, detección entre +45 y −125 ms; ATSC, audio adelantado 15 ms y retrasado 45 ms como mucho. `outputLatency` puede llevar ruido añadido por privacidad
- H23 Pruebas de rendimiento sostenido: 10 minutos en móvil medio, portátil con gráfica integrada y sobremesa

## Mapeo, presets, pruebas e IA

- H24 Revisar la reacción al audio de las 23 visualizaciones con las correspondencias perceptivas (volumen con tamaño y brillo, agudo con pequeño, claro y arriba, tempo con velocidad) y usarlas de guía para las nuevas. La escala del mapeo importa más que el parámetro
- H25 Centroide espectral al tono de color en mapeo inverso, junto a A1
- H26 Criterio para lo nuevo: etiquetas en lenguaje llano («graves», «brillo del sonido»), no términos técnicos de audio
- H28 Plugins JS de terceros aislados en un worker, solo si algún día se abren
- H30 Presets y escenas compartibles por enlace, comprimidos en la URL
- H31 Pruebas visuales deterministas: reloj y audio fijos, capturas comparadas con una referencia. Chromium sin ventana puede usar render por software; las referencias se generan siempre en el mismo entorno
- H33 Synesthesia como referencia de escenas e interfaz
- H34 Clasificación de género o ánimo en local con Transformers.js para el modo automático. Peso del modelo sin medir

## Descartado en la revisión

- Hecho en la app: Commons (imagen y vídeo), NASA vídeo, medios como capa, I-01, I-04, I-06, I-08, M-08, T-01 a T-04, WebGL2, Butterchurn, ISF, código al estilo Shadertoy, BPM, grabación, Web MIDI, captura de pestaña, OBS sin interfaz, compensación de latencia, calidad adaptativa con límite de píxeles, nivelado del análisis, pruebas del análisis, `prefers-reduced-motion`
- Obsoleto, de la v0: C1–C6 del código y los prerrequisitos P1–P9, salvo el aviso de silencio (H1)
- Cubierto: I-33 por M-02, M-04 y M-05; pausar el movimiento con congelar (F)
- Fuera de alcance en `funciones.md`: Spotify y servicios con DRM (solo por captura); Web MIDI en Safari (no existe)
- No: lista de radios de prueba (el directorio ya marca las que no sirven), cava, ShaderFlow, PixiJS, p5.js, Babylon.js, projectM, LYGIA (no comercial), realtime-bpm-analyzer, Presentation API, «Controlar audio vía OBS», modo seguro por defecto, excepción GPL de plugins, generación de imagen en tiempo real
