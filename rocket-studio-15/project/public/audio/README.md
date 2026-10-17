# Rocket Studio soundtrack

Original instrumental composition and interface sound design, created specifically for this film. No third-party music, recordings, or samples are used. The default arrangement spans exactly 32 beats at 128 BPM: 15 seconds, 720,000 samples per channel at 48 kHz.

`synth.mjs` is pure, deterministic, browser-safe JavaScript. The editor and production render use the same `synthesize(timeline, {sampleRate: 48000})` function. It returns stereo Float32 music, SFX, and master buffers plus metadata.

The five harmonic sections are B minor 9, D major 9, G major 9, A add 9, and D major 9. Warm electric keys, bass, understated drums, and a dark room return support the motion. Selection clicks, property confirmations, transition sweeps, and the final brand accent come from the shared visual timeline, not an independent audio clock.

After editing scene timing, regenerate the project timeline and run `node scripts/build-audio.mjs timeline.json`. An optional second argument chooses the output directory. The script writes 16-bit stereo 48 kHz WAV files:

- `music.wav`: musical arrangement only.
- `sfx.wav`: timeline-driven interface and transition sounds only.
- `soundtrack.wav`: final balanced master.
- `metadata.json`: exact sample length, section boundaries, musical events, cue positions, and level measurements.

Timing edits map each musical event through its owning scene, shift later sections and sound effects, and move the final cadence with the brand scene. Pitch does not change. Every stem ends at the exact current timeline duration with a shaped final release and a zero final sample. The master leaves approximately 2.27 dB of sample-peak headroom for AAC delivery. Music and SFX stems sum to the master, apart from negligible 16-bit rounding.
