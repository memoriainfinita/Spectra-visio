# Browser checks

Playwright scripts that drive the built app in Firefox and Chrome, muted, and print what they measured: brightness and symmetry of the canvas, frame rates, timings, files written. They are checks to read, not pass/fail assertions; the runner flags crashes and reported page errors.

## Run

```bash
pnpm build
pnpm e2e                       # every check, Firefox then Chrome
pnpm e2e -- tabs fold          # some checks
pnpm e2e -- --firefox          # one browser
node tests/e2e/touch.mjs chrome  # one check by hand
```

The runner starts `vite preview` on port 4173 when nothing answers there and stops it at the end; `SPECTRA_URL` points the checks elsewhere. Chrome is the installed one (`channel: 'chrome'`); Firefox is Playwright's (`pnpm exec playwright install firefox` the first time).

Audio is always muted: Chrome with `--mute-audio`, Firefox with `media.volume_scale` at 0. Headless browsers play through the speakers otherwise.

## Files

- `lib.mjs`: launching, the generated test track, canvas reads, helpers
- `obs-fake.mjs`: a stand-in for obs-websocket 5, used by `obs.mjs`
- `fixtures/`: shaders, an image, a video and a lyrics file
- `music/`: real tracks for `auto.mjs`, not in git (see its README)
- `out/`: generated files, screenshots and recordings, not in git
- `layout.mjs`: screenshots of the desktop layout at several widths, not part of the run
