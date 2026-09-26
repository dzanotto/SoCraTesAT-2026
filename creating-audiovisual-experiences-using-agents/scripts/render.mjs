// Render the film (or one scene) to MP4, frame by frame, through headless Chrome + ffmpeg.
//   npm run render                          -> out/film.mp4 (with music/soundtrack.wav if it exists)
//   npm run render -- --scene donau         -> out/donau.mp4 (music aligned to where the scene sits)
//   npm run render -- --audio path/to.wav   -> use another soundtrack
//   npm run render -- --silent              -> no audio
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { openFilm, parseArgs } from './browser.mjs';
import { timing } from './timing.mjs';

const args = parseArgs();
const scene = typeof args.scene === 'string' ? args.scene : undefined;
const out = typeof args.out === 'string' ? args.out : `out/${scene ?? 'film'}.mp4`;
const audio = args.silent ? null : typeof args.audio === 'string' ? args.audio : 'music/soundtrack.wav';
const useAudio = audio && fs.existsSync(audio);
fs.mkdirSync('out', { recursive: true });

const tm = timing();
const audioOffset = scene ? (tm.scenes.find((s) => s.id === scene)?.start ?? 0) / tm.config.fps : 0;

const { page, close } = await openFilm({ scene });
const { totalFrames, fps } = await page.evaluate(() => ({
  totalFrames: window.__engine.totalFrames, fps: window.__engine.config.fps,
}));
const duration = totalFrames / fps;

const ff = spawn('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
  ...(useAudio ? ['-ss', String(audioOffset), '-i', audio] : []),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
  ...(useAudio ? ['-c:a', 'aac', '-b:a', '192k', '-af', 'apad', '-map', '0:v', '-map', '1:a'] : []),
  '-t', String(duration), '-movflags', '+faststart', out,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));

const t0 = Date.now();
const BATCH = 6;
try {
  for (let i = 0; i < totalFrames; i += BATCH) {
    const frames = await page.evaluate((i, n, total) => {
      const c = document.getElementById('c');
      const res = [];
      for (let k = i; k < Math.min(i + n, total); k++) {
        window.__engine.renderFrame(k);
        res.push(c.toDataURL('image/png').split(',')[1]);
      }
      return res;
    }, i, BATCH, totalFrames);
    for (const b64 of frames) {
      if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    }
    const done = Math.min(i + BATCH, totalFrames);
    process.stdout.write(`\rframe ${done}/${totalFrames}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await ffDone;
  console.log(`\n${out}  ${duration.toFixed(2)}s  ${useAudio ? `audio: ${audio}` : 'silent (no music/soundtrack.wav)'}`);
} finally {
  await close();
}
