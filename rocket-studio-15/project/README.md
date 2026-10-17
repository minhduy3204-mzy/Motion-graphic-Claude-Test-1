# Rocket Studio — 15-second launch film

**1920 × 1080 · 16:9 · 60 fps · 900 frames · exactly 15.000 seconds.**

Rocket Studio is the invented app identity requested for this film. Its canvas contains an original Rocket Group website concept, rather than a live-site screenshot. The real company name, hostname and “Transform. Convert. Automate.” copy connect it to Rocket Group.

The same document carries through selection, a bold type preset, a new fill, Preview mode, and the final brand lockup. The existing website CTA expands into the final acid-yellow surface. No scene is a flattened video asset.

## Open and edit

Use Node.js 22 or 24, Chrome/Chromium, and FFmpeg:

```sh
npm ci
npm run dev -- --port 3020
```

Open **http://localhost:3020/RocketStudio**. Remotion Studio provides playback and nested Props controls for copy, fonts, palette, UI labels, object position/scale/visibility, type sizes/weights, scene durations, camera depth, cursor visibility, audio enable and volume. `src/schema.ts` validates these controls.

Bundled font choices: **Manrope** and **IBM Plex Mono**. The headline and final app name fit their available space when copy changes. Document content, sidebar selection, selection annotation, inspector name and readouts share one configuration.

Studio can save inline defaults in `src/Root.tsx`. To build the same edited settings through both tools, save the edited Props JSON and pass it as `--config`. Both wrapped `{ "config": ... }` Props files and raw project configurations are accepted. `project.json` is the supplied master configuration and the rendering helper’s default input.

## Render

```sh
# Supplied master
npm run render

# Revised configuration or Studio Props JSON
npm run render -- --config my-props.json --output out/my-revision.mp4
```

This compiles the timeline, rebuilds matching WAV stems, renders native Remotion picture, and muxes the original PCM mix once into the exact-duration H.264/AAC master. Settings: PNG capture, CRF 16, BT.709, yuv420p, 320 kbps AAC, stereo 48 kHz.

Default browser: `/usr/bin/chromium`. Set `CHROME_PATH` or pass `--browser` for another executable. Example:

```sh
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run render
```

Use `--workers 2` on machines with less memory. The finished output is `out/rocket-studio-launch-15s.mp4`; `out/rocket-studio-native.mp4` is an intermediate.

## HyperFrames version

```sh
npm run hf:build
cd hyperframes
npm run dev -- --port 3021
```

Open **http://localhost:3021/#project/hyperframes**. This is a standalone HTML/GSAP composition with local fonts and audio, built from the **same workspace markup, configuration and motion tracks** as Remotion. Its paused GSAP timeline directly animates visual CSS variables.

From the project root, `npm run hf:build -- --config my-props.json` builds a matching revision with freshly generated audio. `npm run hf:check` runs HyperFrames checks. The HTML is editable, but rebuilding replaces generated files; preserve durable edits in `project.json`, `src/Workspace.tsx`, `src/workspace.css`, and `src/motion.mjs`.

## Timing and sound

| Scene | Default time | Action |
| --- | --- | --- |
| The canvas | 0–2.4 s | Establish the document and shallow camera depth |
| Select | 2.4–4.6 s | Select Hero / Title; sidebar, inspector and bounds respond |
| Give it direction | 4.6–8.0 s | Bold preset changes type; acid swatch updates fill |
| Preview | 8.0–11.4 s | Read the improved site; remove selection and dim editing tools |
| Rocket Studio | 11.4–15.0 s | Carry the CTA into the lockup; hold the final read over two seconds |

`compileTimeline()` quantizes durations to frames and moves later scenes and sound cues. Minimum scene duration: 90 frames. Timing edits can change a revision’s total length; the supplied master remains exactly 15 seconds. Keep the final scene at least 3.3 seconds to retain a two-second final hold, and review reading time after shorter revisions.

Remotion uses the prepared WAV when its timeline matches. A Studio timing edit synthesizes a new WAV data URI from the updated timeline, including moved effects and ending cadence. HyperFrames rebuilds its own mix from the same compiler. The final rendering helper prepares matching stems automatically.

`public/audio/synth.mjs` is the editable original 128 BPM score and effects source. Separate `music.wav`, `sfx.wav` and `soundtrack.wav` are included. No external recordings or samples were used.

## Source map

- `project.json`: master identity, copy, colors, UI content, layer controls and durations.
- `src/Workspace.tsx`, `src/workspace.css`: sidebar, canvas, toolbar, properties, rulers, selection, cursor, vector art and final brand layers.
- `src/motion.mjs`: shared deterministic choreography and timeline.
- `src/RocketFilm.tsx`: native frame-driven picture, font loading and synchronized audio.
- `src/Root.tsx`, `src/schema.ts`: Studio defaults, controls and dynamic duration.
- `public/`: fonts/licenses, exported vector branding, score source and audio stems.
- `hyperframes/`: runnable HTML/GSAP version.
- `scripts/`: preparation, both builds, rendering and export checks.
- `review/`: UI, controls, timing, contrast, conformance and playback evidence.

## Identity and production notes

Invented app palette: ink **#14251C**, acid **#DDFF54**, ivory **#F4F2E9**, coral **#FF785A**, sage **#A5B3A6**, canvas **#E3E6DE**, rules **#CED4CA**. These are the requested new identity, not the live website palette.

The supplied 15-second Strata film and earlier Instagram references were studied for selection details, depth, pacing and final holds. Their footage, imagery, identities and audio are excluded. See `REFERENCE-STUDY.md`.

Higgsfield tools and the requested motion skills were unavailable in this session. No Higgsfield content was generated. All film graphics are original editable code. HyperFrames and Remotion were both used and verified.
