import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initEngine } from './app/engine'
import { initSettings } from './app/settings'
import './styles/tokens.css'
import './styles/app.css'

await initSettings()
await initEngine()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
