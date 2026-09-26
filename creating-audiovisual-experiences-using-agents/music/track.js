// Offline soundtrack: plain Web Audio, rendered deterministically in headless Chrome.
//   npm run music   -> music/soundtrack.wav   (length and sections follow src/timeline.js)
//
// This is the "agent can render it by itself" path. The Strudel path
// (music/soundtrack.strudel.js, exported from strudel.cc) sounds nicer
// live - both end up as music/soundtrack.wav.
//
// Musical grid is the same as the film: 96 BPM, 4/4, one chord per bar.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const note = (name) => {
  const [, l, acc, oct] = name.match(/^([A-G])([b#]?)(-?\d)$/);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[l] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0);
  return midi(12 * (Number(oct) + 1) + base);
};

// One chord per bar, looping. Dreamy A minor: Am7 - Fmaj7 - Cmaj7 - G6
const CHORDS = [
  ['A3', 'C4', 'E4', 'G4'],
  ['F3', 'A3', 'C4', 'E4'],
  ['C4', 'E4', 'G4', 'B4'],
  ['G3', 'B3', 'D4', 'E4'],
];
const BASS = ['A1', 'F1', 'C2', 'G1'];
// A minor pentatonic melody, 8 eighth-notes per bar ('.' = rest).
const MELODY = [
  ['E5', '.', 'G5', 'A5', '.', 'G5', 'E5', '.'],
  ['C5', '.', 'D5', 'E5', '.', '.', 'D5', 'C5'],
  ['G5', '.', 'E5', '.', 'D5', 'E5', 'G5', '.'],
  ['A5', 'G5', '.', 'E5', 'D5', '.', 'C5', 'D5'],
];

export function compose(ctx, out, { bpm, beatsPerBar, sections }) {
  const beat = 60 / bpm;
  const bar = beat * beatsPerBar;

  // --- Mix bus: master -> compressor -> out; reverb + delay sends.
  const master = ctx.createGain();
  master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 3;
  master.connect(comp).connect(out);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 2.8, 2.5);
  const revGain = ctx.createGain(); revGain.gain.value = 0.35;
  reverb.connect(revGain).connect(master);

  const delay = ctx.createDelay(2);
  delay.delayTime.value = beat * 0.75; // dotted eighth
  const fb = ctx.createGain(); fb.gain.value = 0.35;
  const delTone = ctx.createBiquadFilter(); delTone.type = 'lowpass'; delTone.frequency.value = 2500;
  delay.connect(delTone).connect(fb).connect(delay);
  delTone.connect(master);

  const noise = noiseBuffer(ctx);

  // --- Instruments -------------------------------------------------------
  const kick = (t, v = 1) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.95 * v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.5);
  };
  const noiseHit = (t, { freq, type, q = 1, dur, vol, send = 0 }) => {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    if (send) { const sg = ctx.createGain(); sg.gain.value = send; g.connect(sg).connect(reverb); }
    s.start(t, (t * 7.31) % 0.5); s.stop(t + dur + 0.05); // varying offset in the noise = less robotic, still deterministic
  };
  const snare = (t) => noiseHit(t, { freq: 1900, type: 'bandpass', q: 0.8, dur: 0.22, vol: 0.45, send: 0.5 });
  const hat = (t, v = 1) => noiseHit(t, { freq: 8000, type: 'highpass', dur: 0.045, vol: 0.16 * v });

  const bass = (t, f, dur) => {
    const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f;
    fl.type = 'lowpass'; fl.Q.value = 6;
    fl.frequency.setValueAtTime(900, t);
    fl.frequency.exponentialRampToValueAtTime(180, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl).connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  };

  const pad = (t, notes, dur, vol = 0.07) => {
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.8, dur * 0.3));
    g.gain.linearRampToValueAtTime(vol * 0.8, t + dur - 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.4);
    fl.connect(g); g.connect(master); g.connect(reverb);
    for (const n of notes) {
      for (const detune of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = note(n); o.detune.value = detune;
        o.connect(fl); o.start(t); o.stop(t + dur + 0.5);
      }
    }
  };

  const pluck = (t, f, vol = 0.18) => {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    o2.type = 'sine'; o2.frequency.value = f * 2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g); o2.connect(g);
    g.connect(master); g.connect(delay); g.connect(reverb);
    o.start(t); o2.start(t); o.stop(t + 0.8); o2.stop(t + 0.8);
  };

  // --- Arrangement: follows the scenes of the film ---------------------------
  // sections = [{ id, startBar, bars }]; first = intro, last = outro, rest = groove.
  let barIndex = 0;
  sections.forEach((sec, si) => {
    const role = si === 0 ? 'intro' : si === sections.length - 1 ? 'outro' : 'groove';
    for (let b = 0; b < sec.bars; b++, barIndex++) {
      const t0 = barIndex * bar;
      const ch = barIndex % CHORDS.length;
      const last = role === 'outro' && b === sec.bars - 1;
      pad(t0, CHORDS[ch], last ? bar * 1.5 : bar, role === 'groove' ? 0.05 : 0.07);

      if (role === 'intro') {
        // Sparse plucks, the melody "arriving".
        MELODY[ch].forEach((n, i) => { if (n !== '.' && (i % 4 === 0 || b > 0)) pluck(t0 + i * beat / 2, note(n), 0.12); });
        if (b === sec.bars - 1) for (let i = 0; i < 8; i++) hat(t0 + bar / 2 + i * beat / 4, i / 8); // riser into the groove
      }
      if (role === 'groove') {
        for (let i = 0; i < beatsPerBar; i++) {
          kick(t0 + i * beat, i % 2 ? 0.8 : 1);
          if (i % 2 === 1) snare(t0 + i * beat);
        }
        for (let i = 0; i < 8; i++) hat(t0 + i * beat / 2 + beat / 4, i % 2 ? 1 : 0.6);
        bass(t0, note(BASS[ch]), beat * 1.5);
        bass(t0 + beat * 2, note(BASS[ch]), beat * 0.5);
        bass(t0 + beat * 2.75, note(BASS[ch]) * 2, beat * 0.9);
        MELODY[ch].forEach((n, i) => { if (n !== '.') pluck(t0 + i * beat / 2, note(n)); });
      }
      if (role === 'outro') {
        if (b === 0) kick(t0);
        MELODY[ch].forEach((n, i) => { if (n !== '.' && i % 2 === 0 && !last) pluck(t0 + i * beat / 2, note(n), 0.09); });
        if (last) pluck(t0, note('A5'), 0.14);
      }
    }
  });
}

function impulse(ctx, seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  let seed = 1234;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = rnd() * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function noiseBuffer(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 42;
  for (let i = 0; i < d.length; i++) d[i] = ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  return buf;
}
