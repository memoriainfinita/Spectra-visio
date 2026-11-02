import { translate } from '../i18n'
import { DEMOS, demoScene, type DemoId } from '../engine/scene/demos'
import { notify } from './notices'
import { sceneStore } from './scene'
import { settingsStore } from './settings'

// Replaces the whole scene with an example one. The overlays stay; Ctrl Z brings the scene back.
export function loadDemo(id: DemoId): void {
  const lang = settingsStore.get().lang
  sceneStore.set((s) => ({ ...demoScene(id, lang), overlays: s.overlays }))
  const demo = DEMOS.find((d) => d.id === id)
  if (demo) notify(translate(lang, 'demo.loaded', { name: translate(lang, demo.name) }))
}
