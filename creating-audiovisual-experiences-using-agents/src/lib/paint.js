// Drawing helpers that give the "risograph print" look.
// All functions take a CanvasRenderingContext2D as first argument.

import { makeRng } from './rng.js';

export const TAU = Math.PI * 2;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
// Map x from [a, b] to [0, 1], clamped. Great for "this happens between 1s and 2s".
export const range01 = (x, a, b) => clamp((x - a) / (b - a));

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};

// A decaying pulse that fires on every beat: 1 right on the beat, fading to 0.
// Use it to make things "hit" with the music: scale, glow, brightness...
export const pulse = (beat, sharpness = 6) => Math.exp(-(beat % 1) * sharpness);

/**
 * Halftone fill: a rotated grid of dots whose size follows `density(x, y)`.
 * This is THE signature texture. Combine a flat base colour with a halftone
 * layer in a second colour for gradients that look printed.
 *
 *   halftone(ctx, { color: pal.pink, spacing: 9, angle: 0.26,
 *                   density: (x, y) => y / 1080, clip: myPath2D });
 *
 * density returns 0..1 (0 = no dot, 1 = dots touching).
 * clip is an optional Path2D; bounds [x, y, w, h] limits work for speed.
 */
export function halftone(ctx, { color, spacing = 9, angle = 0.26, density, clip, bounds }) {
  const [bx, by, bw, bh] = bounds ?? [0, 0, ctx.canvas.width, ctx.canvas.height];
  const cx = bx + bw / 2, cy = by + bh / 2;
  const half = Math.hypot(bw, bh) / 2 + spacing;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const maxR = spacing * 0.62;
  ctx.save();
  if (clip) ctx.clip(clip);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let v = -half; v <= half; v += spacing) {
    for (let u = -half; u <= half; u += spacing) {
      const x = cx + u * cos - v * sin;
      const y = cy + u * sin + v * cos;
      if (x < bx - spacing || x > bx + bw + spacing || y < by - spacing || y > by + bh + spacing) continue;
      const d = density(x, y);
      if (d <= 0.02) continue;
      const r = maxR * Math.sqrt(Math.min(d, 1));
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
  }
  ctx.fill();
  ctx.restore();
}

/**
 * Hand-drawn wobbly polyline through `points` ([[x,y], ...]).
 * `seed` keeps the wobble stable between frames.
 */
export function wobbleLine(ctx, points, { color, width = 4, amp = 1.5, seed = 1, close = false }) {
  const rng = makeRng(seed);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    const jx = x + rng.range(-amp, amp), jy = y + rng.range(-amp, amp);
    i === 0 ? ctx.moveTo(jx, jy) : ctx.lineTo(jx, jy);
  });
  if (close) ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** Points on a circle, handy for wobbleLine rings and organic blobs. */
export function circlePoints(cx, cy, r, n = 96, radiusFn = () => 1) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * TAU;
    const rr = r * radiusFn(a);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
}

/** Radial glow: soft light for lamps, moons, LED facades. */
export function glow(ctx, x, y, r, color, strength = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** Text in the house style. */
export function label(ctx, text, x, y, { size = 48, color, align = 'center', weight = 600, font = 'display' } = {}) {
  const families = {
    display: '"Avenir Next", "Futura", "Helvetica Neue", Arial, sans-serif',
    serif: '"Baskerville", "Georgia", serif',
    mono: '"SF Mono", "Menlo", monospace',
  };
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.font = `${weight} ${size}px ${families[font] ?? font}`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Used by the engine; scenes normally don't need these.

let grainCanvas = null;
/** Paper grain + faint speckles laid over every frame (multiply). */
export function paperGrain(ctx, strength = 0.18) {
  const { width: w, height: h } = ctx.canvas;
  if (!grainCanvas || grainCanvas.width !== w) {
    grainCanvas = document.createElement('canvas');
    grainCanvas.width = w;
    grainCanvas.height = h;
    const g = grainCanvas.getContext('2d');
    const img = g.createImageData(w, h);
    const rng = makeRng('paper');
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 200 + rng() * 55;
      const speck = rng() < 0.002 ? 120 : 0;
      img.data[i] = img.data[i + 1] = n - speck;
      img.data[i + 2] = n - speck - 8;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = strength;
  ctx.drawImage(grainCanvas, 0, 0);
  ctx.restore();
}
