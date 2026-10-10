# Claude.md - Mejores Prácticas para SpectraVisio

**Versión:** 1.0  
**Fecha:** Enero 6, 2026  
**Última Actualización:** [Fecha]

---

## 📖 Propósito del Documento

Este documento contiene **mejores prácticas** y **guidelines** para:
- 🤖 **Interacción óptima** con Claude vía GitHub Copilot
- 💻 **Implementación de código** siguiendo patrones establecidos
- 🏗️ **Arquitectura** y convenciones del proyecto
- 🔄 **Workflows de desarrollo** eficientes

*Este documento se actualiza continuamente con aprendizajes y mejoras.*

---

## 🤖 MEJORES PRÁCTICAS - INTERACCIÓN CON CLAUDE

### 1. **Estructura de Prompts Efectivos**

#### ✅ **Prompts Buenos:**
```
# Contexto específico
"Implementa el método `render()` de TunnelVisualizer que:
- Use audioData.bass para controlar velocidad del túnel
- Implemente fade trail configurable
- Mantenga 60fps con adaptive quality
- Siga el patrón establecido en BaseVisualizer"

# Con ejemplos concretos
"Siguiendo el patrón de AudioEngine.getAnalysisData(), 
crea FrequencySplitter.splitBands() que retorne:
{ subBass: 0.8, bass: 0.6, lowMid: 0.3, ... }"
```

#### ❌ **Prompts Problemáticos:**
```
"Haz el visualizador" (muy vago)
"Agrega efectos cool" (no específico)
"Hazlo más rápido" (sin contexto de performance)
```

### 2. **Flujo de Trabajo Recomendado**

#### **Fase 1: Análisis**
```
1. "Analiza el patrón usado en [archivo existente]"
2. "Identifica dependencias necesarias para [feature]"
3. "Revisa consistencia con [patrón arquitectónico]"
```

#### **Fase 2: Planificación**
```
1. "Sugiere estructura de clases para [componente]"
2. "Define interfaces necesarias para [feature]"
3. "Estima complejidad de implementación"
```

#### **Fase 3: Implementación**
```
1. "Implementa [componente] siguiendo [patrón establecido]"
2. "Agrega validación de errores y logging"
3. "Incluye JSDoc completo"
```

#### **Fase 4: Validación**
```
1. "Revisa código por memory leaks"
2. "Verifica compliance con performance targets"
3. "Sugiere tests unitarios para [componente]"
```

### 3. **Referencias de Contexto Efectivas**

#### **Siempre Incluir:**
- 📁 Archivos relacionados existentes
- 🏗️ Patterns arquitectónicos del TDD
- 📊 Performance requirements específicos
- 🎯 Interfaces y tipos definidos

#### **Ejemplo Efectivo:**
```
"Basándote en:
- BaseVisualizer.js (patrón base)
- AudioEngine.js (estructura de audioData)
- PerformanceMonitor.js (targets de FPS)

Implementa PlasmaVisualizer que cumpla performance 'medium' 
según SpectraVisio_TDD.md sección 'Performance Considerations'"
```

---

## 💻 CONVENCIONES DE CÓDIGO

### 1. **Estructura de Archivos**

#### **Patrón de Clase Principal:**
```javascript
/**
 * [Descripción de la clase]
 * @extends BaseVisualizer
 */
class ComponentName extends BaseClass {
  constructor(canvas, config = {}) {
    super(canvas, config);
    
    // Metadata (para plugins)
    this.name = 'Component Name';
    this.version = '1.0.0';
    this.author = 'Author Name';
    
    // Estado interno
    this.isInitialized = false;
    this.lastRenderTime = 0;
    
    // Configuración específica
    this.localConfig = {
      ...this.getDefaultConfig(),
      ...config
    };
  }

  async init() {
    // Inicialización async
    await this.setupResources();
    this.isInitialized = true;
  }

  render(audioData, deltaTime) {
    if (!this.isInitialized) return;
    
    // Performance tracking
    const startTime = performance.now();
    
    // Render logic here
    this.actualRender(audioData, deltaTime);
    
    // Performance monitoring
    this.lastRenderTime = performance.now() - startTime;
  }

  destroy() {
    // Cleanup resources
    this.isInitialized = false;
    super.destroy();
  }
}
```

### 2. **Naming Conventions**

#### **Variables y Métodos:**
```javascript
// ✅ Nombres descriptivos y específicos
const bassIntensity = audioData.frequencyBands.bass;
const renderStartTime = performance.now();
const activePluginInstance = pluginManager.activePlugin;

// ✅ Métodos con verbos claros
analyzeBeatPattern()
renderTunnelSegment()
updateParticleSystem()
interpolateColorValues()

// ❌ Evitar nombres genéricos
const data = audioData; // Muy genérico
const temp = someValue; // No descriptivo
const doStuff() // No específico
```

#### **Constantes y Configuración:**
```javascript
// ✅ Constantes en UPPER_CASE
const DEFAULT_FFT_SIZE = 2048;
const MAX_PLUGINS_LOADED = 16;
const PERFORMANCE_TARGET_FPS = 60;

// ✅ Enums como objetos frozen
const BlendModes = Object.freeze({
  NORMAL: 'source-over',
  MULTIPLY: 'multiply',
  SCREEN: 'screen',
  ADD: 'lighter'
});
```

### 3. **Gestión de Errores**

#### **Patrón Estándar:**
```javascript
class ComponentExample {
  async initialize() {
    try {
      await this.setupAudio();
    } catch (error) {
      // Log específico
      console.error(`[ComponentExample] Audio setup failed:`, error);
      
      // Emit event para handling global
      this.emit('initializationError', {
        component: 'ComponentExample',
        stage: 'audio-setup',
        error
      });
      
      // Fallback si es posible
      this.initializeWithDefaults();
    }
  }

  render(audioData, deltaTime) {
    // Validación de entrada
    if (!audioData || !audioData.frequencyData) {
      console.warn('[ComponentExample] Invalid audioData received');
      return;
    }

    // Validación de estado
    if (!this.isInitialized) {
      console.warn('[ComponentExample] Render called before initialization');
      return;
    }

    // Render logic...
  }
}
```

### 4. **Performance Patterns**

#### **Object Pooling:**
```javascript
class EffectParticle {
  constructor() {
    // Configurar pool para objetos frecuentes
    this.particlePool = [];
    this.activeParticles = [];
  }

  createParticle(x, y, velocity) {
    // Reusar objeto del pool
    const particle = this.particlePool.pop() || new Particle();
    particle.reset(x, y, velocity);
    this.activeParticles.push(particle);
    return particle;
  }

  destroyParticle(particle) {
    // Devolver al pool
    const index = this.activeParticles.indexOf(particle);
    if (index > -1) {
      this.activeParticles.splice(index, 1);
      this.particlePool.push(particle);
    }
  }
}
```

#### **Batching de Canvas Operations:**
```javascript
class OptimizedRenderer {
  render(audioData, deltaTime) {
    // Batch similar operations
    this.ctx.save();
    this.ctx.fillStyle = '#000000';
    
    // Multiple fills with same style
    for (const rect of this.rectangles) {
      this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    
    this.ctx.restore();
  }
}
```

---

## 🏗️ PATRONES ARQUITECTÓNICOS

### 1. **Plugin Development Pattern**

#### **Template Completo:**
```javascript
/**
 * [Plugin Name] - Audio reactive visualizer
 * @extends BaseVisualizer
 */
class MyCustomVisualizer extends BaseVisualizer {
  constructor(canvas, config = {}) {
    super(canvas, config);
    
    // Plugin metadata
    this.name = 'My Custom Visualizer';
    this.version = '1.0.0';
    this.author = 'Your Name';
    this.description = 'Descripción específica';
    this.category = 'abstract'; // abstract, geometric, particle, etc.
    
    // Performance classification
    this.performance = {
      complexity: 'medium',
      targetFPS: 60,
      memoryUsage: 'low'
    };
    
    // Internal state
    this.particles = [];
    this.lastBeatTime = 0;
    this.animationPhase = 0;
  }

  getDefaultConfig() {
    return {
      // UI configurable parameters
      speed: 1.0,
      intensity: 0.8,
      color: '#ff6b6b',
      trailLength: 0.1,
      reactivity: 0.7,
      
      // Audio reactive mappings
      bassMapping: 'size',    // size, color, speed
      midMapping: 'rotation',
      trebleMapping: 'brightness'
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
        description: 'Controls overall animation speed'
      },
      color: {
        type: 'color',
        default: '#ff6b6b',
        label: 'Primary Color'
      }
      // ... más parámetros
    };
  }

  async init() {
    // Inicialización async si es necesaria
    await this.loadResources();
    this.setupParticleSystem();
    this.isInitialized = true;
  }

  render(audioData, deltaTime) {
    if (!this.isInitialized) return;
    
    // Performance monitoring
    const renderStart = performance.now();
    
    // Audio analysis
    const bassIntensity = audioData.frequencyBands.bass;
    const beatDetected = audioData.beatInfo.detected;
    
    // React to beat
    if (beatDetected) {
      this.onBeat(audioData.beatInfo.intensity);
    }
    
    // Clear with trail effect
    this.fade(this.config.trailLength);
    
    // Main render logic
    this.renderEffect(audioData, deltaTime);
    
    // Performance tracking
    this.lastRenderTime = performance.now() - renderStart;
  }

  onBeat(intensity) {
    // Override para reacciones específicas a beats
    this.lastBeatTime = performance.now();
    // Implementar efectos de beat...
  }

  renderEffect(audioData, deltaTime) {
    // Lógica específica del visualizador
    // Usar audioData para controlar efectos
    
    const { bass, mid, treble } = audioData.frequencyBands;
    
    // Mapear audio a parámetros visuales
    switch (this.config.bassMapping) {
      case 'size':
        this.particleSize = bass * 50;
        break;
      case 'speed':
        this.animationSpeed = bass * 2;
        break;
      // ... más mappings
    }
  }

  onParameterChange(key, value) {
    super.onParameterChange(key, value);
    
    // Handle specific parameter changes
    switch (key) {
      case 'color':
        this.updateColorPalette(value);
        break;
      case 'speed':
        this.animationSpeed = value;
        break;
    }
  }

  destroy() {
    // Cleanup specific resources
    this.particles = [];
    super.destroy();
  }
}

// Export para dynamic loading
export default MyCustomVisualizer;
```

### 2. **Event-Driven Communication Pattern**

#### **Emisión de Eventos:**
```javascript
class ComponentExample extends EventEmitter {
  processAudio(audioData) {
    // Análisis específico
    const beatDetected = this.detectBeat(audioData);
    
    if (beatDetected) {
      // Emit specific event with data
      this.emit('beatDetected', {
        intensity: audioData.energy,
        frequency: this.dominantFrequency,
        timestamp: performance.now()
      });
    }
    
    // Emit regular update
    this.emit('audioProcessed', {
      audioData,
      analysis: this.getAnalysisResult()
    });
  }
}
```

#### **Suscripción a Eventos:**
```javascript
class ComponentSubscriber {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Specific event handling
    eventBus.on('beatDetected', this.onBeat.bind(this));
    eventBus.on('pluginChanged', this.onPluginChange.bind(this));
    eventBus.on('performanceWarning', this.onPerformanceIssue.bind(this));
  }

  onBeat({ intensity, frequency, timestamp }) {
    // Specific beat reaction
    this.triggerBeatEffect(intensity);
  }

  onPluginChange({ oldPlugin, newPlugin }) {
    // Handle plugin transitions
    this.adaptToNewPlugin(newPlugin);
  }
}
```

---

## 🔄 WORKFLOW DE DESARROLLO CON CLAUDE

### 1. **Desarrollo Iterativo**

#### **Sesión Tipo - Implementar Nueva Feature:**

**Prompt 1 - Análisis:**
```
"Analiza cómo implementar [feature] considerando:
- Patrón usado en [archivo similar]
- Performance target según TDD
- Integración con [componente existente]"
```

**Prompt 2 - Planificación:**
```
"Sugiere estructura de clases/métodos para [feature]:
- Interfaces necesarias
- Dependencias con otros componentes
- Puntos de extensión para futuras mejoras"
```

**Prompt 3 - Implementación Base:**
```
"Implementa [componente base] con:
- Logging y error handling
- JSDoc completo
- Validación de inputs
- Tests unitarios básicos"
```

**Prompt 4 - Optimización:**
```
"Optimiza [componente] para:
- Memory usage según performance targets
- 60fps stable
- Mobile compatibility si aplica"
```

**Prompt 5 - Integración:**
```
"Integra [componente] con:
- Event system existente
- Plugin architecture
- UI controls necesarios"
```

### 2. **Debugging Efectivo con Claude**

#### **Información a Incluir:**
```
"Tengo un issue en [componente]:

SÍNTOMAS:
- [Descripción específica del problema]
- [Cuándo ocurre]
- [Datos que produce el error]

CONTEXTO:
- [Archivos relacionados]
- [Estado de la aplicación]
- [Browser/device específico]

INTENTOS PREVIOS:
- [Qué ya probaste]
- [Resultados obtenidos]

¿Puedes ayudarme a diagnosticar?"
```

### 3. **Code Review con Claude**

#### **Template de Review:**
```
"Revisa este código por:

FUNCTIONALIDAD:
- ¿Cumple los requirements?
- ¿Maneja edge cases?
- ¿Integra bien con arquitectura existente?

PERFORMANCE:
- ¿Cumple targets de 60fps?
- ¿Tiene memory leaks potenciales?
- ¿Usa patterns de optimización apropiados?

MAINTAINABILITY:
- ¿Código es legible y autodocumentado?
- ¿Sigue convenciones establecidas?
- ¿Tests adecuados incluidos?

[CÓDIGO AQUÍ]
"
```

---

## 🧪 TESTING Y VALIDACIÓN

### 1. **Unit Testing Pattern**

```javascript
// tests/plugins/TunnelVisualizer.test.js
import TunnelVisualizer from '../../src/plugins/tunnel/TunnelVisualizer.js';
import { createMockAudioData, createMockCanvas } from '../test-utils.js';

describe('TunnelVisualizer', () => {
  let visualizer;
  let mockCanvas;

  beforeEach(() => {
    mockCanvas = createMockCanvas(800, 600);
    visualizer = new TunnelVisualizer(mockCanvas);
  });

  afterEach(() => {
    if (visualizer) {
      visualizer.destroy();
    }
  });

  describe('initialization', () => {
    test('should initialize with default config', () => {
      expect(visualizer.config.speed).toBe(1.0);
      expect(visualizer.name).toBe('Tunnel');
    });

    test('should override config parameters', () => {
      const customVisualizer = new TunnelVisualizer(mockCanvas, { speed: 2.0 });
      expect(customVisualizer.config.speed).toBe(2.0);
    });
  });

  describe('rendering', () => {
    test('should render without errors', async () => {
      await visualizer.init();
      const audioData = createMockAudioData();
      
      expect(() => {
        visualizer.render(audioData, 16.67);
      }).not.toThrow();
    });

    test('should react to bass frequencies', async () => {
      await visualizer.init();
      const lowBassData = createMockAudioData({ bass: 0.1 });
      const highBassData = createMockAudioData({ bass: 0.9 });
      
      visualizer.render(lowBassData, 16.67);
      const lowBassState = visualizer.getTunnelDepth();
      
      visualizer.render(highBassData, 16.67);
      const highBassState = visualizer.getTunnelDepth();
      
      expect(highBassState).toBeGreaterThan(lowBassState);
    });
  });

  describe('performance', () => {
    test('should complete render within frame budget', async () => {
      await visualizer.init();
      const audioData = createMockAudioData();
      
      const startTime = performance.now();
      visualizer.render(audioData, 16.67);
      const endTime = performance.now();
      
      // Should complete within 16.67ms budget for 60fps
      expect(endTime - startTime).toBeLessThan(16.67);
    });
  });
});
```

### 2. **Performance Testing**

```javascript
// tests/performance/PluginPerformance.test.js
describe('Plugin Performance', () => {
  const PERFORMANCE_BUDGETS = {
    low: 5.0,      // 5ms per frame
    medium: 10.0,  // 10ms per frame
    high: 15.0,    // 15ms per frame
    extreme: 16.0  // 16ms per frame (cutting edge)
  };

  test.each([
    ['tunnel', 'medium'],
    ['plasma', 'high'],
    ['ribbons', 'low']
  ])('plugin %s should meet %s performance budget', async (pluginId, complexity) => {
    const plugin = await loadPlugin(pluginId);
    const budget = PERFORMANCE_BUDGETS[complexity];
    const samples = [];

    // Run 60 frames to get average
    for (let i = 0; i < 60; i++) {
      const audioData = createMockAudioData();
      const startTime = performance.now();
      
      plugin.render(audioData, 16.67);
      
      const endTime = performance.now();
      samples.push(endTime - startTime);
    }

    const averageTime = samples.reduce((a, b) => a + b) / samples.length;
    expect(averageTime).toBeLessThan(budget);
  });
});
```

---

## 📚 RECURSOS Y REFERENCIAS

### 1. **Documentación Interna**
- [SpectraVisio_PRD.md](./SpectraVisio_PRD.md) - Requisitos del producto
- [SpectraVisio_FSD.md](./SpectraVisio_FSD.md) - Especificación funcional
- [SpectraVisio_TDD.md](./SpectraVisio_TDD.md) - Arquitectura técnica
- [SpectraVisio_Visualizations.md](./SpectraVisio_Visualizations.md) - Spec de visualizaciones

### 2. **APIs Clave**
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Canvas 2D API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

### 3. **Performance Resources**
- [Google Web Fundamentals - Performance](https://web.dev/fast/)
- [Canvas Performance Tips](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)

---

## 🔄 LOG DE ACTUALIZACIONES

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-01-06 | 1.0 | Versión inicial del documento |
| 2026-01-06 | 1.1 | **SESIÓN COMPLETA**: Creación de ecosystem completo de documentación |

### 📋 Resumen Sesión 2026-01-06

**DOCUMENTOS CREADOS EN ESTA SESIÓN:**
1. ✅ **SpectraVisio_TDD.md** - Technical Design Document completo
2. ✅ **SpectraVisio_API_Reference.md** - APIs completas (Core, Plugin, Audio, Rendering, Performance)
3. ✅ **SpectraVisio_Plugin_Development_Guide.md** - Guía completa desde setup hasta publishing
4. ✅ **SpectraVisio_Deployment_Guide.md** - CI/CD, GitHub Pages, Netlify, Vercel, Docker
5. ✅ **SpectraVisio_User_Manual.md** - Manual completo de usuario con troubleshooting
6. ✅ **SpectraVisio_Contributing_Guidelines.md** - Guías de contribución y comunidad

**ESTADO ACTUAL DEL PROYECTO:**
- 📚 **Documentación**: 100% completa (11 documentos)
- 🏗️ **Arquitectura**: Definida completamente en TDD
- 🔌 **Plugin System**: API y guías completas
- 🚀 **Deployment**: Ready para múltiples plataformas
- 👥 **Comunidad**: Guidelines y workflows establecidos

**PRÓXIMOS PASOS SUGERIDOS:**
1. **Implementar Core Framework** siguiendo TDD
2. **Crear primer plugin** (Tunnel) siguiendo Plugin Guide
3. **Setup CI/CD pipeline** según Deployment Guide
4. **Crear comunidad** en Discord siguiendo Contributing Guidelines

**DECISIONES TÉCNICAS CLAVE:**
- ✅ Vanilla JS + Web Components (performance y simplicidad)
- ✅ Plugin-based architecture (escalabilidad)
- ✅ Event-driven communication (loose coupling)
- ✅ Canvas 2D base + WebGL opcional (compatibilidad)
- ✅ Progressive Web App (accesibilidad)

**HERRAMIENTAS Y WORKFLOWS ESTABLECIDOS:**
- ✅ ESLint + Prettier para code style
- ✅ Jest para testing (unit + integration)
- ✅ GitHub Actions para CI/CD
- ✅ Conventional Commits para mensajes
- ✅ Semantic versioning para releases

---

## 📊 ESTADO ACTUAL DEL PROYECTO

### 🎯 **FASE ACTUAL: READY FOR DEVELOPMENT**

**Documentación Completada (11/11):**
- [x] **SpectraVisio_PRD.md** - Product Requirements
- [x] **SpectraVisio_FSD.md** - Functional Specification  
- [x] **SpectraVisio_Visualizations.md** - Visualizations Spec
- [x] **SpectraVisio_TDD.md** - Technical Design
- [x] **SpectraVisio_API_Reference.md** - Complete API Docs
- [x] **SpectraVisio_Plugin_Development_Guide.md** - Plugin Development
- [x] **SpectraVisio_Deployment_Guide.md** - Deployment & CI/CD
- [x] **SpectraVisio_User_Manual.md** - User Manual
- [x] **SpectraVisio_Contributing_Guidelines.md** - Community Guidelines
- [x] **claude.md** - AI Development Practices
- [x] **psychedelic_audio_visualizer_canvas_fullscreen.html** - Original prototype

### 🚀 **DEVELOPMENT ROADMAP**

**Phase 1: Core Framework (2-3 semanas)**
- [ ] Setup project structure según TDD
- [ ] Implement SpectraVisio main class
- [ ] Create AudioEngine with Web Audio API
- [ ] Build PluginManager with dynamic loading
- [ ] Setup basic UI controls

**Phase 2: Base Plugins (1-2 semanas)**
- [ ] Implement Tunnel plugin (complexity: medium)
- [ ] Create Plasma plugin (complexity: high) 
- [ ] Build Ribbons plugin (complexity: low)
- [ ] Add basic parameter controls

**Phase 3: Advanced Features (2-3 semanas)**
- [ ] Layer system implementation
- [ ] Scene management with snapshots
- [ ] Performance monitoring
- [ ] Mobile optimizations

**Phase 4: Polish & Deploy (1-2 semanas)**
- [ ] Complete testing suite
- [ ] Performance optimizations
- [ ] Documentation final review
- [ ] Production deployment

### 💡 **QUICK REFERENCE FOR NEXT SESSION**

**Para implementar Core Framework:**
```bash
# 1. Setup inicial
mkdir spectravisio && cd spectravisio
npm init -y
npm install --save-dev webpack webpack-cli babel-loader @babel/core @babel/preset-env

# 2. Estructura según TDD
mkdir -p src/{core,plugins,ui,audio,utils,layers}

# 3. Implementar clases principales
# - src/core/SpectraVisio.js (main orchestrator)
# - src/audio/AudioEngine.js (audio processing)
# - src/core/PluginManager.js (plugin system)
```

**Orden de implementación recomendado:**
1. **AudioEngine** (foundation para todo)
2. **SpectraVisio** (orchestrator principal)
3. **BaseVisualizer** (plugin interface)
4. **PluginManager** (plugin loading)
5. **Primer plugin simple** (validar architecture)

**Key Files para Claude Reference:**
- **TDD**: Arquitectura completa y decisiones técnicas
- **API Reference**: Interfaces exactas para implementar
- **Plugin Guide**: Template completo para plugins
- **claude.md**: Patterns y best practices

---

*Este documento evoluciona continuamente. Actualizar después de cada sesión de desarrollo importante.*