# SpectraVisio — arquitectura

Diseño técnico confirmado por mykl el 2026-10-10. Implementa la lista de `docs/funciones.md`; las letras entre paréntesis remiten a sus secciones.

## Stack

- TypeScript, React 19, Vite 8 y Vitest 5, como nona. Vite pasa de 5 a 8 (8.3.4 el 2026-10-10); Vitest 5 exige Vite 6.4 o superior
- Motor (audio, render, modulación) en TypeScript sin React. React solo para paneles, conectado al motor con un store propio sobre `useSyncExternalStore`, sin dependencias
- pnpm 11

## Audio

- Grafo: fuente → ganancia de entrada → analizadores izquierdo y derecho. En paralelo: fuente → volumen → salida. El volumen no afecta al análisis (A)
- Reproductor con dos `<audio>` alternos para precarga y fundido. Según Gapless 5, el elemento `<audio>` corta el final del archivo; el gapless exacto exige audio decodificado en memoria. [PENDIENTE: prototipo que compare memoria y método]
- Metadatos y carátula: `music-metadata` 12.1.0, MIT
- Análisis previo (C): decodificación en el hilo principal, cálculo en un Web Worker. BPM con `web-audio-beat-detector` 8.2.39, MIT, sobre el audio decodificado. Secciones y sonoridad para la normalización, con cálculo propio
- Essentia.js descartado: AGPL v3
- Bandas logarítmicas configurables calculadas desde la FFT
- Compensación de latencia: latencia que informa el navegador más ajuste manual en ms, aplicada retrasando los datos de análisis que llegan al render. [PENDIENTE: soporte en Safari]

## Render

- Un único canvas WebGL2 de salida. Cada visualización dibuja en una textura: las de Canvas 2D en un canvas oculto que se sube a la GPU, las WebGL directamente
- Compositor: capas A y B con crossfader y modo de fusión → cadena de efectos → capas de texto y letras (E, F)
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
- Archivos copiados, solo si el usuario lo elige, en OPFS. En Chrome, además, referencias a los archivos originales (A). [PENDIENTE: soporte de OPFS en Firefox y Safari]

## Salidas

- Segunda ventana: la misma app en modo salida. Audio y análisis siguen en la principal; los datos de análisis viajan en cada fotograma por `BroadcastChannel`
- Modo fuente para OBS con parámetros en la URL: visualización, interfaz, fondo, fuente de audio (G). [PENDIENTE: qué audio recibe la fuente de navegador de OBS]
- Grabación con `MediaRecorder` sobre el canvas más la pista de audio (G)

## Universal y proyecto

- PWA con `vite-plugin-pwa` 2.0.0, MIT, compatible con Vite 8
- Dos idiomas con diccionarios propios, sin librería
- Wake Lock y Media Session
- Despliegue en GitHub Pages con GitHub Actions, ruta base `/Spectra-visio/`, activo desde la fase 1 (I)
- Tests con Vitest: análisis, modulación, lectores ISF y LRC, presets (I)

## Orden de implementación

1. Migración a TypeScript, React y Vite 8; estructura, store, idiomas, almacenamiento, despliegue en Pages
2. Motor de audio nuevo, reproductor completo, metadatos, fuentes (A, B)
3. Análisis y latencia (C)
4. Compositor WebGL2 con capas A/B, port de las 8 visualizaciones, parámetros y modulación (D)
5. Efectos, paletas, transiciones, presets, navegador de visualizaciones
6. Familias nuevas, Butterchurn, ISF, entradas visuales, capas y letras
7. Análisis previo y modo automático
8. Directo: MIDI, reloj MIDI, escenas, crossfader, segunda ventana, apagón
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
