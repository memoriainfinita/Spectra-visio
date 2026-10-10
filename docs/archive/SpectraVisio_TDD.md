# SpectraVisio - Technical Design Document (TDD)

**Versión:** 1.0  
**Fecha:** Enero 6, 2026  
**Autor:** [Tu Nombre]  
**Estado:** Draft

---

## 📖 Propósito del Documento

Este documento define la **arquitectura técnica completa** de SpectraVisio, incluyendo:
- 🏗️ **Arquitectura de alto nivel** y patrones de diseño
- 📦 **Estructura de módulos** y dependencias
- 🔄 **Flujos de datos** y comunicación entre componentes
- 📝 **Interfaces y APIs** internas
- 🎯 **Decisiones técnicas** y justificaciones

---

## 🏗️ ARQUITECTURA DE ALTO NIVEL

### Diagrama de Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    SpectraVisio Core                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │     UI      │  │    Audio    │  │   Plugin    │         │
│  │ Controller  │  │   Engine    │  │  Manager    │         │
│  │             │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                 │                 │              │
│         └─────────────────┼─────────────────┘              │
│                           │                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Config    │  │    Scene    │  │ Performance │         │
│  │  Manager    │  │   Manager   │  │   Monitor   │         │
│  │             │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                     Canvas Renderer                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Plugin    │  │   Plugin    │  │   Plugin    │         │
│  │   Tunnel    │  │  Ribbons    │  │   Plasma    │   ...   │
│  │             │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Patrón de Arquitectura: **Modular Plugin-Based**

**Ventajas:**
- ✅ Escalabilidad: Fácil añadir nuevas visualizaciones
- ✅ Mantenibilidad: Componentes independientes
- ✅ Testing: Cada módulo se puede testear por separado
- ✅ Performance: Carga lazy de plugins
- ✅ Comunidad: API clara para desarrolladores externos

---

## 📦 ESTRUCTURA DE MÓDULOS

### Organización de Archivos

```
src/
├── core/
│   ├── SpectraVisio.js           # Clase principal/orquestador
│   ├── AudioEngine.js            # Motor de análisis de audio
│   ├── PluginManager.js          # Gestión de plugins
│   ├── ConfigManager.js          # Configuración y presets
│   ├── SceneManager.js           # Snapshots y crossfader
│   ├── PerformanceMonitor.js     # Monitor de rendimiento
│   └── CanvasRenderer.js         # Renderizado optimizado
├── plugins/
│   ├── BaseVisualizer.js         # Clase base abstracta
│   ├── tunnel/
│   │   ├── TunnelVisualizer.js   # Implementación
│   │   ├── config.json           # Metadatos
│   │   └── thumbnail.png         # Preview
│   └── [otros plugins...]
├── ui/
│   ├── UIController.js           # Control de interfaz
│   ├── KeyboardHandler.js        # Gestión de teclado
│   ├── ControlPanel.js           # Panel de configuración
│   ├── ScenePanel.js             # Panel de scenes
│   ├── PerformancePanel.js       # Panel de performance
│   └── components/               # Componentes UI reutilizables
├── audio/
│   ├── AudioAnalyzer.js          # Análisis FFT y frecuencias
│   ├── BeatDetector.js           # Detección de beats
│   ├── FrequencySplitter.js      # Splitting de bandas
│   ├── StereoAnalyzer.js         # Análisis estéreo
│   └── ReactiveElements.js       # Elementos reactivos
├── utils/
│   ├── MathUtils.js              # Utilidades matemáticas
│   ├── ColorUtils.js             # Utilidades de color
│   ├── PerformanceUtils.js       # Optimizaciones
│   └── EventEmitter.js           # Sistema de eventos
└── layers/
    ├── LayerManager.js           # Gestión de capas
    ├── BlendModes.js             # Modos de mezcla
    └── LayerRenderer.js          # Renderizado de capas
```

---

## 🔄 FLUJO DE DATOS Y COMUNICACIÓN

### 1. Flujo Principal de Audio

```
[Audio Input] → [AudioEngine] → [AudioAnalyzer] → [AudioData]
                                      ↓
[FrequencySplitter] → [BeatDetector] → [StereoAnalyzer]
                                      ↓
[ReactiveElements] → [Plugin Active] → [Canvas Render]
```

### 2. Sistema de Eventos

```javascript
// EventEmitter centralizado para comunicación loose-coupled
const eventBus = new EventEmitter();

// Ejemplo de flujo:
AudioEngine.emit('audioData', audioData);
PluginManager.on('audioData', (data) => updateActivePlugin(data));
PerformanceMonitor.on('fpsWarning', () => reduceQuality());
SceneManager.emit('sceneChange', newScene);
```

### 3. Estado Global Compartido

```javascript
// Singleton para estado global
class AppState {
  constructor() {
    this.currentPlugin = null;
    this.audioSettings = {};
    this.performanceConfig = {};
    this.layerConfig = {};
    this.sceneConfig = {};
  }
  
  // Método para observers/subscriptions
  subscribe(key, callback) { /* ... */ }
  setState(key, value) { /* ... */ }
}
```

---

## 🎯 CLASES PRINCIPALES

### SpectraVisio (Main Orchestrator)

```javascript
class SpectraVisio {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    
    // Inicializar componentes core
    this.audioEngine = new AudioEngine();
    this.pluginManager = new PluginManager(this.canvas);
    this.configManager = new ConfigManager();
    this.sceneManager = new SceneManager();
    this.performanceMonitor = new PerformanceMonitor();
    this.uiController = new UIController();
    this.layerManager = new LayerManager(this.canvas);
    
    // Estado interno
    this.isRunning = false;
    this.currentPlugin = null;
    this.animationId = null;
    
    // Inicialización
    this.init();
  }

  async init() {
    await this.setupAudio();
    await this.loadPlugins();
    this.setupEventListeners();
    this.setupKeyboardControls();
    this.startRenderLoop();
  }

  // Render loop principal
  render(timestamp) {
    if (!this.isRunning) return;
    
    // Análisis de audio
    const audioData = this.audioEngine.getAnalysisData();
    
    // Performance monitoring
    this.performanceMonitor.startFrame();
    
    // Render layers/plugin
    this.layerManager.render(audioData, timestamp);
    
    // Performance monitoring
    this.performanceMonitor.endFrame();
    
    this.animationId = requestAnimationFrame(this.render.bind(this));
  }

  // API pública
  setPlugin(pluginId) { /* ... */ }
  setScene(sceneId) { /* ... */ }
  togglePlayPause() { /* ... */ }
  // ...
}
```

### AudioEngine (Core Audio Processing)

```javascript
class AudioEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.context = null;
    this.analyser = null;
    this.source = null;
    this.inputType = 'microphone'; // microphone, file, stream
    
    // Análisis modules
    this.audioAnalyzer = new AudioAnalyzer();
    this.beatDetector = new BeatDetector();
    this.frequencySplitter = new FrequencySplitter();
    this.stereoAnalyzer = new StereoAnalyzer();
    this.reactiveElements = new ReactiveElements();
    
    // Configuración
    this.config = {
      fftSize: 2048,
      smoothingTimeConstant: 0.85,
      sampleRate: 44100,
      ...options
    };
  }

  async initialize() {
    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = this.config.fftSize;
    this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
    
    // Configurar módulos de análisis
    await this.setupAnalysisModules();
  }

  async connectMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.context.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      this.inputType = 'microphone';
      this.emit('connected', 'microphone');
    } catch (error) {
      this.emit('error', error);
    }
  }

  getAnalysisData() {
    if (!this.analyser) return null;
    
    // Raw data
    const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    const timedomainData = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteFrequencyData(frequencyData);
    this.analyser.getByteTimeDomainData(timedomainData);
    
    // Processed analysis
    const basicAnalysis = this.audioAnalyzer.analyze(frequencyData);
    const frequencyBands = this.frequencySplitter.splitBands(frequencyData);
    const beatInfo = this.beatDetector.analyze(basicAnalysis.energy);
    const stereoInfo = this.stereoAnalyzer.analyze(timedomainData);
    const reactiveData = this.reactiveElements.analyze(frequencyBands, beatInfo);
    
    return {
      // Raw data
      frequencyData,
      timedomainData,
      
      // Basic analysis
      ...basicAnalysis, // bass, mid, treble, energy
      
      // Advanced analysis
      frequencyBands, // 7 custom bands
      beatInfo,       // beat detection + BPM
      stereoInfo,     // L/R analysis + panning
      reactiveData,   // frequency-specific elements
      
      // Metadata
      timestamp: performance.now(),
      sampleRate: this.context.sampleRate
    };
  }

  // Methods for different input types
  async loadAudioFile(file) { /* ... */ }
  async connectToStream(url) { /* ... */ }
  setGain(value) { /* ... */ }
  setBPM(bpm) { /* ... */ }
}
```

### PluginManager (Plugin Lifecycle)

```javascript
class PluginManager extends EventEmitter {
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.plugins = new Map(); // Available plugins
    this.activePlugin = null;
    this.pluginConfigs = new Map(); // Per-plugin configurations
    
    this.loadingQueue = [];
    this.isLoading = false;
  }

  async discoverPlugins() {
    // Scan plugins directory and load metadata
    const pluginDirs = await this.scanPluginDirectory();
    
    for (const dir of pluginDirs) {
      try {
        const config = await this.loadPluginConfig(dir);
        if (this.validatePluginConfig(config)) {
          this.plugins.set(config.id, {
            config,
            loaded: false,
            instance: null,
            path: dir
          });
        }
      } catch (error) {
        console.warn(`Plugin ${dir} failed to load:`, error);
      }
    }
    
    this.emit('pluginsDiscovered', Array.from(this.plugins.keys()));
  }

  async loadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin ${pluginId} not found`);
    
    if (!plugin.loaded) {
      // Dynamic import
      const module = await import(`./plugins/${plugin.path}/index.js`);
      const PluginClass = module.default;
      
      // Validation
      if (!this.validatePluginClass(PluginClass)) {
        throw new Error(`Plugin ${pluginId} doesn't implement BaseVisualizer`);
      }
      
      plugin.class = PluginClass;
      plugin.loaded = true;
    }
    
    return plugin;
  }

  async setActivePlugin(pluginId, config = {}) {
    // Cleanup previous plugin
    if (this.activePlugin) {
      this.activePlugin.destroy();
      this.activePlugin = null;
    }
    
    // Load and instantiate new plugin
    const plugin = await this.loadPlugin(pluginId);
    const pluginConfig = { ...plugin.config.defaultParams, ...config };
    
    this.activePlugin = new plugin.class(this.canvas, pluginConfig);
    await this.activePlugin.init();
    
    // Store current config
    this.pluginConfigs.set(pluginId, pluginConfig);
    
    this.emit('pluginChanged', pluginId, this.activePlugin);
  }

  render(audioData, deltaTime) {
    if (this.activePlugin) {
      this.activePlugin.render(audioData, deltaTime);
    }
  }

  // Plugin configuration
  updatePluginParameter(key, value) {
    if (this.activePlugin) {
      this.activePlugin.onParameterChange(key, value);
      
      // Update stored config
      const pluginId = this.activePlugin.constructor.name;
      const config = this.pluginConfigs.get(pluginId) || {};
      config[key] = value;
      this.pluginConfigs.set(pluginId, config);
    }
  }

  getPluginParameters(pluginId) {
    const plugin = this.plugins.get(pluginId);
    return plugin ? plugin.config.parameters : {};
  }
}
```

### BaseVisualizer (Abstract Plugin Interface)

```javascript
class BaseVisualizer {
  constructor(canvas, config = {}) {
    if (new.target === BaseVisualizer) {
      throw new Error('BaseVisualizer is abstract and cannot be instantiated');
    }
    
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = { ...this.getDefaultConfig(), ...config };
    
    // Plugin metadata (must be overridden)
    this.name = 'Unknown';
    this.version = '1.0.0';
    this.author = 'Anonymous';
    
    // Internal state
    this.isInitialized = false;
    this.lastRenderTime = 0;
  }

  // Abstract methods (must be implemented by plugins)
  async init() {
    throw new Error('init() must be implemented by plugin');
  }

  render(audioData, deltaTime) {
    throw new Error('render() must be implemented by plugin');
  }

  destroy() {
    // Default cleanup - can be overridden
    this.isInitialized = false;
  }

  resize(width, height) {
    // Default resize behavior - can be overridden
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  // Optional methods
  onParameterChange(key, value) {
    this.config[key] = value;
  }

  onBeat(intensity) {
    // Override to handle beat detection
  }

  getDefaultConfig() {
    return {}; // Override to provide default parameters
  }

  getParameterDefinitions() {
    return {}; // Override to define UI parameters
  }

  // Utility methods available to all plugins
  fade(alpha) {
    this.ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  mapFrequencyToBin(frequency, sampleRate, fftSize) {
    return Math.round(frequency / (sampleRate / 2) * (fftSize / 2));
  }
}
```

### LayerManager (Multi-Layer Rendering)

```javascript
class LayerManager extends EventEmitter {
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.layers = []; // Array of layer configurations
    this.maxLayers = 4;
    this.blendModes = new BlendModes();
    
    // Temporary canvases for layer composition
    this.layerCanvases = [];
    this.compositeCanvas = document.createElement('canvas');
    this.compositeCtx = this.compositeCanvas.getContext('2d');
  }

  addLayer(pluginId, config = {}) {
    if (this.layers.length >= this.maxLayers) {
      throw new Error(`Maximum ${this.maxLayers} layers allowed`);
    }
    
    const layer = {
      id: `layer_${Date.now()}`,
      pluginId,
      config,
      opacity: config.opacity || 1.0,
      blendMode: config.blendMode || 'normal',
      enabled: true,
      plugin: null // Will be loaded lazily
    };
    
    this.layers.push(layer);
    this.emit('layerAdded', layer);
    return layer.id;
  }

  async render(audioData, deltaTime) {
    if (this.layers.length === 0) return;
    
    // Ensure we have enough temporary canvases
    this.ensureLayerCanvases();
    
    // Render each layer to its own canvas
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (!layer.enabled) continue;
      
      await this.renderLayer(layer, i, audioData, deltaTime);
    }
    
    // Composite layers to main canvas
    this.compositeLayers();
  }

  async renderLayer(layer, index, audioData, deltaTime) {
    // Load plugin if not already loaded
    if (!layer.plugin) {
      layer.plugin = await this.loadLayerPlugin(layer.pluginId, layer.config);
    }
    
    const layerCanvas = this.layerCanvases[index];
    const layerCtx = layerCanvas.getContext('2d');
    
    // Backup current canvas context
    const originalCanvas = layer.plugin.canvas;
    const originalCtx = layer.plugin.ctx;
    
    // Redirect plugin to layer canvas
    layer.plugin.canvas = layerCanvas;
    layer.plugin.ctx = layerCtx;
    
    // Render plugin
    layer.plugin.render(audioData, deltaTime);
    
    // Restore original context
    layer.plugin.canvas = originalCanvas;
    layer.plugin.ctx = originalCtx;
  }

  compositeLayers() {
    // Clear main canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Composite layers in order
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (!layer.enabled) continue;
      
      const layerCanvas = this.layerCanvases[i];
      
      // Apply blend mode and opacity
      this.ctx.save();
      this.ctx.globalAlpha = layer.opacity;
      this.ctx.globalCompositeOperation = layer.blendMode;
      
      this.ctx.drawImage(layerCanvas, 0, 0);
      
      this.ctx.restore();
    }
  }

  // Layer management methods
  setLayerOpacity(layerId, opacity) { /* ... */ }
  setLayerBlendMode(layerId, blendMode) { /* ... */ }
  toggleLayer(layerId) { /* ... */ }
  removeLayer(layerId) { /* ... */ }
  reorderLayers(newOrder) { /* ... */ }
}
```

### SceneManager (Snapshots & Crossfader)

```javascript
class SceneManager extends EventEmitter {
  constructor() {
    super();
    
    this.scenes = new Map(); // scene id -> scene data
    this.maxScenes = 8;
    this.currentScene = null;
    
    // Crossfader state
    this.crossfader = {
      enabled: false,
      position: 0.5, // 0 = full A, 1 = full B
      sceneA: null,
      sceneB: null,
      curve: 'linear' // linear, logarithmic, s-curve
    };
  }

  captureScene(name, description = '') {
    const sceneData = {
      id: `scene_${Date.now()}`,
      name,
      description,
      timestamp: new Date().toISOString(),
      
      // Capture current state
      pluginId: this.getCurrentPluginId(),
      pluginConfig: this.getCurrentPluginConfig(),
      layerConfig: this.getCurrentLayerConfig(),
      audioConfig: this.getCurrentAudioConfig(),
      performanceConfig: this.getCurrentPerformanceConfig()
    };
    
    this.scenes.set(sceneData.id, sceneData);
    this.emit('sceneCaptured', sceneData);
    
    return sceneData.id;
  }

  async recallScene(sceneId, transition = { type: 'fade', duration: 200 }) {
    const scene = this.scenes.get(sceneId);
    if (!scene) throw new Error(`Scene ${sceneId} not found`);
    
    this.emit('sceneRecallStart', scene);
    
    try {
      await this.applySceneTransition(scene, transition);
      this.currentScene = sceneId;
      this.emit('sceneRecalled', scene);
    } catch (error) {
      this.emit('sceneRecallError', error);
      throw error;
    }
  }

  // Crossfader functionality
  enableCrossfader(sceneA, sceneB) {
    this.crossfader.enabled = true;
    this.crossfader.sceneA = sceneA;
    this.crossfader.sceneB = sceneB;
    this.crossfader.position = 0.0; // Start with scene A
    this.emit('crossfaderEnabled', this.crossfader);
  }

  setCrossfaderPosition(position) {
    if (!this.crossfader.enabled) return;
    
    this.crossfader.position = Math.max(0, Math.min(1, position));
    this.applyCrossfaderMix();
    this.emit('crossfaderMoved', this.crossfader.position);
  }

  applyCrossfaderMix() {
    const { sceneA, sceneB, position, curve } = this.crossfader;
    
    // Apply crossfader curve
    let mixFactor;
    switch (curve) {
      case 'logarithmic':
        mixFactor = Math.pow(position, 2);
        break;
      case 's-curve':
        mixFactor = (Math.sin((position - 0.5) * Math.PI) + 1) / 2;
        break;
      default: // linear
        mixFactor = position;
    }
    
    // Mix scenes based on position
    const sceneAData = this.scenes.get(sceneA);
    const sceneBData = this.scenes.get(sceneB);
    
    if (sceneAData && sceneBData) {
      const mixedConfig = this.interpolateScenes(sceneAData, sceneBData, mixFactor);
      this.applyMixedConfig(mixedConfig);
    }
  }

  interpolateScenes(sceneA, sceneB, factor) {
    // Interpolate numeric parameters between scenes
    return {
      pluginConfig: this.interpolateConfigs(
        sceneA.pluginConfig, 
        sceneB.pluginConfig, 
        factor
      ),
      layerConfig: this.interpolateLayerConfigs(
        sceneA.layerConfig, 
        sceneB.layerConfig, 
        factor
      ),
      // Colors, opacities, etc.
    };
  }

  // Scene management
  deleteScene(sceneId) { /* ... */ }
  exportScene(sceneId) { /* ... */ }
  importScene(sceneData) { /* ... */ }
  listScenes() { /* ... */ }
}
```

---

## 🎨 PATRONES DE DISEÑO UTILIZADOS

### 1. **Observer Pattern** (Event-Driven Architecture)
```javascript
// Componentes se comunican via eventos, no referencias directas
audioEngine.on('audioData', (data) => pluginManager.render(data));
performanceMonitor.on('fpsWarning', () => layerManager.reduceQuality());
```

### 2. **Strategy Pattern** (Plugin System)
```javascript
// Diferentes visualizaciones implementan la misma interfaz
class TunnelVisualizer extends BaseVisualizer { /* ... */ }
class PlasmaVisualizer extends BaseVisualizer { /* ... */ }
```

### 3. **Factory Pattern** (Plugin Loading)
```javascript
// PluginManager crea instancias según configuración
const plugin = PluginFactory.create(pluginId, config);
```

### 4. **Singleton Pattern** (Global State)
```javascript
// Un solo estado global compartido
const appState = AppState.getInstance();
```

### 5. **Command Pattern** (UI Actions)
```javascript
// Acciones de UI como comandos reutilizables
const switchPluginCommand = new SwitchPluginCommand(pluginId);
commandManager.execute(switchPluginCommand);
```

---

## 🔧 DECISIONES TÉCNICAS

### 1. **Vanilla JavaScript vs Frameworks**
**Decisión:** Vanilla JS con Web Components  
**Justificación:**
- ✅ Performance máximo para audio/visual processing
- ✅ Menor bundle size
- ✅ Control total sobre rendering loop
- ✅ Menor curva de aprendizaje para contributors

### 2. **Canvas 2D vs WebGL**
**Decisión:** Canvas 2D como base, WebGL como opción futura  
**Justificación:**
- ✅ Compatibilidad universal
- ✅ Más simple para community plugins
- ✅ Suficiente performance para casos base
- 🔮 WebGL como opt-in para plugins avanzados

### 3. **Web Audio API vs Libraries**
**Decisión:** Web Audio API nativo  
**Justificación:**
- ✅ Control total sobre pipeline de audio
- ✅ Sin dependencias externas
- ✅ Performance óptimo
- ✅ Acceso a todas las features (stereo, FFT, etc.)

### 4. **Module System**
**Decisión:** ES6 Modules con Dynamic Imports  
**Justificación:**
- ✅ Code splitting automático
- ✅ Lazy loading de plugins
- ✅ Tree shaking para bundle optimization
- ✅ Static analysis capabilities

---

## 🎯 INTERFACES Y APIS

### AudioData Interface
```typescript
interface AudioData {
  // Raw data
  frequencyData: Uint8Array;
  timedomainData: Uint8Array;
  
  // Basic analysis
  bass: number;      // 0-1
  mid: number;       // 0-1
  treble: number;    // 0-1
  energy: number;    // 0-1
  
  // Advanced analysis
  frequencyBands: {
    subBass: number;   // 20-60Hz
    bass: number;      // 60-250Hz
    lowMid: number;    // 250-500Hz
    mid: number;       // 500-2kHz
    highMid: number;   // 2-5kHz
    treble: number;    // 5-12kHz
    air: number;       // 12-20kHz
  };
  
  // Beat detection
  beatInfo: {
    detected: boolean;
    intensity: number; // 0-1
    bpm: number;
    confidence: number; // 0-1
  };
  
  // Stereo analysis
  stereoInfo: {
    left: number;      // 0-1
    right: number;     // 0-1
    center: number;    // 0-1
    width: number;     // 0-1
    correlation: number; // -1 to 1
  };
  
  // Reactive elements
  reactiveData: {
    kickDetected: boolean;
    snareDetected: boolean;
    hihatActivity: number;
    vocalPresence: number;
    transientIntensity: number;
  };
  
  // Metadata
  timestamp: number;
  sampleRate: number;
}
```

### Plugin Configuration Interface
```typescript
interface PluginConfig {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: string;
  tags: string[];
  
  compatibility: {
    spectravisio: string; // semver
    webgl: boolean;
    mobile: boolean;
  };
  
  parameters: {
    [key: string]: {
      type: 'range' | 'select' | 'boolean' | 'color';
      min?: number;
      max?: number;
      step?: number;
      default: any;
      options?: string[];
      label: string;
      description?: string;
      dependsOn?: string;
    };
  };
  
  performance: {
    complexity: 'low' | 'medium' | 'high' | 'extreme';
    targetFPS: number;
    memoryUsage: 'low' | 'medium' | 'high';
  };
}
```

---

## 📊 PERFORMANCE CONSIDERATIONS

### 1. **Memory Management**
```javascript
// Object pooling para objetos frecuentes
class ObjectPool {
  constructor(createFn, resetFn) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
  }
  
  get() {
    return this.pool.pop() || this.createFn();
  }
  
  release(obj) {
    this.resetFn(obj);
    this.pool.push(obj);
  }
}

// Pools para arrays y objetos comunes
const uint8ArrayPool = new ObjectPool(
  () => new Uint8Array(1024),
  (arr) => arr.fill(0)
);
```

### 2. **Render Optimization**
```javascript
// RequestAnimationFrame con delta time
class RenderLoop {
  constructor() {
    this.lastTime = 0;
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
  }
  
  start(renderFn) {
    const loop = (currentTime) => {
      const deltaTime = currentTime - this.lastTime;
      
      if (deltaTime >= this.frameInterval) {
        renderFn(deltaTime);
        this.lastTime = currentTime;
      }
      
      this.animationId = requestAnimationFrame(loop);
    };
    
    loop(performance.now());
  }
}
```

### 3. **Adaptive Quality**
```javascript
// Sistema automático de adaptación de calidad
class AdaptiveQuality {
  constructor(performanceMonitor) {
    this.monitor = performanceMonitor;
    this.qualityLevel = 1.0; // 0.25 - 1.0
    this.targetFPS = 60;
    this.samples = [];
  }
  
  update() {
    const currentFPS = this.monitor.getCurrentFPS();
    this.samples.push(currentFPS);
    
    if (this.samples.length > 10) {
      const avgFPS = this.samples.reduce((a, b) => a + b) / this.samples.length;
      
      if (avgFPS < this.targetFPS * 0.8) {
        this.qualityLevel = Math.max(0.25, this.qualityLevel - 0.1);
        this.applyQualityReduction();
      } else if (avgFPS > this.targetFPS * 0.95) {
        this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.05);
        this.applyQualityImprovement();
      }
      
      this.samples = [];
    }
  }
}
```

---

## 🧪 TESTING STRATEGY

### 1. **Unit Tests**
```javascript
// Cada componente con tests independientes
describe('AudioEngine', () => {
  test('should initialize with correct FFT size', () => {
    const engine = new AudioEngine({ fftSize: 1024 });
    expect(engine.config.fftSize).toBe(1024);
  });
  
  test('should emit audioData events', async () => {
    const engine = new AudioEngine();
    const dataPromise = new Promise(resolve => {
      engine.once('audioData', resolve);
    });
    
    await engine.initialize();
    // Mock audio input...
    
    const audioData = await dataPromise;
    expect(audioData.frequencyData).toBeInstanceOf(Uint8Array);
  });
});
```

### 2. **Integration Tests**
```javascript
// Tests de flujo completo
describe('Plugin Integration', () => {
  test('should load and render plugin correctly', async () => {
    const app = new SpectraVisio(mockCanvas);
    await app.init();
    
    const pluginId = 'tunnel';
    await app.setPlugin(pluginId);
    
    // Mock audio data
    const audioData = createMockAudioData();
    app.pluginManager.render(audioData, 16.67);
    
    expect(mockCanvas.getContext('2d').fillRect).toHaveBeenCalled();
  });
});
```

### 3. **Performance Tests**
```javascript
// Benchmarks de performance
describe('Performance', () => {
  test('should maintain 60 FPS with single plugin', async () => {
    const app = new SpectraVisio(canvas);
    const monitor = new PerformanceMonitor();
    
    // Run for 1 second
    for (let i = 0; i < 60; i++) {
      const start = performance.now();
      app.render(performance.now());
      const end = performance.now();
      
      expect(end - start).toBeLessThan(16.67); // 60 FPS budget
    }
  });
});
```

---

## 🚀 BUILD Y DEPLOYMENT

### 1. **Build Pipeline**
```javascript
// webpack.config.js
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'spectravisio.min.js',
    library: 'SpectraVisio',
    libraryTarget: 'umd'
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        plugins: {
          test: /[\\/]plugins[\\/]/,
          name: 'plugins',
          chunks: 'async'
        }
      }
    }
  }
};
```

### 2. **Plugin Bundling**
```javascript
// Plugins se pueden cargar independientemente
// plugins/tunnel/bundle.js
export default class TunnelVisualizer extends BaseVisualizer {
  // Implementation...
}
```

---

*Este TDD será actualizado continuamente durante el desarrollo para reflejar cambios en la arquitectura y nuevas decisiones técnicas.*