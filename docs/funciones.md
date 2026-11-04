# SpectraVisio — funciones

Lista de funciones confirmada por mykl el 2026-10-10. Es el contrato del rediseño: lo que no está aquí no entra sin pasar antes por revisión.

## Alcance

- Usos: reproductor con visuales, directo / VJ y fuente para OBS / streaming. Ninguno excluye a otro
- Objetivo: app profesional, universal y que merezca la pena usar
- Carencias señaladas por mykl tras probar la versión del 2026-10-10: sin control de volumen ni de reproducción; hacen falta muchas más visualizaciones
- Publicación en GitHub Pages
- Orden de implementación: el más adecuado para la app

## Principios

- Todo funciona en local: sin telemetría ni cuentas

## A. Reproducción

- Reproducir/pausar, anterior/siguiente, barra de progreso con salto, tiempo transcurrido y total
- Volumen y silencio, sin que el volumen afecte al análisis
- Lista de reproducción: varios archivos o carpeta, arrastrar y soltar, reordenar, aleatorio, repetir
- Reproducción sin silencios entre canciones (gapless), fundido cruzado opcional, normalización de volumen entre pistas
- Título, artista y carátula leídos de las etiquetas del archivo
- Teclas multimedia y controles del sistema
- Recordar lista y posición entre sesiones; copiar los archivos al almacenamiento de la app solo si el usuario lo elige

## B. Fuentes de audio

- Elección del dispositivo de entrada
- Audio del sistema o de una pestaña
- Música de Audius (artistas independientes) a la lista del reproductor
- Letras sincronizadas (LRCLIB) y carátulas (MusicBrainz) en línea para pistas que no las traen, opcional
- Directorio de radios por internet; las emisoras sin cabeceras CORS no se pueden analizar
- Ganancia de entrada y nivelado automático del análisis

## C. Análisis

- Más bandas, de subgraves a brillo, con escala de frecuencias logarítmica
- Detección de golpes por banda, BPM estimado y tap tempo manual
- Análisis estéreo, canal izquierdo y derecho por separado
- Suavizado ajustable
- Análisis previo de archivos: BPM, rejilla de golpes y cambios de sección antes de reproducir. Solo con archivos, no en directo
- Compensación de latencia entre audio y visuales: automática y ajuste manual

## D. Modulación

- Cualquier parámetro de cualquier visualización o efecto se puede conectar a una fuente de modulación: banda, golpe, oscilador lento o control MIDI
- La opacidad de una capa también se puede modular, y la cantidad de cada modulador se fija arrastrando sobre el parámetro mientras se mapea

## E. Visualizaciones

- Familias nuevas: barras de espectro (lineales, circulares, en espejo), espectrograma en cascada, variantes de onda, partículas, 3D (túnel, terreno), geometría, fractales
- Motor WebGL2 para efectos en GPU
- Milkdrop mediante Butterchurn
- Shaders importados: ISF como formato principal; pegar código al estilo Shadertoy con sus variables habituales. No se incluyen shaders de Shadertoy en la app. Sí cuatro de ejemplo escritos para ella, con la licencia del proyecto (dos Shadertoy y dos ISF), que se copian a la lista y se ponen en la capa con un clic en Bibliotecas › Shaders. La lista dice cuáles leen la fuente visual de la capa y un aviso salta si se ponen en una capa que no tiene ninguna
- Parámetros por visualización (paleta, velocidad, sensibilidad, intensidad) con panel
- Paletas de color globales
- Cadena de efectos global sobre cualquier visualización: brillo difuso, realimentación, espejo o caleidoscopio, corrección de color, estelas
- Entradas visuales: webcam, vídeo, imagen, canal de TV en directo (iptv-org) o vídeo e imagen libres de Wikimedia Commons y la NASA, para shaders y efectos; los vídeos con pausa, posición, recorte, sentido (adelante o atrás), bucle, ida y vuelta o una vez, y velocidad
- Transiciones con fundido entre visualizaciones
- Modo automático: cambio por tiempo, por golpe o al cambiar de canción. En pantalla ancha se enciende en Actuación (o con A, Mi panel, MIDI) y los ajustes están en Inspector › Composición; en móvil el interruptor está en ese panel
- Navegador de visualizaciones: miniaturas, categorías, búsqueda y favoritos
- Presets guardados, con exportación e importación
- Escenas en Bibliotecas › Escenas y presets: siete de ejemplo que enseñan todo lo que hace la app (Primeros pasos; Fuentes de modulación, con cada tipo de fuente y cada forma de oscilador; Moduladores y mandos; Todos los efectos, una columna por efecto; Clips y directo, con Mi panel; Todas las visualizaciones, como clips en tres capas; Espectáculo completo, con todo junto en ocho columnas) y las que guarda el usuario con su nombre (toda la composición: capas, clips, efectos, mandos y moduladores). Cargar una reemplaza la escena y Ctrl Z la devuelve; entran en la copia de seguridad. Los presets de la capa están debajo, aparte
- Capas superpuestas: título de la canción, letras sincronizadas (LRC), logo o imagen, texto

## F. Directo / VJ

- Aprendizaje de controles MIDI, mediante la modulación
- Sincronía con reloj MIDI externo (caja de ritmos, DAW)
- Atajos configurables; teclas numéricas para lanzar columnas de clips
- Cada control de la interfaz tiene un solo sitio; solo se repite en Mi panel, el buscador Ctrl K, los atajos y MIDI. Excepciones: el reproductor (barra superior y Audio) y Visualizaciones (navegador e Inspector)
- Composición por capas al estilo Resolume Arena: capas apiladas con opacidad y modo de fusión, crossfader entre lados A y B, efectos por capa y de composición, rejilla de clips
- Lanzar clips al pulsar o al siguiente golpe
- Menú de clip con clic derecho: lanzar, guardar la capa aquí, copiar, pegar, renombrar y vaciar; el nombre por defecto es el de la visualización
- Columnas de clips con nombre y lanzables con una nota MIDI, además de las teclas numéricas; las columnas se lanzan también desde la cabecera de la rejilla de Clips, no desde Actuación
- Mi panel: los controles de la app se arrastran a sus celdas desde el modo Editar
- El aviso de deshacer dice qué se deshizo cuando fue una sola cosa
- Fuente visual por capa: cada capa tiene su cámara, archivo, TV o vídeo en línea. El contenido de una capa y el de un clip es Visualización o Fuente visual, y se elige y se configura en el Inspector (Contenido y Fuente, con su vista previa y los controles del vídeo). La fuente sigue en la capa cuando esta muestra una visualización, y la leen los shaders y el efecto Mezcla con la fuente. «Entrada visual» no sale como una visualización más en el navegador. La fuente se configura solo en el Inspector, también los catálogos de TV y de vídeo e imagen libres, que cargan en la capa seleccionada; Bibliotecas no tiene pestaña de fuentes. Al abrir una fuente, la capa pasa a mostrarla (salvo que ya corra un shader), y un aviso dice si el crossfader oculta el lado de esa capa
- Salida en segunda ventana para proyector, controlada desde la principal
- Apagón, congelar imagen y estrobo con límite fotosensible global

## G. OBS / streaming

- Fuente para OBS por URL, sin interfaz, con fondo transparente o negro; la imagen, el audio y el análisis los da la app abierta en el navegador, por obs-websocket
- Resolución fija y perfiles de calidad
- Grabación de la salida a vídeo con audio

## H. Universal

- App instalable (PWA) y uso sin conexión
- Móvil y táctil: gestos para cambiar de modo y controles grandes
- Interfaz en español e inglés
- Accesibilidad: todo manejable con teclado, preferencia de movimiento reducido, aviso de fotosensibilidad
- Calidad adaptativa según fps, con medidor de fps opcional
- Límite de fps y modo de bajo consumo
- Evitar que la pantalla se apague durante la visualización
- Firefox, Chrome y Safari, con alternativas donde falte soporte

## I. Proyecto

- Despliegue en GitHub Pages con GitHub Actions; ruta base relativa en Vite
- Tests de la lógica de audio y análisis

## Fuera de alcance

- WebGPU: WebGL2 cubre la lista; un segundo motor solo añade mantenimiento
- Control remoto desde el móvil: GitHub Pages es estático y emparejar dispositivos exige códigos QR en ambos sentidos o un servidor de terceros
- Spotify, YouTube y servicios con DRM: solo mediante captura de pestaña o de audio del sistema
- Spout, Syphon y NDI: hacia OBS, fuente de navegador o captura de ventana
- OSC y Ableton Link: necesitan un puente nativo
- Lanzar clips al compás: en directo la app no sabe dónde cae el primer tiempo del compás
- Varias grabaciones guardadas en la app: el archivo se descarga al parar y la última queda para recuperarla

## Soporte de navegadores

Consultado el 2026-10-10.

| Función | Chrome / Edge | Firefox | Safari | Fuente |
|---|---|---|---|---|
| Audio del sistema o pestaña (`getDisplayMedia`) | Sí desde Chrome 74; en Linux y macOS solo audio de pestaña (Chrome 141 añade sistema en macOS) | No | No | [Addpipe](https://blog.addpipe.com/getdisplaymedia-allows-capturing-the-screen-with-system-sounds-on-chrome-on-macos.md), [MDN compat data](https://github.com/mdn/browser-compat-data/blob/main/api/MediaDevices.json), comprobado también en el Firefox de mykl |
| Web MIDI | Sí, con permiso | Sí, desde 108 | No | [Chrome](https://developer.chrome.com/blog/web-midi-permission-prompt?hl=de), [WebKit 107250](https://bugs.webkit.org/show_bug.cgi?id=107250) |
| Elegir pantalla de salida (`getScreenDetails`) | Sí, desde 100 | No | No | [web.dev](https://web.dev/articles/web-apps/multiple-screens) |

- Butterchurn: requiere WebGL2; licencia MIT; presets en el paquete `butterchurn-presets` ([npm](https://www.npmjs.com/package/butterchurn))
- ISF: el audio llega al shader como imagen, una fila por canal ([ISF primer](https://docs.isf.video/primer_chapter_8))
- Shadertoy: licencia por defecto CC BY-NC-SA 3.0 si el autor no indica otra, según fuentes secundarias ([Godot Shaders](https://godotshaders.com/?p=5533), [foro de Magic Music Visuals](https://magicmusicvisuals.com/forums/viewtopic.php?p=3522)); no comercial
