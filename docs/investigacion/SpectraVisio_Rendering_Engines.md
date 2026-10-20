# SpectraVisio - Motores, Librerías y Vías de Visualización

**Versión:** 0.1
**Fecha:** Octubre 10, 2026
**Estado:** Investigación (ninguna integrada)

---

## 📖 Propósito del Documento

Recoge las alternativas técnicas para **construir** visualizaciones: motores de render, librerías con contenido listo, análisis de audio y herramientas de rendimiento. Complementa a `SpectraVisio_Visualization_Ideas.md` (qué dibujar) con el **cómo**.

Cada entrada indica licencia, encaje con SpectraVisio y estado de verificación. Los datos de terceros se marcan como **⚠️ sin verificar** cuando las fuentes discrepan o son secundarias. Antes de añadir una dependencia, confirmar licencia y versión en su repositorio oficial.

**Contexto del proyecto (a fecha del documento):** Vite 5, JavaScript sin framework, licencia **GPL-3.0**, render solo Canvas 2D, `AudioEngine` mono con `AnalyserNode` (`fftSize` 2048).

---

## ⚠️ Prerrequisito Arquitectónico

`PluginManager` obtiene `canvas.getContext('2d')` sobre un único canvas. **Un canvas solo admite un tipo de contexto**: si es 2D no puede ser WebGL/WebGPU.

**Cambio propuesto:**
- Cada plugin declara `renderer: '2d' | 'webgl2' | 'webgpu'`.
- El `PluginManager` crea un canvas por plugin (o un `OffscreenCanvas`) y compone el resultado en el canvas visible.
- Esta composición es la base del **sistema de capas** que promete el README y de las transiciones entre modos.

Sin este cambio no se puede integrar ningún motor de esta lista salvo en sustitución total del 2D.

---

## 📋 Resumen

| Categoría | Opción | Licencia | Encaje | Prioridad |
|-----------|--------|----------|--------|-----------|
| Render | WebGL2 + shaders (twgl.js / OGL) | MIT / Unlicense | ⭐⭐⭐ | **Alta** |
| Render | WebGPU | Nativo | ⭐⭐ | Media (con fallback) |
| Render | Three.js (WebGPURenderer + TSL) | MIT | ⭐⭐ | Bajo demanda (3D) |
| Render | PixiJS v8 | MIT | ⭐⭐ | Bajo demanda (partículas 2D) |
| Render | p5.js | LGPL-2.1 | ⭐ | Solo prototipado / comunidad |
| Render | Babylon.js | Apache-2.0 | ⭐ | Descartada |
| Contenido | Butterchurn (Milkdrop) | MIT (código) | ⭐⭐⭐ | **Alta** |
| Contenido | projectM (WASM) | LGPL-2.1 | ⭐ | Descartada frente a Butterchurn |
| Contenido | ISF (Interactive Shader Format) | ISC (renderer JS) | ⭐⭐⭐ | **Alta** |
| Contenido | Shaders tipo Shadertoy | Variable (CC BY-NC-SA por defecto) | ⭐⭐ | Solo con licencia compatible |
| Contenido | Hydra (hydra-synth) | **AGPL-3.0** | ⭐⭐ | Decisión de licencia |
| Contenido | LYGIA (funciones de shader) | Prosperity / Patron | ⭐ | Decisión de licencia |
| Contenido | cables.gl | MIT | ⭐ | Herramienta externa |
| Análisis | Meyda | MIT | ⭐⭐⭐ | **Alta** |
| Análisis | pitchy | MIT | ⭐⭐⭐ | Alta |
| Análisis | realtime-bpm-analyzer | Apache-2.0 (v5) ⚠️ | ⭐⭐ | Media |
| Análisis | Essentia.js | **AGPL-3.0** | ⭐⭐ | Decisión de licencia |
| Análisis | AudioWorklet propio | Nativo | ⭐⭐⭐ | Alta |
| Referencia | audioMotion-analyzer | **AGPL-3.0** ⚠️ | ⭐ | Solo como referencia |
| Rendimiento | OffscreenCanvas + Worker | Nativo | ⭐⭐⭐ | Media |
| Directo | captureStream + MediaRecorder | Nativo | ⭐⭐ | Media |
| Directo | Web MIDI API | Nativo | ⭐⭐⭐ | Media |

---

## 🎨 MOTORES DE RENDER

### WebGL2 + shaders propios (con twgl.js u OGL)
**Licencia:** twgl.js MIT · OGL Unlicense · **Encaje:** el mejor

**Qué aporta:**
- Cada plugin es un *fragment shader*; el espectro y la forma de onda se suben como textura (convención Shadertoy, ver más abajo).
- Millones de píxeles por frame a 60 fps; desbloquea Mandelbrot, Liquid Metal, fluido (I-14), CRT (I-28) y la capa de postproceso (T-01).
- twgl.js y OGL eliminan el código repetitivo de WebGL sin imponer arquitectura; pesan muy poco comparados con Three.js.

**Decisión sugerida:** base del nuevo backend `webgl2`. Canvas 2D se mantiene para modos simples.

---

### WebGPU
**Licencia:** API nativa · **Encaje:** futuro, con fallback obligatorio

**Qué aporta:**
- *Compute shaders*: partículas masivas, fluidos y N-cuerpos (I-10, I-14, I-15) calculados en GPU.
- WGSL como lenguaje de shaders.

**Soporte (⚠️ fuentes secundarias contradictorias):**
- Chrome/Edge: estable desde la versión 113 (mayo 2023).
- Safari: varias fuentes sitúan el soporte completo en Safari 26 (septiembre 2025) para macOS, iPadOS, iOS y visionOS.
- Firefox: Firefox 141 en Windows; macOS y Linux reportados como parciales o tras flag según la fuente.
- Cobertura global estimada entre ~66 % y ~76 % según la fuente (Web3D Survey / terceros que citan caniuse).

**Decisión sugerida:** segundo backend para plugins que lo necesiten, siempre con WebGL2 de respaldo. Verificar en caniuse.com/webgpu antes de decidir.

---

### Three.js
**Licencia:** MIT · **Encaje:** solo para 3D real

**Qué aporta:**
- Escenas 3D, cámaras, iluminación, materiales y postproceso maduro (bloom, glitch, aberración cromática).
- `WebGPURenderer` con **fallback automático a WebGL2** (manual oficial) y **TSL**, un lenguaje de nodos que compila a WGSL o GLSL.
- ⚠️ Las partículas por *compute shader* parecen exclusivas de WebGPU; el fallback WebGL2 necesitaría otra ruta (inferido, no confirmado por fuente).

**Decisión sugerida:** introducir solo cuando llegue la primera visualización 3D real (DNA Helix, Gears, hipercubo con iluminación). Para shaders 2D sobra.

---

### PixiJS v8
**Licencia:** MIT · **Encaje:** 2D acelerado con muchas partículas

**Qué aporta:**
- 2D por GPU con backends WebGL y WebGPU, sprites masivos (`ParticleContainer`) y filtros encadenables.
- Según el blog oficial de v8, **WebGPU no siempre es más rápido**: PixiJS suele estar limitado por CPU; WebGPU ayuda en escenas con muchos filtros, máscaras y modos de fusión.
- `ParticleContainer` es mucho más rápido que `Container` para miles de sprites simples, pero no admite filtros ni hijos.

**Decisión sugerida:** si los modos de partículas 2D (I-10, I-16, Constellation) se quedan cortos en Canvas 2D.

---

### p5.js
**Licencia:** LGPL-2.1 · **Encaje:** bajo para directo

API más sencilla para programación creativa, pero lenta para 60 fps sostenidos. Solo tendría sentido como "modo comunidad" para facilitar plugins de terceros.

---

### Babylon.js
**Licencia:** Apache-2.0 · **Encaje:** descartada

Alternativa a Three.js, más pesada y orientada a juegos. No aporta nada que Three.js no cubra aquí.

---

## 📦 CONTENIDO LISTO

### Butterchurn (Milkdrop en WebGL)
**Licencia:** MIT (código) · **Encaje:** máximo impacto inmediato

**Qué aporta:**
- Reimplementación de Milkdrop (visualizador de Winamp) en JavaScript/WebGL.
- Paquete `butterchurn` + `butterchurn-presets` (v2.4.7, MIT) con cientos/miles de presets.
- Requiere **WebGL 2**; expone una comprobación `isSupported`.

**Precauciones:**
- ⚠️ **Los presets son obra de artistas de la comunidad Milkdrop**: la licencia MIT cubre el código, no necesariamente los presets. Revisar antes de redistribuir.
- ⚠️ **Mantenimiento:** los índices de paquetes sitúan la última versión hace varios años. Funciona, pero hay que asumir mantenerlo.

**Decisión sugerida:** integrarlo como un plugin `milkdrop` sobre el backend `webgl2`. Añade de golpe más variedad que todo el backlog.

---

### projectM (WebAssembly)
**Licencia:** LGPL-2.1 · **Encaje:** bajo

Otra reimplementación de Milkdrop, en C++, compilable a WASM con Emscripten (requiere WebGL 2). Más pesada de integrar y de construir. Butterchurn cubre lo mismo en JavaScript nativo.

---

### ISF (Interactive Shader Format)
**Licencia:** renderer JS `interactive-shader-format` ISC · **Encaje:** muy alto

**Qué aporta:**
- Estándar de VJ (VDMX y otros): un *fragment shader* GLSL + una cabecera JSON que declara entradas con tipo, rango, valor por defecto y etiqueta.
- **Encaja casi uno a uno con el esquema de parámetros de `SpectraVisio_Visualizations.md`**: la UI de parámetros puede generarse automáticamente desde la cabecera ISF.
- Renderer en JS: `ISFRenderer` (`loadSource` → `setValue` → `draw`) y `ISFParser`. Versión reportada 2.8.1–2.9.0 según el índice.
- Acceso a la biblioteca de shaders ISF existentes (revisar licencia de cada uno).

**Decisión sugerida:** formato oficial de los plugins de tipo shader.

---

### Shaders al estilo Shadertoy
**Licencia:** variable · **Encaje:** alto con restricciones

**Qué aporta:**
- Si la textura de audio sigue la convención de Shadertoy, muchos shaders se portan casi directamente.
- Convención (⚠️ fuentes comunitarias, no documentación oficial): textura de **512×2**; la fila superior es el FFT y la inferior la forma de onda, accesibles en `iChannel0`.

**Precaución:** los shaders de Shadertoy son por defecto **CC BY-NC-SA 3.0**, incompatible con la distribución bajo GPL-3.0. Solo usar los que tengan licencia explícita compatible.

**Decisión sugerida:** adoptar la convención de textura de audio 512×2 en el backend `webgl2` aunque no se importen shaders: es un estándar de facto y facilita portar ejemplos.

---

### Hydra (hydra-synth)
**Licencia:** **AGPL-3.0** · **Encaje:** alto en lo técnico, condicionado por licencia

**Qué aporta:**
- Sintetizador de vídeo para *live coding* en el navegador, compila a WebGL. API encadenable (`osc().kaleid().modulate()…`) inspirada en sintetizadores de vídeo analógicos.
- Puede compartir vídeo entre navegadores por WebRTC.
- Se integra con **Strudel** (live coding musical en el navegador): ambos se usan juntos en el mismo REPL.

**Precaución:** AGPL obliga a publicar el código de cualquier versión servida por red. Integrarlo arrastra esa condición al conjunto.

**Decisión sugerida:** solo si se acepta AGPL; alternativa, un modo "live code" propio inspirado en su API.

---

### LYGIA
**Licencia:** Prosperity + Patron (no comercial salvo patrocinio o licencia comercial) · **Encaje:** bajo por licencia

Biblioteca granular de funciones de shader (ruido, color, SDF, filtros…) en GLSL, WGSL, HLSL, Metal y otros. Muy útil, pero la cláusula no comercial de Prosperity no es compatible con GPL-3.0. Solo como referencia, salvo acuerdo de licencia.

---

### cables.gl
**Licencia:** MIT · **Encaje:** herramienta externa

Entorno de programación visual por nodos (WebGL) en el navegador y con versión offline (0.7.0, julio 2025). Tiene documentación sobre análisis y visualización de audio. No es una dependencia embebible de forma natural, pero sirve para **prototipar** visualizaciones antes de escribirlas como plugin.

---

## 🎵 ANÁLISIS DE AUDIO

Muchos prerrequisitos de `SpectraVisio_Visualization_Ideas.md` (P1, P4, P5, P6) se resuelven aquí, no en el render.

### Meyda
**Licencia:** MIT (v5.6.3) · **Encaje:** muy alto

- Extracción de características en tiempo real sobre Web Audio, y también offline.
- Incluye RMS, centroide espectral, rolloff, croma (12 bandas por defecto), MFCC y otras.
- ⚠️ No se confirmó en esta búsqueda si incluye *spectral flux*; revisar la lista completa en meyda.js.org.
- Ventana Hanning por defecto (configurable).

**Desbloquea:** P1 (bandas), I-03 Cromagrama, I-26 Estructura, I-27 Autosimilitud y mejor detección de beat.

---

### pitchy
**Licencia:** MIT · **Encaje:** muy alto

- Detección de pitch con el **McLeod Pitch Method**, en JavaScript puro y pensada para tiempo real (afinadores).
- `findPitch(input, sampleRate)` → `[frecuencia Hz, claridad 0–1]`.
- Monofónica.

**Desbloquea:** P5, I-09 Chladni, I-24 Piano roll (monofónico).

Alternativa: `pitchfinder` (varios algoritmos, incluido YIN).

---

### realtime-bpm-analyzer
**Licencia:** Apache-2.0 en v5 ⚠️ (MIT en v4) · **Encaje:** medio

- BPM en tiempo real basado en **AudioWorklet**, sin dependencias, TypeScript.
- ⚠️ Licencia cambiada entre versiones; puntuación de salud moderada en índices de terceros.

**Desbloquea:** P6 (BPM real) para micrófono y streams.

Alternativa para archivos completos: `web-audio-beat-detector` / `bpm-detective`.

---

### Essentia.js
**Licencia:** **AGPL-3.0** (confirmado en el repositorio MTG/essentia.js) · **Encaje:** alto en lo técnico, condicionado por licencia

- Port a WebAssembly de Essentia (Music Technology Group, Universitat Pompeu Fabra).
- Casos de uso en tiempo real y offline; amplia colección de algoritmos (BPM, tonalidad, onsets, modelos).

**Decisión sugerida:** solo si se acepta AGPL; Meyda + pitchy + realtime-bpm-analyzer cubren lo esencial con licencias permisivas.

---

### AudioWorklet propio
**Licencia:** nativo · **Encaje:** muy alto

- Análisis personalizado fuera del hilo principal: bandas logarítmicas a medida, YIN, *spectral flux*, onsets.
- Más precisión y control que `AnalyserNode`.
- Necesario además para **estéreo (P3)** con `ChannelSplitterNode`.

---

### audioMotion-analyzer (referencia)
**Licencia:** **AGPL-3.0-or-later** ⚠️ (fuente agregadora) · **Encaje:** solo referencia

Analizador de espectro sin dependencias (~25 kB), con análisis de doble canal, varias escalas de frecuencia, filtros de ponderación A/B/C/D e ITU-R 468, barras LED y espectro radial. Es el referente de lo que debería ser I-02 (Analizador pro). Útil como inspiración de funciones; no integrar sin aceptar AGPL.

---

## ⚡ RENDIMIENTO Y DIRECTO

### OffscreenCanvas + Web Worker
Mueve el render fuera del hilo principal; la UI y el MIDI no afectan a los fps. Encaja con el objetivo de baja latencia. Compatible con WebGL2 y WebGPU en el worker.

### `canvas.captureStream()` + MediaRecorder
Grabación de la sesión a vídeo sin dependencias. WebCodecs como opción avanzada si se necesita control de códec.

### Web MIDI API
Nativa. Cubre el "MIDI mapping" del README sin librerías.

---

## ⚖️ Licencias

El repositorio es **GPL-3.0**.

| Licencia | Compatible | Ejemplos |
|----------|-----------|----------|
| MIT, ISC, BSD, Unlicense | ✅ Sí | Three.js, PixiJS, OGL, twgl.js, Butterchurn, Meyda, pitchy, ISF renderer, cables.gl |
| Apache-2.0 | ✅ Sí (con GPL-3.0) | Babylon.js, realtime-bpm-analyzer v5 |
| LGPL-2.1 | ✅ Sí | p5.js, projectM |
| AGPL-3.0 | ⚠️ Combinable, pero extiende la obligación de publicar código a quien sirva la app por red | Hydra, Essentia.js, audioMotion-analyzer |
| CC BY-NC-SA | ❌ No | Shadertoy por defecto |
| Prosperity (no comercial) | ❌ No | LYGIA |

Contenido de terceros (presets de Milkdrop, shaders ISF, shaders de Shadertoy) tiene licencia propia, independiente de la del código que lo ejecuta.

---

## 🎯 Hoja de Ruta Propuesta

1. **Arquitectura:** un canvas por plugin + composición; campo `renderer` en el plugin.
2. **Backend `webgl2`:** twgl.js u OGL, textura de audio 512×2 (convención Shadertoy), plugins de shader en formato ISF con UI generada desde su cabecera.
3. **Contenido inmediato:** Butterchurn como plugin `milkdrop`, revisando la licencia de los presets incluidos.
4. **Análisis:** Meyda (bandas, croma, MFCC) + pitchy (pitch) + realtime-bpm-analyzer o AudioWorklet propio (BPM, estéreo).
5. **Bajo demanda:** PixiJS para partículas 2D masivas; Three.js para la primera visualización 3D real.
6. **Más adelante:** backend `webgpu` para compute (partículas, fluidos) con WebGL2 de respaldo; OffscreenCanvas en worker.
7. **Decisión de licencia pendiente:** aceptar o no AGPL (Hydra, Essentia.js).

---

## 🔗 Fuentes

**Render**
- [three.js — WebGPURenderer (manual oficial)](https://threejs.org/manual/en/webgpurenderer)
- [Migrating Three.js From WebGL to WebGPU](https://www.buildmvpfast.com/blog/threejs-webgl-to-webgpu-renderer-migration-2026)
- [PixiJS v8 launches (blog oficial)](https://pixijs.com/blog/pixi-v8-launches)
- [caniuse — WebGPU](https://caniuse.com/webgpu)
- [Web3D Survey — WebGPU](https://web3dsurvey.com/webgpu)
- [WebGPU vs WebGL for Games (2026)](https://app.cinevva.com/guides/webgpu-vs-webgl-games)
- [WebGPU adoption 2026](https://svilenkovic.com/3d/webgpu-adoption-2026)
- [Research: WebGPU adoption browsers 2026](https://enterno.io/en/s/research-webgpu-adoption-browsers-2026)

**Contenido**
- [butterchurn (npm)](https://www.npmjs.com/package/butterchurn)
- [butterchurn-presets (jsDelivr)](https://www.jsdelivr.com/package/npm/butterchurn-presets?tab=files)
- [Churn — créditos de presets](https://churn.leyanlo.com/credits)
- [projectM — EMSCRIPTEN.md (fork)](https://github.com/jimmy1248/projectm/blob/master/EMSCRIPTEN.md)
- [ISF Spec](https://github.com/mrRay/ISF_Spec)
- [ISF Primer](https://docs.isf.video/primer/)
- [interactive-shader-format (jsDelivr)](https://www.jsdelivr.com/package/npm/interactive-shader-format)
- [Synthclipse — formato de audio estilo Shadertoy](https://synthclipse.sourceforge.net/user_guide/music.html)
- [hydra-synth (GitHub)](https://github.com/hydra-synth/hydra-synth)
- [hydra-synth (Snyk, licencia)](https://snyk.io/advisor/npm-package/hydra-synth)
- [Hydra docs](https://hydra.ojack.xyz/docs/)
- [Strudel — ICLC 2023](https://iclc.toplap.org/2023/catalogue/paper/strudel-live-coding-patterns-on-the-web.html)
- [strudel.nvim (integración Hydra)](https://erock-neovimcraft.pgs.sh/plugin/gruvw/strudel.nvim)
- [LYGIA (npm)](https://npmjs.com/package/lygia)
- [cables.gl — descargas](https://cables.gl/downloads)
- [cables.gl open & offline (CDM)](https://cdm.link/2024/08/cables-gl-open-offline/)

**Análisis**
- [Meyda](https://meyda.js.org/)
- [Meyda — audio features](https://meyda.js.org/audio-features)
- [Meyda (libraries.io)](https://libraries.io/npm/meyda)
- [pitchy (GitHub)](https://github.com/ianprime0509/pitchy)
- [pitchfinder (README)](https://cdn.jsdelivr.net/npm/pitchfinder@2.3.4/README.md)
- [realtime-bpm-analyzer (depscope)](https://depscope.dev/pkg/npm/realtime-bpm-analyzer)
- [bpm-detective (README)](https://cdn.jsdelivr.net/npm/bpm-detective@2.0.5/README.md)
- [essentia.js (GitHub)](https://github.com/MTG/essentia.js)
- [Essentia](https://essentia.upf.edu/)
- [audioMotion-analyzer (npm)](https://npmjs.com/package/audiomotion-analyzer)
- [audioMotion-analyzer (depscope, licencia)](https://depscope.dev/pkg/npm/audiomotion-analyzer)
- [awesome-audio-visualization](https://www.context-awesome.com/list/willianjusten/awesome-audio-visualization)
