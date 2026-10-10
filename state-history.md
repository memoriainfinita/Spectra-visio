# Spectra-visio — history

### 2026-10-10 — Revisión completa del proyecto

- Archivo y stream no sonaban: la fuente solo iba al analizador. Ahora pasan por un `<audio>` conectado al analizador y a `destination`; el micrófono va solo al analizador para no realimentar
- `plasma` medido a 387 ms por fotograma en 1080p con cálculo por píxel a tamaño completo. Ahora se calcula en un buffer de 240 px de ancho y se escala
- Fundido de estelas a negro: con alfa baja el redondeo de 8 bits deja residuo que sobre `#05060f` se veía como fantasmas azulados
- Kaleido, orbitals, gridwarp y strobe bloom portados del prototipo `psychedelic_audio_visualizer_canvas_fullscreen.html`, que tenía mejores prácticas que la app (micrófono sin filtros, animación por tiempo)
- Los nueve `SpectraVisio_*.md` y `claude.md` describían un producto no construido (MIDI, capas, escenas, PWA, Webpack, Jest). Movidos a `docs/archive/`; `claude.md` renombrado a `prompting-guide.md` porque Claude Code lo cargaba como instrucciones del proyecto
