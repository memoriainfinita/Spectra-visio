# SpectraVisio - Banco de Ideas de Visualización

**Versión:** 0.1
**Fecha:** Octubre 10, 2026
**Estado:** Backlog (ninguna implementada)

---

## 📖 Propósito del Documento

Recoge visualizaciones candidatas que **no** están en `SpectraVisio_Visualizations.md`, para tenerlas en cuenta al planificar y desarrollar plugins. No es una especificación: cada entrada describe la idea, los datos de audio que usa, los requisitos técnicos y una estimación de coste. Cuando una idea pase a desarrollo, se especifica en `SpectraVisio_Visualizations.md` con parámetros completos y se marca aquí.

Los identificadores `I-xx` evitan colisión con la numeración 1–18 de la especificación.

**Leyenda**

- **Coste:** Bajo (≈1 plugin simple) · Medio · Alto
- **Render:** `2D` (Canvas 2D, viable hoy) · `WebGL` (requiere migración de render)
- **Requiere:** cambios previos en el motor (ver [Prerrequisitos](#-prerrequisitos-del-motor))

---

## 🔧 Prerrequisitos del Motor

Estado de `src/core/audioEngine.js` a fecha de este documento y lo que bloquea:

| ID | Prerrequisito | Situación actual | Desbloquea |
|----|---------------|------------------|------------|
| P1 | **Bandas logarítmicas** (7 bandas de la especificación) | Bandas lineales por índice de bin; "bass" llega a ~610 Hz con 48 kHz, no a 250 Hz | Mejora todos los modos; I-02, I-23 |
| P2 | **Historial de espectros** (buffer circular de N frames) | No existe; cada plugin solo ve el frame actual | I-01, I-07, I-26, I-27 |
| P3 | **Estéreo** (`ChannelSplitter` + 2 analizadores) | Un único `AnalyserNode`, mono | I-04 |
| P4 | **FFT configurable / mayor** (8192–16384) | `fftSize` fijo en 2048 (~23 Hz por bin) | I-03, I-24, I-25 |
| P5 | **Detección de pitch** (pico espectral, YIN o autocorrelación) | No existe | I-09, I-24, I-25 |
| P6 | **BPM real** | `bpm` fijo en 120; beat por umbral de energía con 250 ms de refractario | Sincronía de transiciones, I-19, T-03 |
| P7 | **Render WebGL** | Solo Canvas 2D | I-14, I-28 y todo shader por píxel |
| P8 | **Fuente de vídeo** (webcam / imagen) | No existe | I-12, I-33 |
| P9 | **Entrada de puntero** expuesta a plugins | No existe | I-35 |

---

## 📋 Resumen

| ID | Nombre | Categoría | Coste | Render | Requiere |
|----|--------|-----------|-------|--------|----------|
| I-01 | Espectrograma en cascada | Analítica | Bajo | 2D | P2, P1 |
| I-02 | Analizador de espectro pro | Analítica | Bajo | 2D | P1 |
| I-03 | Cromagrama / rueda de notas | Analítica | Medio | 2D | P4 |
| I-04 | Goniómetro / Lissajous estéreo | Analítica | Bajo | 2D | P3 |
| I-05 | Atractor por retardo | Forma de onda | Bajo | 2D | — |
| I-06 | Osciloscopio polar | Forma de onda | Bajo | 2D | — |
| I-07 | Ridgeline (*Unknown Pleasures*) | Forma de onda | Bajo | 2D | P2 |
| I-08 | Feedback / zoom (Milkdrop) | Generativa | Medio | 2D | — |
| I-09 | Patrones de Chladni | Generativa | Medio | 2D | P5 |
| I-10 | Campo de flujo con partículas | Generativa | Medio | 2D | — |
| I-11 | Juego de la vida por beats | Generativa | Bajo | 2D | — |
| I-12 | Glitch / pixel sorting | Generativa | Medio | 2D | P8 |
| I-13 | Membrana vibrante | Física | Medio | 2D | — |
| I-14 | Fluido 2D | Física | Alto | WebGL | P7 |
| I-15 | Gravedad N-cuerpos | Física | Medio | 2D | — |
| I-16 | Arena que cae | Física | Medio | 2D | — |
| I-17 | Péndulo doble / múltiple | Física | Bajo | 2D | — |
| I-18 | Espirógrafo / epiciclos | Geometría | Bajo | 2D | — |
| I-19 | Rosas y curvas paramétricas | Geometría | Bajo | 2D | — |
| I-20 | Teselado Penrose / Truchet | Geometría | Medio | 2D | — |
| I-21 | L-system / árbol fractal | Geometría | Medio | 2D | — |
| I-22 | Hipercubo 4D | Geometría | Bajo | 2D | — |
| I-23 | Curva de Hilbert del espectro | Geometría | Bajo | 2D | P1 |
| I-24 | Piano roll en vivo | Musical | Alto | 2D | P4, P5 |
| I-25 | Tonnetz | Musical | Alto | 2D | P4, P5 |
| I-26 | Línea de tiempo de estructura | Musical | Medio | 2D | P2 |
| I-27 | Matriz de autosimilitud | Musical | Medio | 2D | P2 |
| I-28 | Vectorscopio CRT | Retro | Medio | WebGL | P7 |
| I-29 | Synthwave / outrun | Retro | Bajo | 2D | — |
| I-30 | ASCII / ANSI art | Retro | Bajo | 2D | — |
| I-31 | Demoscene clásica | Retro | Bajo | 2D | — |
| I-32 | Tinta / sumi-e | Retro | Medio | 2D | — |
| I-33 | Espejo de webcam reactivo | Interactiva | Medio | 2D | P8 |
| I-34 | Texto cinético | Interactiva | Bajo | 2D | — |
| I-35 | Control por puntero / táctil | Interactiva | Medio | 2D | P9 |
| T-01 | Capa de postproceso | Sistema | Medio | 2D/WebGL | — |
| T-02 | Paletas intercambiables | Sistema | Bajo | 2D | — |
| T-03 | Transiciones entre modos | Sistema | Medio | 2D | P6 |
| T-04 | Modo automático por estructura | Sistema | Alto | — | I-26 |

---

## 📊 ANALÍTICAS

### I-01. ESPECTROGRAMA EN CASCADA (Waterfall)
**Coste:** Bajo · **Render:** 2D · **Requiere:** P2, P1 (recomendado)

**Descripción:**
Mapa de calor que se desplaza en el tiempo, con eje de frecuencias logarítmico. Revela armónicos, barridos, sidechain y transitorios que ningún modo actual muestra.

**Reactividad:**
- **frequencyData** → Intensidad de cada píxel de la columna nueva (mapeado a paleta)
- **beat** → Marca opcional en el eje temporal

**Notas técnicas:**
Cada frame: `drawImage` del propio canvas desplazado 1 px + pintar una columna con `ImageData`. Coste casi constante. Orientación horizontal o vertical configurable.

---

### I-02. ANALIZADOR DE ESPECTRO PRO
**Coste:** Bajo · **Render:** 2D · **Requiere:** P1

**Descripción:**
Barras por octava o tercio de octava con escala logarítmica, marcas de pico (*peak hold*) y caída lenta, al estilo de un plugin de audio profesional. Sirve de referencia técnica.

**Reactividad:**
- **frequencyData** agrupado en bandas log → Altura de barras
- Pico máximo reciente → Marca que cae con gravedad configurable

**Parámetros sugeridos:** resolución (octava / 1/3 / 1/6), tiempo de *hold*, velocidad de caída, escala dB.

---

### I-03. CROMAGRAMA / RUEDA DE NOTAS
**Coste:** Medio · **Render:** 2D · **Requiere:** P4

**Descripción:**
Agrupa los bins en las 12 clases de nota (C, C#, … B) y las dispone en un círculo de quintas. Única visualización con lectura musical directa: tonalidad y acordes.

**Reactividad:**
- **frequencyData** plegado por octavas → Energía de cada clase de nota
- Nota dominante → Resaltado y color

**Notas técnicas:**
Con `fftSize` 2048 la resolución en graves es insuficiente (23 Hz por bin vs. ~2 Hz entre semitonos en C2). Necesita FFT ≥ 8192 o un analizador dedicado.

---

### I-04. GONIÓMETRO / LISSAJOUS ESTÉREO
**Coste:** Bajo · **Render:** 2D · **Requiere:** P3

**Descripción:**
Plot XY de canal L frente a R (o M/S rotado 45°). Muestra ancho estéreo y fase: mono = línea vertical, fuera de fase = horizontal.

**Reactividad:**
- **timedomain L/R** → Coordenadas de cada punto
- **energy** → Brillo de la estela

---

## 〰️ FORMA DE ONDA

### I-05. ATRACTOR POR RETARDO (Phase Space)
**Coste:** Bajo · **Render:** 2D · **Requiere:** —

**Descripción:**
Dibuja x(t) frente a x(t+τ) usando solo la señal mono. Tonos puros → elipses; acordes → figuras de Lissajous complejas; ruido → nube. Con estela es muy vistoso y no necesita estéreo.

**Reactividad:**
- **timedomainData** → Trayectoria
- **mid** → Modulación de τ
- **bass** → Escala; **treble** → Tono de color

**Variante:** embedding 3D (x(t), x(t+τ), x(t+2τ)) con rotación lenta.

---

### I-06. OSCILOSCOPIO POLAR
**Coste:** Bajo · **Render:** 2D · **Requiere:** —

**Descripción:**
La forma de onda envuelta alrededor de un círculo cuyo radio base sigue al bajo. Variante del `oscilloscope` actual; puede ser un parámetro del mismo plugin.

**Reactividad:**
- **timedomainData** → Desplazamiento radial
- **bass** → Radio base; **beat** → Rotación brusca

---

### I-07. RIDGELINE (*Unknown Pleasures*)
**Coste:** Bajo · **Render:** 2D · **Requiere:** P2

**Descripción:**
Últimos N espectros apilados con desplazamiento vertical; cada línea se rellena de negro para ocultar las posteriores. Estética icónica en blanco sobre negro.

**Reactividad:**
- **Historial de frequencyData** → Cada línea
- **energy** → Amplitud global

**Notas técnicas:** reutiliza el mismo historial que I-01.

---

## ✨ GENERATIVAS

### I-08. FEEDBACK / ZOOM (estilo Milkdrop)
**Coste:** Medio · **Render:** 2D (WebGL mejor) · **Requiere:** —

**Descripción:**
Cada frame redibuja el anterior escalado, rotado y atenuado; encima se pinta un elemento pequeño (forma de onda, partículas). Máximo impacto por coste.

**Reactividad:**
- **bass** → Zoom; **mid** → Rotación; **treble** → Desplazamiento de tono
- **beat** → Inversión o salto de zoom

**Notas técnicas:** idealmente implementado como capa reutilizable (ver T-01) para aplicarse sobre cualquier plugin.

---

### I-09. PATRONES DE CHLADNI (Cimática)
**Coste:** Medio · **Render:** 2D · **Requiere:** P5

**Descripción:**
Partículas que migran hacia las líneas nodales de `sin(nx)·sin(my) − sin(mx)·sin(ny)`, con n y m derivados de la frecuencia dominante. Fundamento físico, resultado limpio.

**Reactividad:**
- **Pitch dominante** → (n, m)
- **energy** → Agitación de partículas
- **beat** → Dispersión y reasentamiento

---

### I-10. CAMPO DE FLUJO CON PARTÍCULAS
**Coste:** Medio · **Render:** 2D · **Requiere:** —

**Descripción:**
Partículas que siguen un campo vectorial de ruido (Perlin/Simplex) deformado por el audio.

**Reactividad:**
- **bass** → Deformación del campo
- **treble** → Velocidad de partículas
- **beat** → Ráfaga de nuevas partículas

**Notas:** solapa parcialmente con *Quantum Field* (spec #15); decidir entre uno u otro.

---

### I-11. JUEGO DE LA VIDA POR BEATS
**Coste:** Bajo · **Render:** 2D · **Requiere:** —

**Descripción:**
Autómata celular de Conway (o variantes como HighLife). Cada beat inyecta células; la banda dominante elige regla o paleta.

**Reactividad:**
- **beat** → Siembra (posición según banda)
- **energy** → Velocidad de generaciones

---

### I-12. GLITCH / PIXEL SORTING
**Coste:** Medio · **Render:** 2D · **Requiere:** P8

**Descripción:**
Sobre una imagen o webcam: desplazamiento de bloques en transitorios y ordenación de píxeles por brillo con umbral dependiente de la energía.

**Reactividad:**
- **beat** → Desplazamiento de bloques / datamosh
- **energy** → Umbral de ordenación

---

## ⚛️ FÍSICA Y SIMULACIÓN

### I-13. MEMBRANA VIBRANTE
**Coste:** Medio · **Render:** 2D · **Requiere:** —

**Descripción:**
Red masa-resorte (~40×40) donde cada banda excita un nodo; la onda se propaga y amortigua. Golpes de bajo deforman toda la superficie.

**Reactividad:**
- **Bandas** → Fuerza en nodos asignados
- **bass** → Impulso global; parámetro de amortiguación configurable

---

### I-14. FLUIDO 2D
**Coste:** Alto · **Render:** WebGL · **Requiere:** P7

**Descripción:**
Simulación de Navier-Stokes simplificada (Stam, *Stable Fluids*). Cada beat inyecta tinta y velocidad.

**Reactividad:**
- **beat** → Inyección; **banda dominante** → Color de tinta
- **energy** → Viscosidad / vorticidad

---

### I-15. GRAVEDAD N-CUERPOS
**Coste:** Medio · **Render:** 2D · **Requiere:** —

**Descripción:**
Partículas orbitando atractores cuya masa depende de una banda. Dinámica caótica (se diferencia de *Orbitals*, que es coreografiada).

**Reactividad:**
- **bass / mid / treble** → Masa de cada atractor
- **beat** → Impulso radial

---

### I-16. ARENA QUE CAE (Falling Sand)
**Coste:** Medio · **Render:** 2D · **Requiere:** —

**Descripción:**
Autómata celular de granos. Cada bin actúa como grifo en su columna; se forma un paisaje sedimentado de la canción.

**Reactividad:**
- **frequencyData** → Caudal por columna; **banda** → Color del grano
- **beat** → Sacudida que desmorona pilas

---

### I-17. PÉNDULO DOBLE / MÚLTIPLE
**Coste:** Bajo · **Render:** 2D · **Requiere:** —

**Descripción:**
Péndulo doble (o cadena) cuyo pivote recibe impulsos; la estela del extremo dibuja trayectorias caóticas.

**Reactividad:**
- **bass** → Impulso del pivote; **treble** → Color de estela
- Varios péndulos con condiciones casi idénticas → divergencia visible

---

## 📐 GEOMETRÍA Y MATEMÁTICAS

### I-18. ESPIRÓGRAFO / EPICICLOS
**Coste:** Bajo · **Render:** 2D · **Requiere:** —

**Descripción:**
Cadena de círculos girando cuyos radios son los primeros armónicos del espectro: una serie de Fourier visible. El trazo cambia con el timbre.

**Reactividad:**
- **frequencyData** (primeros N picos) → Radios y velocidades
- **energy** → Persistencia del trazo

---

### I-19. ROSAS Y CURVAS PARAMÉTRICAS
**Coste:** Bajo · **Render:** 2D · **Requiere:** — (P6 para morph a tempo)

**Descripción:**
Rosas `r = cos(kθ)`, superfórmula de Gielis, armonógrafos. Parámetros modulados por bandas; el beat hace morph a la siguiente forma.

**Reactividad:**
- **Bandas** → k, m, n1, n2, n3
- **beat** → Transición a nueva forma

---

### I-20. TESELADO PENROSE / TRUCHET
**Coste:** Medio · **Render:** 2D · **Requiere:** —

**Descripción:**
Teselado aperiódico (Penrose) o de Truchet; las piezas rotan o cambian de color según la energía espectral asignada por posición.

**Reactividad:**
- **frequencyData** mapeado espacialmente → Rotación / color por pieza
- **beat** → Onda de volteo desde el centro

---

### I-21. L-SYSTEM / ÁRBOL FRACTAL
**Coste:** Medio · **Render:** 2D · **Requiere:** —

**Descripción:**
Árbol generado por L-system o recursión que crece y se poda en vivo.

**Reactividad:**
- **energy** → Profundidad de recursión
- **mid** → Ángulo de ramificación
- **treble** → Temblor de hojas

---

### I-22. HIPERCUBO 4D
**Coste:** Bajo · **Render:** 2D · **Requiere:** —

**Descripción:**
Teselacto (o 24-cell, 600-cell) proyectado 4D → 3D → 2D en alambre. Solo álgebra lineal, muy vistoso.

**Reactividad:**
- **Cada banda** → Rotación de un plano 4D distinto (XW, YW, ZW, XY…)
- **beat** → Cambio de politopo o de proyección

---

### I-23. CURVA DE HILBERT DEL ESPECTRO
**Coste:** Bajo · **Render:** 2D · **Requiere:** P1 (recomendado)

**Descripción:**
Los 1024 bins mapeados sobre una curva de Hilbert de 32×32: frecuencias cercanas quedan cercanas en el plano. Espectrograma 2D compacto y original.

**Reactividad:**
- **frequencyData** → Color de cada celda
- Opcional: persistencia para ver evolución

---

## 🎼 LECTURA MUSICAL

### I-24. PIANO ROLL EN VIVO
**Coste:** Alto · **Render:** 2D · **Requiere:** P4, P5

**Descripción:**
Detección de picos espectrales → notas MIDI → barras que avanzan sobre un teclado.

**Reactividad:**
- **Pitch detectado** → Nota; **amplitud** → Velocidad (brillo)

**Riesgo:** la detección polifónica es poco fiable; empezar monofónico.

---

### I-25. TONNETZ
**Coste:** Alto · **Render:** 2D · **Requiere:** P4, P5

**Descripción:**
Red tonal de Euler/Riemann en hexágonos: se iluminan las notas activas y los triángulos de acordes. Las progresiones armónicas aparecen como recorridos. Evolución natural de I-03.

---

### I-26. LÍNEA DE TIEMPO DE ESTRUCTURA
**Coste:** Medio · **Render:** 2D · **Requiere:** P2

**Descripción:**
Barra que se pinta con la "firma" de cada momento (energía + timbre). Distingue estrofa, estribillo y drop; las repeticiones se reconocen visualmente. Mejor como overlay que como modo.

**Notas:** base para T-04.

---

### I-27. MATRIZ DE AUTOSIMILITUD
**Coste:** Medio · **Render:** 2D · **Requiere:** P2

**Descripción:**
Matriz donde el punto (i, j) es la similitud entre los instantes i y j (p. ej. coseno entre vectores de espectro reducidos). Las repeticiones aparecen como diagonales. Analítica pura, útil para productores.

**Notas técnicas:** coste O(N²); limitar N (p. ej. 256 frames submuestreados) y actualizar incrementalmente una fila por frame.

---

## 📺 RETRO Y ESTÉTICA

### I-28. VECTORSCOPIO CRT
**Coste:** Medio · **Render:** WebGL · **Requiere:** P7

**Descripción:**
Osciloscopio con fósforo verde, bloom, persistencia, curvatura y ruido de barrido. Esencialmente un shader de postproceso reutilizable (ver T-01).

---

### I-29. SYNTHWAVE / OUTRUN
**Coste:** Bajo · **Render:** 2D · **Requiere:** —

**Descripción:**
Rejilla en perspectiva hacia el horizonte, montañas generadas por el espectro, sol con franjas que pulsa con el bajo.

**Reactividad:**
- **frequencyData** → Perfil de montañas
- **bass** → Pulso del sol; **energy** → Velocidad de la rejilla

---

### I-30. ASCII / ANSI ART
**Coste:** Bajo · **Render:** 2D · **Requiere:** —

**Descripción:**
Rasteriza cualquier visualización a caracteres monoespaciados según brillo. Puede implementarse como filtro global (T-01) en lugar de modo.

---

### I-31. DEMOSCENE CLÁSICA
**Coste:** Bajo · **Render:** 2D · **Requiere:** —

**Descripción:**
Colección de efectos clásicos: *rotozoomer*, *copper bars*, plasma por ciclo de paleta, *scroller* sinusoidal. El plasma por paleta es distinto al plugin `plasma` actual y mucho más barato.

---

### I-32. TINTA / SUMI-E
**Coste:** Medio · **Render:** 2D · **Requiere:** —

**Descripción:**
Trazos de pincel sobre textura de papel; contrasta con la estética neón dominante.

**Reactividad:**
- **bass** → Grosor del trazo
- **treble** → Difuminado / salpicadura
- **beat** → Nuevo trazo

---

## 🖐️ INTERACTIVAS / FUENTE EXTERNA

### I-33. ESPEJO DE WEBCAM REACTIVO
**Coste:** Medio · **Render:** 2D · **Requiere:** P8

**Descripción:**
Webcam con desplazamiento por bandas, *slit-scan* (cada columna es un instante distinto) o datamosh en beats.

**Notas:** requiere permiso de cámara; añadir a `capabilities.js`.

---

### I-34. TEXTO CINÉTICO
**Coste:** Bajo · **Render:** 2D · **Requiere:** —

**Descripción:**
Frase introducida por el usuario cuyas letras se dispersan, rebotan o laten con el audio. Útil para eventos y streams.

---

### I-35. CONTROL POR PUNTERO / TÁCTIL
**Coste:** Medio · **Render:** 2D · **Requiere:** P9

**Descripción:**
El puntero actúa como atractor o fuente en modos de partículas o fluido (I-10, I-14, I-15). Convierte la app en instrumento visual.

---

## 🧩 SISTEMAS TRANSVERSALES

### T-01. CAPA DE POSTPROCESO
Bloom, aberración cromática, viñeta, feedback (I-08), CRT (I-28), ASCII (I-30). Aplicable sobre cualquier plugin; base del "Layer system" que promete el README y no existe aún.

### T-02. PALETAS INTERCAMBIABLES
Sustituir el `hsla` codificado en cada plugin por paletas compartidas (p. ej. *cosine palettes* de Íñigo Quílez: `a + b·cos(2π(c·t + d))`). Coherencia visual y un parámetro global más.

### T-03. TRANSICIONES ENTRE MODOS
Fundido cruzado o morph sincronizado al beat. Ya descrito en `SpectraVisio_Visualizations.md` (Sistema de Transiciones), sin implementar.

### T-04. MODO AUTOMÁTICO POR ESTRUCTURA
Cambiar de visualización al detectar cambio de sección (I-26) en lugar de por temporizador.

---

## 🎯 Priorización Propuesta

1. **Infraestructura:** P1 (bandas log), P2 (historial), P6 (BPM real).
2. **Bajo coste, alta diferenciación, sin cambios de motor:** I-05 Atractor, I-18 Epiciclos, I-22 Hipercubo 4D, I-29 Synthwave, I-17 Péndulo.
3. **Tras P2:** I-07 Ridgeline, I-01 Waterfall.
4. **Sistemas:** T-01 Postproceso (con I-08 Feedback), T-02 Paletas.
5. **Tras P3/P4/P5:** I-04 Goniómetro, I-03 Cromagrama, I-09 Chladni.
6. **Diferenciación analítica:** I-27 Autosimilitud, I-23 Hilbert, I-25 Tonnetz.
7. **Tras P7 (WebGL):** I-14 Fluido, I-28 CRT, y Mandelbrot / Liquid Metal de la especificación.

---

## ✅ Seguimiento

| ID | Estado | Plugin | Notas |
|----|--------|--------|-------|
| — | — | — | Sin implementaciones aún |
