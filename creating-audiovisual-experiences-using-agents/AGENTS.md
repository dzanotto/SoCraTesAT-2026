# Rules for agents working in this repo

This repo is a collaborative short film: every frame is drawn with JavaScript on a
`<canvas>`, rendered frame-by-frame in headless Chrome, encoded with ffmpeg.
Several people (and their agents) add **scenes** in parallel. The rules below
keep the film coherent. Follow them strictly.

## The scene contract

A scene is one file, `src/scenes/<id>.js`, default-exporting:

```js
export default {
  title: 'Human readable title',   // shown in the credits
  author: 'who prompted it',       // shown in the credits
  setup({ w, h, lib, seed }) { return state },  // optional, runs once
  draw(ctx, f) { ... },            // required, runs once per frame
  thread: true,                    // optional: false hides the centre dot
};
```

`f` contains: `w, h` (1080×1080), `t` (seconds in scene), `p` (progress 0..1),
`beat`, `bar` (musical time, floats), `frame`, `fps`, `duration`,
`rng` (seeded per frame), `seed` (stable string for layouts), `state`
(from setup), `pal` (palette), `lib` (helpers, see `src/lib/paint.js`),
`credits`.

Start from `src/scenes/_template.js`; `src/scenes/donau.js` is the reference
for the quality bar. Register a scene by adding it to `src/timeline.js`.

## Hard rules

1. **Deterministic.** Never use `Math.random()`, `Date.now()`, `performance.now()`,
   timers or animation frames in a scene. Everything derives from `f`.
   Use `lib.makeRng(f.seed)` for layouts that stay put, `f.rng` for flicker.
2. **Pure code.** No images, fonts, network requests or external libraries. Draw everything.
3. **Palette only.** Use colours from `pal` (plus `lib.alpha`/`lib.mix` of them).
4. **House style:** risograph print. Flat shapes plus `lib.halftone()` layers for
   shading, limited palette, a little wobble (`lib.wobbleLine`), soft `lib.glow`.
5. **The thread.** The engine draws an ink dot at the centre (540, 540) of every frame.
   Compose around it: it can be a moon, an eye, a lantern, a buoy... or just sit in the sky.
6. **Music-aware.** 96 BPM, 4/4. 1 bar = 2.5 s = 60 frames. Make things hit on the beat
   (`lib.pulse(f.beat)`), change on bar boundaries (`Math.floor(f.bar)`).
7. **Transitions are the engine's job.** The next scene opens in a circle from the centre
   during the first 2 beats. Your scene may be drawn with `p` slightly > 1 while it's
   being covered, so don't crash or go blank after the end.
8. **Stay in your file.** Only edit your own scene and your line in `timeline.js`.
   Changes to `src/engine.js` or `src/lib/` need the whole room's agreement.
9. **Performance:** a frame should draw in < 150 ms. Keep halftone spacing ≥ 6 and pass
   `bounds` to limit work.

## The loop: always look at your work

You cannot judge a scene without seeing it. After every meaningful change:

```bash
npm run stills -- --scene <id>              # contact sheet, 8 frames -> out/stills/<id>.png
npm run stills -- --scene <id> --frame 90   # one full-size frame  -> out/stills/<id>-90.png
```

Open the PNG, critique it honestly (composition, readability at the centre, palette,
motion across the 8 frames), fix, repeat. Render video only when stills look right:

```bash
npm run render -- --scene <id>              # out/<id>.mp4 with the matching music slice
```

## Music

- `music/track.js` is a Web Audio composition rendered offline: `npm run music` → `music/soundtrack.wav`.
  Its arrangement follows the sections in `src/timeline.js` automatically.
- `music/soundtrack.strudel.js` is for live jamming on https://strudel.cc; export a WAV from there
  and save it as `music/soundtrack.wav` to use it instead.
- `npm run render` always muxes `music/soundtrack.wav` if it exists.

## Git

Small commits, one per scene iteration, message = what changed visually
(e.g. `donau: ship gets a wake, moon reflection wobbles`). No attribution lines.
