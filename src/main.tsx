import { OUTPUT_PARAM } from './engine/output/bridge'

// The output window, opened by the app for a projector, loads only the renderer.
if (new URLSearchParams(location.search).has(OUTPUT_PARAM)) await import('./output/main')
else await import('./mainApp')
