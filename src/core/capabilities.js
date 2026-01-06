export function detectCapabilities() {
  const support = {
    audio: !!(window.AudioContext || window.webkitAudioContext),
    canvas: !!document.createElement('canvas').getContext('2d'),
    media: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    fullscreen: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
    storage: (() => {
      try {
        const key = '__spectra_probe__';
        localStorage.setItem(key, key);
        localStorage.removeItem(key);
        return true;
      } catch (err) {
        return false;
      }
    })(),
  };

  const blockers = [];
  if (!support.audio || !support.canvas) {
    blockers.push({
      title: '❌ Navegador no compatible',
      body:
        'Este navegador no soporta las características necesarias. Prueba con Chrome 90+, Firefox 88+, Safari 14+ o Edge 90+. ',
    });
  }
  if (!support.media) {
    blockers.push({
      title: '⚠️ Funcionalidad limitada',
      body: 'El micrófono no está disponible, pero puedes usar archivos de audio.',
    });
  }
  if (!support.storage) {
    blockers.push({
      title: 'ℹ️ Sin almacenamiento local',
      body: 'Los presets no se guardarán entre sesiones.',
    });
  }

  return { support, blockers };
}
