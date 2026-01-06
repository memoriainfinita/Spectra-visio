# SpectraVisio - User Manual

**Versión:** 1.0  
**Fecha:** Enero 6, 2026  
**Autor:** [Tu Nombre]  
**Estado:** Draft

---

## 📖 Propósito del Documento

Manual completo de usuario para **SpectraVisio**:
- 🚀 **Getting Started** - Primeros pasos y configuración
- 🎛️ **Interface Guide** - Tour completo de la interfaz
- 🎨 **Visual Effects** - Guía de todas las visualizaciones
- 🎵 **Audio Setup** - Configuración de fuentes de audio
- 🎪 **Live Performance** - Tips para uso en vivo
- 🔧 **Troubleshooting** - Solución de problemas comunes

---

## 🚀 GETTING STARTED

### 1. Acceso a SpectraVisio

**Opciones de acceso:**
- 🌐 **Web App**: [https://spectravisio.dev](https://spectravisio.dev)
- 📱 **PWA**: Instalar desde el navegador (Add to Home Screen)
- 💿 **Desktop**: Descargar app nativa (próximamente)

**Requisitos del sistema:**
- 🌐 **Navegador**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- 🎤 **Audio**: Micrófono o fuente de audio
- 💻 **Hardware**: Mínimo 4GB RAM, GPU dedicada recomendada

### 2. Primer Uso

**Configuración inicial:**

1. **Permitir acceso al micrófono**
   - Click en "Allow" cuando el navegador lo solicite
   - Si se bloqueó, click en el icono de micrófono en la barra de direcciones

2. **Seleccionar visualización**
   - Usa los números **1-7** para cambiar entre plugins base
   - O click en el selector de plugins en la interfaz

3. **Ajustar configuración**
   - **Volumen**: Slider principal en la parte superior
   - **Intensidad**: Controla qué tan reactivo es el visual
   - **Calidad**: Auto, Alta, Media, Batería

**¡Ya estás listo para comenzar! 🎉**

### 3. Controles Básicos

| Tecla | Acción |
|-------|--------|
| **Espacio** | Pausar/Reproducir |
| **1-7** | Cambiar plugin base |
| **↑/↓** | Ajustar intensidad |
| **←/→** | Cambiar velocidad |
| **F** | Pantalla completa |
| **R** | Reset configuración |
| **H** | Mostrar/ocultar ayuda |

---

## 🎛️ INTERFAZ DE USUARIO

### 1. Layout Principal

```
┌─────────────────────────────────────────────────────────────┐
│  🎵 SpectraVisio    [🎤] [⚙️] [📊] [🎬]    [⚡] [🔧]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     ÁREA DE                                 │
│                  VISUALIZACIÓN                              │
│                    (Canvas)                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Plugin: [Tunnel ▼]  Intensidad: ━━━━━○━━  Calidad: [Auto]  │
│  [🎨 Parámetros] [🎬 Scenes] [⚡ Performance] [❓ Ayuda]    │
└─────────────────────────────────────────────────────────────┘
```

### 2. Barra Superior

#### **Logo y Título**
- Click para volver a la configuración inicial

#### **Controles de Audio** 🎤
- **Micrófono**: Activar/desactivar entrada de micrófono
- **Archivos**: Cargar archivo de audio (MP3, WAV, OGG)
- **Streaming**: Conectar a stream de audio online

#### **Herramientas** ⚙️
- **Configuración**: Ajustes generales de la aplicación
- **Plugins**: Explorar y cargar nuevos plugins
- **Presets**: Guardar y cargar configuraciones

#### **Análisis** 📊
- **Frecuencias**: Visualizar análisis en tiempo real
- **BPM**: Monitor de beats por minuto
- **Estéreo**: Análisis del campo estéreo

#### **Grabación** 🎬
- **Capturar**: Tomar screenshot del visual actual
- **Grabar**: Iniciar grabación de video (WebM, MP4)
- **Streaming**: Conectar a OBS/streaming software

#### **Estado del Sistema**
- **⚡ Verde**: Rendimiento óptimo (60fps)
- **🟡 Amarillo**: Rendimiento moderado (30-59fps)  
- **🔴 Rojo**: Bajo rendimiento (<30fps)

#### **Configuración Rápida** 🔧
- **Pantalla completa**: Toggle fullscreen
- **Ocultar UI**: Modo performance/presentación
- **Reset**: Volver a configuración por defecto

### 3. Área de Visualización

**Área central donde se renderiza el visual activo**
- **Canvas responsivo**: Se adapta al tamaño de pantalla
- **Click/Touch**: Interacción con algunos plugins
- **Scroll**: Zoom en plugins que lo soporten
- **Drag**: Rotación/movimiento en plugins 3D

### 4. Panel de Control Inferior

#### **Selector de Plugin**
- **Dropdown**: Lista de todos los plugins disponibles
- **Thumbnails**: Vista previa de cada plugin
- **Categorías**: Filtrar por tipo (Abstract, Geometric, Nature, etc.)
- **Favoritos**: Marcar plugins más usados

#### **Control de Intensidad**
- **Slider horizontal**: Ajuste fino de reactividad
- **Valores**: 0% (sin reacción) - 100% (máxima reacción)
- **Auto**: Ajuste automático basado en el audio

#### **Configuración de Calidad**
- **Auto**: Ajuste automático basado en rendimiento
- **Alta**: Máxima calidad visual (60fps target)
- **Media**: Balance calidad/rendimiento (30fps)
- **Batería**: Mínimo consumo (móviles)

### 5. Paneles Expandibles

#### **🎨 Panel de Parámetros**
```
┌─────────────────────────────────┐
│  Tunnel Parameters              │
├─────────────────────────────────┤
│  Speed        ━━━━○━━━━  1.2x    │
│  Color        [🔴]       #ff6b6b │
│  Depth        ━━━━━━○━━  75%     │
│  Rotation     ━○━━━━━━━  15°     │
│  Trail        ━━○━━━━━━  25%     │
│                                 │
│  🔄 Reset   💾 Save   📤 Share  │
└─────────────────────────────────┘
```

**Tipos de parámetros:**
- **Range Sliders**: Valores numéricos (velocidad, intensidad)
- **Color Pickers**: Selección de colores
- **Checkboxes**: Opciones on/off
- **Dropdowns**: Selección múltiple (blend modes, patterns)
- **Text Inputs**: Valores específicos

#### **🎬 Panel de Scenes**
```
┌─────────────────────────────────┐
│  Scene Management               │
├─────────────────────────────────┤
│  [📷 Capture Scene]             │
│                                 │
│  📸 Scene 1: "Bass Drop"        │
│  📸 Scene 2: "Ambient Chill"    │
│  📸 Scene 3: "High Energy"      │
│  📸 Scene 4: "Breakdown"        │
│                                 │
│  Crossfader: A ━━○━━━━━ B       │
│  [🔄 Linear] [📈 S-Curve]       │
└─────────────────────────────────┘
```

**Funciones:**
- **Capture**: Guardar configuración actual como scene
- **Recall**: Cargar scene guardado
- **Crossfader**: Mezcla suave entre dos scenes
- **Curves**: Diferentes curvas de crossfading

#### **⚡ Panel de Performance**
```
┌─────────────────────────────────┐
│  Performance Monitor            │
├─────────────────────────────────┤
│  FPS: 60  ████████████████ 100% │
│  CPU: 45% ████████░░░░░░░░ 45%  │
│  GPU: 23% ███░░░░░░░░░░░░░ 23%  │
│  MEM: 67% ██████████░░░░░░ 67%  │
│                                 │
│  Plugin Load Time: 12ms         │
│  Render Time: 8.3ms            │
│  Audio Process: 1.2ms          │
│                                 │
│  Quality: [Auto ▼]             │
│  [🔧 Advanced Settings]        │
└─────────────────────────────────┘
```

**Métricas:**
- **FPS**: Frames por segundo actual
- **CPU/GPU**: Uso de procesamiento
- **Memory**: Uso de memoria RAM
- **Timing**: Tiempos de cada proceso

---

## 🎨 GUÍA DE VISUALIZACIONES

### 1. Plugins Base (Incluidos)

#### **🌀 Tunnel (Plugin 1)**
```
Visual: Túnel infinito con efectos 3D
Reactividad: Bass (profundidad), Mid (rotación), Treble (color)
```

**Parámetros:**
- **Speed**: Velocidad de movimiento (0.1x - 5.0x)
- **Color**: Color principal del túnel
- **Depth**: Profundidad del efecto 3D
- **Rotation**: Velocidad de rotación
- **Trail**: Intensidad del efecto de estela
- **Perspective**: Ángulo de perspectiva

**Mejor para**: Música electrónica, bass drops, temas épicos

#### **🌊 Plasma (Plugin 2)**
```
Visual: Efectos de plasma fractal orgánico
Reactividad: Energy (ondulación), Beats (explosiones)
```

**Parámetros:**
- **Intensity**: Intensidad de las ondulaciones
- **Color Scheme**: Esquema de colores (Rainbow, Fire, Ice, Neon)
- **Turbulence**: Nivel de turbulencia
- **Flow Speed**: Velocidad del flujo
- **Brightness**: Brillo general
- **Contrast**: Contraste de colores

**Mejor para**: Ambient, progressive, música relajante

#### **🎀 Ribbons (Plugin 3)**
```
Visual: Cintas fluidas que danzan con el audio
Reactividad: Mid (movimiento), Treble (brillo)
```

**Parámetros:**
- **Ribbon Count**: Número de cintas (1-20)
- **Flow Speed**: Velocidad de movimiento
- **Color Mode**: Sólido, Gradiente, Reactivo
- **Thickness**: Grosor de las cintas
- **Gravity**: Efecto de gravedad
- **Bounce**: Rebote en los bordes

**Mejor para**: Jazz, clásica, música fluida

#### **✨ Particles (Plugin 4)**
```
Visual: Sistema de partículas reactivo
Reactividad: Bass (tamaño), Beats (explosión)
```

**Parámetros:**
- **Particle Count**: Cantidad de partículas
- **Size Range**: Rango de tamaños
- **Color**: Color base de partículas
- **Physics**: Gravedad, viento, atracción
- **Emission**: Patrón de emisión
- **Life Span**: Duración de vida

**Mejor para**: EDM, dubstep, música energética

#### **🔥 Fire (Plugin 5)**
```
Visual: Simulación realista de fuego
Reactividad: Energy (altura), Bass (intensidad)
```

**Parámetros:**
- **Heat**: Temperatura del fuego
- **Wind**: Dirección e intensidad del viento
- **Fuel**: Cantidad de combustible
- **Spark Count**: Número de chispas
- **Smoke**: Cantidad de humo
- **Color Temp**: Temperatura de color

**Mejor para**: Rock, metal, música intensa

#### **💫 Starfield (Plugin 6)**
```
Visual: Campo de estrellas en movimiento
Reactividad: Treble (velocidad), Mid (densidad)
```

**Parámetros:**
- **Star Count**: Número de estrellas
- **Speed**: Velocidad de movimiento
- **Twinkle**: Parpadeo de estrellas
- **Trail Length**: Longitud de estelas
- **Perspective**: Profundidad 3D
- **Color Shift**: Cambio de color

**Mejor para**: Ambient space, synthwave, instrumental

#### **⚡ Lightning (Plugin 7)**
```
Visual: Rayos eléctricos dinámicos
Reactividad: Beats (rayos), Transients (ramificación)
```

**Parámetros:**
- **Voltage**: Intensidad eléctrica
- **Branch Factor**: Ramificación de rayos
- **Frequency**: Frecuencia de rayos
- **Color**: Color del rayo
- **Glow**: Intensidad del brillo
- **Persistence**: Duración del rayo

**Mejor para**: Electro, industrial, breakcore

### 2. Plugins Premium (Addon)

#### **🌸 Flowers (Addon)**
```
Visual: Flores fractales que crecen con el audio
Reactividad: Harmonic content (crecimiento), Beats (floración)
```

#### **🌌 Galaxy (Addon)**
```
Visual: Galaxia espiral con sistema de partículas
Reactividad: Bass (rotación), Energy (densidad estelar)
```

#### **🌊 Ocean (Addon)**
```
Visual: Simulación de océano en tiempo real
Reactividad: Bass (altura olas), Mid (velocidad viento)
```

#### **🎭 Fractals (Addon)**
```
Visual: Fractales matemáticos animados
Reactividad: Frequency bands (zoom), Beats (rotación)
```

---

## 🎵 CONFIGURACIÓN DE AUDIO

### 1. Fuentes de Audio

#### **🎤 Micrófono (Recomendado)**
```
Configuración:
• Acceso: Permitir en navegador
• Ganancia: Ajustar según ambiente
• Filtro de ruido: Activar para entornos ruidosos
```

**Setup optimal:**
1. **Usar micrófono de calidad** (condenser recomendado)
2. **Posicionar cerca de altavoces** pero evitar feedback
3. **Ajustar ganancia** en el sistema operativo
4. **Activar filtros** si hay ruido de fondo

#### **📁 Archivos de Audio**
```
Formatos soportados: MP3, WAV, OGG, FLAC, AAC
Calidad recomendada: 320kbps o superior
```

**Cómo usar:**
1. Click en **🎤** → **Load File**
2. Seleccionar archivo de audio
3. El visual se sincronizará automáticamente
4. Usar controles de reproducción estándar

#### **📡 Streaming de Audio**
```
Fuentes soportadas:
• Icecast streams (.mp3, .ogg)
• SHOUTcast streams
• HTTP audio streams
• WebRTC streams
```

**Configuración:**
1. Click en **🎤** → **Stream URL**
2. Pegar URL del stream
3. Esperar conexión (puede tomar unos segundos)
4. Ajustar buffer si hay problemas de latencia

### 2. Configuración Avanzada de Audio

#### **⚙️ Configuración del Analizador**
```
FFT Size: 2048 (default), 1024 (móvil), 4096 (calidad)
Smoothing: 0.85 (default) - Controla suavidad del análisis
Sample Rate: Auto-detectado del dispositivo
```

#### **🎚️ Procesamiento de Frecuencias**
```
Bandas de frecuencia personalizables:
• Sub-Bass: 20-60Hz    (Kick, bass)
• Bass: 60-250Hz       (Bass line)
• Low-Mid: 250-500Hz   (Warmth)
• Mid: 500-2kHz        (Vocals, leads)
• High-Mid: 2-5kHz     (Presence)
• Treble: 5-12kHz      (Brightness)
• Air: 12-20kHz        (Sparkle)
```

#### **🥁 Detección de Beats**
```
Algoritmo: Onset detection + BPM analysis
Sensibilidad: 0.1 (mínima) - 1.0 (máxima)
BPM Range: 60-200 BPM auto-detectado
```

**Ajustar sensibilidad:**
- **0.1-0.3**: Música muy dinámica (jazz, clásica)
- **0.4-0.7**: Música normal (pop, rock)
- **0.8-1.0**: Música con beats marcados (EDM, hip-hop)

### 3. Troubleshooting de Audio

#### **❌ No se detecta audio**
1. **Verificar permisos de micrófono**
2. **Revisar configuración de privacidad del navegador**
3. **Probar con archivo de audio conocido**
4. **Verificar configuración de sistema de audio**

#### **🔇 Audio muy bajo**
1. **Subir volumen del sistema**
2. **Ajustar ganancia en SpectraVisio**
3. **Revisar configuración del micrófono**
4. **Acercarse a la fuente de sonido**

#### **📢 Audio muy alto/distorsionado**
1. **Bajar volumen del sistema**
2. **Reducir ganancia en SpectraVisio**
3. **Alejar micrófono de altavoces**
4. **Activar limitador si está disponible**

#### **⚡ Latencia de audio**
1. **Usar navegador Chrome (mejor rendimiento)**
2. **Cerrar otras aplicaciones que usen audio**
3. **Reducir tamaño de buffer**
4. **Probar con archivo local vs streaming**

---

## 🎪 GUÍA PARA LIVE PERFORMANCE

### 1. Setup para DJ/VJ

#### **Configuración Hardware Recomendada**
```
🖥️ PC/Mac:
• CPU: Intel i5/AMD Ryzen 5 o superior
• RAM: 8GB mínimo, 16GB recomendado
• GPU: Dedicada recomendada (GTX 1060/RX 580+)
• Audio: Interface de audio profesional

📱 Mobile (backup):
• Tablet Android/iPad con 4GB+ RAM
• Conexión estable a internet
• Audio interface con USB-C/Lightning
```

#### **Software y Conexiones**
```
🔌 Setup de Audio:
• Mixer → Audio Interface → Computer
• Monitorear salida del mixer
• Configurar ganancia apropiada
• Test antes del show

📺 Video Output:
• HDMI a proyector/pantalla principal
• Monitor secundario para controles
• Cables de backup siempre
• Test de resolución previa
```

### 2. Preparación Pre-Show

#### **📋 Checklist Técnico**
- [ ] **Probar setup completo** 30min antes
- [ ] **Configurar scenes** para diferentes momentos
- [ ] **Verificar audio levels** y ganancia
- [ ] **Test video output** en resolución final
- [ ] **Preparar plugin presets** para diferentes géneros
- [ ] **Backup plan** preparado (tablet/phone)

#### **🎨 Preparación Creativa**
```
Crear scenes para:
• Intro/Outro del set
• Build-ups y drops
• Momentos ambient/chill
• Picos de energía
• Transiciones entre DJs
```

#### **⌨️ Mapeo de Controles**
```
Shortcuts esenciales para live:
• 1-7: Plugins principales
• F: Fullscreen toggle
• Espacio: Pause emergency
• ↑/↓: Intensidad rápida
• A/B: Crossfader scenes
• R: Reset rápido
```

### 3. Durante la Performance

#### **🎯 Técnicas de VJ**

**Seguir la Música:**
- **Intro**: Visuals sutiles, buildup gradual
- **Drop**: Cambio dramático de plugin o intensidad
- **Bridge**: Reducir intensidad, cambiar colores
- **Breakdown**: Plugin diferente, efectos mínimos
- **Outro**: Fade suave a negro o visual ambient

**Uso del Crossfader:**
- **Linear**: Transiciones mecánicas, EDM
- **S-Curve**: Transiciones suaves, música orgánica
- **Cut**: Cambios abruptos en drops

**Gestión de Intensidad:**
- **Build-ups**: Aumentar gradualmente
- **Drops**: Máxima intensidad instantly
- **Vocals**: Reducir para no competir
- **Solo instrumentos**: Aumentar para destacar

#### **🚨 Gestión de Crisis**

**Audio se corta:**
1. **No entrar en pánico**
2. **Cambiar a archivo backup**
3. **Comunicar con DJ/sound tech**
4. **Mantener visual corriendo**

**Visual se cuelga:**
1. **F5 para refresh rápido**
2. **Cambiar a backup device**
3. **Comunicar situación**
4. **Volver cuando esté estable**

**Performance baja:**
1. **Bajar calidad immediately**
2. **Cerrar panels innecesarios**
3. **Cambiar a plugin menos intensivo**
4. **Monitor performance constantemente**

### 4. Colaboración con DJs

#### **📻 Comunicación**
```
Pre-show briefing:
• Géneros musicales del set
• Momentos clave a destacar
• Signals para cambios importantes
• Backup plans if needed
```

#### **🎵 Integración Musical**
```
Seguir estructura típica:
• Warm-up: Visuals sutiles
• Prime time: Full intensity
• Peak hour: Creatividad máxima
• Cool down: Transición suave
```

#### **🤝 Workflows Colaborativos**
- **Eye contact** para cambios importantes
- **Hand signals** para intensidad
- **Pre-arranged cues** para drops especiales
- **Freedom periods** para experimentación

---

## 🔧 TROUBLESHOOTING

### 1. Problemas de Performance

#### **🐌 FPS Bajo (<30fps)**
```
Soluciones inmediatas:
1. Bajar calidad a "Media" o "Batería"
2. Cerrar otros programas/tabs
3. Cambiar a plugin menos intensivo
4. Reducir parámetros de partículas/efectos
5. Recargar página (Ctrl+F5)
```

#### **💾 Uso Alto de Memoria**
```
Síntomas: Browser se vuelve lento, system lag
Soluciones:
1. Recargar SpectraVisio cada hora en live
2. Cerrar tabs innecesarios
3. Limpiar caché del navegador
4. Usar modo incógnito/privado
```

#### **🔥 CPU/GPU Alto**
```
Soluciones:
1. Activar "Adaptive Quality"
2. Limitar FPS a 30fps si es necesario
3. Desactivar layers si están habilitados
4. Usar plugins de complejidad "Low"
```

### 2. Problemas de Audio

#### **🔇 Sin Audio Detection**
```
Diagnosticar:
1. ¿Hay permisos de micrófono? → Revisar browser settings
2. ¿Funciona con archivo? → Probar MP3 conocido
3. ¿Está muted el sistema? → Verificar volume mixer
4. ¿Funciona en otro browser? → Chrome recomendado
```

#### **📊 Análisis Incorrecto**
```
Síntomas: Visuals no reaccionan correctamente
Soluciones:
1. Ajustar ganancia de audio
2. Revisar configuración FFT size
3. Calibrar sensibilidad de beats
4. Probar con diferentes fuente audio
```

#### **⚡ Latencia Audio/Video**
```
Síntomas: Delay entre audio y visual
Soluciones:
1. Usar Chrome (menor latency)
2. Cerrar programas de audio
3. Reducir buffer size en configuración
4. Usar archivo local vs streaming
```

### 3. Problemas de Compatibilidad

#### **📱 Issues en Mobile**
```
Problemas comunes:
• Performance baja → Usar modo batería
• Touch no responde → Reload página
• Audio no funciona → Permitir permisos
• Pantalla incorrecta → Rotar a landscape
```

#### **🌐 Problemas de Browser**
```
Safari:
• Pueden haber limitaciones WebAudio
• Probar con Chrome/Firefox
• Verificar permisos más restrictivos

Firefox:
• Performance puede ser menor
• Algunos plugins WebGL limitados
• Configurar dom.webaudio.enabled

Edge:
• Generalmente funciona bien
• Issues con streaming ocasionales
```

#### **🖥️ Problemas de Display**
```
Dual monitors:
• SpectraVisio en monitor secundario
• Controles en monitor principal
• Verificar resolución scaling

Projector:
• Test resolución antes del show
• Configurar como "extend" no "mirror"
• Ajustar brightness/contrast para venue
```

### 4. Problemas de Funcionalidad

#### **🔌 Plugins No Cargan**
```
Diagnóstico:
1. ¿Error en console? → F12 para ver logs
2. ¿Conexión a internet? → Verificar CDN access
3. ¿Cache corrupted? → Clear browser cache
4. ¿Plugin válido? → Probar plugin diferente
```

#### **💾 Scenes No Guardan**
```
Diagnóstico:
1. ¿Storage disponible? → Verificar localStorage
2. ¿Browser en modo privado? → Cambiar a normal
3. ¿Permissions blocked? → Revisar site settings
4. ¿JSON corrupted? → Export/import manual
```

#### **⌨️ Shortcuts No Funcionan**
```
Diagnóstico:
1. ¿Focus en SpectraVisio? → Click en área visual
2. ¿Conflicto con browser? → Disable extensions
3. ¿Custom mapping? → Reset to defaults
4. ¿Mobile keyboard? → Usar touch controls
```

---

## ❓ FAQ - PREGUNTAS FRECUENTES

### Uso General

**Q: ¿Es gratis SpectraVisio?**
A: La versión base es completamente gratis. Plugins premium y funciones avanzadas requieren suscripción.

**Q: ¿Funciona offline?**
A: Sí, una vez cargado funciona offline. Plugins adicionales requieren conexión para descarga inicial.

**Q: ¿Puedo usar mi música de Spotify?**
A: No directamente por restricciones de DRM. Usa archivos de audio locales o streaming libre.

**Q: ¿Cuánto ancho de banda usa?**
A: Inicial: ~2MB. Plugins adicionales: 100-500KB cada uno. Streaming: según la fuente.

### Performance

**Q: ¿Por qué va lento en mi laptop?**
A: Prueba modo "Batería", cierra otros programas, usa Chrome, verifica que no esté en modo ahorro de energía.

**Q: ¿Cómo mejoro el rendimiento?**
A: GPU dedicada > CPU integrada. 16GB RAM recomendado. SSD ayuda con carga de plugins.

**Q: ¿Funciona en tablets?**
A: Sí, especialmente iPad Pro y tablets Android de alta gama. Performance menor que desktop.

### Audio

**Q: ¿Qué micrófono recomiendan?**
A: Cualquier micrófono USB funciona. Para profesional: Audio-Technica AT2020USB+ o similar.

**Q: ¿Puedo conectar mi mixer?**
A: Sí, via audio interface USB. Configurar como input device en el sistema operativo.

**Q: ¿Por qué no detecta bass?**
A: Ajusta ganancia, verifica configuración de graves en el mixer/EQ, prueba con música con bass claro.

### Live Performance

**Q: ¿Cómo sincronizo con el DJ?**
A: Usa micrófono ambiente o línea del mixer. Practica transiciones. Comunicación visual importante.

**Q: ¿Qué hago si se cuelga durante show?**
A: Backup device siempre listo. F5 para refresh rápido. Mantén visual corriendo mientras solucionas.

**Q: ¿Puedo grabar mi performance?**
A: Sí, función de grabación incluida. También puedes usar OBS Studio para más control.

### Técnicos

**Q: ¿Qué formatos de video graba?**
A: WebM (recomendado), MP4 en algunos browsers. 30/60fps seleccionable.

**Q: ¿Puedo crear mis propios plugins?**
A: Sí! Ver Plugin Development Guide. API abierta y documentada.

**Q: ¿Hay API para integración?**
A: Sí, JavaScript API completa. Documentación en GitHub.

---

## 📞 SOPORTE Y COMUNIDAD

### 🆘 Obtener Ayuda

**Canales de Soporte:**
- 💬 **Discord Community**: [discord.gg/spectravisio](https://discord.gg/spectravisio)
- 🐛 **GitHub Issues**: [github.com/spectravisio/issues](https://github.com/spectravisio/issues)
- 📧 **Email Support**: support@spectravisio.dev
- 📚 **Documentation**: [docs.spectravisio.dev](https://docs.spectravisio.dev)

### 🤝 Comunidad

**Únete a la comunidad:**
- 🎵 **Compartir creaciones** en el Discord
- 🎨 **Plugin showcase** semanal
- 🎪 **Live performance** tips y reviews
- 💡 **Feature requests** y feedback

### 📱 Síguenos

- 🐦 **Twitter**: [@SpectraVisio](https://twitter.com/spectravisio)
- 📸 **Instagram**: [@spectravisio.dev](https://instagram.com/spectravisio.dev)
- 🎬 **YouTube**: [SpectraVisio Channel](https://youtube.com/c/spectravisio)

---

**¡Gracias por usar SpectraVisio! 🎵✨**

*Manual v1.0 - Actualizado Enero 2026*