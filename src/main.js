import './style.css';
import { detectCapabilities } from './core/capabilities.js';
import { AudioEngine } from './core/audioEngine.js';
import { PluginManager } from './core/pluginManager.js';
import { idlePlugin } from './plugins/idle.js';
import { tunnelPlugin } from './plugins/tunnel.js';
import { ribbonsPlugin } from './plugins/ribbons.js';
import { plasmaPlugin } from './plugins/plasma.js';
import { oscilloscopePlugin } from './plugins/oscilloscope.js';

const app = document.getElementById('app');
const canvasWrap = document.createElement('div');
canvasWrap.className = 'canvas-wrap';
const canvas = document.createElement('canvas');
canvasWrap.appendChild(canvas);
app.appendChild(canvasWrap);

const overlay = document.createElement('div');
overlay.className = 'overlay';
const overlayCard = document.createElement('div');
overlayCard.className = 'overlay-card';
overlay.appendChild(overlayCard);
const blockerTitle = document.createElement('h1');
blockerTitle.textContent = 'Bienvenido a SpectraVisio';
overlayCard.appendChild(blockerTitle);
const blockerBody = document.createElement('p');
overlayCard.appendChild(blockerBody);
const blockerBtns = document.createElement('div');
blockerBtns.className = 'row';
overlayCard.appendChild(blockerBtns);
const startButtonOverlay = document.createElement('button');
startButtonOverlay.className = 'btn';
startButtonOverlay.textContent = 'Start';
blockerBtns.appendChild(startButtonOverlay);
const overlaySecondary = document.createElement('button');
overlaySecondary.className = 'btn secondary';
overlaySecondary.textContent = 'Probar con archivo';
blockerBtns.appendChild(overlaySecondary);
app.appendChild(overlay);

const controlBar = document.createElement('div');
controlBar.className = 'control-bar';
const startBtn = document.createElement('button');
startBtn.className = 'btn';
startBtn.textContent = 'Start';
const modeSelect = document.createElement('select');
['tunnel', 'ribbons', 'plasma', 'oscilloscope'].forEach((m) => {
  const opt = document.createElement('option');
  opt.value = m;
  opt.textContent = m.toUpperCase();
  modeSelect.appendChild(opt);
});
const fullscreenBtn = document.createElement('button');
fullscreenBtn.className = 'btn secondary';
fullscreenBtn.textContent = 'Fullscreen';
const hideBtn = document.createElement('button');
hideBtn.className = 'btn secondary';
hideBtn.textContent = 'Hide UI';
controlBar.append(startBtn, modeSelect, fullscreenBtn, hideBtn);
app.appendChild(controlBar);

const hintPanel = document.createElement('div');
hintPanel.className = 'hint-panel';
hintPanel.innerHTML = `
  <div class="hint-title">⚡ Controles rápidos</div>
  <div class="hint-body">
    <div class="badge">Start: Mic</div>
    <div class="badge">Ctrl + O: Archivo</div>
    <div class="badge">Ctrl + U: Stream URL</div>
    <div class="badge">Espacio: Play/Pause</div>
  </div>
`;
app.appendChild(hintPanel);

const toast = document.createElement('div');
toast.className = 'toast';
app.appendChild(toast);

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.mp3,.wav,.ogg,.m4a';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

const { support, blockers } = detectCapabilities();
const audio = new AudioEngine();
const plugins = new PluginManager(canvas);
plugins.register('idle', idlePlugin);
plugins.register('tunnel', tunnelPlugin);
plugins.register('ribbons', ribbonsPlugin);
plugins.register('plasma', plasmaPlugin);
plugins.register('oscilloscope', oscilloscopePlugin);
plugins.use('idle');
modeSelect.value = 'tunnel';

let uiHidden = false;
let playing = false;
let raf;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1600);
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth * dpr;
  const h = window.innerHeight * dpr;
  plugins.resize(w, h);
}
window.addEventListener('resize', resize);
resize();

function renderLoop(ts) {
  const data = audio.update(ts);
  plugins.render(data);
  raf = requestAnimationFrame(renderLoop);
}

async function startMic() {
  try {
    await audio.useMic();
    plugins.use(modeSelect.value || 'tunnel');
    playing = true;
    startBtn.textContent = 'Mic OK';
    startBtn.style.background = 'linear-gradient(135deg, #35d49a, #79f2c0)';
    startBtn.disabled = true;
    startButtonOverlay.textContent = 'Mic OK';
    showToast('Micrófono activo');
    overlay.style.display = 'none';
    if (!raf) raf = requestAnimationFrame(renderLoop);
  } catch (err) {
    startBtn.textContent = 'Mic Blocked';
    startBtn.classList.add('danger');
    showToast('Micrófono bloqueado. Usa Ctrl+O para archivo');
  }
}

async function startFile(file) {
  if (!file) return;
  await audio.useFile(file);
  plugins.use(modeSelect.value || 'tunnel');
  playing = true;
  startBtn.textContent = 'Archivo';
  startBtn.disabled = false;
  overlay.style.display = 'none';
  showToast(`Reproduciendo ${file.name}`);
  if (!raf) raf = requestAnimationFrame(renderLoop);
}

async function startStream(url) {
  if (!url) return;
  try {
    await audio.useStream(url);
    plugins.use(modeSelect.value || 'tunnel');
    playing = true;
    startBtn.textContent = 'Stream';
    overlay.style.display = 'none';
    showToast('Stream conectado');
    if (!raf) raf = requestAnimationFrame(renderLoop);
  } catch (err) {
    showToast('No se pudo conectar al stream');
  }
}

function toggleFullscreen() {
  if (!support.fullscreen) {
    showToast('Fullscreen no disponible');
    return;
  }
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function toggleUI() {
  uiHidden = !uiHidden;
  controlBar.classList.toggle('hidden', uiHidden);
  hintPanel.classList.toggle('hidden', uiHidden);
  hideBtn.textContent = uiHidden ? 'Show UI' : 'Hide UI';
}

function handleKey(e) {
  if (e.shiftKey && e.code === 'Space') {
    e.preventDefault();
    audio.stop();
    playing = false;
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    return;
  }
  if (e.ctrlKey && e.key.toLowerCase() === 'o') {
    e.preventDefault();
    fileInput.click();
  }
  if (e.ctrlKey && e.key.toLowerCase() === 'u') {
    e.preventDefault();
    const url = prompt('Ingresa URL de streaming');
    startStream(url);
  }
  if (e.code === 'Space') {
    e.preventDefault();
    playing = !playing;
    if (playing && !raf) raf = requestAnimationFrame(renderLoop);
    if (!playing && raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }
}

document.addEventListener('keydown', handleKey);
fileInput.addEventListener('change', (e) => startFile(e.target.files?.[0]));
startBtn.addEventListener('click', startMic);
startButtonOverlay.addEventListener('click', startMic);
overlaySecondary.addEventListener('click', () => fileInput.click());
modeSelect.addEventListener('change', (e) => {
  plugins.use(e.target.value);
});
fullscreenBtn.addEventListener('click', toggleFullscreen);
hideBtn.addEventListener('click', toggleUI);

if (blockers.length) {
  blockerBody.innerHTML = blockers.map((b) => `<strong>${b.title}</strong><br>${b.body}`).join('<br><br>');
} else {
  blockerBody.textContent = 'Listo para visualizar audio en tiempo real. Usa Start para activar el micrófono.';
}

if (!support.audio || !support.canvas) {
  startBtn.disabled = true;
  startButtonOverlay.disabled = true;
  startBtn.textContent = 'No compatible';
  startButtonOverlay.textContent = 'No compatible';
}

if (!support.media) {
  startBtn.textContent = 'Mic no disponible';
  startButtonOverlay.textContent = 'Mic no disponible';
  startBtn.disabled = true;
  startButtonOverlay.disabled = true;
}

// start idle render
raf = requestAnimationFrame(renderLoop);
