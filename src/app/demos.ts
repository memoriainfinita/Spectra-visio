import { translate } from '../i18n'
import { DEMOS, demoScene, type DemoId } from '../engine/scene/demos'
import { notify } from './notices'
import { sceneStore } from './scene'
import { settingsStore } from './settings'

// Replaces the whole scene with an example one. The overlays stay; Ctrl Z brings the scene back.
export function loadDemo(id: DemoId): void {
  sceneStore.set((s) => ({ ...demoScene(id), overlays: s.overlays }))
  const lang = settingsStore.get().lang
  const demo = DEMOS.find((d) => d.id === id)
  if (demo) notify(translate(lang, 'demo.loaded', { name: translate(lang, demo.name) }))
}
