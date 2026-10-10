import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initEngine } from './app/engine'
import { initScene } from './app/scene'
import { initSettings } from './app/settings'
import './styles/tokens.css'
import './styles/app.css'

await initSettings()
await initScene()
await initEngine()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
