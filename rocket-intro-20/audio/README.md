# Forward Momentum — original soundtrack

All music and effects are procedurally synthesized from original score data. No
third-party recordings, copyrighted songs, generative service assets, or samples
are included. `synth.js` is the editable musical source.

## Rebuild the mix and separate stems

From the project root:

```sh
node audio/build.mjs
```

The command reads the shared `timeline.json` and writes stereo, 48 kHz, 16-bit
PCM `music.wav`, `sfx.wav`, `soundtrack.wav`, plus event/level `metadata.json`.
Files are exactly as long as the last scene, with a 650 ms ending fade and zero
tail beyond the film. Export headroom is approximately −2.16 dBFS before AAC.

After changing scene durations or cue timing, rebuild these stems before the
final export. The interactive editor can regenerate the identical audio without
running Node by using the module API below.

## Browser / worker API

```js
import {synthesize} from './audio/synth.js';
const result = synthesize(timeline, {sampleRate: 48000});
// result.music, result.sfx, result.mix each contain [Float32Array L, Float32Array R].
// result.sampleRate and result.metadata describe the output.
```

This function has no Node, browser, framework, or audio-device dependencies.
Recompute it in a module worker after controls update the shared timeline. Copy
the resulting stereo mix into an AudioBuffer for synchronized playback. A user
play gesture is needed to start browser audio playback.

## Editable score

- `harmony` contains the five sections' MIDI pitches, bass roots, and pluck motif.
- Scene starts and durations schedule harmonic sections, instrumental density,
  rhythmic subdivisions, and the ending cadence.
- `timeline.cues` schedules sound effects. Supported types are `launch`,
  `select`, `whoosh`, `unfold`, `scan`, and `resolve`.
- A cue accepts `time`, `duration`, and `strength` (0.05–2). `id` is retained in
  the project timeline; audio metadata records the resolved sonic events.
- Empty cue lists receive useful scene-relative defaults.
- All procedural noise uses fixed seeds, so repeated builds are sample-identical.
- Music, effects, and mix share one master gain. The two stems sum to the mix.

The opening is sparse and warm; the sphere and grid passages introduce rhythmic
detail; the fan builds energy; the last lockup removes drums and resolves to an
A-major-nine cadence halfway through its duration. Changing that scene's duration
moves the cadence and adapts the release rather than cutting a pre-rendered song.
