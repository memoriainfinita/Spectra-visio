# SpectraVisio - Visualizations Specification

**Versión:** 1.0  
**Fecha:** Enero 6, 2026  
**Autor:** [Tu Nombre]  
**Estado:** Living Document

---

## 📖 Propósito del Documento

Este documento define **todas las visualizaciones** de SpectraVisio, incluyendo:
- ✅ **7 visualizaciones base** (ya implementadas en prototipo)
- 🚧 **Visualizaciones planificadas** para futuras versiones
- 🎨 **Especificaciones técnicas** y comportamientos
- ⚙️ **Parámetros configurables** de cada modo
- 🎵 **Reactividad al audio** específica por visualización

---

## 🎨 VISUALIZACIONES BASE (v1.0)

### 1. TUNNEL
**Categoría:** Abstract Geometric  
**Complejidad:** Media  
**Performance:** Óptimo

**Descripción:**
Túnel de anillos concéntricos con perspectiva 3D simulada. Los anillos se mueven hacia el espectador creando sensación de profundidad infinita, con deformaciones ondulantes que reaccionan al audio.

**Parámetros Configurables:**
```json
{
  "speed": {
    "type": "range",
    "min": 0.1,
    "max": 5.0,
    "default": 1.2,
    "step": 0.1,
    "label": "Velocidad de Movimiento",
    "description": "Velocidad base del túnel antes de reactividad"
  },
  "ringCount": {
    "type": "range", 
    "min": 20,
    "max": 80,
    "default": 40,
    "step": 5,
    "label": "Cantidad de Anillos",
    "description": "Número de anillos concéntricos visibles"
  },
  "wobbleIntensity": {
    "type": "range",
    "min": 0.0,
    "max": 2.0,
    "default": 0.8,
    "step": 0.1,
    "label": "Intensidad de Ondulación",
    "description": "Cuánto se deforman los anillos"
  },
  "ringThickness": {
    "type": "range",
    "min": 1,
    "max": 20,
    "default": 3,
    "step": 1,
    "label": "Grosor de Líneas",
    "unit": "px"
  },
  "colorShiftSpeed": {
    "type": "range",
    "min": 0.1,
    "max": 3.0,
    "default": 2.1,
    "step": 0.1,
    "label": "Velocidad de Cambio de Color"
  },
  "centerPulse": {
    "type": "boolean",
    "default": true,
    "label": "Pulso Central",
    "description": "Círculo pulsante en el centro"
  },
  "centerPulseIntensity": {
    "type": "range",
    "min": 0.0,
    "max": 2.0,
    "default": 1.0,
    "step": 0.1,
    "label": "Intensidad Pulso Central",
    "dependsOn": "centerPulse"
  }
}
```

**Reactividad al Audio:**
- **Bass (0-250Hz)** → Velocidad del túnel (0.5x - 2.5x multiplicador)
- **Bass** → Grosor de líneas (+0 a +15px adicionales)
- **Bass** → Tamaño del pulso central (x0.5 a x3.0)
- **Mid (250Hz-4kHz)** → Intensidad de wobble (x0.2 a x2.0)
- **Mid** → Deformación asimétrica de anillos
- **Treble (4kHz+)** → Velocidad de cambio de color (x0.3 a x3.0)
- **Treble** → Brillo y saturación de colores
- **Beat Detection** → Flash instantáneo + expansión de anillos

**Estados Especiales:**
- **Silencio**: Movimiento mínimo, colores pastel
- **Build-up**: Aceleración gradual + intensificación de colores
- **Drop/Peak**: Explosión de anillos + flash controlado
- **Fade-out**: Desaceleración suave + fade a negro

---

### 2. RIBBONS
**Categoría:** Waveform Reactive  
**Complejidad:** Media  
**Performance:** Bueno

**Descripción:**
Múltiples cintas horizontales que ondean según la forma de onda del audio, creando un efecto de ecualizador fluido y orgánico. Incluye partículas flotantes que siguen el movimiento de las cintas.

**Parámetros Configurables:**
```json
{
  "ribbonCount": {
    "type": "range",
    "min": 3,
    "max": 12,
    "default": 7,
    "step": 1,
    "label": "Cantidad de Cintas"
  },
  "waveAmplitude": {
    "type": "range",
    "min": 0.1,
    "max": 2.0,
    "default": 1.0,
    "step": 0.1,
    "label": "Amplitud de Ondas"
  },
  "smoothing": {
    "type": "range",
    "min": 0.1,
    "max": 0.95,
    "default": 0.7,
    "step": 0.05,
    "label": "Suavizado de Forma de Onda"
  },
  "particleDensity": {
    "type": "range",
    "min": 0,
    "max": 50,
    "default": 18,
    "step": 2,
    "label": "Densidad de Partículas"
  },
  "flowSpeed": {
    "type": "range",
    "min": 0.1,
    "max": 3.0,
    "default": 1.0,
    "step": 0.1,
    "label": "Velocidad de Flujo"
  },
  "ribbonWidth": {
    "type": "range",
    "min": 1,
    "max": 15,
    "default": 5,
    "step": 1,
    "label": "Grosor de Cintas",
    "unit": "px"
  },
  "verticalSpacing": {
    "type": "range",
    "min": 0.5,
    "max": 2.0,
    "default": 1.0,
    "step": 0.1,
    "label": "Espaciado Vertical"
  }
}
```

**Reactividad al Audio:**
- **Waveform Data** → Forma exacta de cada cinta (mapeo directo)
- **Mid** → Amplitud principal de movimiento
- **Bass** → Grosor de líneas dinámico
- **Bass** → Cantidad de partículas adicionales
- **Treble** → Velocidad de partículas
- **Treble** → Brillo y dispersión de partículas
- **Energy Spikes** → Ondas que se propagan por las cintas

---

### 3. PLASMA
**Categoría:** Mathematical Abstract  
**Complejidad:** Alta  
**Performance:** Medio

**Descripción:**
Campo de plasma generado por múltiples ondas senoidales superpuestas, creando patrones orgánicos y fluidos. Incluye ondas de choque concéntricas que reaccionan a los graves.

**Parámetros Configurables:**
```json
{
  "gridResolution": {
    "type": "select",
    "options": ["8x8", "16x16", "24x24", "32x32", "48x48", "64x64"],
    "default": "24x24",
    "label": "Resolución de Campo"
  },
  "waveComplexity": {
    "type": "range",
    "min": 1,
    "max": 5,
    "default": 3,
    "step": 1,
    "label": "Complejidad de Ondas",
    "description": "Número de capas de ondas superpuestas"
  },
  "plasmaSpeed": {
    "type": "range",
    "min": 0.1,
    "max": 4.0,
    "default": 1.0,
    "step": 0.1,
    "label": "Velocidad de Evolución"
  },
  "intensity": {
    "type": "range",
    "min": 0.1,
    "max": 3.0,
    "default": 1.5,
    "step": 0.1,
    "label": "Intensidad General"
  },
  "shockWaves": {
    "type": "boolean",
    "default": true,
    "label": "Ondas de Choque"
  },
  "shockWaveCount": {
    "type": "range",
    "min": 1,
    "max": 5,
    "default": 3,
    "step": 1,
    "label": "Cantidad de Ondas de Choque",
    "dependsOn": "shockWaves"
  },
  "colorCycles": {
    "type": "range",
    "min": 1,
    "max": 8,
    "default": 3,
    "step": 1,
    "label": "Ciclos de Color"
  }
}
```

**Reactividad al Audio:**
- **Bass** → Ondas de choque concéntricas (frecuencia y amplitud)
- **Mid + Treble** → Velocidad y complejidad del plasma
- **Beat** → Pulso de intensidad en todo el campo
- **Energy** → Interpolación entre paletas de colores
- **Frequency Spectrum** → Modulación direccional de ondas

---

### 4. KALEIDO (Kaleidoscope)
**Categoría:** Symmetric Geometric  
**Complejidad:** Alta  
**Performance:** Medio

**Descripción:**
Caleidoscopio con barras radiales simétricas que reaccionan al espectro de frecuencias. Cada segmento puede tener modo espejo alternado para crear patrones hipnóticos.

**Parámetros Configurables:**
```json
{
  "segments": {
    "type": "range",
    "min": 6,
    "max": 24,
    "default": 12,
    "step": 1,
    "label": "Número de Segmentos"
  },
  "barDensity": {
    "type": "range",
    "min": 30,
    "max": 120,
    "default": 72,
    "step": 6,
    "label": "Densidad de Barras por Segmento"
  },
  "mirrorMode": {
    "type": "select",
    "options": ["alternating", "all-same", "random"],
    "default": "alternating",
    "label": "Modo Espejo"
  },
  "rotationSpeed": {
    "type": "range",
    "min": 0.1,
    "max": 3.0,
    "default": 0.8,
    "step": 0.1,
    "label": "Velocidad de Rotación"
  },
  "radialReach": {
    "type": "range",
    "min": 0.2,
    "max": 1.0,
    "default": 0.7,
    "step": 0.05,
    "label": "Alcance Radial"
  },
  "centerBloom": {
    "type": "boolean",
    "default": true,
    "label": "Florecimiento Central"
  },
  "barThickness": {
    "type": "range",
    "min": 1,
    "max": 8,
    "default": 3,
    "step": 1,
    "label": "Grosor de Barras",
    "unit": "px"
  }
}
```

**Reactividad al Audio:**
- **Frequency Data** → Longitud de cada barra radial (mapeo 1:1)
- **Bass + Mid** → Velocidad de rotación del conjunto
- **Treble** → Cambio de colores y saturación
- **Energy** → Pulso del centro luminoso (bloom)
- **Beat** → Flash sincronizado de todos los segmentos

---

### 5. ORBITALS
**Categoría:** Particle Physics  
**Complejidad:** Alta  
**Performance:** Medio-Bajo

**Descripción:**
Partículas en órbitas complejas tipo Lissajous, creando patrones que evocan modelos atómicos o sistemas planetarios. Las partículas dejan estelas opcionales.

**Parámetros Configurables:**
```json
{
  "particleCount": {
    "type": "range",
    "min": 50,
    "max": 500,
    "default": 140,
    "step": 10,
    "label": "Cantidad de Partículas"
  },
  "orbitComplexity": {
    "type": "range",
    "min": 1.0,
    "max": 3.0,
    "default": 1.7,
    "step": 0.1,
    "label": "Complejidad de Órbitas"
  },
  "particleSize": {
    "type": "range",
    "min": 0.5,
    "max": 5.0,
    "default": 2.0,
    "step": 0.1,
    "label": "Tamaño de Partículas"
  },
  "trailLength": {
    "type": "range",
    "min": 0.0,
    "max": 1.0,
    "default": 0.3,
    "step": 0.05,
    "label": "Longitud de Estela"
  },
  "gravityWells": {
    "type": "range",
    "min": 0,
    "max": 5,
    "default": 2,
    "step": 1,
    "label": "Pozos Gravitacionales"
  },
  "orbitalRing": {
    "type": "boolean",
    "default": true,
    "label": "Anillo Orbital"
  },
  "ringEccentricity": {
    "type": "range",
    "min": 0.0,
    "max": 1.0,
    "default": 0.3,
    "step": 0.05,
    "label": "Excentricidad del Anillo",
    "dependsOn": "orbitalRing"
  }
}
```

**Reactividad al Audio:**
- **Waveform** → Modulación de órbitas individuales
- **Bass** → Tamaño de partículas y masa gravitacional
- **Mid** → Velocidad orbital general
- **Treble** → Brillo, color y dispersión de partículas
- **Beat** → Pulso expansivo que afecta todas las órbitas

---

### 6. GRIDWARP
**Categoría:** Mathematical Grid  
**Complejidad:** Media  
**Performance:** Bueno

**Descripción:**
Rejilla deformable con ondas sinusoidales que crean efectos de perspectiva y deformación espacial. Las líneas pueden tener perspectiva 3D simulada.

**Parámetros Configurables:**
```json
{
  "gridDensity": {
    "type": "select",
    "options": ["10x10", "20x20", "30x30", "50x50", "70x70", "100x100"],
    "default": "30x30",
    "label": "Densidad de Rejilla"
  },
  "warpIntensity": {
    "type": "range",
    "min": 0.1,
    "max": 2.0,
    "default": 1.0,
    "step": 0.1,
    "label": "Intensidad de Deformación"
  },
  "waveLayers": {
    "type": "range",
    "min": 1,
    "max": 4,
    "default": 2,
    "step": 1,
    "label": "Capas de Ondas"
  },
  "lineThickness": {
    "type": "range",
    "min": 0.5,
    "max": 5.0,
    "default": 1.5,
    "step": 0.1,
    "label": "Grosor de Líneas"
  },
  "perspective": {
    "type": "range",
    "min": 0.0,
    "max": 1.0,
    "default": 0.4,
    "step": 0.05,
    "label": "Perspectiva 3D"
  },
  "centerPulse": {
    "type": "boolean",
    "default": true,
    "label": "Pulso Central"
  },
  "gridColor": {
    "type": "select",
    "options": ["dynamic", "monochrome", "dual-tone"],
    "default": "dynamic",
    "label": "Esquema de Color"
  }
}
```

**Reactividad al Audio:**
- **Bass + Mid** → Amplitud de deformación
- **Treble** → Velocidad de ondas propagándose
- **Beat** → Pulso expansivo desde centro
- **Frequency** → Modulación direccional de la rejilla (X/Y)
- **Energy** → Intensidad general de perspective warp

---

### 7. STROBEBLOOM
**Categoría:** Organic Floral  
**Complejidad:** Media  
**Performance:** Bueno

**Descripción:**
Flores con pétalos que pulsan y efectos estroboscópicos suaves y controlados. Incluye limitador para prevenir epilepsia y ondas de choque radiales en beats fuertes.

**Parámetros Configurables:**
```json
{
  "petalCount": {
    "type": "range",
    "min": 6,
    "max": 20,
    "default": 10,
    "step": 1,
    "label": "Número de Pétalos"
  },
  "bloomIntensity": {
    "type": "range",
    "min": 0.1,
    "max": 2.0,
    "default": 1.2,
    "step": 0.1,
    "label": "Intensidad de Florecimiento"
  },
  "flashSensitivity": {
    "type": "range",
    "min": 0.1,
    "max": 1.0,
    "default": 0.6,
    "step": 0.05,
    "label": "Sensibilidad de Flash"
  },
  "flashLimiter": {
    "type": "boolean",
    "default": true,
    "label": "Limitador de Flash (Anti-epiléptico)"
  },
  "maxFlashIntensity": {
    "type": "range",
    "min": 0.1,
    "max": 0.5,
    "default": 0.22,
    "step": 0.02,
    "label": "Intensidad Máxima de Flash",
    "dependsOn": "flashLimiter"
  },
  "rotationSpeed": {
    "type": "range",
    "min": 0.1,
    "max": 2.0,
    "default": 0.6,
    "step": 0.1,
    "label": "Velocidad de Rotación"
  },
  "shockRings": {
    "type": "boolean",
    "default": true,
    "label": "Anillos de Choque"
  }
}
```

**Reactividad al Audio:**
- **Beat Detection** → Flash controlado (respeta limitador)
- **Bass** → Tamaño base de pétalos
- **Mid** → Velocidad de rotación
- **Treble** → Intensidad de colores y detalles
- **Energy Spikes** → Ondas de choque radiales (limitadas)

---

## 🚀 VISUALIZACIONES PLANIFICADAS (v1.1+)

### 8. NEURAL NETWORK
**Categoría:** AI-Inspired Abstract  
**Complejidad:** Alta  
**Performance:** Medio-Bajo

**Descripción:**
Red neuronal visual con nodos conectados por líneas que se iluminan según el flujo de "información" (audio). Los nodos pulsan y cambian de tamaño reactivamente.

**Parámetros Clave:**
- Node count, connection density, information flow speed
- Synaptic firing patterns, network topology
- Learning visualization (connections strengthen with repeated patterns)

**Reactividad:**
- **Frequency bands** → Different layers of the network
- **Beat** → Synaptic firing waves across network
- **Energy** → Overall network activation level

---

### 9. CONSTELLATION
**Categoría:** Astronomical  
**Complejidad:** Media  
**Performance:** Bueno

**Descripción:**
Campo de estrellas que forman constelaciones dinámicas. Las estrellas se conectan con líneas cuando la música alcanza ciertos umbrales, creando formas geométricas temporales.

**Parámetros Clave:**
- Star count, brightness variation, constellation complexity
- Connection threshold, line lifetime, twinkle effect

**Reactividad:**
- **Treble** → Star twinkle and brightness
- **Mid** → Constellation formation patterns  
- **Bass** → Gravitational clustering effects

---

### 10. LIQUID METAL
**Categoría:** Fluid Simulation  
**Complejidad:** Muy Alta  
**Performance:** Bajo (requiere WebGL)

**Descripción:**
Simulación de metal líquido con física realista. El "mercurio" reacciona a ondas sonoras, creando ondas, salpicaduras y formaciones esféricas.

**Parámetros Clave:**
- Viscosity, surface tension, gravity simulation
- Particle count, metaball rendering, reflection intensity

**Reactividad:**
- **Bass** → Large ripples and waves
- **Mid** → Surface disturbance intensity
- **Beat** → Droplet ejection and splash effects

---

### 11. FRACTAL MANDELBROT
**Categoría:** Mathematical Fractal  
**Complejidad:** Muy Alta  
**Performance:** Bajo (cálculo intensivo)

**Descripción:**
Exploración animada del conjunto de Mandelbrot con zoom y coloración reactivos al audio. Los parámetros del fractal cambian según las frecuencias.

**Parámetros Clave:**
- Zoom level, iteration count, color mapping
- Navigation path, rotation, Julia set morphing

**Reactividad:**
- **Bass** → Zoom speed and depth
- **Mid** → Color cycling and saturation
- **Treble** → Detail refinement and iteration count

---

### 12. DNA HELIX
**Categoría:** Biological Inspired  
**Complejidad:** Media-Alta  
**Performance:** Medio

**Descripción:**
Doble hélice de ADN que rota y se desenrolla reactivamente. Las "bases" (ATCG) se iluminan según diferentes bandas de frecuencia.

**Parámetros Clave:**
- Helix pitch, rotation speed, base pair density
- Unraveling intensity, genetic color coding

**Reactividad:**
- **4 Frequency bands** → 4 bases (A, T, C, G) illumination
- **Bass** → Helix unraveling and structural deformation
- **Beat** → Pulse traveling along the helix

---

### 13. AURORA BOREALIS
**Categoría:** Natural Phenomena  
**Complejidad:** Alta  
**Performance:** Medio

**Descripción:**
Simulación de aurora boreal con partículas que siguen líneas de campo magnético. Los colores y intensidad cambian según el espectro musical.

**Parámetros Clave:**
- Particle count, field line complexity, color zones
- Atmospheric layers, shimmer effect, horizon line

**Reactividad:**
- **Frequency spectrum** → Color zones (green, blue, purple, red)
- **Energy** → Particle intensity and movement speed
- **Beat** → Aurora "curtain" waves and flickers

---

### 14. MECHANICAL GEARS
**Categoría:** Steampunk Industrial  
**Complejidad:** Media  
**Performance:** Bueno

**Descripción:**
Sistema de engranajes mecánicos interconectados que giran a diferentes velocidades según el tempo. Steam effects y chispas opcionales en beats fuertes.

**Parámetros Clave:**
- Gear count, size ratios, connection complexity
- Steam density, spark effects, rust/metal textures

**Reactividad:**
- **BPM** → Base rotation speed of main gear
- **Bass** → Torque effects and gear strain visualization
- **Beat** → Spark bursts and steam puffs

---

### 15. QUANTUM FIELD
**Categoría:** Physics Simulation  
**Complejidad:** Muy Alta  
**Performance:** Bajo

**Descripción:**
Visualización de campo cuántico con partículas virtuales que aparecen y desaparecen. Efectos de interferencia y superposición basados en principios cuánticos.

**Parámetros Clave:**
- Quantum foam density, particle lifetime, wave interference
- Heisenberg uncertainty visualization, entanglement effects

**Reactividad:**
- **White noise/high freq** → Quantum foam activity
- **Beat** → Particle creation/annihilation events
- **Harmonics** → Standing wave patterns and interference

---

## 🎨 VISUALIZACIONES AVANZADAS (v2.0+)

### 16. MULTI-LAYER HYBRID
**Categoría:** Composite  
**Complejidad:** Variable  
**Performance:** Depends on layers

**Descripción:**
Combina 2-3 visualizaciones simultáneamente con blend modes personalizables. Permite crear efectos únicos mezclando diferentes categorías.

**Características:**
- Layer selection from any existing visualization
- Blend modes: Normal, Screen, Multiply, Overlay, Difference
- Individual opacity and parameter control per layer
- Cross-layer parameter linking (e.g., Tunnel speed affects Ribbons amplitude)

---

### 17. USER GENERATED (Plugin Template)
**Categoría:** Community Created  
**Complejidad:** Variable  
**Performance:** Variable

**Descripción:**
Template y herramientas para que usuarios creen sus propias visualizaciones usando una API simplificada.

**Herramientas incluidas:**
- Visual node editor para crear efectos sin código
- Shader editor básico para efectos WebGL
- Particle system designer
- Animation curve editor
- Real-time preview con audio test

---

### 18. AI GENERATIVE
**Categoría:** Machine Learning  
**Complejidad:** Muy Alta  
**Performance:** Variable (cloud)

**Descripción:**
IA que genera visualizaciones únicas en tiempo real basándose en el estilo musical detectado. Aprende de las preferencias del usuario.

**Características:**
- Style transfer from famous visual artists
- Genre-specific generation (electronic, classical, jazz, etc.)
- Mood-based visual generation
- User preference learning and adaptation

---

## 🎛️ PARÁMETROS GLOBALES

### Configuración que Afecta Todas las Visualizaciones

**Color System:**
```json
{
  "globalPalette": {
    "type": "select",
    "options": ["psychedelic", "neon", "pastel", "monochrome", "warm", "cool", "custom"],
    "default": "psychedelic"
  },
  "colorShiftMode": {
    "type": "select", 
    "options": ["energy-based", "time-based", "frequency-based", "beat-sync"],
    "default": "energy-based"
  },
  "saturation": {
    "type": "range",
    "min": 0.0,
    "max": 2.0,
    "default": 1.0,
    "step": 0.1
  },
  "brightness": {
    "type": "range",
    "min": 0.1,
    "max": 2.0,
    "default": 0.8,
    "step": 0.05
  }
}
```

**Performance & Quality:**
```json
{
  "globalSpeed": {
    "type": "range",
    "min": 0.1,
    "max": 3.0,
    "default": 1.0,
    "step": 0.1,
    "label": "Velocidad Global"
  },
  "qualityLevel": {
    "type": "select",
    "options": ["low", "medium", "high", "ultra"],
    "default": "high"
  },
  "motionBlur": {
    "type": "boolean",
    "default": false,
    "label": "Motion Blur (Experimental)"
  },
  "antiAliasing": {
    "type": "boolean", 
    "default": true
  }
}
```

**Audio Sensitivity:**
```json
{
  "bassGain": {
    "type": "range",
    "min": 0.0,
    "max": 3.0,
    "default": 1.0,
    "step": 0.1
  },
  "midGain": {
    "type": "range",
    "min": 0.0,
    "max": 3.0, 
    "default": 1.0,
    "step": 0.1
  },
  "trebleGain": {
    "type": "range",
    "min": 0.0,
    "max": 3.0,
    "default": 1.0,
    "step": 0.1
  },
  "beatSensitivity": {
    "type": "range",
    "min": 0.1,
    "max": 2.0,
    "default": 0.8,
    "step": 0.05
  }
}
```

---

## 🔄 SISTEMA DE TRANSICIONES

### Transiciones Entre Visualizaciones

**Tipos de Transición:**
1. **Fade** (default): Cross-fade suave de 200ms
2. **Slide**: Deslizamiento direccional 
3. **Zoom**: Zoom out → Zoom in con nueva visualización
4. **Morph**: Transformación gradual de una a otra (advanced)
5. **Cut**: Cambio instantáneo
6. **Beat-sync**: Cambio sincronizado con próximo beat detectado

**Parámetros de Transición:**
```json
{
  "transitionType": {
    "type": "select",
    "options": ["fade", "slide", "zoom", "morph", "cut", "beat-sync"],
    "default": "fade"
  },
  "transitionSpeed": {
    "type": "select",
    "options": ["instant", "fast", "normal", "slow"],
    "default": "normal"
  },
  "keepAudioContinuity": {
    "type": "boolean",
    "default": true,
    "description": "Mantener análisis de audio durante transición"
  }
}
```

---

## 🎯 ROADMAP DE IMPLEMENTACIÓN

### Fase 1 (v1.0): Core Visualizations
- [x] Tunnel (completado en prototipo)
- [x] Ribbons (completado en prototipo) 
- [x] Plasma (completado en prototipo)
- [x] Kaleido (completado en prototipo)
- [x] Orbitals (completado en prototipo)
- [x] GridWarp (completado en prototipo)
- [x] StrobeBloom (completado en prototipo)

### Fase 2 (v1.1): Enhanced Features
- [ ] Neural Network
- [ ] Constellation
- [ ] DNA Helix
- [ ] Parámetros globales de color
- [ ] Sistema de transiciones mejorado

### Fase 3 (v1.2): Advanced Visuals
- [ ] Liquid Metal (WebGL required)
- [ ] Fractal Mandelbrot
- [ ] Aurora Borealis
- [ ] Mechanical Gears

### Fase 4 (v2.0): Next Generation
- [ ] Multi-layer Hybrid system
- [ ] User Generated visualization tools
- [ ] Quantum Field simulation
- [ ] AI Generative visualizations

---

## 📊 CRITERIOS DE EVALUACIÓN

### Performance Targets por Categoría

**Óptimo** (60+ FPS en hardware medio):
- Tunnel, Ribbons, GridWarp, StrobeBloom

**Bueno** (45-60 FPS en hardware medio):
- Plasma, Constellation, Mechanical Gears

**Medio** (30-45 FPS en hardware medio):
- Kaleido, Orbitals, Aurora Borealis, DNA Helix

**Exigente** (30+ FPS solo en hardware alto):
- Neural Network, Liquid Metal, Fractal Mandelbrot, Quantum Field

### Quality Assurance Checklist

Para cada visualización:
- [ ] 60 FPS en desktop moderno (últimos 3 años)
- [ ] 30+ FPS en tablet/móvil moderno
- [ ] Todos los parámetros responden en tiempo real
- [ ] No memory leaks durante 30+ minutos de uso
- [ ] Reactividad clara y satisfactoria al audio
- [ ] Colores no causan fatiga visual
- [ ] Sin efectos que puedan causar epilepsia (strobe limitado)
- [ ] Graceful degradation en hardware limitado

---

*Este documento evoluciona constantemente. Nuevas visualizaciones se añaden basándose en feedback de usuarios, capacidades técnicas disponibles y tendencias creativas.*