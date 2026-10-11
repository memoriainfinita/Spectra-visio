import { SOURCE_PARAM } from './engine/obs/messages'
import { OUTPUT_PARAM } from './engine/output/bridge'

// The output window, opened by the app for a projector, and the OBS source load only the
// renderer.
const params = new URLSearchParams(location.search)
if (params.has(OUTPUT_PARAM)) await import('./output/main')
else if (params.has(SOURCE_PARAM)) await import('./source/main')
else await import('./mainApp')
