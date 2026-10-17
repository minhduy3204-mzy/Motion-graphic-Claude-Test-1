# Rocket Group — original 20-second launch film

1920 × 1080 · 16:9 · 60 fps · 1,200 frames · exactly 20.000 seconds. H.264 MP4 with a finished original stereo soundtrack. The five editable scenes connect typography, a particle sphere, a moving dot grid, a perspective service fan, and the official Rocket wordmark.

## Open the editable project

Requires Node.js 20+, Chrome/Chromium, and FFmpeg on your PATH. Assets and fonts are bundled; no API key or online asset service is required.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:4180/editor.html**. Press Play to hear the soundtrack and preview in sync. Browsers require a Play gesture before audio can start. The editor also works with a smaller browser window; the film retains its 1920 × 1080 composition.

The left panel selects scenes and layers. Controls expose scene duration, background, text, font, weight, size, maximum text-box width/height, individual colors, visibility, scale, and position. Geometry controls include point colors/count/size and service-card content, colors, visibility, and transforms. Palette tokens update matching layers together; an individual HEX value overrides a token. Text wraps and shrinks to its configured bounds when copy changes. The film's wordmark remains an original image asset.

Edits are saved in this browser's local storage. **Export JSON** saves an editable configuration file. Keep that file with this project. Import it to resume editing. Browser edits do not silently overwrite `project.json` on disk.

## Render revisions

```sh
# Render the supplied 20-second master:
npm run render

# Render a configuration exported from the editor:
npm run render -- --config my-edit.json --output renders/my-edit.mp4
```

The renderer uses `/usr/bin/chromium` by default. For another installation, set `CHROME_PATH` to the Chrome/Chromium executable. Example on macOS:

```sh
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run render
```

Four parallel browser workers are the default. Use `--workers 2` on machines with less memory. Rendering produces lossless numbered PNG frames, then an H.264 CRF 16 / AAC 320 kbps MP4. The `renders/frames/` folder is temporary and can be removed after rendering. FFmpeg must support libx264 and AAC.

`npm run prepare:film -- --config my-edit.json` compiles timings and rebuilds the three WAV stems without rendering frames. `npm run test:controls` tests the editor with the local server running; `npm run review` captures scene and boundary frames and checks text bounds.

## Timing and sound

`project.json` is the editable source of truth. `core/timeline.js` quantizes durations to whole frames and computes all following scene starts, transition windows, and sound cues. Scenes have a minimum of 90 frames (1.5 seconds at 60 fps). Changing a duration changes the total length of a revised film; the supplied master stays exactly 20 seconds.

The editor and renderer use the same timeline and deterministic audio synthesizer. A duration edit rebuilds the preview soundtrack, moves later cues, and adapts the music sections and ending cadence. Visual playback follows the audio clock. The renderer rebuilds picture and audio from the same exported configuration.

Default schedule:

| Scene | Time | Visual role |
| --- | --- | --- |
| Transform | 0.0–3.2 | Kinetic type, yellow directional action, fitted selection frame |
| Business performance | 3.2–7.4 | Stable rotating particle sphere on brand navy |
| Connected motion | 7.4–11.8 | The same points open into a moving grid |
| One team | 11.8–16.0 | Selected plane unfolds into five genuine website service cards |
| Rocket Group | 16.0–20.0 | Official wordmark, CTA, URL; settled final hold exceeds two seconds |

Very short revised scenes naturally provide less reading time. Review revised timing before delivery. The controls test includes a duration-change and long-copy check; the default export receives a separate full review.

## Project map

- `editor.*`: controls, playback, JSON import/export.
- `index.html`, `film.js`, `film.css`: DOM text/image layers, scene choreography and camera controls.
- `project.json`: copy, palette, fonts, transforms, visibility and durations.
- `core/timeline.js`: one shared timeline and easing functions.
- `visuals/geometry.js`: original deterministic 3D point field and perspective fan.
- `assets/`: original supplied logos, real website captures, bundled licensed fonts, brand reference.
- `audio/synth.js`: editable original score and sound effects; no sampled recordings.
- `audio/music.wav`, `sfx.wav`, `soundtrack.wav`: separate 48 kHz stereo stems and final mix.
- `scripts/`: local server, timeline/audio preparation, frame rendering and QA.
- `references/reference-study.md`: analysis of the three supplied Instagram references. Their footage, music and artwork are not part of the film or source delivery.
- `review/`: technical checks and review evidence.

## Brand, references and production limitations

See `assets/BRAND-REFERENCE.md` for verified website colors, typography, messaging sources and asset origins. Inter Tight is loaded by the actual website and intentionally used for this film; the website's primary content currently uses Helvetica/Arial. Liberation Sans is included as an optional portable substitute. Font license files are included. Logos are preserved as supplied PNGs and displayed below native pixel width.

The requested `higgsfield-motion-claude` and `higgsfield-motion-saas` skills and Higgsfield generation tools were unavailable in this environment. They were not used. All geometry and animation are original code, and all brand/website visuals use supplied logos or genuine site captures. No generated visual content or third-party reference footage is included. The soundtrack is an original procedural composition with separately editable music and effects.

The source is a browser/JavaScript motion project, not an After Effects or Premiere project. It opens in the included editor and renders through the included scripts. No flattened scene video is used as an editable layer.
