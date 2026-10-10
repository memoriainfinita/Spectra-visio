export function detectCapabilities() {
  const support = {
    audio: !!(window.AudioContext || window.webkitAudioContext),
    canvas: !!document.createElement('canvas').getContext('2d'),
    media: !!navigator.mediaDevices?.getUserMedia,
    fullscreen: !!document.fullscreenEnabled,
  };

  const notices = [];
  if (!support.audio || !support.canvas) {
    notices.push({
      title: 'Navegador no compatible',
      body: 'Este navegador no tiene Web Audio o Canvas 2D.',
    });
  }
  if (!support.media) {
    notices.push({
      title: 'Sin micrófono',
      body: 'El micrófono no está disponible aquí. Puedes usar archivos o streams.',
    });
  }

  return { support, notices };
}
