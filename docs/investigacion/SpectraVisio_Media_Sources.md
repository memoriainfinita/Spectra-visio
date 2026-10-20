# SpectraVisio - Fuentes de Medios Externas y Motores Basados en Medios

**Versión:** 0.1
**Fecha:** Octubre 15, 2026
**Estado:** Investigación (ninguna integrada)

---

## 📖 Propósito del Documento

Analiza qué **fuentes de imágenes, vídeo y audio de internet** se pueden añadir a SpectraVisio, con qué licencia y con qué restricciones técnicas, y qué **motores de visualización** construidos sobre esos medios merecen la pena (propios o de terceros con licencia compatible).

Complementa a:
- `SpectraVisio_Rendering_Engines.md` (motores de render y contenido de shaders: Butterchurn, ISF, Hydra…).
- `SpectraVisio_Visualization_Ideas.md` (I-01 a I-35, T-01 a T-04).
- `SpectraVisio_Research_Findings.md` (fuentes de audio, CORS de streams, competencia).

Esos tres documentos están en la rama `claude/serene-edison-ztb2a7`. No se repite aquí su contenido.

**Limitación:** la red del entorno de investigación bloqueaba todos los dominios consultados, así que **no se pudieron comprobar las cabeceras CORS reales**. Todo lo marcado ⚠️ debe verificarse con `curl -I -H "Origin: https://ejemplo.com" <url>` desde una red abierta antes de integrar.

---

## ⚠️ La Restricción que lo Decide Todo: CORS

Un medio remoto puede **mostrarse** sin CORS, pero no **analizarse ni procesarse**:

| Uso del medio | Sin CORS | Con CORS (`crossOrigin` antes de `src`) |
|---------------|----------|------------------------------------------|
| `drawImage` en Canvas 2D | ✅ Se ve, pero el canvas queda *tainted* | ✅ |
| Textura WebGL/WebGPU | ❌ Error de seguridad | ✅ |
| `getImageData` (muestrear colores, partículas desde imagen) | ❌ | ✅ |
| `canvas.captureStream()` (grabar, OBS por WebRTC) | ❌ `SecurityError`; si el canvas se contamina después, la captura se detiene | ✅ |
| Audio por `MediaElementSource` → `AnalyserNode` | ❌ El analizador devuelve silencio | ✅ |

**Consecuencias para el diseño:**
1. Toda fuente nueva necesita una etiqueta `cors: 'yes' | 'no' | 'unknown'` comprobada, no supuesta.
2. Una fuente sin CORS solo sirve para plugins 2D de "mostrar" y rompe la grabación. Con el paso a WebGL previsto en `_Rendering_Engines.md`, **una fuente sin CORS es prácticamente inútil**.
3. Solución general: un **proxy mínimo propio** (Cloudflare Worker o similar, ~30 líneas) que reenvíe solo hosts de una lista blanca y añada `Access-Control-Allow-Origin`. Rompe el modelo "web estática sin servidor", pero desbloquea Internet Archive y cualquier fuente sin CORS. Coste: ancho de banda del vídeo pasa por el proxy.
4. El hallazgo C2 de `_Research_Findings.md` (`crossOrigin` asignado después de `src`) afecta igual a imágenes y vídeo: hay que corregirlo antes de añadir fuentes.

---

## ⚖️ Licencias de Contenido (no de Código)

El código es GPL-3.0, pero **mostrar un medio en tiempo de ejecución no lo incorpora al código**: la licencia del medio no choca con la GPL. Lo que sí importa:

| Licencia del medio | Requisito práctico en la app |
|--------------------|------------------------------|
| Dominio público / CC0 | Ninguno (atribución opcional, recomendable) |
| CC BY / CC BY-SA | **Mostrar autor, título, licencia y enlace** mientras se usa → hace falta una capa de créditos |
| CC BY-NC | Incompatible con streams monetizados (caso OBS). Filtrar por defecto |
| CC BY-ND | Discutible: una visualización que deforma el vídeo es probablemente una obra derivada. Excluir |
| Licencias propias (Pexels, Pixabay) | Condiciones de API: atribución, caché, prohibición de replicar el servicio |

**Requisito transversal (T-05 propuesto):** capa de atribución automática. Cada medio cargado lleva `{ title, author, license, sourceUrl }` y la app lo muestra en una esquina (configurable, con modo "créditos al final" para directos).

**Empaquetar** medios en el repositorio sí es redistribución: solo CC0/dominio público o CC BY con fichero de créditos.

---

## 📋 Resumen de Fuentes

| Fuente | Tipo | Licencia del contenido | Clave API | CORS | Encaje | Prioridad |
|--------|------|------------------------|-----------|------|--------|-----------|
| Wikimedia Commons | Imagen, vídeo (WebM), audio (Ogg) | Libre por fichero (PD, CC0, BY, BY-SA) | No | API con `origin=*`; ficheros ⚠️ | ⭐⭐⭐ | **Alta** |
| Openverse | Imagen, audio (agregador) | CC y PD, filtrable | No (límites bajos) / sí | ⚠️ | ⭐⭐⭐ | **Alta** (búsqueda) |
| NASA Image and Video Library | Imagen, vídeo, audio | Sin copyright en EE. UU., con excepciones | No ⚠️ | ⚠️ | ⭐⭐⭐ | **Alta** |
| Art Institute of Chicago | Imagen (IIIF) | Obras de dominio público marcadas | No (≈60 req/min ⚠️) | ⚠️ | ⭐⭐⭐ | Alta (IIIF) |
| The Met / Cleveland / Rijksmuseum / Smithsonian | Imagen | CC0 en Open Access | No (Smithsonian sí) | ⚠️ | ⭐⭐ | Media |
| Internet Archive | Vídeo, audio, imagen | **Variable por ítem** | No | Probablemente no en ficheros ⚠️ | ⭐⭐ | Media (requiere proxy) |
| Pexels | Imagen, **vídeo de stock** | Licencia Pexels | Sí (200/h, 20 000/mes) | ⚠️ | ⭐⭐ | Media |
| Pixabay | Imagen, vídeo | Licencia Pixabay | Sí | ⚠️ (desaconseja *hotlink*) | ⭐ | Baja |
| Europeana | Imagen (IIIF) | Variable, filtrable | Sí | ⚠️ | ⭐ | Baja |
| Giphy / Tenor | GIF | Términos propios, contenido sin licencia clara | Sí | — | ❌ | Descartada |
| Datos en vivo (USGS, Open-Meteo, ISS) | Datos | Abiertos | No | ⚠️ | ⭐⭐ | Exploración |

---

## 🖼️ FUENTES DE IMAGEN Y VÍDEO

### Wikimedia Commons

- **Qué:** más de 100 millones de ficheros. Imagen, vídeo en WebM/Ogg (formatos que el navegador reproduce sin transcodificar) y audio.
- **API:** MediaWiki (`action=query`, `prop=imageinfo`) devuelve URL, dimensiones, licencia y autor en `extmetadata`. Admite miniaturas a cualquier ancho (`iiurlwidth`), útil para pedir resolución según el dispositivo.
- **CORS:** la API acepta `origin=*`. Los ficheros de `upload.wikimedia.org` ⚠️ sin verificar en esta investigación.
- **Encaje:** la mejor fuente generalista con licencias limpias y metadatos de atribución estructurados. Base natural de la capa de créditos.
- **Riesgo:** licencias por fichero; filtrar NC/ND y respetar BY-SA.

### Openverse

- **Qué:** buscador de WordPress que agrega imágenes y audio CC y de dominio público de muchas fuentes (Flickr, Wikimedia, museos, Freesound, Jamendo…).
- **API:** `/v1/images` y `/v1/audio` con filtros de licencia (`cc0`, `by`, `by-sa`…). Anónima con límites estrictos (máx. 20 resultados por página; cifras concretas ⚠️). Registro gratuito para más cuota.
- **Encaje:** una sola integración da acceso a decenas de fuentes con la licencia ya normalizada. Buen candidato para el **buscador de medios** dentro de la app.
- **Riesgo:** los ficheros se sirven desde el origen de cada proveedor: el CORS depende de cada uno.

### NASA Image and Video Library

- **Qué:** imágenes, vídeo y audio de NASA (más de 140 000 en 2019). Endpoint `images-api.nasa.gov/search`; no requiere clave según fuentes secundarias ⚠️.
- **Licencia:** NASA indica que su material generalmente no tiene copyright en EE. UU., pero excluye insignias y logotipos, prohíbe sugerir respaldo de NASA y pide permiso para uso comercial de personas identificables.
- **Encaje:** contenido espacial (nebulosas, Tierra, Sol) que combina muy bien con visualizaciones generativas. Complementos: **APOD** (una imagen al día, requiere clave, `DEMO_KEY` limitada) y **EPIC** (fotos diarias de la Tierra completa, buenas para rotación lenta).
- **Riesgo:** no usar logotipos; no presentar la app como asociada a NASA.

### Museos con Open Access (Art Institute of Chicago, Met, Cleveland, Rijksmuseum, Smithsonian)

- **Qué:** cientos de miles de obras de dominio público en alta resolución, con datos CC0.
- **IIIF:** AIC, Europeana, Wikimedia y otros sirven imágenes por **IIIF Image API**, que permite pedir cualquier recorte y tamaño por URL (`/region/size/rotation/quality.format`). Esto habilita un motor propio de **zoom profundo** (ver M-07) sin descargar la imagen entera.
- **Encaje:** estética muy distinta a la habitual en visualizadores; diferencia el producto.
- **Riesgo:** comprobar el indicador de dominio público por obra (`is_public_domain` en AIC ⚠️).

### Internet Archive

- **Qué:** vídeo histórico (colección **Prelinger**, cine de dominio público, animación antigua), audio (**Live Music Archive / etree**: más de 250 000 conciertos de artistas que permiten grabar e intercambiar) y libros escaneados.
- **API:** `advancedsearch.php` (búsqueda), `/metadata/{id}` (ficheros y formatos de cada ítem), `/download/{id}/{fichero}`. Sin clave para lectura.
- **CORS:** un informe de usuario indica que `/download/` redirige a servidores `ia*.us.archive.org` que **no envían** `Access-Control-Allow-Origin` ⚠️ (fuente antigua, verificar). Si se confirma: el vídeo solo podría mostrarse en 2D sin procesar, y el audio del Live Music Archive **no se podría analizar** sin proxy.
- **Licencia:** cada ítem declara la suya (campo `licenseurl`), y muchos no la declaran. Política recomendada: **solo ítems con `licenseurl` PD/CC0/CC BY** o colecciones de dominio público conocidas.
- **Encaje:** el más atractivo estéticamente (material de archivo, *found footage*) y el único que aporta **audio** a la vez. Encaja con M-01, M-03 y M-05.
- **Coste técnico:** proxy obligatorio en la práctica; vídeos MPEG-4 grandes (usar derivados `_512kb.mp4` u `.ogv` cuando existan).

### Pexels y Pixabay

- **Pexels:** el mejor catálogo de **vídeo de stock** de calidad (naturaleza, ciudad, texturas). Clave obligatoria, 200 peticiones/hora y 20 000/mes por defecto; exige enlace visible a Pexels y crédito al autor; prohíbe replicar su funcionalidad (por ejemplo, apps de fondos de pantalla). La clave **no puede ir en el cliente** de una web estática sin exponerse: requiere el mismo proxy.
- **Pixabay:** según fuentes secundarias exige cachear respuestas 24 h y desaconseja enlazar sus URLs directamente ⚠️. Peor encaje que Pexels para una app sin servidor.

### Descartadas

- **Giphy / Tenor:** contenido con derechos dudosos (recortes de películas y series), términos restrictivos; Tenor redujo su API pública. No compatible con streams monetizados.
- **YouTube / Vimeo:** los reproductores incrustados no exponen fotogramas ni audio (iframe de otro origen). Solo usables mediante captura de pestaña (`getDisplayMedia`, ya tratado en `_Research_Findings.md` 1.1).
- **Unsplash:** solo imagen, con requisitos de *hotlink* y seguimiento de descargas; Wikimedia/Openverse cubren el mismo caso con licencias más claras.

---

## 🎥 CONTENIDO LISTO PARA VJ (descargable, empaquetable)

Para un **pack de medios incluido** (sin red ni CORS), solo sirve contenido que permita redistribución:

| Contenido | Licencia | Nota |
|-----------|----------|------|
| **Beeple VJ clips** | CC (BY, uso comercial permitido en los packs revisados) ⚠️ por pack | Bucles 1080p diseñados para VJ, algunos con proyecto de Cinema 4D. Verificar la licencia de cada pack |
| **Electric Sheep** (vídeos de *fractal flames*) | Vídeos y parámetros bajo CC (versión ⚠️) | El motor `flam3` es GPL-2.0+: el **algoritmo** puede reimplementarse (ver M-10) |
| **NASA / dominio público** | PD | Ver arriba |
| **Prelinger Archives** | Mayoritariamente PD | Requiere proxy si se carga desde Internet Archive; empaquetar evita el problema |

Peso: un pack de vídeo de calidad pesa cientos de MB. Mejor como **descarga opcional** (Cache Storage / Service Worker de la PWA) que dentro del bundle.

---

## 🧩 OTROS PROYECTOS DE VISUALIZACIÓN COMO REFERENCIA

Solo los que no están ya en `_Rendering_Engines.md` ni en la tabla de competencia de `_Research_Findings.md`:

| Proyecto | Licencia | Qué aporta | Encaje |
|----------|----------|-----------|--------|
| **Webvs** (AVS de Winamp en la web) | MIT | Motor por capas tipo AVS: efectos encadenados (superscope, movimiento dinámico, convolución) definidos en JSON. Carga presets en JSON, no `.avs` directamente ⚠️. Actividad baja | ⭐⭐ Como **segundo motor de presets** junto a Butterchurn o como inspiración para el sistema de capas (T-01) |
| **AVS original** | BSD (código liberado en 2005) | Miles de presets históricos | ⭐ Licencia de cada preset desconocida |
| **TiXL** (antes Tooll3) | MIT | Herramienta de escritorio de VFX en tiempo real orientada a VJ: grafo de operadores, audio, MIDI, OSC | ⭐ Referencia de **UX de grafo de nodos** y de operadores, no integrable |
| **flam3 / Electric Sheep** | GPL-2.0+ | Algoritmo de *fractal flames* | ⭐⭐ Reimplementar en shader (M-10) |
| **cava** | MIT | Barras de espectro en terminal; buena referencia de suavizado y "caída" de barras | ⭐ Referencia de I-02 |
| **ShaderFlow** | ⚠️ | Framework Python con shaders ~80 % compatibles con Shadertoy, vídeo como textura | ⭐ Referencia de convención audio + vídeo como texturas |
| **Magic Music Visuals / Resolume** | Propietario | Ya en competencia: confirman que **vídeo + shader + audio** en la misma escena es el estándar profesional | — |

**Conclusión:** el hueco frente a Butterchurn no es otro motor de presets, sino **mezclar medios reales con audio**, que es lo que hacen las herramientas de escritorio y ninguna web abierta.

---

## 🎨 MOTORES PROPIOS SOBRE MEDIOS (M-01 a M-10)

Todos requieren el backend `webgl2` y medios con CORS. Se numeran M-xx para no colisionar con I-xx. Solapes indicados.

| ID | Motor | Mecánica | Fuentes ideales | Coste |
|----|-------|----------|-----------------|-------|
| **M-01** | **Auto-VJ por beats** | Corta entre clips o salta dentro de un clip en cada beat/compás; transición según energía. Varía `playbackRate` con el tempo | Pexels, Internet Archive, Beeple | Medio (necesita BPM) |
| **M-02** | **Slit-scan / desplazamiento temporal** | Buffer circular de N fotogramas en textura 3D o array; cada fila o banda de frecuencia muestra un instante distinto del pasado | Cualquier vídeo, webcam (I-33) | Medio (memoria GPU) |
| **M-03** | **Rutt-Etra** | Emulación del sintetizador de vídeo de 1972: la luminancia desplaza líneas horizontales en 3D; el audio modula la amplitud | Archivo en blanco y negro (Prelinger) | Bajo |
| **M-04** | **Desplazamiento por espectro** | Mapa de desplazamiento UV derivado de la textura de audio 512×2; graves = ondas grandes, agudos = vibración fina | Imagen o vídeo | Bajo |
| **M-05** | **Datamosh simulado** | Retiene fotogramas y aplica vectores de movimiento falsos (flujo óptico aproximado) en cada transitorio. Complementa I-12 (glitch) | Vídeo con movimiento | Medio |
| **M-06** | **Partículas desde imagen** | Cada partícula toma posición y color de un píxel; el audio dispersa y recompone la imagen | Museos, NASA | Medio (requiere `getImageData` o textura) |
| **M-07** | **Zoom profundo IIIF** | Recorrido de cámara sobre una obra en alta resolución pidiendo teselas IIIF; zoom con la energía, cambio de detalle en cada sección musical (enlaza con T-04) | AIC, Wikimedia, Europeana | Medio (gestión de teselas) |
| **M-08** | **Caleidoscopio / espejo de medios** | Simetría de N segmentos sobre imagen o vídeo; N y rotación por bandas | Cualquiera | Bajo |
| **M-09** | **Mosaico por bandas** | La imagen se divide en celdas; cada celda reacciona a una banda (escala, brillo, rotación) | Imagen | Bajo |
| **M-10** | **Fractal flames** | Reimplementación en shader del algoritmo de `flam3` (sistemas de funciones iteradas con variaciones no lineales); el audio modula pesos de las variaciones | Ninguna (generativo) | Alto (acumulación por histograma en GPU) |

Transversales que estos motores necesitan:
- **T-05 Atribución automática** (ver Licencias).
- **T-06 Gestor de medios:** interfaz `MediaProvider` con `search(query, filters) → MediaItem[]` y `MediaItem { url, type, width, height, license, author, sourceUrl, cors }`; precarga, caché en Service Worker y respaldo local si falla la red.
- **T-07 Mezclador de capas de medios:** el vídeo como capa más del sistema de composición propuesto en `_Rendering_Engines.md` (un canvas por plugin), con modos de fusión.

---

## 🎯 Hoja de Ruta Propuesta

1. **Prerrequisitos:** corregir C2 (`crossOrigin` antes de `src`); backend `webgl2` con composición por capas (ya propuesto).
2. **Verificar CORS** real de cada fuente de la tabla con `curl` desde una red abierta y anotar el resultado aquí.
3. **`MediaProvider` + capa de atribución** (T-05, T-06) con **Wikimedia Commons** y **NASA** como primeros proveedores (sin clave, licencias claras).
4. **Primeros motores baratos:** M-04, M-08, M-03 (shaders simples sobre una textura de medio).
5. **Openverse** como buscador unificado.
6. **Decisión de arquitectura:** aceptar o no un proxy propio. Sin él, Internet Archive y Pexels quedan fuera. Con él, entran ambos y el audio del Live Music Archive.
7. **M-01 Auto-VJ** cuando exista detección de BPM (`_Rendering_Engines.md`, sección de análisis).
8. Más adelante: M-07 (IIIF), M-02, M-05, M-06, M-10; pack descargable de clips CC (Beeple, Prelinger).

---

## 🔗 Fuentes

- CORS en WebGL: [Mozilla Hacks](https://hacks.mozilla.org/2011/11/using-cors-to-load-webgl-textures-from-cross-domain-images/), [WebGL2 Fundamentals](https://webgl2fundamentals.org/webgl/lessons/webgl-cors-permission.html)
- `captureStream` y canvas contaminado: [W3C Media Capture from DOM Elements](https://w3c.github.io/mediacapture-fromelement/)
- Internet Archive y CORS (informe de usuario): [Public Lab](https://publiclab.org/n/14933)
- Live Music Archive: [Wikipedia](https://en.wikipedia.org/wiki/Live_Music_Archive)
- Openverse: [Make WordPress – Openverse API](https://make.wordpress.org/openverse/tag/api/)
- NASA: [Guías de uso de medios](https://www.nasa.gov/multimedia/guidelines/index.html), [Brand Center](https://nasa.gov/nasa-brand-center/images-and-media)
- Art Institute of Chicago: [api.artic.edu](https://api.artic.edu/)
- Pexels: [Documentación de la API](https://cat.pexels.com/api/documentation/), [Límites](https://help.pexels.com/hc/en-us/articles/900005852323)
- Pixabay (secundaria): [Comparativa de APIs de imagen](https://blog.laozhang.ai/en/posts/free-image-api)
- Webvs: [github.com/azeem/webvs](https://github.com/azeem/webvs); AVS: [Wikipedia](https://en.wikipedia.org/wiki/Advanced_Visualization_Studio)
- Beeple: [CDM](https://cdm.link/beeple-brilliant-visuals-as-creative-commons-vj-clips-cinema-4d-source-files/), [Gumroad](https://beeple.gumroad.com/l/GnDA)
- Electric Sheep / flam3: [Wikipedia](https://en.wikipedia.org/wiki/Electric_Sheep), [flam3.com](https://flam3.com/), [Debian](https://sources.debian.org/copyright/license/flam3/3.0.1-3)
- TiXL / Tooll3: [CDM](https://cdm.link/tooll3-vj-friendly-free-procedural-visuals-puts-some-sweetness-in-sweet-spot-windows/)
- ShaderFlow: [GitHub](https://github.com/GentlemanHu/ShaderFlow)
