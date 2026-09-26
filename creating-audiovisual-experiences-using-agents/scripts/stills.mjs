// Contact sheet of a scene (or the whole film) so you - and your agent - can LOOK at it.
//   npm run stills                       -> out/stills/film.png   (whole film, 12 frames)
//   npm run stills -- --scene donau      -> out/stills/donau.png  (8 frames)
//   npm run stills -- --scene donau --frame 30   -> out/stills/donau-30.png (one full-size frame)
//   npm run stills -- --scene donau --frames 16
import fs from 'node:fs';
import path from 'node:path';
import { openFilm, parseArgs } from './browser.mjs';

const args = parseArgs();
const scene = typeof args.scene === 'string' ? args.scene : undefined;
const name = scene ?? 'film';
fs.mkdirSync('out/stills', { recursive: true });

const { page, close } = await openFilm({ scene });
try {
  if (args.frame !== undefined) {
    const n = Number(args.frame);
    const data = await page.evaluate((n) => {
      window.__engine.renderFrame(n);
      return document.getElementById('c').toDataURL('image/png');
    }, n);
    const file = path.join('out/stills', `${name}-${n}.png`);
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    console.log(file);
  } else {
    const count = Number(args.frames ?? (scene ? 8 : 12));
    const data = await page.evaluate((count) => {
      const e = window.__engine;
      const src = document.getElementById('c');
      const cols = 4, rows = Math.ceil(count / cols), cell = 360;
      const sheet = document.createElement('canvas');
      sheet.width = cols * cell; sheet.height = rows * cell;
      const g = sheet.getContext('2d');
      g.fillStyle = '#222'; g.fillRect(0, 0, sheet.width, sheet.height);
      for (let i = 0; i < count; i++) {
        const f = Math.round((i / (count - 1 || 1)) * (e.totalFrames - 1));
        const { scene } = e.renderFrame(f);
        const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
        g.drawImage(src, x, y, cell, cell);
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, y, cell, 22);
        g.fillStyle = '#fff'; g.font = '13px monospace';
        g.fillText(`${scene} · frame ${f} · ${(f / e.config.fps).toFixed(2)}s`, x + 6, y + 15);
      }
      return sheet.toDataURL('image/png');
    }, count);
    const file = path.join('out/stills', `${name}.png`);
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    console.log(file);
  }
} finally {
  await close();
}
