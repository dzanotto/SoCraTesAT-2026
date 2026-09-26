// Example scene: a summer night on the Danube in Linz.
// Pöstlingberg with its basilica on the left, the Nibelungenbrücke,
// the Ars Electronica Center's LED facade pulsing to the beat,
// its reflection shimmering in the river, and a ship passing by.

const HORIZON = 640;

export default {
  title: 'Donau bei Nacht',
  author: 'example',

  setup({ w, lib, seed }) {
    const rng = lib.makeRng(seed);
    const stars = Array.from({ length: 110 }, () => ({
      x: rng() * w,
      y: rng() * 430,
      r: rng.range(1.2, 3.6),
      phase: rng() * lib.TAU,
      speed: rng.range(1, 3),
    }));
    return { stars, noise: lib.makeNoise(seed) };
  },

  draw(ctx, f) {
    const { w, h, t, pal, lib, state } = f;
    const { halftone, glow, mix, alpha, pulse, range01, TAU } = lib;
    const kick = pulse(f.beat, 5);

    // Slow push-in keeps the still composition alive.
    ctx.save();
    const zoom = 1 + 0.05 * f.p;
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2, -h / 2);

    // --- Sky -------------------------------------------------------------
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
    sky.addColorStop(0, pal.night);
    sky.addColorStop(0.65, pal.violet);
    sky.addColorStop(1, mix(pal.violet, pal.pink, 0.55));
    ctx.fillStyle = sky;
    ctx.fillRect(-60, -60, w + 120, HORIZON + 60);

    const skyClip = new Path2D();
    skyClip.rect(-60, -60, w + 120, HORIZON + 60);
    halftone(ctx, {
      color: pal.pink, spacing: 9, angle: 0.26, clip: skyClip, bounds: [-60, 200, w + 120, HORIZON - 200],
      density: (x, y) => Math.pow(range01(y, 260, HORIZON), 1.6) * (0.55 + 0.45 * state.noise(x / 160, y / 90)),
    });
    halftone(ctx, {
      color: pal.blue, spacing: 11, angle: 1.1, clip: skyClip, bounds: [-60, -60, w + 120, 420],
      density: (x, y) => 0.45 * (1 - y / 420) * state.noise.fbm(x / 220 + t * 0.03, y / 120),
    });

    // Stars twinkle, and a few flash on each beat.
    ctx.fillStyle = pal.paper;
    state.stars.forEach((s, i) => {
      const tw = 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
      const flash = i % 9 === Math.floor(f.beat) % 9 ? kick : 0;
      ctx.globalAlpha = 0.5 + 0.5 * tw;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * (tw + flash * 1.4), 0, TAU);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Moon with printed shading.
    const moon = new Path2D();
    moon.arc(830, 180, 72, 0, TAU);
    glow(ctx, 830, 180, 230, alpha(pal.yellow, 0.35));
    ctx.fillStyle = pal.yellow;
    ctx.fill(moon);
    halftone(ctx, {
      color: pal.orange, spacing: 7, angle: 0.7, clip: moon, bounds: [750, 100, 160, 160],
      density: (x, y) => range01(Math.hypot(x - 800, y - 150), 20, 110) * 0.9,
    });

    // --- Pöstlingberg -------------------------------------------------------
    const hill = new Path2D();
    hill.moveTo(-60, HORIZON);
    hill.bezierCurveTo(60, 540, 150, 436, 250, 432);
    hill.bezierCurveTo(350, 436, 450, 540, 600, HORIZON);
    hill.closePath();
    ctx.fillStyle = mix(pal.night, pal.violet, 0.3);
    ctx.fill(hill);
    halftone(ctx, {
      color: pal.blue, spacing: 8, angle: 0.26, clip: hill, bounds: [-60, 420, 670, 230],
      density: (x, y) => 0.4 * Math.pow(state.noise.fbm(x / 70, y / 50), 1.8) * range01(y, 700, 430),
    });

    // Basilica: wide nave, twin towers with onion domes and spires.
    ctx.fillStyle = pal.ink;
    ctx.fillRect(196, 398, 108, 36);
    ctx.beginPath(); // pitched roof
    ctx.moveTo(214, 398); ctx.lineTo(250, 380); ctx.lineTo(286, 398);
    ctx.fill();
    for (const tx of [186, 290]) {
      ctx.fillRect(tx - 12, 350, 24, 84);
      ctx.beginPath(); // onion dome
      ctx.moveTo(tx - 14, 350);
      ctx.bezierCurveTo(tx - 18, 330, tx - 2, 328, tx, 314);
      ctx.bezierCurveTo(tx + 2, 328, tx + 18, 330, tx + 14, 350);
      ctx.fill();
      ctx.fillRect(tx - 1, 298, 2, 18);
      ctx.fillStyle = pal.yellow;
      ctx.fillRect(tx - 3, 366, 6, 12);
      ctx.fillStyle = pal.ink;
    }
    ctx.fillStyle = pal.yellow;
    for (let i = 0; i < 4; i++) ctx.fillRect(224 + i * 15, 410, 6, 11);
    glow(ctx, 250, 405, 90, alpha(pal.yellow, 0.25));

    // --- Nibelungenbrücke ----------------------------------------------------
    ctx.fillStyle = pal.ink;
    ctx.fillRect(-60, 598, 660, 13);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const x0 = -40 + i * 160;
      ctx.moveTo(x0, 611);
      ctx.lineTo(x0 + 160, 611);
      ctx.lineTo(x0 + 160, 646);
      ctx.quadraticCurveTo(x0 + 80, 618, x0 + 18, 646);
      ctx.lineTo(x0, 646);
    }
    ctx.fill();
    for (let x = -30; x < 600; x += 48) {
      ctx.fillStyle = pal.ink;
      ctx.fillRect(x, 580, 3, 18);
      glow(ctx, x + 1.5, 579, 18 + 6 * kick, alpha(pal.yellow, 0.8));
      ctx.fillStyle = pal.yellow;
      ctx.beginPath();
      ctx.arc(x + 1.5, 579, 3.2, 0, TAU);
      ctx.fill();
    }

    // --- Ars Electronica Center: LED facade --------------------------------
    // Facade quad corners: top-left, top-right, bottom-right, bottom-left.
    const Q = [[640, 440], [965, 468], [965, 640], [608, 640]];
    const COLS = 16, ROWS = 8;
    const at = (u, v) => {
      const top = [Q[0][0] + (Q[1][0] - Q[0][0]) * u, Q[0][1] + (Q[1][1] - Q[0][1]) * u];
      const bot = [Q[3][0] + (Q[2][0] - Q[3][0]) * u, Q[3][1] + (Q[2][1] - Q[3][1]) * u];
      return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v];
    };
    const hues = [pal.pink, pal.yellow, pal.teal, pal.orange, pal.blue];
    // A diagonal colour wave that advances one step per bar and "breathes" per beat.
    const cellColor = (c, r) => {
      const band = Math.floor((c + r) / 3 + Math.floor(f.bar) * 2);
      return hues[((band % hues.length) + hues.length) % hues.length];
    };
    const cellLight = (c, r) => 0.55 + 0.45 * Math.sin(c * 0.55 - r * 0.4 - f.beat * Math.PI) * (0.5 + 0.5 * kick);

    ctx.fillStyle = pal.ink;
    ctx.beginPath();
    Q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    glow(ctx, 790, 540, 260 + 40 * kick, alpha(cellColor(8, 4), 0.35 + 0.25 * kick));

    const gap = 0.08;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const u0 = (c + gap) / COLS, u1 = (c + 1 - gap) / COLS;
        const v0 = (r + gap) / ROWS, v1 = (r + 1 - gap) / ROWS;
        const pts = [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
        ctx.globalAlpha = cellLight(c, r);
        ctx.fillStyle = cellColor(c, r);
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // --- Danube ------------------------------------------------------------
    const water = ctx.createLinearGradient(0, HORIZON, 0, h);
    water.addColorStop(0, pal.night);
    water.addColorStop(1, mix(pal.night, pal.blue, 0.55));
    ctx.fillStyle = water;
    ctx.fillRect(-60, HORIZON, w + 120, h - HORIZON + 60);
    ctx.fillStyle = pal.ink;
    ctx.fillRect(-60, HORIZON - 2, w + 120, 8); // embankment

    const river = new Path2D();
    river.rect(-60, HORIZON + 6, w + 120, h - HORIZON + 60);
    halftone(ctx, {
      color: pal.teal, spacing: 9, angle: 0.26, clip: river, bounds: [-60, HORIZON, w + 120, h - HORIZON + 60],
      density: (x, y) => 0.75 * Math.pow(state.noise.fbm(x / 240 + t * 0.12, y / 22), 2.2) * range01(y, HORIZON, h),
    });

    // Gentle wave strokes drifting downstream.
    ctx.strokeStyle = alpha(pal.paper, 0.18);
    ctx.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const y = HORIZON + 30 + i * 16 + i * i * 0.35;
      const len = 40 + 30 * state.noise(i, 3);
      const x0 = ((state.noise(i, 7) * 1400 - t * (20 + i * 3)) % 1300 + 1300) % 1300 - 110;
      ctx.beginPath();
      for (let x = 0; x <= len; x += 6) ctx.lineTo(x0 + x, y + Math.sin((x0 + x) / 14 + t * 2) * 2.5);
      ctx.stroke();
    }

    // Reflections: broken, wobbling dashes under every lit thing.
    const reflect = (x, width, color, depth, strength, y0 = HORIZON) => {
      for (let y = y0 + 10; y < y0 + depth; y += 9) {
        const k = 1 - (y - y0) / depth;
        const n = state.noise(x / 40 + t * 0.9, y / 14 - t * 0.6);
        if (n < 0.35) continue;
        const dx = (state.noise(y / 20, t * 0.8) - 0.5) * 26 * (1 - k);
        ctx.globalAlpha = strength * k * n;
        ctx.fillStyle = color;
        ctx.fillRect(x + dx - width * (0.5 + n * 0.4), y, width * (1 + n * 0.8), 4);
      }
    };
    for (let c = 0; c < COLS; c++) {
      const [x] = at((c + 0.5) / COLS, 1);
      reflect(x, (Q[2][0] - Q[3][0]) / COLS * 0.55, cellColor(c, ROWS - 1), 360, 0.9);
    }
    reflect(830, 60, pal.yellow, 420, 0.8);
    for (let x = -30; x < 600; x += 48) reflect(x + 1.5, 5, pal.yellow, 120, 0.7);
    ctx.globalAlpha = 1;

    // --- A ship passing downstream -----------------------------------------
    const sx = 1180 - 1500 * f.p, sy = 745;
    ctx.fillStyle = alpha(pal.paper, 0.25);
    for (let i = 0; i < 6; i++) ctx.fillRect(sx + 200 + i * 30, sy + 24 + (i % 2) * 6, 26 - i * 3, 3); // wake
    reflect(sx + 110, 150, pal.pink, 110, 0.45, sy + 24);
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.blue;
    ctx.beginPath();
    ctx.moveTo(sx - 20, sy);
    ctx.lineTo(sx + 230, sy);
    ctx.lineTo(sx + 210, sy + 28);
    ctx.lineTo(sx + 10, sy + 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.paper;
    ctx.fillRect(sx - 8, sy + 6, 226, 4);
    ctx.fillStyle = pal.pink;
    ctx.fillRect(sx + 30, sy - 34, 160, 34);
    ctx.fillStyle = pal.ink;
    ctx.fillRect(sx + 60, sy - 52, 90, 18);
    ctx.fillStyle = pal.yellow;
    for (let i = 0; i < 9; i++) ctx.fillRect(sx + 40 + i * 16, sy - 24, 8, 10);
    glow(ctx, sx + 110, sy - 20, 120, alpha(pal.yellow, 0.25));

    ctx.restore();
  },
};
