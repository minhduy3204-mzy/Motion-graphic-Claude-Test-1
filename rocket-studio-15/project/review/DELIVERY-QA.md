# Finished film quality review

- Exactly **15.000 seconds**, 1920 × 1080, 16:9, 60 fps, 900 frames, H.264/AAC, BT.709.
- Full picture/audio decode passed. Normal-speed unmuted playback completed: 900 frames, zero dropped or corrupted frames.
- All four cursor actions hit their actual document/control bounds. Sidebar, selection, inspector values and rendered type/fill remain consistent.
- Font-ink padding, missing glyphs and inspector-footer overlap were fixed before final export.
- HyperFrames full check: no lint, runtime, layout or motion issues; all 212 contrast checks pass.
- HyperFrames and Remotion visual variables match across 15 forward/reverse arbitrary seeks.
- Final transition grows from the real website CTA. Its measured origin differs from the button bounds by less than 0.5 pixels.
- Main final logo, app name, CTA and URL settle by approximately 12.8 seconds and hold through the final frame.
- Final encoded soundtrack: −16.8 LUFS integrated, 2.5 LU loudness range, −2.3 dB true peak. Exact cursor cues, no clipping and a clean ending.
- Timing changes regenerate matching audio, move later scenes/cues, and update the ending cadence. Tested native 15.8-second / 948-frame variant and wrapped HyperFrames revisions.
- Longer title and app-name controls fit their containers. Visibility, camera depth, layer positioning, mute and volume controls were tested.
- TypeScript and full source ESLint checks pass.

See the neighboring machine-readable reports and public/audio/verification.json for detailed evidence. The final-source archive receives a separate clean-extraction check.
