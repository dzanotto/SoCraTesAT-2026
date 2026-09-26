// The engine turns "frame number" into pixels. It is deterministic:
// renderFrame(n) always produces the same image, which is what lets a
// headless browser render the film frame-by-frame into a video.
//
// Responsibilities (scenes don't have to care about any of this):
//   * timing: scene boundaries, musical time (beats/bars)
//   * the circle-portal transition between consecutive scenes
//   * the "thread": the small ink dot in the centre that survives every cut
//   * paper grain over everything

import { config, scenes as sceneList } from './timeline.js';
import { pal, alpha, mix } from './lib/palette.js';
import * as paint from './lib/paint.js';
import { makeRng, makeNoise } from './lib/rng.js';

const lib = { ...paint, pal, alpha, mix, makeRng, makeNoise };

export async function createEngine(canvas, { only } = {}) {
  const { width: W, height: H, fps, bpm, beatsPerBar } = config;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const framesPerBeat = (fps * 60) / bpm;
  const framesPerBar = framesPerBeat * beatsPerBar;
  const transitionFrames = Math.round(config.transitionBeats * framesPerBeat);

  // Load scene modules (cache-busted so the preview picks up edits on reload).
  const bust = `?v=${Date.now()}`;
  let entries = sceneList;
  if (only) {
    entries = sceneList.filter((s) => s.file.replace(/\.js$/, '') === only);
    if (!entries.length) entries = [{ file: `${only}.js`, bars: 4 }];
  }
  const scenes = [];
  let start = 0;
  for (const entry of entries) {
    const mod = await import(`./scenes/${entry.file}${bust}`);
    const scene = mod.default;
    const id = entry.file.replace(/\.js$/, '');
    const length = Math.round((entry.bars ?? scene.bars ?? 4) * framesPerBar);
    const state = scene.setup ? await scene.setup({ w: W, h: H, lib, seed: id }) : undefined;
    scenes.push({ ...scene, id, start, length, state });
    start += length;
  }
  const totalFrames = start;
  const credits = scenes.map(({ id, title, author }) => ({ id, title: title ?? id, author: author ?? '' }));

  function sceneAt(frame) {
    for (let i = scenes.length - 1; i >= 0; i--) if (frame >= scenes[i].start) return i;
    return 0;
  }

  // Build the argument every scene's draw() receives.
  function frameInfo(scene, localFrame) {
    const t = localFrame / fps;
    const beat = localFrame / framesPerBeat;
    return {
      w: W, h: H, fps,
      frame: localFrame,
      t,                                          // seconds since the scene started
      p: localFrame / scene.length,               // progress 0..1 (can exceed 1 during the outgoing transition)
      duration: scene.length / fps,
      beat,                                       // beats since the scene started (float)
      bar: beat / beatsPerBar,                    // bars since the scene started (float)
      rng: makeRng(`${scene.id}:${localFrame}`),  // fresh every frame: use for flicker / grain
      seed: scene.id,                             // use makeRng(seed) for layouts that must stay put
      state: scene.state,
      credits,                                    // [{ id, title, author }] of all scenes, for the outro
      lib, pal,
    };
  }

  function drawScene(scene, localFrame) {
    ctx.save();
    ctx.fillStyle = pal.paper;
    ctx.fillRect(0, 0, W, H);
    scene.draw(ctx, frameInfo(scene, localFrame));
    ctx.restore();
  }

  function renderFrame(frame) {
    frame = Math.max(0, Math.min(totalFrames - 1, Math.floor(frame)));
    const i = sceneAt(frame);
    const cur = scenes[i];
    const local = frame - cur.start;
    const inTransition = i > 0 && local < transitionFrames;

    if (inTransition) {
      // Old scene keeps running underneath while the new one opens in a circle.
      const prev = scenes[i - 1];
      drawScene(prev, prev.length + local);
      const k = paint.ease.inOutCubic(local / transitionFrames);
      const r = k * Math.hypot(W, H) * 0.52;
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r, 0, paint.TAU);
      ctx.clip();
      drawScene(cur, local);
      ctx.restore();
      // The portal ring.
      ctx.save();
      ctx.strokeStyle = alpha(pal.paper, 0.9 * (1 - k));
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r, 0, paint.TAU);
      ctx.stroke();
      ctx.strokeStyle = alpha(pal.ink, 0.8 * (1 - k));
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    } else {
      drawScene(cur, local);
    }

    // The thread: one ink dot that lives through the whole film.
    if (cur.thread !== false) {
      ctx.save();
      ctx.fillStyle = pal.ink;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 9, 0, paint.TAU);
      ctx.fill();
      ctx.restore();
    }

    paint.paperGrain(ctx);
    return { scene: cur.id, local };
  }

  return {
    config, scenes, totalFrames, renderFrame,
    duration: totalFrames / fps,
    frameOfScene: (id) => scenes.find((s) => s.id === id)?.start ?? 0,
  };
}
