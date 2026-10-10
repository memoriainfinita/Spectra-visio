// Source of truth for message keys: other languages are typed against this one.
export const es = {
  'app.title': 'SpectraVisio',
  'app.tagline': 'Visualizador de audio en tiempo real',
  'app.rebuilding': 'Reconstrucción en curso: fase {phase} de {total}.',
  'settings.language': 'Idioma',
  'lang.es': 'Español',
  'lang.en': 'English',
} as const

export type MessageKey = keyof typeof es
export type Messages = Record<MessageKey, string>
