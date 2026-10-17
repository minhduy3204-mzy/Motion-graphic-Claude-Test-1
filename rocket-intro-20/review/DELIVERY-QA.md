# Final delivery checks

- Master: exactly 20.000 seconds, 1920 × 1080, 16:9, 60 fps, 1,200 frames, H.264/AAC, 48 kHz stereo.
- Full picture and sound decoding completed without errors.
- Normal-speed unmuted browser playback reached the end: 1,200 frames, zero dropped and zero corrupted frames.
- Text bounds: 19 scene, resting and boundary captures; no overflow, off-frame text containers or browser errors.
- Independent geometric review checked all four handoffs, fan mesh, particle continuity and all 1,200 frames for flicker spikes. No material issues found.
- Opening selection sound and cursor click peak share the 1.152-second cue.
- Final brand lockup settles before 18 seconds and remains through the final frame.
- Encoded mix: −15.1 LUFS integrated, 2.8 LU loudness range, −2.2 dB true peak. The ending cadence and 650 ms fade derive from the timeline.
- Seven editor checks pass: longer copy, colors, transforms, visibility, playback, and 21-second retiming with matching 1,008,000-sample stereo audio. The default configuration was restored.
- A separate two-scene retiming test confirms following starts and sound cues shift. The source project remains unchanged.

Machine-readable evidence: `export-check.json`, `controls-evidence.json`, `layout.json`, `retime-audio.json`, and `audio/metadata.json`. Brand and copy provenance and font licenses are in `assets/`.
