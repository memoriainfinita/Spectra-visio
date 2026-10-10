# SpectraVisio - Functional Specification Document (FSD)

**Versión:** 1.0  
**Fecha:** Enero 6, 2026  
**Autor:** [Tu Nombre]  
**Estado:** Draft

---

## 📖 Propósito del Documento

Este documento describe **exactamente cómo funciona** cada característica de SpectraVisio desde la perspectiva del usuario final. Sirve como:

- 🎯 **Guía de implementación**: Comportamientos específicos a programar
- 📋 **Manual anticipado**: Cómo el usuario experimentará cada función  
- ✅ **Criterios de testing**: Qué debe hacer exactamente la aplicación
- 🔍 **Detección de gaps**: Funcionalidades que faltan por definir

---

## 🚀 Inicio y Configuración Inicial

### Primera Carga de la Aplicación

**Comportamiento esperado:**
1. **Pantalla de bienvenida** aparece inmediatamente (< 1 segundo)
2. **Canvas negro** se renderiza en pantalla completa
3. **UI mínima** aparece en la esquina superior derecha:
   - Botón "Start" (azul, pulsante suave)
   - Selector de modo "TUNNEL" 
   - Botón "Fullscreen"
   - Botón "Hide UI"
4. **Hint panel** aparece en esquina inferior izquierda con controles de teclado
5. **Animación idle** comienza automáticamente:
   - Anillos concéntricos suaves rotando lentamente
   - Colores pastel que cambian gradualmente
   - Sin audio, solo visual de bienvenida

### Detección de Capacidades del Navegador

**Al cargar, la app debe verificar:**
- ✅ **Web Audio API**: Si no está disponible → mostrar mensaje de navegador no compatible
- ✅ **Canvas 2D**: Si no está disponible → fallback a mensaje de error elegante
- ✅ **getUserMedia**: Si no está disponible → deshabilitar botón de micrófono pero permitir archivos
- ✅ **Fullscreen API**: Si no está disponible → ocultar botón fullscreen
- ✅ **Local Storage**: Si no está disponible → avisar que no se guardarán presets

**Mensajes de error:**
```
❌ Navegador no compatible
Este navegador no soporta las características necesarias. 
Prueba con Chrome 90+, Firefox 88+, Safari 14+ o Edge 90+.

⚠️ Funcionalidad limitada
El micrófono no está disponible, pero puedes usar archivos de audio.

ℹ️ Sin almacenamiento local
Los presets no se guardarán entre sesiones.
```

---

## 🎵 Sistema de Audio

### Activación de Audio

**Flujo principal - Micrófono:**
1. Usuario hace clic en **"Start"**
2. Navegador solicita **permiso de micrófono**
3. **Si acepta:**
   - Botón cambia a "Mic OK" (verde, deshabilitado)
   - Hint panel se actualiza: "Micrófono activo - Reproduce música cerca del micrófono"
   - Visualización pasa de idle a modo reactivo inmediatamente
4. **Si rechaza:**
   - Botón cambia a "Mic Blocked" (rojo)
   - Aparece botón adicional "Try Again"
   - Hint panel muestra: "Micrófono bloqueado. Puedes usar archivos de audio con Ctrl+O"

**Flujo alternativo - Archivo de audio:**
1. Usuario presiona **Ctrl+O** o arrastra archivo al canvas
2. **File picker** se abre (filtro: .mp3, .wav, .ogg, .m4a)
3. **Al seleccionar archivo:**
   - Barra de progreso aparece mientras carga
   - Player controls aparecen en UI: ⏯️ ⏹️ 🔊 ▶️⏸️
   - Visualización empieza cuando el audio comienza
4. **Controles de reproducción:**
   - **Play/Pause**: Espacio o clic en botón
   - **Stop**: Shift+Espacio
   - **Volumen**: Rueda del mouse sobre icono de volumen
   - **Seek**: Clic en barra de progreso

**Flujo avanzado - Streaming URL:**
1. Usuario presiona **Ctrl+U**
2. **Modal aparece** con input de URL
3. **Ejemplos mostrados:**
   ```
   Radio online: http://streaming.radio.com/stream
   YouTube (via yt-dlp): https://youtube.com/watch?v=...
   SoundCloud: https://soundcloud.com/track/...
   ```
4. **Validación en tiempo real:**
   - ✅ URL válida → botón "Connect" habilitado
   - ❌ URL inválida → mensaje "Formato de URL no válido"
5. **Al conectar:**
   - Spinner de "Conectando..."
   - Si funciona → controles como archivo local
   - Si falla → "No se pudo conectar al stream"

### Análisis de Audio en Tiempo Real

**Procesamiento continuo:**
- **FFT Analysis**: 2048 samples, ventana Hann
- **Smoothing**: 0.85 para evitar flickering
- **Frequency Bands**:
  ```
  Bass:    0Hz - 250Hz    (bins 0-26)
  Mid:     250Hz - 4kHz   (bins 27-419) 
  Treble:  4kHz - 16kHz   (bins 420-1024)
  ```
- **Energy calculation**: RMS de cada banda
- **Beat detection**: Derivada de energía con threshold adaptativo
- **BPM detection**: Autocorrelación de beats con ventana de 8 segundos

**Datos expuestos a visualizaciones:**
```javascript
{
  frequencyData: Uint8Array(1024),  // Spectrum crudo 0-255
  timedomainData: Uint8Array(2048), // Waveform -128 a 127
  bass: 0.0,          // Energía graves normalizada 0-1
  mid: 0.0,           // Energía medios normalizada 0-1  
  treble: 0.0,        // Energía agudos normalizada 0-1
  energy: 0.0,        // Energía total 0-1
  bpm: 120.0,         // BPM detectado o manual
  beat: false,        // true si beat detectado este frame
  timestamp: 1234.56  // Tiempo en segundos desde inicio
}
```

---

## 🎨 Sistema de Visualización

### Modos de Visualización

**📄 Para especificaciones completas de todas las visualizaciones, ver:**
**[SpectraVisio_Visualizations.md](SpectraVisio_Visualizations.md)**

**Resumen de visualizaciones base (v1.0):**
- **TUNNEL**: Túnel de anillos concéntricos con perspectiva 3D
- **RIBBONS**: Ondas horizontales tipo ecualizador fluido
- **PLASMA**: Campo de plasma con ondas senoidales superpuestas
- **KALEIDO**: Caleidoscopio con barras radiales simétricas
- **ORBITALS**: Partículas en órbitas Lissajous complejas
- **GRIDWARP**: Rejilla deformable con ondas sinusoidales
- **STROBEBLOOM**: Flores con pétalos que pulsan

**Parámetros comunes:**
Cada visualización incluye parámetros configurables como velocidad, intensidad, densidad, colores, y reactividad específica a bass, mid, treble y beat detection.

**Ejemplo de configuración - TUNNEL:**
```
🌀 TUNNEL CONFIGURATION

Movement
├── Speed: [▬▬▬●▬▬▬] 1.2x
├── Ring Count: [▬▬●▬▬▬▬] 40
└── Wobble: [▬▬▬▬●▬▬] 0.8

Appearance  
├── Ring Thickness: [▬▬●▬▬▬▬] 3px
├── Color Shift: [▬▬▬▬▬●▬] 2.1x
└── Center Pulse: [✓] Intensity: [▬▬▬●▬▬▬]

Reactivity
├── Bass → Speed: [▬▬▬▬●▬▬] 80%
├── Mid → Wobble: [▬▬▬●▬▬▬] 60%  
└── Treble → Colors: [▬▬▬▬▬●▬] 90%

[🔄 Reset to Default] [💾 Save as Preset]
```

### Cambio de Visualización

**Métodos de cambio:**
1. **Teclado**: `←/→` para navegación secuencial
2. **Teclado directo**: `1-7` para selección inmediata
3. **UI**: Clic en selector de modo (dropdown en móvil)
4. **Automático**: Cada X segundos (configurable)

**Comportamiento del cambio:**
- **Transición suave**: Fade out 200ms → Fade in 200ms
- **Mantener configuración**: Cada modo recuerda sus últimos ajustes
- **Audio continuity**: Sin interrupciones de audio durante cambio
- **Preview**: Hover sobre nombre de modo muestra thumbnail (desktop)

### Modo Automático

**Configuración:**
- **Intervalo**: 15s, 30s, 1min, 2min, 5min, custom
- **Modos incluidos**: Checkboxes para seleccionar qué modos rotar
- **Orden**: Secuencial, aleatorio, basado en energía
- **Transiciones**: Fade, slide, instant

**Comportamiento:**
- **Indicador visual**: Barra de progreso sutil en UI cuando está activo
- **Pausa en interacción**: Se pausa si usuario cambia modo manualmente
- **Reanudación**: Se reanuda después de 10s de inactividad
- **Exclusión inteligente**: Si un modo causa problemas de performance, se salta automáticamente

---

## 🎨 FUNCIONALIDADES AVANZADAS

### Blend Modes & Layers

**Activación:**
- **Teclado**: `L` para toggle layer mode
- **UI**: Botón "Layers" en panel de configuración
- **Indicador**: Icono de capas (📚) se ilumina cuando está activo

**Configuración de Capas:**
```
🎨 LAYER SYSTEM

📚 Layer 1 (Base): [TUNNEL ▼] Opacity: [████████░░] 80%
📚 Layer 2: [RIBBONS ▼] [✓] Opacity: [██████░░░░] 60%  
📚 Layer 3: [PLASMA ▼] [✗] Opacity: [████░░░░░░] 40%

🔀 Blend Modes:
├── Layer 2 → Layer 1: [Screen ▼]
└── Layer 3 → Combined: [Overlay ▼]

⚙️ Global:
├── Max Layers: [3 ▼] (1-4 depending on performance)
└── Auto-adjust: [✓] Reduce quality if FPS < 45
```

**Blend Modes Disponibles:**
- **Normal**: Capas se superponen con transparencia simple
- **Screen**: Ilumina, ideal para efectos de luz brillante
- **Multiply**: Oscurece, crea sombras y profundidad
- **Overlay**: Combina screen y multiply según luminosidad
- **Difference**: Sustracción de colores, efectos psicodélicos
- **Addition**: Suma colores, efectos de neón intenso
- **Exclusion**: Similar a difference pero más suave

**Comportamiento del Sistema:**
- **Layer priority**: Layer 1 siempre es base, otros se aplican encima
- **Performance scaling**: Desactiva layers automáticamente si FPS < 30
- **Memory management**: Layers inactivos se pausan para ahorrar recursos
- **Sync audio**: Todas las layers reciben los mismos datos de audio
- **Independent config**: Cada layer mantiene su configuración individual

**Presets de Layers:**
- **"Neon Dreams"**: Tunnel (base) + Ribbons (screen) + Orbitals (addition)
- **"Deep Space"**: Plasma (base) + Constellation (overlay) + GridWarp (multiply)
- **"Organic Flow"**: StrobeBloom (base) + Liquid Metal (screen)
- **"Minimal Layers"**: Cualquier modo base + sutil overlay al 20%

### Reactive Elements

**Elementos Reactivos Inteligentes:**

**Frequency-Specific Elements:**
- **Sub-bass (20-60Hz)**: Elementos que solo aparecen en frecuencias muy graves
- **Kick drum (60-120Hz)**: Efectos que reaccionan específicamente a bombos
- **Snare range (150-250Hz)**: Elementos que detectan cajas y claps
- **Hi-hat range (8kHz-16kHz)**: Partículas que reaccionan a hi-hats y crashes
- **Vocal range (300Hz-3kHz)**: Efectos que siguen líneas vocales

**Configuración de Reactive Elements:**
```
🎵 REACTIVE ELEMENTS

📊 Frequency Triggers:
├── Sub-Bass Elements: [✓] Threshold: [▬▬▬●▬▬▬] 60%
├── Kick Detection: [✓] Sensitivity: [▬▬▬▬●▬▬] 70%  
├── Snare Detection: [✓] Sensitivity: [▬▬▬●▬▬▬] 50%
├── Hi-Hat Sparkles: [✓] Density: [▬▬▬▬▬●▬] 80%
└── Vocal Highlights: [✗] Intensity: [▬▬▬●▬▬▬] 60%

⚡ Transient Effects:
├── Attack Detection: [✓] Speed: [Fast ▼]
├── Decay Following: [✓] Trail Length: [▬▬▬●▬▬▬]
└── Sustain Visualization: [✓] Min Duration: [200ms]

🔇 Silence Behavior:
├── Fade to Ambient: [✓] Time: [3s ▼]
├── Idle Animation: [Minimal ▼]
└── Keep Base Layer: [✓]
```

**Transient Detection:**
- **Attack phase**: Efectos explosivos en inicio de sonidos
- **Decay phase**: Elementos que siguen la caída natural del sonido
- **Sustain phase**: Visualizaciones que mantienen intensidad durante notas largas
- **Release phase**: Efectos de fade out suaves al finalizar sonidos

**Silence Behavior:**
- **Ambient mode**: Visualización minimal durante silencios
- **Breathing**: Pulsación sutil que mantiene la vida visual
- **Anticipation**: Efectos que "esperan" la próxima entrada de audio
- **Memory trails**: Elementos que recuerdan el último patrón musical

**Ejemplos por Visualización:**
- **Tunnel**: Anillos extra aparecen solo en sub-bass, destellos en hi-hats
- **Ribbons**: Partículas extras siguen ataques de snare, ondas en vocal range
- **Plasma**: Burbujas especiales en kicks, chispas en transientes rápidos
- **Kaleido**: Segmentos que se iluminan según frecuencias específicas
- **Orbitals**: Partículas que nacen en ataques, mueren en silencios

### Advanced Audio Analysis

**Frequency Splitting:**

**Configuración de Bandas:**
```
🎛️ FREQUENCY SPLITTING

📊 Custom Bands (Advanced Mode):
├── Band 1: [20Hz] - [80Hz] → Sub-Bass
├── Band 2: [80Hz] - [200Hz] → Bass  
├── Band 3: [200Hz] - [500Hz] → Low-Mid
├── Band 4: [500Hz] - [2kHz] → Mid
├── Band 5: [2kHz] - [5kHz] → High-Mid
├── Band 6: [5kHz] - [12kHz] → Treble
└── Band 7: [12kHz] - [20kHz] → Air

🎨 Visual Mapping:
├── Each band → Different visual element
├── Band isolation: [✓] Solo mode available
└── Cross-band effects: [✓] Harmonics influence

📈 Analysis Options:
├── Resolution: [2048 ▼] FFT Size
├── Overlap: [50% ▼] Window overlap
└── Smoothing: [0.85 ▼] Temporal smoothing
```

**Stereo Field Analysis:**

**Configuración Estéreo:**
```
🎧 STEREO FIELD ANALYSIS

🗺️ Spatial Mapping:
├── Left Channel → Left side visuals: [✓]
├── Right Channel → Right side visuals: [✓]
├── Center (Mono) → Center visuals: [✓]
├── Stereo Width → Visual spread: [▬▬▬▬●▬▬] 70%
└── Phase Correlation → Color shift: [✓]

🌊 Stereo Effects:
├── Panning Visualization: [✓] Follow pan movement
├── Stereo Separation: [▬▬▬●▬▬▬] 60% visual split
├── Mid-Side Processing: [✗] M/S mode
└── Haas Effect: [✓] Visualize stereo delays

🎼 Advanced Stereo:
├── LCR Detection: Left-Center-Right detection
├── Phantom Center: [✓] Detect center-panned sources  
├── Stereo Image: [Width Meter ▼] Visual representation
└── Correlation Meter: [-1 ←●→ +1] Phase relationship
```

**Comportamiento del Stereo Field:**
- **True stereo**: Diferentes efectos en canal izquierdo vs derecho
- **Panning effects**: Elementos visuales que siguen el movimiento panorámico
- **Width visualization**: Visualización se expande/contrae con stereo width
- **Phase effects**: Colores/efectos cambian con correlación de fase
- **Spatial audio**: En modo 7.1/5.1, mapear canales a posiciones espaciales

**Ejemplos de Uso:**
- **DJ mixes**: Ver transiciones entre canciones en diferentes canales
- **Rock/Metal**: Guitarras left/right crean efectos simétricos
- **Electronic**: Elementos que "saltan" entre canales
- **Ambient**: Soundscape que usa todo el field estéreo

### Performance Controls

**Sistema de Snapshots/Scenes:**

**Activación:**
- **Teclado**: `S` para guardar snapshot, `Shift+1-8` para cargar
- **UI**: Panel de "Scenes" con 8 botones de snapshot
- **Indicador**: Botones se iluminan según contenido guardado

**Interfaz de Snapshots:**
```
📸 SNAPSHOTS/SCENES

🎬 Scene Slots:
├── Scene 1: ["Drop Moment"] [●] [📝] [🗑️]
├── Scene 2: ["Chill Vibe"] [○] [📝] [🗑️]  
├── Scene 3: ["Build Up"] [○] [📝] [🗑️]
├── Scene 4: [Empty] [○] [📝] [🗑️]
├── Scene 5: [Empty] [○] [📝] [🗑️]
├── Scene 6: [Empty] [○] [📝] [🗑️]
├── Scene 7: [Empty] [○] [📝] [🗑️]
└── Scene 8: [Empty] [○] [📝] [🗑️]

⚙️ Snapshot Options:
├── Include: [✓] Visualization mode [✓] All parameters
├── Include: [✓] Layer configuration [✓] Blend modes
├── Include: [✗] Audio settings [✓] Color palette
└── Transition: [Fade ▼] Speed: [Fast ▼]

🎮 Quick Actions:
├── [📸 Capture Current] → Save to selected slot
├── [⚡ Instant Recall] → No transition, immediate
└── [🔄 Morph Between] → Gradual transition A→B
```

**Contenido de Snapshots:**
- **Modo de visualización** actual + todos sus parámetros
- **Configuración de layers** (si está activo)
- **Blend modes** y opacidades
- **Paleta de colores** y configuración global
- **Configuración de reactive elements**
- **Parámetros de stereo field** (opcional)

**Crossfader System:**

**Activación:**
- **Teclado**: `X` para toggle crossfader mode
- **UI**: Slider horizontal grande en parte inferior
- **Control**: Click + drag, o teclas `Q`/`E` para nudge

**Interfaz del Crossfader:**
```
🎛️ CROSSFADER

A ◄─────●─────────► B
[Scene 2]      [Scene 5]
"Chill Vibe"   "Drop Moment"

⚙️ Crossfader Settings:
├── Curve: [Linear ▼] (Linear, Log, S-Curve)
├── Cut: [✗] Hard cut at extremes
├── Reverse: [✗] Flip A/B assignment  
└── Link Audio: [✗] Crossfade audio levels too

🎚️ Advanced:
├── Parameter Morph: [✓] Smooth parameter transitions
├── Color Blend: [✓] Blend color palettes
├── Layer Mix: [✓] Crossfade between layer configs
└── Beat Sync: [✗] Snap to beat boundaries
```

**Trigger Pads:**

**Activación:**
- **Teclado**: `T` para mostrar trigger pad overlay
- **Layout**: 4x2 grid de botones grandes
- **Asignación**: Click derecho para asignar función

**Trigger Pad Layout:**
```
🎮 TRIGGER PADS

[Flash]  [Color]  [Speed]  [Layer]
  F1       F2       F3       F4

[Beat]   [Freeze] [Random] [Reset]
  F5       F6       F7       F8

📋 Pad Functions:
├── Flash: Instant white flash (safe intensity)
├── Color: Cycle through color palettes instantly  
├── Speed: Toggle between 0.5x, 1x, 2x speed
├── Layer: Toggle layer system on/off
├── Beat: Manual beat trigger (override detection)
├── Freeze: Pause visual animation, keep audio
├── Random: Randomize current mode parameters
└── Reset: Return current mode to defaults

⚙️ Pad Settings:
├── Hold vs Toggle: [Toggle ▼] Behavior per pad
├── Visual Feedback: [✓] Pad lights up when active
├── MIDI Learn: [📡] Assign MIDI controller
└── Sensitivity: [▬▬▬●▬▬▬] Response strength
```

**XY Performance Pad:**

**Activación:**
- **Teclado**: `Y` para mostrar XY pad
- **Control**: Mouse/touch para control bidimensional
- **Tamaño**: Overlay grande en centro de pantalla

**XY Pad Configuration:**
```
📐 XY PERFORMANCE PAD

        Y: Intensity ▲
               |
               |
 X: Hue ◄──────●──────► X: Saturation
               |
               |
        Y: Speed ▼

⚙️ Axis Assignment:
├── X-Axis: [Color Hue ▼] Parameter control
├── Y-Axis: [Global Intensity ▼] Parameter control
├── Range X: [0] to [360] degrees/units
├── Range Y: [0.1] to [3.0] multiplier
└── Return: [✓] Return to center when released

🎯 Advanced:
├── Gravity: [✓] Smooth return to center
├── Momentum: [✓] Continue movement after release
├── Quantize: [✗] Snap to grid positions
└── Record: [✗] Record XY movements for playback
```

### Performance & Quality Management

**Sistema Adaptativo de Performance:**

**Monitor de Performance en Tiempo Real:**
```
📊 PERFORMANCE MONITOR

🖥️ Current Status:
├── FPS: [58/60] ████████░░ 97%
├── Memory: [145MB/256MB] ██████░░░░ 57%
├── CPU: [23%] ████░░░░░░ Low Load
└── GPU: [Not Available] Canvas 2D Mode

⚡ Auto-Optimization: [✓] Enabled
├── Target FPS: [60 ▼] (30/45/60)
├── Quality Scaling: [✓] Auto-reduce if needed
├── Layer Limit: [✓] Disable layers if FPS < 45
└── Emergency Mode: [✓] Minimal mode if FPS < 20

🔧 Manual Overrides:
├── Force High Quality: [✗] Ignore performance
├── Force Low Quality: [✗] Force optimization
└── Performance Alert: [✓] Notify when issues occur
```

**Configuración de Calidad:**
```
🎨 QUALITY SETTINGS

📈 Rendering Quality:
├── Resolution Scale: [100% ▼] (50%, 75%, 100%, 125%)
├── Anti-Aliasing: [✓] Smooth edges
├── Motion Blur: [✗] Experimental feature
└── Color Depth: [8-bit ▼] (8-bit, 16-bit)

🔄 Animation Quality:
├── Frame Skip: [None ▼] (None, Aggressive, Smart)
├── Particle Density: [100% ▼] (25%, 50%, 75%, 100%)
├── Complexity Scaling: [✓] Reduce details automatically
└── Trail Length: [100% ▼] Reduce trails to save memory

💾 Memory Management:
├── Garbage Collection: [Smart ▼] (Off, Smart, Aggressive)
├── Texture Caching: [✓] Cache for performance
├── Buffer Size: [Auto ▼] Audio buffer optimization
└── Memory Limit: [512MB ▼] Maximum RAM usage
```

**Adaptive Quality Behavior:**
- **60+ FPS**: All features enabled, maximum quality
- **45-60 FPS**: Reduce particle density by 25%
- **30-45 FPS**: Disable layers, reduce complexity, lower resolution scale
- **20-30 FPS**: Emergency mode: single layer, minimal effects, 50% resolution
- **<20 FPS**: Show performance warning, suggest browser/hardware upgrade

**Device-Specific Optimizations:**
- **Mobile devices**: Automatic reduction in particle count and complexity
- **Low-end hardware**: Preference for simpler visualizations (Tunnel, Ribbons)
- **High-end hardware**: Enable all features, suggest WebGL mode when available
- **Battery mode**: Reduce frame rate target to 30 FPS, minimize CPU usage

**Performance Presets:**
```
⚡ PERFORMANCE PRESETS

🏎️ "Maximum Performance" (Gaming PC):
├── Target FPS: 60, All features enabled
├── Resolution: 125%, Anti-aliasing ON
├── Layers: Up to 4, All blend modes
└── Particles: Maximum density

⚖️ "Balanced" (Standard Laptop):
├── Target FPS: 60, Auto-scaling enabled  
├── Resolution: 100%, Anti-aliasing ON
├── Layers: Up to 3, Performance monitoring
└── Particles: 75% density

💡 "Power Saver" (Battery/Mobile):
├── Target FPS: 30, Aggressive optimization
├── Resolution: 75%, Anti-aliasing OFF
├── Layers: 1 only, Simple blend modes
└── Particles: 50% density

🔧 "Potato Mode" (Old Hardware):
├── Target FPS: 30, Everything simplified
├── Resolution: 50%, No anti-aliasing
├── Layers: Disabled, Core visualizations only
└── Particles: 25% density
```

**Performance Notifications:**
- **Good performance**: Green indicator, no notifications
- **Minor issues**: Yellow indicator, "Performance slightly reduced" 
- **Significant issues**: Orange indicator, "Consider reducing quality settings"
- **Critical issues**: Red indicator, "Performance critical - check system resources"
- **Recovery**: Blue indicator when performance improves after optimization

---

## 🎛️ SISTEMA DE CONFIGURACIÓN ACTUALIZADO

### Panel de Configuración
- **Orden**: Secuencial, aleatorio, basado en energía
- **Transiciones**: Fade, slide, instant

**Comportamiento:**
- **Indicador visual**: Barra de progreso sutil en UI cuando está activo
- **Pausa en interacción**: Se pausa si usuario cambia modo manualmente
- **Reanudación**: Se reanuda después de 10s de inactividad
- **Exclusión inteligente**: Si un modo causa problemas de performance, se salta automáticamente

### Blend Modes & Layers

**Activación:**
- **Teclado**: `L` para toggle layer mode
- **UI**: Botón "Layers" en panel de configuración
- **Indicador**: Icono de capas (⚈) se ilumina cuando está activo

**Configuración de Capas:**
```
🎨 LAYER SYSTEM

📚 Layer 1 (Base): [TUNNEL ▼] Opacity: [████████░░] 80%
📚 Layer 2: [RIBBONS ▼] [✓] Opacity: [██████░░░░] 60%  
📚 Layer 3: [PLASMA ▼] [✗] Opacity: [████░░░░░░] 40%

🔀 Blend Modes:
├── Layer 2 → Layer 1: [Screen ▼]
└── Layer 3 → Combined: [Overlay ▼]

⚙️ Global:
├── Max Layers: [3 ▼] (1-4 depending on performance)
└── Auto-adjust: [✓] Reduce quality if FPS < 45
```

**Blend Modes Disponibles:**
- **Normal**: Capas se superponen con transparencia simple
- **Screen**: Ilumina, ideal para efectos de luz brillante
- **Multiply**: Oscurece, crea sombras y profundidad
- **Overlay**: Combina screen y multiply según luminosidad
- **Difference**: Sustracción de colores, efectos psicodélicos
- **Addition**: Suma colores, efectos de neón intenso
- **Exclusion**: Similar a difference pero más suave

**Comportamiento del Sistema:**
- **Layer priority**: Layer 1 siempre es base, otros se aplican encima
- **Performance scaling**: Desactiva layers automáticamente si FPS < 30
- **Memory management**: Layers inactivos se pausan para ahorrar recursos
- **Sync audio**: Todas las layers reciben los mismos datos de audio
- **Independent config**: Cada layer mantiene su configuración individual

**Presets de Layers:**
- **"Neon Dreams"**: Tunnel (base) + Ribbons (screen) + Orbitals (addition)
- **"Deep Space"**: Plasma (base) + Constellation (overlay) + GridWarp (multiply)
- **"Organic Flow"**: StrobeBloom (base) + Liquid Metal (screen)
- **"Minimal Layers"**: Cualquier modo base + sutil overlay al 20%

---

## 🎛️ Sistema de Configuración

### Panel de Configuración

**Activación:**
- **Teclado**: `C` para toggle
- **UI**: Clic en icono de engranaje (⚙️)
- **Auto-hide**: Se oculta automáticamente después de 30s sin interacción

**Estructura del panel:**
```
📊 AUDIO
├── Input Source: [Microphone ▼] [Test]
├── Sensitivity: [▬▬▬●▬▬▬] 50%
├── BPM: [Auto ▼] Manual: [120]
└── Audio Gain: [▬▬▬●▬▬▬] 100%

🎨 VISUAL  
├── Current Mode: [TUNNEL ▼] [⚙️ Mode Settings]
├── Global Speed: [▬▬▬●▬▬▬] 100%
├── Color Palette: [Psychedelic ▼] [🎨 Custom]
└── Brightness: [▬▬▬●▬▬▬] 80%

⏰ AUTO MODE
├── Enable Auto: [✓] Interval: [30s ▼]
├── Included Modes: [✓ Tunnel] [✓ Ribbons] [✓ Plasma]...
└── Transition: [Fade ▼] Speed: [Fast ▼]

💾 PRESETS
├── Current: [Default ▼] [💾 Save] [📁 Load] [🗑️ Delete]
├── Export: [📤 Export Config] 
└── Import: [📥 Import Config] [📁 Browse]
```

### Configuración por Modo

**Acceso:**
- Clic en ⚙️ junto al nombre del modo
- Panel específico se abre con parámetros únicos de ese modo

**Ejemplo - Tunnel Settings:**
```
🌀 TUNNEL CONFIGURATION

Movement
├── Speed: [▬▬▬●▬▬▬] 1.2x
├── Ring Count: [▬▬●▬▬▬▬] 40
└── Wobble: [▬▬▬▬●▬▬] 0.8

Appearance  
├── Ring Thickness: [▬▬●▬▬▬▬] 3px
├── Color Shift: [▬▬▬▬▬●▬] 2.1x
└── Center Pulse: [✓] Intensity: [▬▬▬●▬▬▬]

Reactivity
├── Bass → Speed: [▬▬▬▬●▬▬] 80%
├── Mid → Wobble: [▬▬▬●▬▬▬] 60%  
└── Treble → Colors: [▬▬▬▬▬●▬] 90%

[🔄 Reset to Default] [💾 Save as Preset]
```

### Sistema de Presets

**Preset por defecto:**
- Cada modo tiene configuración "Default" integrada
- No se puede borrar, pero sí modificar temporalmente
- Botón "Reset" siempre disponible para volver al original

**Presets personalizados:**
- **Nombrado**: Máximo 30 caracteres, sin caracteres especiales
- **Ámbito**: Por modo individual o configuración global
- **Metadatos**: Fecha de creación, última modificación, descripción opcional

**Gestión de presets:**
- **Guardar**: Dialogo con nombre y descripción
- **Cargar**: Lista con preview de configuración
- **Eliminar**: Confirmación requerida
- **Duplicar**: Crear copia con nuevo nombre
- **Compartir**: Export a archivo .json

**Formato de export (.spectravisio):**
```json
{
  "version": "1.0",
  "name": "Mi Config Épica",
  "description": "Config para sesiones de trance",
  "created": "2026-01-06T10:30:00Z",
  "global": {
    "sensitivity": 0.8,
    "speed": 1.2,
    "brightness": 0.9
  },
  "modes": {
    "tunnel": { "speed": 1.5, "ringCount": 60 },
    "plasma": { "intensity": 2.1, "complexity": 3 }
  },
  "auto": {
    "enabled": true,
    "interval": 45,
    "modes": ["tunnel", "plasma", "ribbons"]
  }
}
```

---

## 🎯 Controles e Interacción

### Controles de Teclado Completos

**Audio y Reproducción:**
- `Espacio` - Play/Pause
- `Ctrl+O` - Abrir archivo de audio
- `Ctrl+U` - Conectar a streaming URL
- `Shift+Espacio` - Stop (volver a micrófono si disponible)
- `↑/↓` - Ajustar sensitivity general
- `Shift+↑/↓` - Ajustar volumen (solo archivos)

**Visualización:**
- `←/→` - Cambiar modo de visualización
- `1-7` - Selección directa de modo
- `Shift+←/→` - Ajustar velocidad global
- `Alt+←/→` - Cambiar paleta de colores
- `R` - Reset modo actual a configuración default

**Interfaz:**
- `F` - Toggle fullscreen
- `H` - Hide/Show UI
- `C` - Abrir/cerrar panel de configuración  
- `P` - Gestión de presets
- `A` - Toggle modo automático
- `Esc` - Cerrar paneles/salir fullscreen

**Modo avanzado (Shift+tecla):**
- `Shift+1-7` - Configuración rápida del modo
- `Shift+A` - Configuración avanzada de auto-mode
- `Shift+C` - Export configuración actual
- `Shift+V` - Import configuración desde archivo
- `Shift+R` - Reset completo de toda la aplicación

### Controles Táctiles

**Gestos básicos:**
- **Single tap**: Play/Pause
- **Double tap**: Fullscreen toggle
- **Long press** (500ms): Mostrar menú contextual
- **Swipe horizontal**: Cambiar visualización
- **Swipe vertical**: Ajustar sensitivity
- **Pinch in/out**: Ajustar zoom/escala (modos compatibles)

**Menú contextual (long press):**
```
🎵 Audio Source
🎨 Change Mode  
⚙️ Settings
📱 Hide UI
🔄 Auto Mode: ON
```

**Controles de volumen (móvil):**
- **Botones físicos**: Controlan volumen del sistema
- **En app**: Slider que aparece al tocar icono de volumen

### Estados de la Interfaz

**Estado Normal:**
- Controles visibles en esquina superior derecha
- Hint panel visible en esquina inferior izquierda
- Respuesta inmediata a todos los controles

**Estado Minimal (primer H):**
- Solo botón de play/pause y selector de modo visibles
- Hint panel se oculta
- Atajos de teclado siguen funcionando

**Estado Inmersivo (segundo H):**
- UI completamente oculta
- Solo controles de teclado funcionales
- Indicador sutil de "Press H to show UI" aparece por 3s tras ocultar

**Estado Fullscreen:**
- UI se adapta automáticamente
- Controles no se superponen con bordes del navegador
- ESC siempre visible como hint sutil

---

## 🔧 Sistema de Plugins

### Estructura de Plugin

**Archivos requeridos por plugin:**
```
plugins/mi-visualizacion/
├── index.js          # Clase principal
├── config.json       # Metadatos y configuración
├── thumbnail.png     # Preview 320x180
├── README.md         # Documentación
└── examples/         # Ejemplos de uso (opcional)
```

**Metadatos (config.json):**
```json
{
  "name": "Mi Visualización Épica",
  "id": "mi-visualizacion",
  "version": "1.0.0",
  "author": "Tu Nombre",
  "description": "Una visualización que hace cosas increíbles",
  "category": "abstract",
  "tags": ["particles", "3d", "reactive"],
  "dependencies": [],
  "compatibility": {
    "spectravisio": ">=1.0.0",
    "webgl": false,
    "mobile": true
  },
  "parameters": {
    "speed": {
      "type": "range",
      "min": 0.1,
      "max": 3.0,
      "default": 1.0,
      "step": 0.1,
      "label": "Velocidad"
    },
    "color": {
      "type": "color",
      "default": "#ff0080",
      "label": "Color Principal"
    }
  }
}
```

### Carga Dinámica de Plugins

**Descubrimiento automático:**
- Al inicio, la app escanea `/plugins/` directory
- Lee `config.json` de cada subdirectorio
- Valida compatibilidad y dependencias
- Agrega a lista de modos disponibles

**Carga lazy:**
- Plugin solo se carga cuando usuario lo selecciona por primera vez
- Spinner de "Cargando..." mientras se descarga
- Cache en memoria para usos posteriores
- Error handling si plugin falla al cargar

**Hot reload (desarrollo):**
- En modo desarrollo, cambios en plugins se detectan automáticamente
- Recarga solo el plugin modificado sin afectar estado de la app
- Logs de debug en consola del navegador

### API de Desarrollo de Plugins

**Clase base obligatoria:**
```javascript
class BaseVisualizer {
  constructor(canvas, audioEngine, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audioEngine;
    this.config = config;
  }

  // Métodos obligatorios
  init() {
    // Inicialización una vez
  }

  render(audioData, deltaTime) {
    // Renderizado cada frame
    // audioData contiene frequency, time, bass, mid, treble, etc.
  }

  resize(width, height) {
    // Llamado cuando canvas cambia de tamaño
  }

  destroy() {
    // Limpieza al cambiar de plugin
  }

  // Métodos opcionales
  onParameterChange(key, value) {
    // Cuando usuario cambia configuración
  }

  onBeat(intensity) {
    // Cuando se detecta beat
  }

  getPerformanceStats() {
    // Retornar métricas de performance
    return { fps: 60, memoryUsage: 45 };
  }
}
```

**Utilidades disponibles:**
```javascript
// Matemáticas
SpectraVisio.Math.lerp(a, b, t)
SpectraVisio.Math.clamp(value, min, max)
SpectraVisio.Math.smoothstep(edge0, edge1, x)

// Colores  
SpectraVisio.Color.hslaToRgba(h, s, l, a)
SpectraVisio.Color.interpolate(color1, color2, t)
SpectraVisio.Color.palette.psychedelic[0] // Paletas predefinidas

// Audio
SpectraVisio.Audio.frequencyToBin(frequency, sampleRate, fftSize)
SpectraVisio.Audio.getAverageInRange(frequencyData, startHz, endHz)
```

---

## 📱 Comportamiento Responsive

### Breakpoints y Adaptaciones

**Mobile Portrait (< 480px):**
- Canvas mantiene aspect ratio pero UI se reorganiza
- Botones más grandes (min 44px touch target)
- Panel de configuración ocupa pantalla completa
- Controles simplificados: solo esenciales visibles
- Swipe gestures más prominentes

**Mobile Landscape (480px - 767px):**
- UI se compacta horizontalmente
- Hint panel se minimiza a iconos
- Configuración en sidebar lateral
- Controls overlay semitransparente

**Tablet (768px - 1024px):**
- UI híbrida táctil/mouse
- Panel de configuración en sidebar
- Todos los controles visibles
- Hover states activados

**Desktop (> 1024px):**
- UI completa con todas las funcionalidades
- Tooltips en hover
- Keyboard shortcuts prominentes
- Multi-monitor aware

### Adaptaciones por Dispositivo

**Touch devices:**
- Botones minimum 44x44px
- Gestos swipe habilitados  
- Long-press menus
- Visual feedback en taps

**Mouse devices:**
- Hover effects
- Right-click context menus
- Scroll wheel para ajustes finos
- Tooltips informativos

**Keyboard-only:**
- Focus indicators claros
- Tab navigation lógico
- Shortcuts visibles
- Screen reader support

---

## 🔍 Testing y QA

### Escenarios de Testing Manual

**Flujo básico de usuario:**
1. ✅ Página carga correctamente en <2 segundos
2. ✅ Animación idle se ejecuta suavemente
3. ✅ Botón "Start" funciona y solicita permisos
4. ✅ Micrófono captura audio y visualización reacciona
5. ✅ Cambio entre modos funciona sin lag
6. ✅ Fullscreen entra y sale correctamente
7. ✅ UI se puede ocultar/mostrar sin problemas
8. ✅ Configuración se abre y guarda cambios

**Flujo de archivos de audio:**
1. ✅ Ctrl+O abre file picker con filtros correctos
2. ✅ Archivo se carga con progress indicator
3. ✅ Play/pause funciona correctamente
4. ✅ Visualización sincroniza con audio del archivo
5. ✅ Seek bar permite saltar a cualquier posición
6. ✅ Volumen se controla independientemente

**Flujo de configuración avanzada:**
1. ✅ Panel de configuración se abre sin lag
2. ✅ Todos los sliders responden en tiempo real
3. ✅ Cambios se reflejan inmediatamente en visualización
4. ✅ Presets se guardan y cargan correctamente
5. ✅ Export/import funciona sin corromper datos
6. ✅ Reset devuelve a valores por defecto

### Cases de Error

**Audio no disponible:**
- ✅ Mensaje de error claro y útil
- ✅ Botón "Try Again" funcional
- ✅ Fallback a archivos sin problemas

**Archivo de audio inválido:**
- ✅ Error se muestra sin romper la app
- ✅ Usuario puede intentar con otro archivo
- ✅ App vuelve al estado anterior

**Browser incompatible:**
- ✅ Detección correcta de capacidades
- ✅ Mensaje explicativo con alternativas
- ✅ Graceful degradation donde sea posible

**Performance insuficiente:**
- ✅ Detección automática de frame rate bajo
- ✅ Sugerencia de reducir calidad/efectos
- ✅ Fallback a modo de bajo consumo

### Performance Benchmarks

**Métricas target:**
- **FPS**: 60 FPS constantes en hardware moderno
- **Memory**: <100MB uso de RAM total
- **CPU**: <30% en single core durante picos
- **Load time**: <2s para primera carga
- **Mode switch**: <200ms de latencia

**Dispositivos de test:**
- **High-end**: Gaming laptop, desktop workstation
- **Mid-range**: MacBook Air M1, Surface Pro
- **Low-end**: Tablet Android budget, smartphone 3+ años
- **Browsers**: Chrome, Firefox, Safari, Edge (últimas 2 versiones)

---

## 🌐 Compatibilidad y Fallbacks

### Navegadores Soportados

**Tier 1 (Soporte completo):**
- Chrome 90+ (Windows, Mac, Linux, Android)
- Firefox 88+ (Windows, Mac, Linux)  
- Safari 14+ (Mac, iOS)
- Edge 90+ (Windows)

**Tier 2 (Funcionalidad limitada):**
- Chrome 80-89: Sin algunas optimizaciones
- Firefox 80-87: Sin Web Audio avanzado
- Safari 13: Sin fullscreen API
- Samsung Internet: Sin streaming URLs

**No soportado (graceful fail):**
- Internet Explorer (cualquier versión)
- Chrome <80, Firefox <80, Safari <13
- Navegadores sin Web Audio API

### Fallbacks por Feature

**Web Audio API no disponible:**
- Mostrar visualización estática decorativa
- Mensaje: "Tu navegador no soporta análisis de audio en tiempo real"
- Link a navegadores compatibles

**Canvas 2D no disponible:**
- Fallback a animación CSS pura
- Mensaje: "Modo de compatibilidad activado"
- Funcionalidad muy limitada pero algo visual

**getUserMedia no disponible:**  
- Ocultar opción de micrófono
- Enfoque en carga de archivos
- Mensaje informativo sobre limitaciones

**Fullscreen API no disponible:**
- Ocultar botón de fullscreen
- Maximizar canvas dentro de viewport
- Hint: "Use F11 para fullscreen del navegador"

**Local Storage no disponible:**
- Presets en memoria solo (se pierden al recargar)
- Warning: "Configuraciones no se guardarán"
- Export/import sigue funcionando

---

## 📚 Documentación de Usuario

### Quick Start Guide

**Texto que aparecerá en el hint panel inicial:**

```
🎵 SPECTRAVISIO - Quick Start

1️⃣ Click "Start" para activar micrófono
   O presiona Ctrl+O para cargar archivo de audio

2️⃣ Usa ← → para cambiar entre 7 modos visuales
   O presiona 1-7 para selección directa

3️⃣ Presiona F para pantalla completa
   H para ocultar esta interfaz

⌨️ Más controles: C (configuración) P (presets) A (auto-mode)

🎨 Modos disponibles:
   Tunnel • Ribbons • Plasma • Kaleidoscope • Orbitals • GridWarp • StrobeBloom
```

### Tooltips y Ayuda Contextual

**Botones principales:**
- Start: "Activar captura de micrófono para análisis en tiempo real"
- Mode selector: "7 visualizaciones únicas - usa ←/→ para navegar"
- Fullscreen: "Modo inmersivo pantalla completa (F)"
- Hide UI: "Ocultar interfaz para experiencia pura (H)"

**Panel de configuración:**
- Cada slider muestra valor actual y rango
- Tooltips explican qué hace cada parámetro
- Links a "Más información" para conceptos avanzados

**Mensajes de estado:**
- "Micrófono activado - Reproduce música cerca del micrófono"
- "Archivo cargado - Usa Espacio para play/pause"  
- "Modo automático: cambiará en 15 segundos"
- "Configuración guardada como 'Mi Preset'"

### Error Messages User-Friendly

**En lugar de errores técnicos:**
❌ `MediaDeviceError: Permission denied`  
✅ `Necesitamos acceso al micrófono para crear visualizaciones. Haz click en "Permitir" cuando tu navegador lo solicite.`

❌ `AudioContext suspended`  
✅ `El audio está pausado. Haz click en cualquier lugar para reactivar las visualizaciones.`

❌ `Failed to fetch plugin`  
✅ `No se pudo cargar la visualización. Verifica tu conexión a internet o prueba otro modo.`

---

## 🚀 Futuras Expansiones

### Módulos Planificados (Post v1.0)

**SpectraVisio Pro:**
- WebGL shaders personalizados
- Visualizaciones 3D avanzadas  
- Export a video/GIF
- Control MIDI/OSC para hardware

**SpectraVisio Social:**
- Compartir configuraciones online
- Galería comunitaria de plugins  
- Colaboración en tiempo real
- Integración con streaming platforms

**SpectraVisio VJ:**
- Multiple outputs
- DMX lighting control
- Video mixing capabilities
- Performance recording/playback

### Integración con Suite Spectra

**Componentes de la suite:**
- **SpectraVisio**: Visualización de audio (este proyecto)
- **SpectraSeq**: Secuenciador musical
- **SpectraSynth**: Sintetizador virtual  
- **SpectraFX**: Procesador de efectos
- **SpectraLive**: Platform de streaming

**APIs compartidas:**
- **SpectraCore**: Engine de audio compartido
- **SpectraUI**: Componentes de interfaz consistentes
- **SpectraSync**: Sincronización entre apps
- **SpectraCloud**: Almacenamiento y colaboración

---

## ✅ Checklist de Implementación

### Fase 1: Core Foundation
- [ ] Arquitectura base con Web Components
- [ ] AudioEngine con Web Audio API
- [ ] PluginManager con carga dinámica
- [ ] Canvas renderer optimizado
- [ ] Sistema básico de configuración
- [ ] 7 visualizaciones como plugins
- [ ] Controles de teclado fundamentales
- [ ] UI minimalista con TweakCSS

### Fase 2: Advanced Features  
- [ ] Sistema completo de presets
- [ ] Panel de configuración avanzada
- [ ] Modo automático configurable
- [ ] Soporte para archivos de audio
- [ ] Detección de BPM
- [ ] Export/import de configuraciones
- [ ] Controles táctiles completos
- [ ] Responsive design total

### Fase 3: Polish & UX
- [ ] Animaciones y transiciones suaves
- [ ] Error handling robusto
- [ ] Performance optimizations
- [ ] Accessibility compliance
- [ ] Cross-browser testing
- [ ] Documentación de usuario
- [ ] Quick start tutorial interactivo

### Fase 4: Developer Experience
- [ ] API de plugins documentada
- [ ] Herramientas de desarrollo
- [ ] Plugin generator/template
- [ ] Ejemplos y tutoriales
- [ ] Testing framework para plugins
- [ ] Hot reload en desarrollo
- [ ] Performance profiler

---

*Este documento define exactamente cómo debe comportarse SpectraVisio desde la perspectiva del usuario. Cada función descrita aquí debe implementarse tal como se especifica para garantizar una experiencia consistente y profesional.*
