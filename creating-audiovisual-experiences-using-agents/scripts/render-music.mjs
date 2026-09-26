// Render music/track.js offline (OfflineAudioContext in headless Chrome) to a WAV.
//   npm run music                         -> music/soundtrack.wav
//   npm run music -- --out music/alt.wav
import fs from 'node:fs';
import { openFilm, parseArgs } from './browser.mjs';
import { timing } from './timing.mjs';

const args = parseArgs();
const out = typeof args.out === 'string' ? args.out : 'music/soundtrack.wav';
const tm = timing();
const { bpm, beatsPerBar } = tm.config;
const sections = tm.scenes.map((s) => ({ id: s.id, bars: s.length / tm.framesPerBar }));
const sampleRate = 48000;
const seconds = tm.duration + 1.5; // let the reverb tail ring out; render.mjs trims to film length

const { page, close } = await openFilm();
try {
  const b64 = await page.evaluate(async (opts) => {
    const { compose } = await import(`/music/track.js?v=${Date.now()}`);
    const ctx = new OfflineAudioContext(2, Math.ceil(opts.sampleRate * opts.seconds), opts.sampleRate);
    compose(ctx, ctx.destination, opts);
    const buf = await ctx.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    let peak = 0;
    for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    const gain = peak > 0 ? 0.89 / peak : 1; // normalise to -1 dBFS
    const pcm = new Int16Array(L.length * 2);
    for (let i = 0; i < L.length; i++) {
      pcm[2 * i] = Math.max(-1, Math.min(1, L[i] * gain)) * 32767;
      pcm[2 * i + 1] = Math.max(-1, Math.min(1, R[i] * gain)) * 32767;
    }
    const bytes = new Uint8Array(pcm.buffer);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }, { bpm, beatsPerBar, sections, sampleRate, seconds });

  const data = Buffer.from(b64, 'base64');
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 4, 28); header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(out, Buffer.concat([header, data]));
  console.log(`${out}  ${seconds.toFixed(2)}s  ${bpm} BPM  sections: ${sections.map((s) => `${s.id}(${s.bars})`).join(' ')}`);
} finally {
  await close();
}
