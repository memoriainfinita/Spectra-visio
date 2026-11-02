import { cleanName } from './preset'
import { normalizeScene, type SceneState } from './scene'

// A scene the user saved: the whole composition under a name, as the scene model stores it.
export interface SavedScene {
  id: string
  name: string
  // Milliseconds since the epoch.
  created: number
  scene: SceneState
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// What is stored or restored from a backup; what is not a scene with a name and an id is dropped.
export function normalizeSavedScenes(raw: unknown): SavedScene[] {
  if (!Array.isArray(raw)) return []
  const ids = new Set<string>()
  const out: SavedScene[] = []
  for (const x of raw) {
    if (!isObj(x) || typeof x.id !== 'string' || typeof x.name !== 'string' || ids.has(x.id)) continue
    const name = cleanName(x.name)
    if (!name) continue
    ids.add(x.id)
    out.push({ id: x.id, name, created: typeof x.created === 'number' ? x.created : 0, scene: normalizeScene(x.scene) })
  }
  return out
}
