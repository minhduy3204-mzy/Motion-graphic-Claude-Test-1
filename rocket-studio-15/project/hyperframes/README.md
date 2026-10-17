# Rocket Studio · HyperFrames composition

This is the independent HTML/GSAP version of the editable Rocket Studio film.
It shares the React workspace markup, document configuration, motion curves,
fonts, and soundtrack with the Remotion composition. GSAP animates actual visual
CSS variables on `#rocket-film`, not an intermediate clock.

From the parent `project` folder:

```sh
npm install
npx tsx scripts/build-hyperframes.tsx
cd hyperframes
npm run check
npx --yes hyperframes@0.8.168 preview --background --port 3021
```

Open the Studio project URL printed by the preview command. The source
`index.html` is an editable composition, rather than the Studio interface.

To export with HyperFrames:

```sh
npm run render -- --fps 60 --quality high --output ../renders/rocket-studio-hyperframes.mp4
```

Edit `../project.json` and rebuild the HyperFrames adapter when
changing copy, colors, positions, visibility, or scene durations. Changes to
durations recompile all downstream scene and sound-cue positions. The default
configuration is exactly 15 seconds at 60 fps. The adapter rebuilds its soundtrack
from its own compiled timeline, including when using `--config path/to/file.json`.

Generated files intentionally keep the whole document and motion tracks local:
`project.json`, `timeline.json`, `motion-tracks.json`, local GSAP, bundled fonts,
and separate music, sound-effects, and finished soundtrack WAV files.
