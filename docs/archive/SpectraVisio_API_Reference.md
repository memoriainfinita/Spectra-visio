# SpectraVisio - API Reference Documentation

**Versión:** 1.0  
**Fecha:** Enero 6, 2026  
**Autor:** [Tu Nombre]  
**Estado:** Draft

---

## 📖 Propósito del Documento

Documentación completa de **todas las APIs** de SpectraVisio:
- 🏗️ **Core APIs** - Clases principales y métodos
- 🔌 **Plugin APIs** - Interfaz para desarrollo de plugins  
- 🎵 **Audio APIs** - Sistema de análisis de audio
- 🎨 **Rendering APIs** - Canvas y efectos visuales
- 📊 **Performance APIs** - Monitoring y optimización

---

## 🏗️ CORE API

### SpectraVisio (Main Class)

#### Constructor
```javascript
const spectra = new SpectraVisio(canvasElement, options);
```

**Parameters:**
- `canvasElement` (HTMLCanvasElement) - Canvas donde renderizar
- `options` (Object, optional) - Configuración inicial

**Options:**
```javascript
{
  audioSource: 'microphone', // 'microphone', 'file', 'stream'
  initialPlugin: 'tunnel',   // Plugin inicial
  performanceMode: 'auto',   // 'auto', 'high', 'balanced', 'battery'
  enableLayers: true,        // Sistema de capas
  maxLayers: 4,             // Máximo capas simultáneas
  debugMode: false          // Modo debug
}
```

#### Métodos Públicos

##### `async init()`
Inicializa SpectraVisio y todos sus componentes.

```javascript
await spectra.init();
```

**Returns:** `Promise<void>`  
**Throws:** `Error` si falla la inicialización

##### `async setPlugin(pluginId, config)`
Cambia el plugin activo.

```javascript
await spectra.setPlugin('plasma', { 
  color: '#ff0000', 
  intensity: 0.8 
});
```

**Parameters:**
- `pluginId` (string) - ID del plugin
- `config` (Object, optional) - Configuración del plugin

**Returns:** `Promise<void>`  
**Events:** Emite `pluginChanged`

##### `start()` / `stop()` / `pause()` / `resume()`
Control de reproducción.

```javascript
spectra.start();    // Inicia la visualización
spectra.stop();     // Para completamente
spectra.pause();    // Pausa manteniendo estado
spectra.resume();   // Reanuda desde pausa
```

**Returns:** `void`  
**Events:** Emite `stateChanged`

##### `setAudioSource(source, options)`
Cambia la fuente de audio.

```javascript
// Micrófono
await spectra.setAudioSource('microphone');

// Archivo
await spectra.setAudioSource('file', { file: audioFile });

// Stream URL
await spectra.setAudioSource('stream', { url: 'http://...' });
```

**Parameters:**
- `source` (string) - Tipo de fuente: 'microphone', 'file', 'stream'
- `options` (Object, optional) - Opciones específicas de la fuente

**Returns:** `Promise<void>`

##### `updateParameter(key, value)`
Actualiza parámetro del plugin activo.

```javascript
spectra.updateParameter('speed', 1.5);
spectra.updateParameter('color', '#00ff00');
```

**Parameters:**
- `key` (string) - Nombre del parámetro
- `value` (any) - Nuevo valor

**Returns:** `void`

##### `captureFrame()` / `captureVideo(duration)`
Captura de frames o video.

```javascript
// Captura frame actual
const imageBlob = await spectra.captureFrame('image/png');

// Captura video de 10 segundos
const videoBlob = await spectra.captureVideo(10000);
```

**Returns:** `Promise<Blob>`

#### Events

```javascript
// Estado de la aplicación
spectra.on('initialized', () => {});
spectra.on('stateChanged', (state) => {}); // 'playing', 'paused', 'stopped'
spectra.on('error', (error) => {});

// Plugins
spectra.on('pluginChanged', ({ oldPlugin, newPlugin }) => {});
spectra.on('pluginsLoaded', (pluginList) => {});

// Audio
spectra.on('audioConnected', (source) => {});
spectra.on('audioDisconnected', () => {});
spectra.on('beatDetected', ({ intensity, bpm }) => {});

// Performance
spectra.on('performanceWarning', ({ fps, memoryUsage }) => {});
spectra.on('adaptiveQualityChange', ({ level, reason }) => {});
```

---

## 🔌 PLUGIN API

### BaseVisualizer (Abstract Class)

Clase base que deben extender todos los plugins.

```javascript
class MyPlugin extends BaseVisualizer {
  constructor(canvas, config = {}) {
    super(canvas, config);
  }
}
```

#### Métodos Abstractos (Obligatorios)

##### `async init()`
Inicialización del plugin.

```javascript
async init() {
  // Cargar recursos, configurar estado inicial
  await this.loadTextures();
  this.setupParticleSystem();
  this.isInitialized = true;
}
```

##### `render(audioData, deltaTime)`
Render principal del plugin.

```javascript
render(audioData, deltaTime) {
  if (!this.isInitialized) return;
  
  // Usar audioData para controlar visualización
  const bassIntensity = audioData.frequencyBands.bass;
  this.updateVisualization(bassIntensity, deltaTime);
}
```

**Parameters:**
- `audioData` (AudioData) - Datos de análisis de audio
- `deltaTime` (number) - Tiempo transcurrido desde último frame (ms)

#### Métodos Opcionales (Override)

##### `resize(width, height)`
Manejo de cambio de tamaño.

```javascript
resize(width, height) {
  super.resize(width, height);
  this.updateViewport(width, height);
}
```

##### `onParameterChange(key, value)`
Reacción a cambios de parámetros.

```javascript
onParameterChange(key, value) {
  super.onParameterChange(key, value);
  
  switch (key) {
    case 'speed':
      this.animationSpeed = value;
      break;
    case 'color':
      this.updateColorPalette(value);
      break;
  }
}
```

##### `onBeat(intensity)`
Reacción específica a beats detectados.

```javascript
onBeat(intensity) {
  this.triggerBeatEffect(intensity);
  this.flashIntensity = intensity;
}
```

#### Métodos de Utilidad Disponibles

##### `fade(alpha)`
Aplica efecto de trail/fade.

```javascript
this.fade(0.1); // Trail suave
this.fade(1.0); // Limpiar completamente
```

##### `mapRange(value, inMin, inMax, outMin, outMax)`
Mapea valor entre rangos.

```javascript
const size = this.mapRange(bassLevel, 0, 1, 10, 100);
```

##### `hslToRgb(h, s, l)` / `rgbToHsl(r, g, b)`
Conversiones de color.

```javascript
const [r, g, b] = this.hslToRgb(hue, 1, 0.5);
```

#### Plugin Metadata

```javascript
class MyPlugin extends BaseVisualizer {
  constructor(canvas, config) {
    super(canvas, config);
    
    // Metadata obligatorio
    this.name = 'My Plugin Name';
    this.version = '1.0.0';
    this.author = 'Author Name';
    this.description = 'Plugin description';
    this.category = 'abstract'; // abstract, geometric, particle, nature
    this.tags = ['colorful', 'reactive', 'smooth'];
    
    // Performance info
    this.performance = {
      complexity: 'medium',
      targetFPS: 60,
      memoryUsage: 'low'
    };
  }
  
  getDefaultConfig() {
    return {
      speed: 1.0,
      color: '#ff6b6b',
      intensity: 0.8
    };
  }
  
  getParameterDefinitions() {
    return {
      speed: {
        type: 'range',
        min: 0.1,
        max: 5.0,
        step: 0.1,
        default: 1.0,
        label: 'Animation Speed',
        description: 'Controls animation speed'
      },
      color: {
        type: 'color',
        default: '#ff6b6b',
        label: 'Primary Color'
      },
      intensity: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        default: 0.8,
        label: 'Effect Intensity'
      }
    };
  }
}
```

---

## 🎵 AUDIO API

### AudioData Interface

Estructura de datos que reciben todos los plugins:

```typescript
interface AudioData {
  // Raw FFT data
  frequencyData: Uint8Array;        // Frequency domain data (0-255)
  timedomainData: Uint8Array;       // Time domain data (0-255)
  
  // Basic frequency analysis (0-1)
  bass: number;                     // Combined bass frequencies
  mid: number;                      // Combined mid frequencies  
  treble: number;                   // Combined treble frequencies
  energy: number;                   // Overall energy level
  
  // 7-band frequency analysis (0-1)
  frequencyBands: {
    subBass: number;                // 20-60Hz
    bass: number;                   // 60-250Hz
    lowMid: number;                 // 250-500Hz
    mid: number;                    // 500-2kHz
    highMid: number;                // 2-5kHz
    treble: number;                 // 5-12kHz
    air: number;                    // 12-20kHz
  };
  
  // Beat detection
  beatInfo: {
    detected: boolean;              // Beat detected this frame
    intensity: number;              // Beat intensity (0-1)
    bpm: number;                    // Estimated BPM
    confidence: number;             // BPM confidence (0-1)
    timeSinceLastBeat: number;      // Milliseconds since last beat
  };
  
  // Stereo field analysis
  stereoInfo: {
    left: number;                   // Left channel energy (0-1)
    right: number;                  // Right channel energy (0-1)
    center: number;                 // Center/mono energy (0-1)
    width: number;                  // Stereo width (0-1)
    correlation: number;            // L/R correlation (-1 to 1)
    balance: number;                // L/R balance (-1 to 1)
  };
  
  // Reactive elements (advanced analysis)
  reactiveData: {
    kickDetected: boolean;          // Kick drum detection
    snareDetected: boolean;         // Snare detection
    hihatActivity: number;          // Hi-hat activity level (0-1)
    vocalPresence: number;          // Vocal frequency presence (0-1)
    transientIntensity: number;     // Transient detection (0-1)
    harmonicContent: number;        // Harmonic vs noise (0-1)
  };
  
  // Metadata
  timestamp: number;                // Performance.now() timestamp
  sampleRate: number;               // Audio sample rate
  bufferSize: number;               // Analysis buffer size
  volume: number;                   // Overall volume (0-1)
  peakFrequency: number;            // Dominant frequency (Hz)
}
```

### AudioEngine Methods

#### `connectMicrophone()`
```javascript
await audioEngine.connectMicrophone();
```

#### `loadAudioFile(file)`
```javascript
const audioFile = document.getElementById('audioInput').files[0];
await audioEngine.loadAudioFile(audioFile);
```

#### `connectStream(url)`
```javascript
await audioEngine.connectStream('https://example.com/stream.mp3');
```

#### `setGain(value)`
```javascript
audioEngine.setGain(0.8); // 80% gain
```

#### `setBeatSensitivity(value)`
```javascript
audioEngine.setBeatSensitivity(0.7); // 70% sensitivity
```

---

## 🎨 RENDERING API

### Canvas Extensions

Métodos adicionales disponibles en el contexto de canvas:

#### `drawReactiveCircle(x, y, radius, audioData)`
```javascript
this.drawReactiveCircle(400, 300, 50, audioData);
```

#### `drawFrequencyBars(x, y, width, height, audioData)`
```javascript
this.drawFrequencyBars(0, 500, 800, 100, audioData);
```

#### `applyAudioColorMap(baseColor, audioData)`
```javascript
const reactiveColor = this.applyAudioColorMap('#ff0000', audioData);
```

### Layer System API

#### `addLayer(pluginId, config)`
```javascript
const layerId = layerManager.addLayer('plasma', {
  opacity: 0.7,
  blendMode: 'multiply'
});
```

#### `setLayerOpacity(layerId, opacity)`
```javascript
layerManager.setLayerOpacity(layerId, 0.5);
```

#### `setLayerBlendMode(layerId, mode)`
```javascript
// Available blend modes: normal, multiply, screen, overlay, 
// soft-light, hard-light, color-dodge, color-burn, darken, 
// lighten, difference, exclusion
layerManager.setLayerBlendMode(layerId, 'screen');
```

---

## 📊 PERFORMANCE API

### PerformanceMonitor Methods

#### `getCurrentFPS()`
```javascript
const fps = performanceMonitor.getCurrentFPS();
```

#### `getMemoryUsage()`
```javascript
const memInfo = performanceMonitor.getMemoryUsage();
// { used: 50.2, total: 100.0, percentage: 50.2 }
```

#### `getPerformanceMetrics()`
```javascript
const metrics = performanceMonitor.getPerformanceMetrics();
/*
{
  fps: 59.8,
  frameTime: 16.7,
  renderTime: 8.3,
  audioProcessTime: 2.1,
  memoryUsage: 45.6,
  gpuUsage: 23.4,
  droppedFrames: 2
}
*/
```

#### `setPerformanceTarget(target)`
```javascript
// Targets: 'battery', 'balanced', 'performance', 'unlimited'
performanceMonitor.setPerformanceTarget('balanced');
```

### Adaptive Quality API

#### `setQualityLevel(level)`
```javascript
// Level: 0.25 (lowest) to 1.0 (highest)
adaptiveQuality.setQualityLevel(0.75);
```

#### `enableAutoAdjustment(enable)`
```javascript
adaptiveQuality.enableAutoAdjustment(true);
```

---

## 🎬 SCENE MANAGEMENT API

### SceneManager Methods

#### `captureScene(name, description)`
```javascript
const sceneId = sceneManager.captureScene(
  'Epic Drop', 
  'Perfect for bass drops'
);
```

#### `recallScene(sceneId, transition)`
```javascript
await sceneManager.recallScene(sceneId, {
  type: 'fade',        // 'fade', 'cut', 'crossfade'
  duration: 500        // milliseconds
});
```

#### `listScenes()`
```javascript
const scenes = sceneManager.listScenes();
/*
[
  {
    id: 'scene_123',
    name: 'Epic Drop',
    description: 'Perfect for bass drops',
    timestamp: '2026-01-06T10:30:00.000Z',
    pluginId: 'plasma',
    pluginConfig: { ... }
  }
]
*/
```

### Crossfader API

#### `enableCrossfader(sceneA, sceneB)`
```javascript
sceneManager.enableCrossfader('scene_1', 'scene_2');
```

#### `setCrossfaderPosition(position)`
```javascript
// Position: 0.0 (full scene A) to 1.0 (full scene B)
sceneManager.setCrossfaderPosition(0.3);
```

#### `setCrossfaderCurve(curve)`
```javascript
// Curves: 'linear', 'logarithmic', 's-curve'
sceneManager.setCrossfaderCurve('s-curve');
```

---

## 🎹 KEYBOARD API

### KeyboardHandler Events

```javascript
// Bind keyboard shortcuts
keyboardHandler.bind('Space', () => spectra.togglePlayPause());
keyboardHandler.bind('1-8', (key) => spectra.recallScene(`scene_${key}`));
keyboardHandler.bind('ArrowUp', () => spectra.updateParameter('intensity', '+0.1'));
keyboardHandler.bind('ArrowDown', () => spectra.updateParameter('intensity', '-0.1'));

// MIDI-style shortcuts
keyboardHandler.bind('q-p', (key) => spectra.setPlugin(getPluginForKey(key)));
```

---

## 🔧 CONFIGURATION API

### ConfigManager Methods

#### `savePreset(name, config)`
```javascript
const config = {
  plugin: 'tunnel',
  parameters: { speed: 1.5, color: '#ff0000' },
  layers: [...],
  audio: { gain: 0.8, sensitivity: 0.7 }
};

configManager.savePreset('My Favorite Setup', config);
```

#### `loadPreset(name)`
```javascript
await configManager.loadPreset('My Favorite Setup');
```

#### `exportConfig()`
```javascript
const configJSON = configManager.exportConfig();
// Guardar o compartir JSON
```

#### `importConfig(configJSON)`
```javascript
await configManager.importConfig(configJSON);
```

---

## 🌐 PLUGIN DISCOVERY API

### PluginManager Discovery

#### `discoverPlugins()`
```javascript
await pluginManager.discoverPlugins();
```

#### `getAvailablePlugins()`
```javascript
const plugins = pluginManager.getAvailablePlugins();
/*
[
  {
    id: 'tunnel',
    name: 'Tunnel',
    category: 'abstract',
    performance: 'medium',
    loaded: true
  }
]
*/
```

#### `loadPlugin(pluginId)`
```javascript
const plugin = await pluginManager.loadPlugin('plasma');
```

#### `getPluginInfo(pluginId)`
```javascript
const info = pluginManager.getPluginInfo('tunnel');
/*
{
  id: 'tunnel',
  name: 'Tunnel',
  version: '1.0.0',
  author: 'SpectraVisio Team',
  description: 'Immersive tunnel visualization',
  parameters: { ... },
  performance: { complexity: 'medium', targetFPS: 60 }
}
*/
```

---

## 📱 MOBILE API

### Mobile Optimizations

#### `setMobileMode(enabled)`
```javascript
spectra.setMobileMode(true);
// Automatically reduces quality and disables intensive features
```

#### `enableTouchControls()`
```javascript
mobileHandler.enableTouchControls({
  swipeToChangePlugin: true,
  pinchToZoom: false,
  twoFingerRotate: true
});
```

#### `enableDeviceMotion()`
```javascript
motionHandler.enableDeviceMotion({
  tilt: true,      // Use device tilt for effects
  shake: true,     // Detect shake gestures
  rotation: false  // Use device rotation
});
```

---

## 🔍 DEBUG API

### Debug Methods

#### `enableDebugMode()`
```javascript
spectra.enableDebugMode();
// Shows FPS, memory usage, audio levels overlay
```

#### `getDebugInfo()`
```javascript
const debug = spectra.getDebugInfo();
/*
{
  performance: { fps: 60, renderTime: 8.2 },
  audio: { connected: true, volume: 0.65 },
  plugin: { active: 'tunnel', renderTime: 3.1 },
  memory: { used: 45.2, jsHeap: 23.1 }
}
*/
```

#### `enablePerformanceProfiling()`
```javascript
spectra.enablePerformanceProfiling();
// Detailed performance metrics collection
```

---

## 📋 TYPE DEFINITIONS

### TypeScript Definitions

```typescript
// Main interface
interface SpectraVisioOptions {
  audioSource?: 'microphone' | 'file' | 'stream';
  initialPlugin?: string;
  performanceMode?: 'auto' | 'high' | 'balanced' | 'battery';
  enableLayers?: boolean;
  maxLayers?: number;
  debugMode?: boolean;
}

// Plugin parameter types
type ParameterType = 'range' | 'select' | 'boolean' | 'color' | 'text';
type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' 
               | 'hard-light' | 'color-dodge' | 'color-burn' | 'darken' 
               | 'lighten' | 'difference' | 'exclusion';

// Performance levels
type PerformanceComplexity = 'low' | 'medium' | 'high' | 'extreme';
type PerformanceMode = 'battery' | 'balanced' | 'performance' | 'unlimited';

// Event types
type SpectraEvent = 'initialized' | 'stateChanged' | 'pluginChanged' 
                  | 'audioConnected' | 'beatDetected' | 'performanceWarning';
```

---

**Notas de Uso:**
- 🔄 Esta API es **retrocompatible** - nuevas versiones no romperán código existente
- 📱 Todos los métodos incluyen **soporte móvil** optimizado
- ⚡ Métodos críticos de performance están **optimizados** y no bloquean el UI thread
- 🎯 Validación automática de parámetros con **error reporting** descriptivo

*Documentación actualizada para SpectraVisio v1.0*