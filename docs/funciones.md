# SpectraVisio — funciones

Lista de funciones confirmada por mykl el 2026-10-10. Es el contrato del rediseño: lo que no está aquí no entra sin pasar antes por revisión.

## Alcance

- Usos: reproductor con visuales, directo / VJ y fuente para OBS / streaming. Ninguno excluye a otro
- Objetivo: app profesional, universal y que merezca la pena usar
- Carencias señaladas por mykl tras probar la versión del 2026-10-10: sin control de volumen ni de reproducción; hacen falta muchas más visualizaciones

## A. Reproducción

- Reproducir/pausar, anterior/siguiente, barra de progreso con salto, tiempo transcurrido y total
- Volumen y silencio, sin que el volumen afecte al análisis
- Lista de reproducción: varios archivos o carpeta, arrastrar y soltar, reordenar, aleatorio, repetir
- Título, artista y carátula leídos de las etiquetas del archivo
- Teclas multimedia y controles del sistema
- Recordar lista y posición entre sesiones

## B. Fuentes de audio

- Elección del dispositivo de entrada
- Audio del sistema o de una pestaña
- Ganancia de entrada y nivelado automático del análisis

## C. Análisis

- Más bandas, de subgraves a brillo, con escala de frecuencias logarítmica
- Detección de golpes por banda, BPM estimado y tap tempo manual
- Análisis estéreo, canal izquierdo y derecho por separado
- Suavizado ajustable

## D. Visualizaciones

- Familias nuevas: barras de espectro (lineales, circulares, en espejo), espectrograma en cascada, variantes de onda, partículas, 3D (túnel, terreno), geometría, fractales
- Motor WebGL2 para efectos en GPU
- WebGPU, más adelante
- Milkdrop mediante Butterchurn
- Importación de shaders ISF y al estilo Shadertoy, con el audio como textura
- Parámetros por visualización (paleta, velocidad, sensibilidad, intensidad) con panel
- Paletas de color globales
- Transiciones con fundido entre visualizaciones
- Modo automático: cambio por tiempo, por golpe o al cambiar de canción
- Favoritos y presets guardados, con exportación e importación
- Capas superpuestas: título de la canción, logo o imagen, texto

## E. Directo / VJ

- Control MIDI con aprendizaje de controles
- Atajos configurables y teclas numéricas para escenas
- Mezcla de dos visualizaciones con crossfader y modos de fusión
- Salida en segunda ventana para proyector, controlada desde la principal
- Apagón, congelar imagen y estrobo con límite fotosensible global

## F. OBS / streaming

- Modo fuente configurable por URL: visualización, sin interfaz, fondo transparente, fuente de audio
- Resolución fija y perfiles de calidad
- Grabación de la salida a vídeo con audio

## G. Universal

- App instalable (PWA) y uso sin conexión
- Móvil y táctil: gestos para cambiar de modo y controles grandes
- Interfaz en español e inglés
- Accesibilidad: todo manejable con teclado, preferencia de movimiento reducido, aviso de fotosensibilidad
- Calidad adaptativa según fps, con medidor de fps opcional
- Evitar que la pantalla se apague durante la visualización
- Firefox, Chrome y Safari, con alternativas donde falte soporte

## H. Proyecto

- Tests de la lógica de audio y análisis
- [PENDIENTE: publicar en web (por ejemplo GitHub Pages) o solo uso local]

## Soporte de navegadores

Consultado el 2026-10-10.

| Función | Chrome / Edge | Firefox | Safari | Fuente |
|---|---|---|---|---|
| Audio del sistema o pestaña (`getDisplayMedia`) | Sí en escritorio; audio del sistema en macOS desde Chrome 141 | [PENDIENTE: sin confirmar] | [PENDIENTE: sin confirmar] | [Addpipe](https://blog.addpipe.com/getdisplaymedia-allows-capturing-the-screen-with-system-sounds-on-chrome-on-macos.md), [MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia) |
| Web MIDI | Sí, con permiso | Sí, desde 108 | No | [Chrome](https://developer.chrome.com/blog/web-midi-permission-prompt?hl=de), [WebKit 107250](https://bugs.webkit.org/show_bug.cgi?id=107250) |
| Elegir pantalla de salida (`getScreenDetails`) | Sí, desde 100 | No | No | [web.dev](https://web.dev/articles/web-apps/multiple-screens) |
| WebGPU | Sí; Linux en curso | Windows desde 141; resto parcial | Safari 26 | [web.dev](https://web.dev/blog/webgpu-supported-major-browsers) |

- Butterchurn: requiere WebGL2; licencia MIT; presets en el paquete `butterchurn-presets` ([npm](https://www.npmjs.com/package/butterchurn))
- ISF: el audio llega al shader como imagen, una fila por canal ([ISF primer](https://docs.isf.video/primer_chapter_8))

## Orden

[PENDIENTE: orden de implementación, a decidir con mykl]
