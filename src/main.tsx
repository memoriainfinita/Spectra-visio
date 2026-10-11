import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initEngine } from './app/engine'
import { initLibrary } from './app/library'
import { initOverlays } from './app/overlays'
import { initPresets } from './app/presets'
import { initScene } from './app/scene'
import { initSettings } from './app/settings'
import { initShaders } from './app/shaders'
import { initTrackAnalysis } from './app/trackAnalysis'
import './styles/tokens.css'
import './styles/app.css'

await initSettings()
// Imported shaders first: the scene and the presets may point at them.
await initShaders()
await initScene()
await initPresets()
await initLibrary()
await initEngine()
await initOverlays()
await initTrackAnalysis()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
