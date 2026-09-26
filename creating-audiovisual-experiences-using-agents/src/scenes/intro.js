// Title card: a hand-drawn ring draws itself around the thread dot,
// a pink orbit swings by, the title appears, then everything clears
// so the next scene can open through the portal.

export default {
  title: 'Title',
  author: 'the session',

  draw(ctx, f) {
    const { w, h, pal, lib } = f;
    const { ease, range01, circlePoints, wobbleLine, label } = lib;
    const cx = w / 2, cy = h / 2;
    const out = ease.inQuad(range01(f.p, 0.8, 0.97)); // fade-out towards the end

    // Ring drawing itself during the first bar.
    const draw = ease.inOutCubic(range01(f.bar, 0, 1));
    const ring = circlePoints(cx, cy, 150, 120, (a) => 1 + 0.012 * Math.sin(a * 5));
    const n = Math.max(2, Math.floor(ring.length * draw));
    ctx.globalAlpha = 1 - out;
    wobbleLine(ctx, ring.slice(0, n), { color: pal.blue, width: 5, amp: 1.2, seed: 7 });

    // Pink orbit + satellite dot, swinging in on the second bar.
    const orbit = ease.outQuad(range01(f.bar, 0.6, 1.8));
    if (orbit > 0) {
      const r = 150 + 330 * orbit;
      ctx.strokeStyle = pal.pink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx - 40 * orbit, cy + 30 * orbit, r, 0, lib.TAU);
      ctx.stroke();
      const a = -0.9 + f.t * 0.7;
      ctx.fillStyle = pal.pink;
      ctx.beginPath();
      ctx.arc(cx - 40 * orbit + Math.cos(a) * r, cy + 30 * orbit + Math.sin(a) * r, 14, 0, lib.TAU);
      ctx.fill();
    }

    // Title, on the downbeat of bar 2.
    const txt = ease.outQuad(range01(f.bar, 1, 1.6));
    ctx.globalAlpha = txt * (1 - out);
    label(ctx, 'SoCraTes Linz 2026', cx, cy + 230 + 20 * (1 - txt), { size: 60, color: pal.ink, weight: 700 });
    label(ctx, 'an audiovisual experience, drawn by agents & humans', cx, cy + 290 + 20 * (1 - txt), {
      size: 26, color: pal.blue, weight: 500,
    });
    ctx.globalAlpha = 1;
  },
};
