// Runs the browser checks one after another in Firefox and Chrome, against the built app.
// Starts `vite preview` on 4173 if nothing answers there, and stops it at the end.
// Usage: node tests/e2e/run.mjs [check ...] [--firefox | --chrome]
// While iterating, name only the checks the change touches; the whole set takes about 40 min.
// The checks print what they measured; this runner flags crashes and reported errors.
import { spawn, spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const APP = process.env.SPECTRA_URL ?? 'http://localhost:4173/'

const CHECKS = [
  'visuals', 'effects', 'transitions', 'presets', 'browser', 'shaders', 'milkdrop', 'milkdrop-isolation',
  'visual-input', 'tv', 'audius', 'overlays', 'seek', 'levelling', 'radio', 'auto', 'layers', 'live', 'midi', 'output-window', 'record', 'obs',
  'safety', 'safety-output', 'keyboard', 'touch', 'tabs', 'fold', 'settings', 'pwa',
]
const args = process.argv.slice(2)
const browsers = args.includes('--firefox') ? ['firefox'] : args.includes('--chrome') ? ['chrome'] : ['firefox', 'chrome']
const chosen = args.filter((a) => !a.startsWith('--'))
const checks = chosen.length ? chosen : CHECKS

const up = async () => fetch(APP).then((r) => r.ok, () => false)
let server = null
if (!(await up())) {
  // Vite itself, not through pnpm, so stopping it does not leave a child behind.
  server = spawn(process.execPath, [join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', '4173', '--strictPort'], { cwd: ROOT, stdio: 'ignore' })
  for (let i = 0; i < 50 && !(await up()); i++) await new Promise((r) => setTimeout(r, 200))
}

const results = []
for (const check of checks) {
  for (const kind of browsers) {
    console.log(`\n== ${check} ${kind}`)
    // One at a time: two browsers rendering at once make the timing checks flaky.
    const t0 = Date.now()
    const run = spawnSync(process.execPath, [join(HERE, `${check}.mjs`), kind], { encoding: 'utf8', timeout: 400_000 })
    const out = (run.stdout ?? '') + (run.stderr ?? '')
    process.stdout.write(out)
    const reported = out.split('\n').filter((l) => /\] (source )?errors: (?!none)/.test(l))
    results.push({ check, kind, secs: Math.round((Date.now() - t0) / 1000), ok: run.status === 0 && !reported.length, why: run.status !== 0 ? `exit ${run.status ?? run.signal}` : reported.length ? 'errors reported' : '' })
  }
}

server?.kill()
console.log('\n== summary')
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.check} ${r.kind} ${r.secs}s${r.why ? ` (${r.why})` : ''}`)
console.log(`total ${Math.round(results.reduce((t, r) => t + r.secs, 0) / 60)} min`)
process.exitCode = results.every((r) => r.ok) ? 0 : 1
