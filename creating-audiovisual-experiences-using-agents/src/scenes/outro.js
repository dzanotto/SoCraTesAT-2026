// Credits: rings contract onto the thread dot while the scene list scrolls by,
// ending on the dot alone. Credits are generated from timeline.js automatically.

export default {
  title: 'Credits',
  author: 'the session',

  draw(ctx, f) {
    const { w, h, pal, lib, credits } = f;
    const { ease, range01, label, TAU } = lib;
    const cx = w / 2, cy = h / 2;

    // Rings pulling in to the centre, one per beat.
    for (let i = 0; i < 4; i++) {
      const k = ease.inOutCubic(range01(f.beat - i * 0.5, 0, 6));
      const r = (560 - i * 90) * (1 - k) + 16;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = i % 2 ? pal.pink : pal.blue;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
    }

    // Credits, fading in then out.
    const items = credits.filter((c) => !['intro', 'outro'].includes(c.id));
    const vis = ease.outQuad(range01(f.bar, 0.3, 0.9)) * (1 - range01(f.bar, 2.2, 2.7));
    ctx.globalAlpha = vis;
    label(ctx, 'made together at SoCraTes Linz 2026', cx, cy - 200, { size: 40, color: pal.ink, weight: 700 });
    items.forEach((c, i) => {
      const y = cy + 110 + i * 46;
      label(ctx, c.title, cx - 16, y, { size: 30, color: pal.ink, align: 'right', weight: 600 });
      label(ctx, c.author, cx + 16, y, { size: 30, color: pal.pink, align: 'left', weight: 500 });
    });
    ctx.globalAlpha = 1;
  },
};
