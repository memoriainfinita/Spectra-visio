# SpectraVisio - Product Requirements Document (PRD)

**Versión:** 1.0  
**Fecha:** Enero 6, 2026  
**Autor:** [Tu Nombre]  
**Estado:** Draft

---

## 📋 Resumen Ejecutivo

**SpectraVisio** es un visualizador de audio web multiplataforma, diseñado como el componente central de la suite audiovisual **Spectra**. Proporciona visualizaciones psicodélicas e inmersivas sincronizadas con audio en tiempo real, dirigido a VJs, DJs, audiophiles y usuarios casuales que buscan una experiencia visual rica durante la reproducción de música, podcasts, meditaciones o audiolibros.

### Propuesta de Valor
- **Multiplataforma**: Funciona en cualquier navegador moderno
- **Opensource**: GPL, fomentando la contribución comunitaria
- **Modular**: Sistema extensible de plugins para visualizaciones
- **Profesional**: Herramientas avanzadas para VJs/DJs
- **Accesible**: Interfaz minimalista para usuarios casuales

---

## 🎯 Objetivos del Producto

### Objetivo Principal
Crear la base sólida y modular para un ecosistema de visualización de audio que permita a cualquier usuario, desde casuales hasta profesionales, disfrutar de experiencias audiovisuales inmersivas y personalizables.

### Objetivos Específicos
1. **Experiencia Universal**: Funcionar sin fricción en desktop, tablet y móvil
2. **Extensibilidad**: Arquitectura que permita fácil adición de nuevas visualizaciones
3. **Performance**: Renderizado fluido sin impacto en la reproducción de audio
4. **Simplicidad**: Interfaz que no interfiera con la experiencia visual
5. **Comunidad**: Base para que desarrolladores contribuyan con nuevos módulos

---

## 👥 Audiencia Objetivo

### Usuarios Primarios
- **VJs/DJs Profesionales**: Control preciso, múltiples modos, personalización avanzada
- **Audiophiles**: Experiencia visual premium durante sesiones de escucha
- **Creadores de Contenido**: Para streams, videos, presentaciones

### Usuarios Secundarios
- **Usuarios Casuales**: Entretenimiento visual mientras escuchan música
- **Meditación/Relajación**: Visuales calmantes para sesiones de mindfulness
- **Desarrolladores**: Plataforma para crear y compartir nuevas visualizaciones

### Casos de Uso Específicos
1. **VJ en vivo**: Control por teclado, cambio rápido entre modos
2. **Sesión de escucha personal**: Modo automático, pantalla completa
3. **Stream en directo**: Captura de pantalla, efectos personalizados
4. **Desarrollo**: Creación y testeo de nuevos plugins de visualización

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico
- **Frontend**: Vanilla JavaScript (ES6+) + Web Components
- **CSS**: TweakCSS para styling minimalista y responsive
- **Audio**: Web Audio API para análisis en tiempo real
- **Gráficos**: Canvas 2D con optimizaciones de performance
- **Módulos**: ES6 Modules + Dynamic Imports para plugins

### Estructura del Proyecto
```
spectravisio/
├── index.html                  # Punto de entrada
├── src/
│   ├── core/
│   │   ├── SpectraVisio.js    # Clase principal
│   │   ├── AudioEngine.js     # Procesamiento de audio
│   │   ├── PluginManager.js   # Gestión de plugins
│   │   └── ConfigManager.js   # Configuración y presets
│   ├── plugins/
│   │   ├── BaseVisualizer.js  # Interfaz base para plugins
│   │   ├── tunnel/            # Plugin Tunnel
│   │   ├── ribbons/           # Plugin Ribbons
│   │   ├── plasma/            # Plugin Plasma
│   │   ├── kaleido/           # Plugin Kaleidoscope
│   │   ├── orbitals/          # Plugin Orbitals
│   │   ├── gridwarp/          # Plugin Grid Warp
│   │   └── strobebloom/       # Plugin Strobe Bloom
│   ├── ui/
│   │   ├── UIController.js    # Controlador de interfaz
│   │   ├── KeyboardHandler.js # Gestión de teclas
│   │   └── PresetManager.js   # Gestión de presets
│   └── utils/
│       ├── MathUtils.js       # Utilidades matemáticas
│       └── ColorUtils.js      # Utilidades de color
├── assets/
│   ├── css/
│   │   └── styles.css         # Estilos principales
│   └── icons/                 # Iconografía SVG
├── docs/
│   ├── api/                   # Documentación de API
│   ├── plugins/               # Guía de desarrollo de plugins
│   └── examples/              # Ejemplos de código
└── tests/
    ├── unit/                  # Tests unitarios
    └── integration/           # Tests de integración
```

---

## ⚡ Funcionalidades Core

### 1. Motor de Audio
- **Entrada múltiple**: Micrófono, archivos locales, URLs de streaming
- **Análisis avanzado**: FFT, detección de BPM, 7 bandas personalizables
- **Frequency Splitting**: Análisis detallado por bandas (20Hz-20kHz)
- **Stereo Field Analysis**: Análisis espacial completo L/R/Center
- **Control de tempo**: BPM manual y detección automática
- **Formatos soportados**: MP3, WAV, OGG, streaming URLs

### 2. Sistema de Visualización
- **7+ modos iniciales**: Ver documento de visualizaciones completo
- **Blend Modes & Layers**: Sistema de hasta 4 capas con 7 blend modes
- **Reactive Elements**: Elementos que reaccionan a frecuencias específicas
- **Renderizado Canvas**: 60 FPS con optimizaciones adaptativas
- **Performance scaling**: Calidad adaptativa según hardware
- **Responsivo**: Adaptación automática a cualquier resolución

### 3. Sistema de Plugins
- **API estandarizada**: Interfaz `BaseVisualizer` para nuevos plugins
- **Carga dinámica**: Lazy loading de visualizaciones
- **Hot-swapping**: Cambio de plugins sin interrumpir el audio
- **Configuración modular**: Cada plugin define sus propios parámetros
- **Multi-layer support**: Plugins compatibles con sistema de capas

### 4. Performance Controls
- **Snapshots/Scenes**: 8 slots para configuraciones guardadas
- **Crossfader**: Sistema A/B con morfing entre configuraciones
- **Trigger Pads**: 8 pads programables para efectos instantáneos
- **XY Performance Pad**: Control bidimensional en tiempo real
- **Performance Monitor**: Monitoreo FPS/memoria en tiempo real

### 5. Controles e Interfaz
- **Minimalista**: UI discreta que no interfiere con visualizaciones
- **Teclado avanzado**: Más de 20 shortcuts para control profesional
- **Táctil**: Soporte completo para dispositivos touch
- **Ocultable**: Interfaz completamente removible para experiencia pura
- **Responsive**: Adaptación inteligente según tamaño de pantalla

### 6. Configuración y Presets
- **Parámetros ajustables**: Velocidad, sensibilidad, colores, densidad por visualización
- **Presets locales**: Guardado en localStorage del navegador
- **Import/Export**: Compartir configuraciones vía archivos JSON
- **Modo automático**: Rotación configurable entre visualizaciones
- **Quality presets**: 4 niveles de calidad predefinidos

---

## 🎮 Especificación de Controles

### Controles de Teclado
| Tecla | Función |
|-------|---------|
| `Espacio` | Play/Pause |
| `F` | Pantalla completa |
| `H` | Ocultar/Mostrar UI |
| `←/→` | Cambiar visualización |
| `↑/↓` | Ajustar sensibilidad |
| `1-7` | Selección directa de modo |
| `A` | Toggle modo automático |
| `C` | Panel de configuración |
| `P` | Gestión de presets |
| `Esc` | Salir de pantalla completa |

### Controles Táctiles
- **Tap**: Iniciar/pausar
- **Doble tap**: Pantalla completa
- **Swipe horizontal**: Cambiar visualización
- **Pinch**: Zoom (donde aplique)
- **Long press**: Mostrar menú contextual

---

## 🔧 API de Plugins

### Interfaz BaseVisualizer
```javascript
class BaseVisualizer {
  constructor(canvas, config) {}
  
  // Métodos obligatorios
  init()                    // Inicialización
  render(audioData, delta)  // Renderizado principal
  resize(width, height)     // Redimensionado
  destroy()                 // Limpieza
  
  // Métodos opcionales
  onParameterChange(key, value)  // Cambio de parámetros
  getDefaultConfig()             // Configuración por defecto
  getParameterDefinitions()      // Definición de parámetros UI
}
```

### AudioData Structure
```javascript
{
  frequencyData: Uint8Array,    // Datos de frecuencia (0-255)
  timedomainData: Uint8Array,   // Datos de forma de onda
  bass: Number,                 // Energía graves (0-1)
  mid: Number,                  // Energía medios (0-1)
  treble: Number,              // Energía agudos (0-1)
  bpm: Number,                 // BPM detectado/manual
  energy: Number               // Energía total (0-1)
}
```

---

## 🎨 Especificaciones de UI/UX

### Principios de Diseño
1. **Las visualizaciones son protagonistas**: UI nunca debe competir visualmente
2. **Acceso rápido**: Funciones principales accesibles en <2 interacciones
3. **Progresivo**: Funciones avanzadas ocultas hasta que se necesiten
4. **Responsive**: Experiencia óptima en cualquier dispositivo
5. **Accesible**: Soporte para lectores de pantalla y navegación por teclado

### Estados de la Interfaz
- **Modo Completo**: Controles visibles y panel de configuración disponible
- **Modo Minimal**: Solo controles esenciales (play/pause, modo)
- **Modo Inmersivo**: UI completamente oculta, solo controles de teclado
- **Modo Configuración**: Panel expandido con todos los ajustes

### Responsive Breakpoints
- **Mobile**: < 768px - Controles táctiles optimizados
- **Tablet**: 768px - 1024px - Híbrido táctil/mouse
- **Desktop**: > 1024px - Controles completos de teclado/mouse

---

## 📊 Métricas y KPIs

### Métricas Técnicas
- **Performance**: Mantener 60 FPS con scaling adaptativo
- **Memoria**: Uso < 256MB RAM con múltiples capas activas
- **Carga**: Tiempo de inicio < 2 segundos
- **Compatibilidad**: Funcionar en navegadores con >95% market share
- **Quality scaling**: Detección automática y ajuste < 500ms

### Métricas de Usuario
- **Engagement**: Tiempo de uso por sesión
- **Performance features**: Uso de snapshots, crossfader, trigger pads
- **Layer adoption**: Porcentaje de usuarios que usan múltiples capas
- **Advanced audio**: Uso de frequency splitting y stereo analysis
- **Personalización**: Uso de presets y configuraciones avanzadas
- **Contribución**: Plugins desarrollados por la comunidad

### Métricas de Desarrollo
- **Contribuciones**: PRs de la comunidad por mes
- **Issues**: Tiempo de resolución de bugs
- **Documentación**: Coverage de API documentada
- **Tests**: Cobertura de código > 80%

---

## 🚀 Roadmap de Desarrollo

### Fase 1: Core Foundation (Meses 1-2)
- [ ] Arquitectura base y sistema de plugins
- [ ] Motor de audio con Web Audio API básico
- [ ] Migración de 7 visualizaciones actuales a plugins
- [ ] UI minimalista con TweakCSS
- [ ] Controles de teclado básicos
- [ ] Sistema de presets básico

### Fase 2: Advanced Audio & Visuals (Meses 3-4)
- [ ] Frequency Splitting (7 bandas personalizables)
- [ ] Stereo Field Analysis completo
- [ ] Reactive Elements por banda de frecuencia
- [ ] Blend Modes & Layer System (hasta 3 capas)
- [ ] Detección de BPM mejorada
- [ ] Soporte para archivos de audio locales

### Fase 3: Performance Controls (Mes 5)
- [ ] Sistema de Snapshots/Scenes (8 slots)
- [ ] Crossfader con morfing entre configuraciones
- [ ] Trigger Pads (8 pads programables)
- [ ] XY Performance Pad
- [ ] Performance Monitor en tiempo real
- [ ] Quality scaling adaptativo

### Fase 4: Polish & Optimization (Mes 6)
- [ ] Optimizaciones de rendimiento avanzadas
- [ ] 4 presets de calidad (Potato a Maximum)
- [ ] Responsive design completo
- [ ] Testing exhaustivo cross-browser
- [ ] Panel de configuración completo

### Fase 5: Developer Ecosystem (Mes 7)
- [ ] API de plugins finalizada con layer support
- [ ] Documentación completa para desarrolladores
- [ ] Ejemplos y tutoriales avanzados
- [ ] Sistema de contribución en GitHub
- [ ] Plugin template generator

### Fase 6: Community & Extensions (Ongoing)
- [ ] Nuevos plugins de la comunidad
- [ ] Integración con otros componentes de Spectra
- [ ] Hardware Integration (MIDI, OSC)
- [ ] Streaming Integration avanzada
- [ ] Recording & Export capabilities

---

## 🛡️ Consideraciones Técnicas

### Performance
- **Canvas Optimization**: Usar `OffscreenCanvas` cuando esté disponible
- **Memory Management**: Cleanup automático de recursos no utilizados
- **RequestAnimationFrame**: Sincronización perfecta con refresh rate
- **Web Workers**: Para análisis de audio pesado (futuro)

### Compatibilidad
- **Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **APIs requeridas**: Web Audio API, Canvas 2D, ES6 Modules
- **Graceful degradation**: Fallbacks para navegadores limitados

### Seguridad
- **CSP**: Content Security Policy estricta
- **CORS**: Manejo seguro de recursos externos
- **Input validation**: Sanitización de configuraciones importadas
- **Privacy**: Sin tracking, solo localStorage local

### Accesibilidad
- **WCAG 2.1 AA**: Compliance con estándares de accesibilidad
- **Keyboard navigation**: Navegación completa sin mouse
- **Screen readers**: ARIA labels apropiados
- **Motion sensitivity**: Opciones para reducir efectos intensos

---

## 📚 Documentación Requerida

### Para Usuarios
- **Quick Start Guide**: Configuración inicial y uso básico
- **User Manual**: Guía completa de todas las funcionalidades
- **Keyboard Shortcuts**: Referencia rápida de controles
- **Troubleshooting**: Soluciones a problemas comunes

### Para Desarrolladores
- **Plugin Development Guide**: Tutorial completo de creación de plugins
- **API Reference**: Documentación detallada de todas las APIs
- **Architecture Overview**: Explicación de la estructura del sistema
- **Contributing Guidelines**: Proceso de contribución al proyecto
- **Code Examples**: Ejemplos prácticos y templates

### Técnica
- **Build Instructions**: Proceso de compilación y despliegue
- **Testing Guide**: Cómo ejecutar y crear tests
- **Performance Guidelines**: Best practices para optimización
- **Browser Support Matrix**: Compatibilidad detallada

---

## ✅ Criterios de Aceptación

### Funcionalidad
- [ ] Todas las visualizaciones funcionan como plugins modulares
- [ ] Sistema de audio con frequency splitting y stereo analysis
- [ ] Blend modes y layer system (hasta 4 capas) funcional
- [ ] Reactive elements responden a bandas específicas
- [ ] Snapshots/scenes (8 slots) guardan estado completo
- [ ] Crossfader permite morfing suave entre configuraciones
- [ ] Trigger pads (8) responden instantáneamente
- [ ] XY pad controla parámetros en tiempo real
- [ ] Controles de teclado avanzados (20+ shortcuts)
- [ ] UI se puede ocultar/mostrar sin afectar performance
- [ ] Performance monitor detecta y optimiza automáticamente
- [ ] Modo automático funciona con timing configurable

### Performance
- [ ] 60 FPS constantes en hardware moderno
- [ ] Tiempo de carga inicial < 2 segundos
- [ ] Uso de memoria estable durante sesiones largas
- [ ] Sin lag en cambio de visualizaciones
- [ ] Audio sync perfecto con visuales

### Compatibilidad
- [ ] Funciona en al menos 4 navegadores principales
- [ ] Responsive design en móviles, tablets y desktop
- [ ] Accesible vía teclado completo
- [ ] Graceful degradation en navegadores limitados

### Código
- [ ] Arquitectura modular y extensible
- [ ] Cobertura de tests > 80%
- [ ] Documentación completa de API
- [ ] Código linting y formatting consistente
- [ ] Zero dependencies externas críticas

---

## 🎉 Definición de "Hecho"

Un feature se considera completo cuando:

1. ✅ **Código implementado** y revisado
2. ✅ **Tests unitarios** pasando al 100%
3. ✅ **Documentación** actualizada (usuario y desarrollador)
4. ✅ **Performance** validado en dispositivos objetivo
5. ✅ **Cross-browser** testing completado
6. ✅ **Accesibilidad** verificada
7. ✅ **Demo/ejemplo** funcional disponible

---

## 🏷️ Metadatos del Proyecto

**Nombre del Proyecto**: SpectraVisio  
**Suite**: Spectra  
**Licencia**: GPL v3  
**Repositorio**: GitHub  
**Hosting**: GitHub Pages  
**Target Release**: Q2 2026  
**Maintainer**: [Tu Nombre]  

**Tags**: `audio-visualization`, `web-audio`, `vj-tools`, `opensource`, `modular`, `canvas`, `real-time`

---

*Este PRD es un documento vivo que evolucionará con el desarrollo del proyecto y el feedback de la comunidad.*
