// Scene template: copy this file to src/scenes/<your-scene>.js and add it
// to src/timeline.js. Preview it alone at http://localhost:5173/?scene=<your-scene>
//
// Rules of the film (see AGENTS.md for the full contract):
//   * Everything is drawn with code. No images, no Math.random(), no Date.now().
//   * Only colours from `pal`. Paper background is already painted for you.
//   * Keep the centre (540, 540) readable: the ink "thread" dot sits there.
//   * Time is musical: use f.beat / f.bar to make things hit with the music.

export default {
  title: 'Template',
  author: 'your name',

  // Optional: expensive one-time work (layouts, precomputed paths).
  // Whatever you return is available as f.state in draw().
  setup({ w, h, lib, seed }) {
    const rng = lib.makeRng(seed);
    return {
      dots: Array.from({ length: 40 }, () => ({ x: rng() * w, y: rng() * h, r: rng.range(4, 14) })),
    };
  },

  // Called once per frame. f = { w, h, t, p, beat, bar, frame, fps, duration, rng, seed, state, lib, pal }
  draw(ctx, f) {
    const { w, h, pal, lib, state } = f;

    // A halftone gradient: dense at the bottom, fading upwards.
    lib.halftone(ctx, { color: pal.blue, spacing: 10, density: (x, y) => y / h });

    // Things that pulse with the beat.
    const kick = lib.pulse(f.beat);
    ctx.fillStyle = pal.pink;
    for (const d of state.dots) {
      ctx.beginPath();
      ctx.arc(d.x, d.y + Math.sin(f.t + d.x) * 10, d.r * (1 + 0.4 * kick), 0, lib.TAU);
      ctx.fill();
    }

    lib.label(ctx, 'hello Linz', w / 2, h * 0.75, { size: 64, color: pal.ink });
  },
};
