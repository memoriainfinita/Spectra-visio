# SpectraVisio - Plugin Development Guide

**Versión:** 1.0  
**Fecha:** Enero 6, 2026  
**Autor:** [Tu Nombre]  
**Estado:** Draft

---

## 📖 Propósito del Documento

Guía completa para **desarrollar plugins** para SpectraVisio:
- 🚀 **Getting Started** - Tu primer plugin en 15 minutos
- 🏗️ **Arquitectura** - Cómo funcionan los plugins internamente
- 🎨 **Best Practices** - Patrones y optimizaciones
- 🧪 **Testing** - Cómo testear tu plugin
- 📦 **Publishing** - Compartir tu plugin con la comunidad

---

## 🚀 QUICK START - Tu Primer Plugin

### 1. Setup Inicial

```bash
# Clonar template de plugin
git clone https://github.com/spectravisio/plugin-template my-awesome-plugin
cd my-awesome-plugin

# Instalar dependencias de desarrollo
npm install
```

### 2. Estructura Básica

```
my-awesome-plugin/
├── src/
│   ├── MyAwesomePlugin.js      # Plugin principal
│   └── index.js                # Export point
├── config/
│   └── plugin.json             # Metadata del plugin
├── assets/
│   ├── thumbnail.png           # Preview (400x300)
│   └── demo.gif                # Demo animado
├── tests/
│   └── MyAwesomePlugin.test.js # Unit tests
├── docs/
│   └── README.md               # Documentación
└── package.json                # NPM config
```

### 3. Implementación Mínima

**src/MyAwesomePlugin.js:**
```javascript
import { BaseVisualizer } from 'spectravisio-sdk';

/**
 * My Awesome Plugin - Pulsating circles reactive to bass
 * @extends BaseVisualizer
 */
export default class MyAwesomePlugin extends BaseVisualizer {
  constructor(canvas, config = {}) {
    super(canvas, config);
    
    // Plugin metadata
    this.name = 'My Awesome Plugin';
    this.version = '1.0.0';
    this.author = 'Your Name';
    this.description = 'Pulsating circles that react to bass frequencies';
    this.category = 'abstract';
    this.tags = ['bass-reactive', 'circles', 'minimalist'];
    
    // Performance classification
    this.performance = {
      complexity: 'low',
      targetFPS: 60,
      memoryUsage: 'low'
    };
    
    // Internal state
    this.circles = [];
    this.lastBeatTime = 0;
  }

  getDefaultConfig() {
    return {
      circleCount: 5,
      maxRadius: 100,
      color: '#ff6b6b',
      reactivity: 0.8,
      fadeSpeed: 0.05
    };
  }

  getParameterDefinitions() {
    return {
      circleCount: {
        type: 'range',
        min: 1,
        max: 20,
        step: 1,
        default: 5,
        label: 'Circle Count',
        description: 'Number of circles to display'
      },
      maxRadius: {
        type: 'range',
        min: 20,
        max: 200,
        step: 5,
        default: 100,
        label: 'Max Radius',
        description: 'Maximum circle radius'
      },
      color: {
        type: 'color',
        default: '#ff6b6b',
        label: 'Circle Color'
      },
      reactivity: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.1,
        default: 0.8,
        label: 'Bass Reactivity',
        description: 'How much circles react to bass'
      }
    };
  }

  async init() {
    // Initialize circles
    this.setupCircles();
    this.isInitialized = true;
  }

  setupCircles() {
    this.circles = [];
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    for (let i = 0; i < this.config.circleCount; i++) {
      this.circles.push({
        x: centerX + (Math.random() - 0.5) * 200,
        y: centerY + (Math.random() - 0.5) * 200,
        baseRadius: 20 + Math.random() * 30,
        currentRadius: 20,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.7
      });
    }
  }

  render(audioData, deltaTime) {
    if (!this.isInitialized) return;
    
    // Clear with fade effect
    this.fade(this.config.fadeSpeed);
    
    // Get bass intensity
    const bassIntensity = audioData.frequencyBands.bass;
    
    // React to beats
    if (audioData.beatInfo.detected) {
      this.onBeat(audioData.beatInfo.intensity);
    }
    
    // Render circles
    this.renderCircles(bassIntensity, deltaTime);
  }

  onBeat(intensity) {
    this.lastBeatTime = performance.now();
    
    // Add beat effect to all circles
    this.circles.forEach(circle => {
      circle.currentRadius = circle.baseRadius * (1 + intensity);
      circle.alpha = Math.min(1, circle.alpha + intensity * 0.5);
    });
  }

  renderCircles(bassIntensity, deltaTime) {
    this.ctx.save();
    
    this.circles.forEach((circle, index) => {
      // Calculate reactive radius
      const reactiveSize = bassIntensity * this.config.reactivity;
      const targetRadius = circle.baseRadius * (1 + reactiveSize);
      
      // Smooth radius transition
      circle.currentRadius = this.lerp(
        circle.currentRadius, 
        targetRadius, 
        0.1
      );
      
      // Beat decay
      const timeSinceBeat = performance.now() - this.lastBeatTime;
      if (timeSinceBeat < 200) { // 200ms beat effect
        const decay = 1 - (timeSinceBeat / 200);
        circle.currentRadius *= (1 + decay * 0.5);
      }
      
      // Draw circle
      this.ctx.beginPath();
      this.ctx.arc(circle.x, circle.y, circle.currentRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.config.color;
      this.ctx.globalAlpha = circle.alpha;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      // Fade alpha
      circle.alpha = Math.max(0.1, circle.alpha - 0.01);
    });
    
    this.ctx.restore();
  }

  onParameterChange(key, value) {
    super.onParameterChange(key, value);
    
    switch (key) {
      case 'circleCount':
        this.setupCircles();
        break;
      case 'color':
        // Color change is automatic via this.config
        break;
    }
  }

  resize(width, height) {
    super.resize(width, height);
    // Reposition circles for new canvas size
    this.setupCircles();
  }

  destroy() {
    this.circles = [];
    super.destroy();
  }

  // Utility method
  lerp(a, b, factor) {
    return a + (b - a) * factor;
  }
}
```

**src/index.js:**
```javascript
import MyAwesomePlugin from './MyAwesomePlugin.js';

// Export default para dynamic import
export default MyAwesomePlugin;

// También exportar la clase por nombre
export { MyAwesomePlugin };
```

**config/plugin.json:**
```json
{
  "id": "my-awesome-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Pulsating circles that react to bass frequencies",
  "category": "abstract",
  "tags": ["bass-reactive", "circles", "minimalist"],
  "homepage": "https://github.com/yourname/my-awesome-plugin",
  
  "compatibility": {
    "spectravisio": "^1.0.0",
    "webgl": false,
    "mobile": true
  },
  
  "performance": {
    "complexity": "low",
    "targetFPS": 60,
    "memoryUsage": "low",
    "cpuUsage": "low"
  },
  
  "assets": {
    "thumbnail": "./assets/thumbnail.png",
    "demo": "./assets/demo.gif",
    "screenshots": [
      "./assets/screenshot1.png",
      "./assets/screenshot2.png"
    ]
  },
  
  "parameters": {
    "circleCount": {
      "type": "range",
      "min": 1,
      "max": 20,
      "step": 1,
      "default": 5,
      "label": "Circle Count"
    },
    "maxRadius": {
      "type": "range", 
      "min": 20,
      "max": 200,
      "step": 5,
      "default": 100,
      "label": "Max Radius"
    },
    "color": {
      "type": "color",
      "default": "#ff6b6b",
      "label": "Circle Color"
    }
  }
}
```

### 4. Testing Rápido

```javascript
// tests/MyAwesomePlugin.test.js
import MyAwesomePlugin from '../src/MyAwesomePlugin.js';
import { createMockCanvas, createMockAudioData } from 'spectravisio-test-utils';

describe('MyAwesomePlugin', () => {
  let plugin;
  let canvas;

  beforeEach(() => {
    canvas = createMockCanvas(800, 600);
    plugin = new MyAwesomePlugin(canvas);
  });

  test('should initialize correctly', async () => {
    await plugin.init();
    expect(plugin.isInitialized).toBe(true);
    expect(plugin.circles).toHaveLength(5);
  });

  test('should render without errors', async () => {
    await plugin.init();
    const audioData = createMockAudioData({ bass: 0.8 });
    
    expect(() => {
      plugin.render(audioData, 16.67);
    }).not.toThrow();
  });
});
```

### 5. Build y Test

```bash
# Ejecutar tests
npm test

# Build para distribución
npm run build

# Servidor de desarrollo con hot reload
npm run dev
```

---

## 🏗️ ARQUITECTURA AVANZADA

### 1. Ciclo de Vida del Plugin

```javascript
class AdvancedPlugin extends BaseVisualizer {
  constructor(canvas, config) {
    super(canvas, config);
    // 1. Constructor: Setup inicial, sin recursos pesados
  }

  async init() {
    // 2. Init: Carga async de recursos
    await this.loadTextures();
    await this.setupWebGLContext();
    await this.compileShaders();
    this.isInitialized = true;
  }

  render(audioData, deltaTime) {
    // 3. Render: Llamado cada frame (60fps target)
    if (!this.isInitialized) return;
    
    this.update(audioData, deltaTime);
    this.draw();
  }

  resize(width, height) {
    // 4. Resize: Cambio de tamaño de canvas
    this.updateProjection(width, height);
  }

  onParameterChange(key, value) {
    // 5. Parameter Change: Usuario modifica configuración
    this.handleConfigChange(key, value);
  }

  destroy() {
    // 6. Destroy: Cleanup de recursos
    this.releaseTextures();
    this.cleanupWebGL();
    super.destroy();
  }
}
```

### 2. Gestión de Estado Compleja

```javascript
class StatefulPlugin extends BaseVisualizer {
  constructor(canvas, config) {
    super(canvas, config);
    
    // Estado interno organizado
    this.state = {
      // Visual state
      particles: [],
      effects: [],
      animations: [],
      
      // Audio reactive state
      bassHistory: new Array(60).fill(0), // 1 segundo de historia
      beatPhase: 0,
      energySmoothed: 0,
      
      // Performance state
      frameCount: 0,
      lastOptimization: 0
    };
    
    // Configuración interna
    this.internal = {
      particlePool: [],
      textureCache: new Map(),
      shaderPrograms: new Map()
    };
  }

  update(audioData, deltaTime) {
    // Update audio history
    this.updateAudioHistory(audioData);
    
    // Update animations
    this.updateAnimations(deltaTime);
    
    // Update particles
    this.updateParticles(audioData, deltaTime);
    
    // Performance optimizations
    this.optimizePerformance();
  }

  updateAudioHistory(audioData) {
    // Sliding window de datos de audio
    this.state.bassHistory.shift();
    this.state.bassHistory.push(audioData.frequencyBands.bass);
    
    // Smoothed energy para evitar flickering
    this.state.energySmoothed = this.lerp(
      this.state.energySmoothed,
      audioData.energy,
      0.1
    );
  }
}
```

### 3. Sistema de Efectos Modulares

```javascript
class ModularEffectsPlugin extends BaseVisualizer {
  constructor(canvas, config) {
    super(canvas, config);
    
    // Sistema de efectos composables
    this.effects = {
      particleSystem: new ParticleEffect(this),
      trailEffect: new TrailEffect(this),
      glowEffect: new GlowEffect(this),
      distortionEffect: new DistortionEffect(this)
    };
  }

  async init() {
    // Initialize all effects
    await Promise.all(
      Object.values(this.effects).map(effect => effect.init())
    );
    this.isInitialized = true;
  }

  render(audioData, deltaTime) {
    if (!this.isInitialized) return;
    
    // Render pipeline con efectos
    this.clearCanvas();
    
    // Base layer
    this.effects.particleSystem.render(audioData, deltaTime);
    
    // Post-processing effects
    this.effects.trailEffect.apply();
    this.effects.glowEffect.apply();
    
    // Final distortion
    if (audioData.beatInfo.detected) {
      this.effects.distortionEffect.apply(audioData.beatInfo.intensity);
    }
  }
}

// Efecto modular ejemplo
class ParticleEffect {
  constructor(plugin) {
    this.plugin = plugin;
    this.particles = [];
  }

  async init() {
    this.setupParticlePool();
  }

  render(audioData, deltaTime) {
    this.updateParticles(audioData, deltaTime);
    this.drawParticles();
  }

  // Métodos específicos del efecto...
}
```

---

## 🎨 PATRONES Y BEST PRACTICES

### 1. Audio Reactive Patterns

#### **Bass-Driven Size:**
```javascript
render(audioData, deltaTime) {
  const bassIntensity = audioData.frequencyBands.bass;
  const reactiveSize = this.baseSize * (1 + bassIntensity * this.config.reactivity);
  
  // Smooth size changes
  this.currentSize = this.lerp(this.currentSize, reactiveSize, 0.15);
}
```

#### **Multi-Band Reactivity:**
```javascript
render(audioData, deltaTime) {
  const { bass, mid, treble } = audioData.frequencyBands;
  
  // Different elements react to different frequencies
  this.particles.forEach(particle => {
    switch (particle.type) {
      case 'bass':
        particle.intensity = bass;
        break;
      case 'mid':
        particle.rotation += mid * deltaTime * 0.01;
        break;
      case 'treble':
        particle.sparkle = treble > 0.7;
        break;
    }
  });
}
```

#### **Beat Reaction System:**
```javascript
onBeat(intensity) {
  // Immediate beat effects
  this.beatFlash = intensity;
  this.beatScale = 1 + intensity * 0.5;
  
  // Trigger new elements
  if (intensity > 0.8) {
    this.spawnBeatParticles(intensity);
  }
  
  // Store beat timing for delayed effects
  this.beatTimings.push({
    timestamp: performance.now(),
    intensity: intensity
  });
}

render(audioData, deltaTime) {
  // Apply beat decay
  this.beatFlash *= 0.95;
  this.beatScale = this.lerp(this.beatScale, 1.0, 0.1);
  
  // Process timed effects
  this.processTimedBeatEffects();
}
```

### 2. Performance Optimization Patterns

#### **Object Pooling:**
```javascript
class OptimizedPlugin extends BaseVisualizer {
  constructor(canvas, config) {
    super(canvas, config);
    
    // Object pools
    this.particlePool = [];
    this.effectPool = [];
    this.activeParticles = [];
  }

  spawnParticle(x, y, velocity) {
    // Reuse objects from pool
    let particle = this.particlePool.pop();
    if (!particle) {
      particle = new Particle();
    }
    
    particle.reset(x, y, velocity);
    this.activeParticles.push(particle);
    return particle;
  }

  destroyParticle(particle) {
    // Return to pool instead of GC
    const index = this.activeParticles.indexOf(particle);
    if (index > -1) {
      this.activeParticles.splice(index, 1);
      this.particlePool.push(particle);
    }
  }
}
```

#### **Adaptive Quality:**
```javascript
class AdaptivePlugin extends BaseVisualizer {
  constructor(canvas, config) {
    super(canvas, config);
    this.qualityLevel = 1.0; // Start at full quality
    this.performanceHistory = [];
  }

  render(audioData, deltaTime) {
    const renderStart = performance.now();
    
    // Adjust rendering based on quality level
    const particleCount = Math.floor(
      this.config.maxParticles * this.qualityLevel
    );
    
    this.renderParticles(particleCount, audioData, deltaTime);
    
    // Track performance
    const renderTime = performance.now() - renderStart;
    this.trackPerformance(renderTime);
  }

  trackPerformance(renderTime) {
    this.performanceHistory.push(renderTime);
    if (this.performanceHistory.length > 60) { // 1 second of data
      this.performanceHistory.shift();
    }
    
    // Adjust quality based on performance
    const avgRenderTime = this.performanceHistory.reduce((a, b) => a + b) 
                         / this.performanceHistory.length;
    
    if (avgRenderTime > 13) { // Too slow for 60fps
      this.qualityLevel = Math.max(0.25, this.qualityLevel - 0.1);
    } else if (avgRenderTime < 8) { // Room for improvement
      this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.05);
    }
  }
}
```

#### **Canvas Optimization:**
```javascript
class CanvasOptimizedPlugin extends BaseVisualizer {
  render(audioData, deltaTime) {
    const ctx = this.ctx;
    
    // Batch similar operations
    ctx.save();
    
    // Set styles once for multiple draws
    ctx.fillStyle = this.config.color;
    ctx.globalAlpha = 0.8;
    
    // Use requestAnimationFrame's provided timestamp
    this.animateElements(deltaTime);
    
    // Avoid unnecessary state changes
    if (this.needsBlending) {
      ctx.globalCompositeOperation = 'multiply';
    }
    
    // Batch geometry
    this.drawBatchedShapes();
    
    ctx.restore();
  }

  drawBatchedShapes() {
    // Draw all circles in one path
    this.ctx.beginPath();
    this.circles.forEach(circle => {
      this.ctx.moveTo(circle.x + circle.radius, circle.y);
      this.ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    });
    this.ctx.fill();
  }
}
```

### 3. Mobile Optimization Patterns

```javascript
class MobileOptimizedPlugin extends BaseVisualizer {
  constructor(canvas, config) {
    super(canvas, config);
    
    // Detect mobile
    this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
                    .test(navigator.userAgent);
    
    if (this.isMobile) {
      this.applyMobileOptimizations();
    }
  }

  applyMobileOptimizations() {
    // Reduce particle count
    this.config.maxParticles = Math.floor(this.config.maxParticles * 0.5);
    
    // Disable expensive effects
    this.config.enableGlow = false;
    this.config.enableBlur = false;
    
    // Reduce update frequency
    this.skipFrames = 1; // Render every other frame
  }

  render(audioData, deltaTime) {
    // Skip frames on mobile
    if (this.isMobile && (this.frameCount % (this.skipFrames + 1)) !== 0) {
      this.frameCount++;
      return;
    }
    
    // Mobile-specific rendering
    if (this.isMobile) {
      this.renderMobile(audioData, deltaTime);
    } else {
      this.renderDesktop(audioData, deltaTime);
    }
    
    this.frameCount++;
  }
}
```

---

## 🧪 TESTING AVANZADO

### 1. Unit Tests Completos

```javascript
// tests/AdvancedPlugin.test.js
import AdvancedPlugin from '../src/AdvancedPlugin.js';
import { 
  createMockCanvas, 
  createMockAudioData, 
  PerformanceProfiler 
} from 'spectravisio-test-utils';

describe('AdvancedPlugin', () => {
  let plugin;
  let canvas;
  let profiler;

  beforeEach(async () => {
    canvas = createMockCanvas(800, 600);
    plugin = new AdvancedPlugin(canvas);
    profiler = new PerformanceProfiler();
    await plugin.init();
  });

  afterEach(() => {
    plugin.destroy();
  });

  describe('Audio Reactivity', () => {
    test('should react proportionally to bass levels', () => {
      const lowBass = createMockAudioData({ bass: 0.1 });
      const highBass = createMockAudioData({ bass: 0.9 });
      
      plugin.render(lowBass, 16.67);
      const lowBassState = plugin.getVisualIntensity();
      
      plugin.render(highBass, 16.67);
      const highBassState = plugin.getVisualIntensity();
      
      expect(highBassState).toBeGreaterThan(lowBassState);
    });

    test('should trigger beat effects', () => {
      const beatData = createMockAudioData({ 
        beatInfo: { detected: true, intensity: 0.8 } 
      });
      
      const initialEffects = plugin.getActiveEffects().length;
      plugin.render(beatData, 16.67);
      const afterBeatEffects = plugin.getActiveEffects().length;
      
      expect(afterBeatEffects).toBeGreaterThan(initialEffects);
    });
  });

  describe('Performance', () => {
    test('should maintain target FPS under load', async () => {
      const targetFPS = 60;
      const testDuration = 1000; // 1 second
      const startTime = performance.now();
      let frameCount = 0;
      
      while (performance.now() - startTime < testDuration) {
        const frameStart = performance.now();
        
        const audioData = createMockAudioData({ 
          bass: Math.random(),
          energy: Math.random() 
        });
        
        plugin.render(audioData, 16.67);
        
        const frameTime = performance.now() - frameStart;
        expect(frameTime).toBeLessThan(16.67); // 60fps budget
        
        frameCount++;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      const actualFPS = frameCount;
      expect(actualFPS).toBeGreaterThanOrEqual(targetFPS * 0.9); // 10% tolerance
    });

    test('should not leak memory during long runs', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Run 1000 frames
      for (let i = 0; i < 1000; i++) {
        const audioData = createMockAudioData();
        plugin.render(audioData, 16.67);
        
        if (i % 100 === 0) {
          // Force garbage collection if available
          if (global.gc) global.gc();
        }
      }
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory should not increase significantly
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB limit
    });
  });

  describe('Parameter Changes', () => {
    test('should update parameters without errors', () => {
      const parameters = plugin.getParameterDefinitions();
      
      Object.keys(parameters).forEach(key => {
        const param = parameters[key];
        let testValue;
        
        switch (param.type) {
          case 'range':
            testValue = param.min + (param.max - param.min) / 2;
            break;
          case 'color':
            testValue = '#ff0000';
            break;
          case 'boolean':
            testValue = !param.default;
            break;
          case 'select':
            testValue = param.options[1] || param.options[0];
            break;
        }
        
        expect(() => {
          plugin.onParameterChange(key, testValue);
        }).not.toThrow();
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle null audio data gracefully', () => {
      expect(() => {
        plugin.render(null, 16.67);
      }).not.toThrow();
    });

    test('should handle canvas resize', () => {
      expect(() => {
        plugin.resize(1920, 1080);
        plugin.render(createMockAudioData(), 16.67);
      }).not.toThrow();
    });

    test('should handle rapid parameter changes', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          plugin.onParameterChange('intensity', Math.random());
        }
      }).not.toThrow();
    });
  });
});
```

### 2. Integration Tests

```javascript
// tests/integration/PluginIntegration.test.js
describe('Plugin Integration', () => {
  test('should integrate with SpectraVisio core', async () => {
    const spectra = new SpectraVisio(createMockCanvas());
    await spectra.init();
    
    // Load plugin
    await spectra.pluginManager.loadPlugin('my-awesome-plugin');
    
    // Set as active
    await spectra.setPlugin('my-awesome-plugin');
    
    expect(spectra.pluginManager.activePlugin).toBeInstanceOf(MyAwesomePlugin);
  });

  test('should work with layer system', async () => {
    const layerManager = new LayerManager(createMockCanvas());
    
    const layerId = layerManager.addLayer('my-awesome-plugin', {
      opacity: 0.7,
      blendMode: 'multiply'
    });
    
    expect(layerId).toBeDefined();
    
    // Render layer
    const audioData = createMockAudioData();
    await layerManager.render(audioData, 16.67);
    
    expect(() => {
      layerManager.compositeLayers();
    }).not.toThrow();
  });
});
```

### 3. Visual Testing

```javascript
// tests/visual/VisualRegression.test.js
describe('Visual Regression', () => {
  test('should match expected visual output', async () => {
    const plugin = new MyAwesomePlugin(createMockCanvas(400, 300));
    await plugin.init();
    
    // Render with known audio data
    const knownAudioData = createMockAudioData({ 
      bass: 0.5, 
      mid: 0.3, 
      treble: 0.8 
    });
    
    plugin.render(knownAudioData, 16.67);
    
    // Capture frame
    const imageData = plugin.canvas.getContext('2d').getImageData(
      0, 0, 400, 300
    );
    
    // Compare with baseline (simplified)
    const hash = generateImageHash(imageData);
    expect(hash).toMatchSnapshot();
  });
});
```

---

## 📦 PUBLISHING Y DISTRIBUCIÓN

### 1. Preparación para Release

**package.json:**
```json
{
  "name": "spectravisio-plugin-my-awesome",
  "version": "1.0.0",
  "description": "Pulsating circles reactive to bass",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  
  "keywords": [
    "spectravisio",
    "plugin",
    "audio-visual",
    "bass-reactive"
  ],
  
  "repository": {
    "type": "git",
    "url": "https://github.com/yourname/spectravisio-plugin-my-awesome"
  },
  
  "peerDependencies": {
    "spectravisio-sdk": "^1.0.0"
  },
  
  "files": [
    "dist/",
    "assets/",
    "config/",
    "README.md"
  ],
  
  "scripts": {
    "build": "rollup -c",
    "test": "jest",
    "test:visual": "jest --config=jest.visual.config.js",
    "lint": "eslint src/",
    "docs": "jsdoc src/ -d docs/"
  }
}
```

### 2. Build Configuration

**rollup.config.js:**
```javascript
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/index.js',
      format: 'umd',
      name: 'MyAwesomePlugin'
    },
    {
      file: 'dist/index.esm.js', 
      format: 'esm'
    },
    {
      file: 'dist/index.min.js',
      format: 'umd',
      name: 'MyAwesomePlugin',
      plugins: [terser()]
    }
  ],
  plugins: [
    resolve()
  ],
  external: ['spectravisio-sdk']
};
```

### 3. Documentación del Plugin

**README.md template:**
```markdown
# My Awesome Plugin

Pulsating circles that react beautifully to bass frequencies.

## Installation

```bash
npm install spectravisio-plugin-my-awesome
```

## Usage

```javascript
import SpectraVisio from 'spectravisio';
import MyAwesomePlugin from 'spectravisio-plugin-my-awesome';

const spectra = new SpectraVisio(canvas);
await spectra.pluginManager.registerPlugin(MyAwesomePlugin);
await spectra.setPlugin('my-awesome-plugin');
```

## Parameters

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| circleCount | range | 1-20 | 5 | Number of circles |
| maxRadius | range | 20-200 | 100 | Maximum circle size |
| color | color | - | #ff6b6b | Circle color |
| reactivity | range | 0-1 | 0.8 | Bass reactivity |

## Demo

![Demo](assets/demo.gif)

## Performance

- **Complexity**: Low
- **Target FPS**: 60
- **Memory Usage**: Low
- **Mobile Compatible**: Yes

## Development

```bash
git clone https://github.com/yourname/spectravisio-plugin-my-awesome
cd spectravisio-plugin-my-awesome
npm install
npm run dev
```

## License

MIT
```

### 4. Submission a Plugin Registry

```bash
# Build final
npm run build
npm run test
npm run lint

# Tag version
git tag v1.0.0
git push origin v1.0.0

# Publish to NPM
npm publish

# Submit to SpectraVisio Plugin Registry
spectra-cli plugin submit
```

---

## 🔧 HERRAMIENTAS DE DESARROLLO

### 1. SpectraVisio CLI

```bash
# Instalar CLI
npm install -g spectravisio-cli

# Crear nuevo plugin
spectra-cli create plugin my-awesome-plugin

# Desarrollo con hot reload
spectra-cli dev

# Test integrado con SpectraVisio
spectra-cli test --integration

# Build optimizado
spectra-cli build --optimize

# Análisis de performance
spectra-cli analyze --performance
```

### 2. Plugin Debugger

```javascript
// Habilitar debug mode en desarrollo
if (process.env.NODE_ENV === 'development') {
  plugin.enableDebugMode({
    showPerformanceMetrics: true,
    showAudioAnalysis: true,
    showParameterValues: true,
    enableHotReload: true
  });
}
```

### 3. Template Generator

```bash
# Templates disponibles
spectra-cli template list

# Particle system template
spectra-cli template use particle-system

# WebGL shader template  
spectra-cli template use webgl-shader

# Multi-layer effect template
spectra-cli template use multi-layer
```

---

## 📚 RECURSOS ADICIONALES

### 1. Ejemplos de Plugins
- [Plugin Tunnel](https://github.com/spectravisio/plugin-tunnel) - Efecto túnel 3D
- [Plugin Plasma](https://github.com/spectravisio/plugin-plasma) - Plasma fractal
- [Plugin Particles](https://github.com/spectravisio/plugin-particles) - Sistema de partículas

### 2. Documentación
- [SpectraVisio API Reference](./SpectraVisio_API_Reference.md)
- [Audio Analysis Guide](./docs/audio-analysis.md)
- [Performance Optimization](./docs/performance.md)

### 3. Comunidad
- [Discord](https://discord.gg/spectravisio)
- [Forum](https://forum.spectravisio.dev)
- [Plugin Showcase](https://plugins.spectravisio.dev)

---

*Guía actualizada para SpectraVisio v1.0 - Happy coding! 🎵✨*