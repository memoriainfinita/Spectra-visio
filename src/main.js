import './style.css';
import { detectCapabilities } from './core/capabilities.js';
import { AudioEngine } from './core/audioEngine.js';
import { PluginManager } from './core/pluginManager.js';
import { IdleVisualizer } from './plugins/idle.js';
import { TunnelVisualizer } from './plugins/tunnel.js';
import { RibbonsVisualizer } from './plugins/ribbons.js';
import { PlasmaVisualizer } from './plugins/plasma.js';
import { OscilloscopeVisualizer } from './plugins/oscilloscope.js';
import { KaleidoVisualizer } from './plugins/kaleido.js';
import { OrbitalsVisualizer } from './plugins/orbitals.js';
import { GridWarpVisualizer } from './plugins/gridWarp.js';
import { StrobeBloomVisualizer } from './plugins/strobeBloom.js';

const MODES = {
  tunnel: ['Tunnel', TunnelVisualizer],
  ribbons: ['Ribbons', RibbonsVisualizer],
  plasma: ['Plasma', PlasmaVisualizer],
  oscilloscope: ['Oscilloscope', OscilloscopeVisualizer],
  kaleido: ['Kaleido', KaleidoVisualizer],
  orbitals: ['Orbitals', OrbitalsVisualizer],
  gridwarp: ['Grid Warp', GridWarpVisualizer],
  strobebloom: ['Strobe Bloom', StrobeBloomVisualizer],
};
const MODE_NAMES = Object.keys(MODES);
const MAX_DPR = 2;

const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const overlay = $('overlay');
const controls = $('controls');
const hints = $('hints');
const micBtn = $('btn-mic');
const fileBtn = $('btn-file');
const streamBtn = $('btn-stream');
const modeSelect = $('mode');
const fullscreenBtn = $('btn-fullscreen');
const hideBtn = $('btn-hide');
const streamForm = $('stream-form');
const streamUrl = $('stream-url');
const fileInput = $('file-input');
const toast = $('toast');

const { support, notices } = detectCapabilities();
const audio = new AudioEngine();
const plugins = new PluginManager(canvas);
plugins.register('idle', IdleVisualizer);
for (const [name, [label, Visualizer]] of Object.entries(MODES)) {
  plugins.register(name, Visualizer);
  modeSelect.add(new Option(label, name));
}
modeSelect.value = 'tunnel';

let uiHidden = false;
let toastTimer;

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function resize() {
  const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
  plugins.resize(Math.floor(window.innerWidth * dpr), Math.floor(window.innerHeight * dpr), dpr);
}

// Idle animation until a source is playing.
function syncVisual() {
  plugins.use(audio.active ? modeSelect.value : 'idle');
}

function syncSourceButtons() {
  micBtn.classList.toggle('active', audio.kind === 'mic');
  fileBtn.classList.toggle('active', audio.kind === 'file');
  streamBtn.classList.toggle('active', audio.kind === 'stream');
}

function sourceStarted(message) {
  overlay.classList.add('hidden');
  syncVisual();
  syncSourceButtons();
  showToast(message);
}

async function startMic() {
  if (!support.media) {
    showToast('Micrófono no disponible');
    return;
  }
  try {
    await audio.useMic();
    micBtn.classList.remove('danger');
    sourceStarted('Micrófono activo');
  } catch (err) {
    micBtn.classList.add('danger');
    showToast(err.name === 'NotAllowedError' ? 'Permiso de micrófono denegado' : 'No se pudo abrir el micrófono');
  }
}

function openFile() {
  fileInput.click();
}

async function startFile(file) {
  if (!file) return;
  try {
    await audio.useFile(file);
    sourceStarted(`Reproduciendo ${file.name}`);
  } catch (err) {
    showToast(`No se puede reproducir ${file.name}`);
  }
}

function toggleStreamForm(show = streamForm.classList.contains('hidden')) {
  streamForm.classList.toggle('hidden', !show);
  if (show) streamUrl.focus();
}

async function startStream(url) {
  try {
    await audio.useStream(url);
    toggleStreamForm(false);
    sourceStarted('Stream conectado');
  } catch (err) {
    showToast('No se pudo conectar. El servidor tiene que permitir CORS');
  }
}

function stopAudio() {
  if (!audio.active) return;
  audio.stop();
  syncVisual();
  syncSourceButtons();
  showToast('Audio detenido');
}

async function togglePause() {
  if (!audio.active) return;
  const paused = await audio.togglePause();
  showToast(paused ? 'Pausa' : 'Reanudado');
}

function stepMode(delta) {
  const i = MODE_NAMES.indexOf(modeSelect.value);
  modeSelect.value = MODE_NAMES[(i + delta + MODE_NAMES.length) % MODE_NAMES.length];
  syncVisual();
  showToast(MODES[modeSelect.value][0]);
}

async function toggleFullscreen() {
  if (!support.fullscreen) return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  } catch (err) {
    showToast('No se pudo cambiar a pantalla completa');
  }
}

function toggleUI() {
  uiHidden = !uiHidden;
  if (uiHidden) toggleStreamForm(false);
  controls.classList.toggle('ui-hidden', uiHidden);
  hints.classList.toggle('ui-hidden', uiHidden);
  hideBtn.textContent = uiHidden ? 'Mostrar UI' : 'Ocultar UI';
}

const KEY_ACTIONS = {
  m: startMic,
  o: openFile,
  u: () => toggleStreamForm(),
  s: stopAudio,
  f: toggleFullscreen,
  h: toggleUI,
  ' ': togglePause,
  ArrowRight: () => stepMode(1),
  ArrowLeft: () => stepMode(-1),
};

function handleKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest?.('input, select, textarea')) return;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const action = KEY_ACTIONS[key];
  if (!action) return;
  e.preventDefault();
  // A focused button would also be clicked by the Space keyup.
  if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
  action();
}

function frame(ts) {
  const data = audio.update(ts);
  if (!audio.paused) plugins.render(data);
  requestAnimationFrame(frame);
}

audio.onEnded = () => {
  syncVisual();
  syncSourceButtons();
  showToast('Fin del archivo');
};

window.addEventListener('resize', resize);
document.addEventListener('keydown', handleKey);
document.addEventListener('fullscreenchange', () => {
  fullscreenBtn.textContent = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa';
});
fileInput.addEventListener('change', () => {
  startFile(fileInput.files[0]);
  fileInput.value = '';
});
micBtn.addEventListener('click', startMic);
$('overlay-mic').addEventListener('click', startMic);
fileBtn.addEventListener('click', openFile);
$('overlay-file').addEventListener('click', openFile);
streamBtn.addEventListener('click', () => toggleStreamForm());
streamForm.addEventListener('submit', (e) => {
  e.preventDefault();
  startStream(streamUrl.value.trim());
});
streamUrl.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') toggleStreamForm(false);
});
modeSelect.addEventListener('change', syncVisual);
fullscreenBtn.addEventListener('click', toggleFullscreen);
hideBtn.addEventListener('click', toggleUI);

const overlayText = $('overlay-text');
for (const { title, body } of notices) {
  const p = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = title;
  p.append(strong, document.createElement('br'), body);
  overlayText.append(p);
}
if (!notices.length) {
  const p = document.createElement('p');
  p.textContent = 'Elige una fuente de audio: micrófono, un archivo o un stream (tecla U).';
  overlayText.append(p);
}

if (!support.audio || !support.canvas) {
  for (const btn of [micBtn, fileBtn, streamBtn, $('overlay-mic'), $('overlay-file')]) btn.disabled = true;
} else if (!support.media) {
  micBtn.disabled = true;
  $('overlay-mic').disabled = true;
}
if (!support.fullscreen) fullscreenBtn.hidden = true;

resize();
syncVisual();
requestAnimationFrame(frame);
