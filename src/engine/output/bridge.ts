import type { AnalysisFrame } from '../analysis/analyzer'
import type { OutputState } from '../live/live'
import type { OverlayData } from '../overlay/overlay'
import type { PixelSize } from './format'
import type { PerformanceSettings } from '../render/quality'
import type { VisualSource } from '../render/visualInput'
import type { SceneState } from '../scene/scene'
import type { UserShader } from '../shaders/userVisual'

// What the output window reads from the main window, which opened it. Both windows share
// one event loop and memory, so the output calls into the main window directly: nothing
// is copied, and the camera or video element is the main window's own. Times are taken
// with the main window's clock inside these functions.

export const BRIDGE_KEY = '__spectraVisioOutput'
export const OUTPUT_PARAM = 'output'

export interface OutputBridge {
  scene(): SceneState
  // The analysis frame for what is heard now.
  frame(): AnalysisFrame | null
  // Blackout, freeze and strobe for now.
  output(frame: AnalysisFrame | null): OutputState
  control(id: string): number
  overlay(): OverlayData
  visual(): VisualSource | null
  shaders(): readonly UserShader[]
  // The fixed size the main window renders at, or null when it follows its canvas.
  size(): PixelSize | null
  // Frame cap, adaptive resolution and low power, as in the main window.
  performance?(): PerformanceSettings
  // A key pressed in the output window, as `keyCombo` writes it.
  key(combo: string): void
}
