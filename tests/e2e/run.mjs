// Runs the browser checks in Firefox and Chrome against the built app.
// Starts `vite preview` on 4173 if nothing answers there, and stops it at the end.
// Usage: node tests/e2e/run.mjs [check ...] [--firefox | --chrome] [--serial] [--jobs N]
// While iterating, name only the checks the change touches and add --chrome: a minute or two.
// The whole set is for before publishing: about 40 min. --jobs N runs the checks that do not
// measure time N at once, but on a 4-core PC it saved nothing (the renderers slow each other
// down: 43 min on the clock for 72 of runs) and made four checks fail that pass alone.
// The checks print what they measured; this runner flags crashes and reported errors.
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const APP = process.env.SPECTRA_URL ?? 'http://localhost:4173/'
const START = Date.now()

// Checks that measure time, frame rates, flashes or sound, or that use a fixed port or a
// window of their own: two browsers rendering at once would falsify them, so these run
// one at a time, after the rest.
const SERIAL = [
  'visuals', 'transitions', 'milkdrop', 'milkdrop-isolation', 'video-control', 'tv', 'seek', 'levelling', 'radio', 'auto', 'live', 'midi',
  'output-window', 'record', 'obs', 'safety', 'safety-output', 'keyboard', 'pwa',
]
// The rest only check what the interface does, and run side by side.
const PARALLEL = [
  'effects', 'presets', 'browser', 'shaders', 'visual-input', 'layer-input', 'layer-content', 'input-surface', 'scenes', 'demos', 'shader-examples',
  'media', 'audius', 'lookup', 'overlays', 'layers', 'touch', 'docks', 'inspector', 'knobs', 'clips', 'modulators', 'undo', 'mypanel', 'drag', 'search', 'settings',
]
const ALL = [...PARALLEL, ...SERIAL]

const args = process.argv.slice(2)
const browsers = args.includes('--firefox') ? ['firefox'] : args.includes('--chrome') ? ['chrome'] : ['firefox', 'chrome']
const jobsAt = args.indexOf('--jobs')
const jobs = args.includes('--serial') ? 1 : jobsAt >= 0 ? Math.max(1, Number(args[jobsAt + 1]) || 2) : 1
const chosen = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--jobs')
const checks = chosen.length ? chosen : ALL
const parallel = checks.filter((c) => !SERIAL.includes(c))
const serial = checks.filter((c) => SERIAL.includes(c))

const up = async () => fetch(APP).then((r) => r.ok, () => false)
let server = null
if (!(await up())) {
  // Vite itself, not through pnpm, so stopping it does not leave a child behind.
  server = spawn(process.execPath, [join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', '4173', '--strictPort'], { cwd: ROOT, stdio: 'ignore' })
  for (let i = 0; i < 50 && !(await up()); i++) await new Promise((r) => setTimeout(r, 200))
}

// One check in one browser. Its output is printed whole when it ends, so runs side by side do not interleave.
function run(check, kind) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const child = spawn(process.execPath, [join(HERE, `${check}.mjs`), kind], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (out += d))
    const timer = setTimeout(() => child.kill(), 400_000)
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      process.stdout.write(`\n== ${check} ${kind}\n${out}`)
      const reported = out.split('\n').filter((l) => /\] (source )?errors: (?!none)/.test(l))
      // Checks that print PASS and FAIL lines do not exit with an error on a FAIL.
      const failed = out.split('\n').filter((l) => /\] FAIL /.test(l))
      resolve({ check, kind, secs: Math.round((Date.now() - t0) / 1000), ok: code === 0 && !reported.length && !failed.length, why: code !== 0 ? `exit ${code ?? signal}` : reported.length ? 'errors reported' : failed.length ? `${failed.length} FAIL lines` : '' })
    })
  })
}

// A check's browsers go one after the other in the same lane; lanes take the next check as they free up.
async function lanes(list, n) {
  const results = []
  const queue = [...list]
  await Promise.all(
    Array.from({ length: n }, async () => {
      for (let check = queue.shift(); check; check = queue.shift()) for (const kind of browsers) results.push(await run(check, kind))
    }),
  )
  return results
}

const results = [...(await lanes(parallel, jobs)), ...(await lanes(serial, 1))]

server?.kill()
const wall = Math.round((Date.now() - START) / 60000)
console.log('\n== summary')
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.check} ${r.kind} ${r.secs}s${r.why ? ` (${r.why})` : ''}`)
console.log(`total ${Math.round(results.reduce((t, r) => t + r.secs, 0) / 60)} min of runs, ${wall} min on the clock`)
process.exitCode = results.every((r) => r.ok) ? 0 : 1
