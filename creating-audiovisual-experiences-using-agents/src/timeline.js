// The film, in order. This is the one file everybody touches:
// add your scene here (keep the list short and sweet, ~4 bars per scene).
//
// Timing is musical on purpose:
//   96 BPM, 4/4  ->  1 beat = 0.625 s, 1 bar = 2.5 s = 60 frames @ 24 fps
// so the music track (see music/) and the cuts line up by construction.

export const config = {
  width: 1080,
  height: 1080,
  fps: 24,
  bpm: 96,
  beatsPerBar: 4,
  transitionBeats: 2, // the circle portal between two scenes
};

export const scenes = [
  { file: 'intro.js', bars: 3 },
  { file: 'donau.js', bars: 4 },
  // { file: 'your-scene.js', bars: 4 },
  { file: 'outro.js', bars: 3 },
];
