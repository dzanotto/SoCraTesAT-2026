// SoCraTes Linz 2026 - soundtrack starter for https://strudel.cc
// Paste this into the REPL, press ctrl+enter to (re)play, ctrl+. to stop.
//
// Same grid as the film: 96 BPM, 4/4  ->  1 cycle = 1 bar = 2.5 s = 60 frames.
// Scene lengths in src/timeline.js are in bars, so "3 bars intro" = 3 cycles.
//
// When it sounds right: use the export tab in strudel.cc to render a WAV
// of exactly the film length (intro+scenes+outro bars x 2.5 s),
// save it as music/soundtrack.wav and run `npm run render`.

setcpm(96 / 4)

const chords = "<Am7 F^7 C^7 G6>"  // ^7 = maj7

stack(
  // drums - comment lines out to build up / break down
  s("bd ~ bd ~, ~ sd ~ sd").bank("RolandTR909").gain(.9),
  s("~ hh ~ hh ~ hh ~ hh").bank("RolandTR909").gain(.35),

  // bass follows the chord roots
  note("<a1 f1 c2 g1>").s("sawtooth").lpf(500).lpq(6)
    .decay(.25).sustain(0).struct("x ~ ~ x ~ ~ x ~"),

  // pad
  chord(chords).voicing().s("sawtooth").lpf(1200)
    .attack(.4).release(1).gain(.25).room(.8),

  // melody: A minor pentatonic, same harmony as music/track.js
  n("<[4 ~ 6 7 ~ 6 4 ~] [2 ~ 3 4 ~ ~ 3 2] [6 ~ 4 ~ 3 4 6 ~] [7 6 ~ 4 3 ~ 2 3]>")
    .scale("A3:minor:pentatonic").s("triangle")
    .decay(.3).sustain(0).delay(.4).delaytime(.1875).room(.5).gain(.5),
)
