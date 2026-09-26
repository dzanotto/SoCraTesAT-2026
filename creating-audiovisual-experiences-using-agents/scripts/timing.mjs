// Film timing computed in Node (mirrors src/engine.js) so scripts can align audio.
import { config, scenes } from '../src/timeline.js';

export function timing() {
  const framesPerBar = (config.fps * 60 / config.bpm) * config.beatsPerBar;
  let start = 0;
  const list = scenes.map((s) => {
    const id = s.file.replace(/\.js$/, '');
    const length = Math.round((s.bars ?? 4) * framesPerBar);
    const item = { id, start, length };
    start += length;
    return item;
  });
  return { config, scenes: list, totalFrames: start, duration: start / config.fps, framesPerBar };
}
