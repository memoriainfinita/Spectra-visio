// The app: player, panels and the stage.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initEngine } from './app/engine'
import { initLibrary } from './app/library'
import { initLive } from './app/live'
import { initMidi } from './app/midi'
import { initObs } from './app/obs'
import { initOutput } from './app/output'
import { initOverlays } from './app/overlays'
import { initPower } from './app/power'
import { initPresets } from './app/presets'
import { initRadio } from './app/radio'
import { initRecord } from './app/record'
import { initScene } from './app/scene'
import { initSettings } from './app/settings'
import { initShaders } from './app/shaders'
import { initTrackAnalysis } from './app/trackAnalysis'
import { initUpdate } from './app/update'
import './styles/tokens.css'
import './styles/app.css'

await initSettings()
// Imported shaders first: the scene and the presets may point at them.
await initShaders()
await initScene()
await initPresets()
await initLibrary()
await initEngine()
initLive()
initMidi()
initOutput()
initObs()
initPower()
initUpdate()
await initRecord()
await initOverlays()
await initTrackAnalysis()
await initRadio()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
