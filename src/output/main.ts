import { BRIDGE_KEY, type OutputBridge } from '../engine/output/bridge'
import { startView, type ViewBridge } from './view'

// The output window: reads the main window that opened it, through its bridge.
function bridge(): ViewBridge | null {
  try {
    const b = (window.opener as Record<string, unknown> | null)?.[BRIDGE_KEY]
    return (b as OutputBridge | undefined) ?? null
  } catch {
    // The opener went to another origin.
    return null
  }
}

startView({ bridge, title: 'output.title', lost: 'output.lost', transparent: false })
