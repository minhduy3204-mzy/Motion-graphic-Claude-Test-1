# Editable geometry layers

`geometry.js` exports three browser ESM functions. It uses Canvas2D, projected 3D vertices and deterministic timeline time. It has no dependencies, random calls, wall clock or independent playback state.

```js
import {drawPointField, drawFan, clearGeometryCache} from './visuals/geometry.js';
await document.fonts.ready;
clearGeometryCache();

drawPointField(ctx, {
  time: timelineSeconds,
  shape: 0,          // 0 = sphere, 1 = wave grid, continuous morph between
  expansion: .4,     // radius/grid breadth
  x: 1250, y: 540, scale: 1,
  alpha: 1, color: '#0057FF', accent: '#F0C400',
  count: 700, dotSize: 2.4, orbit: false,
});

drawFan(ctx, {
  time: timelineSeconds, progress: 1, // 0 stacked → 1 fanned
  x: 1240, y: 540, scale: .9, alpha: 1,
  colors: ['#0057FF', '#FF6A00', '#061A4A'],
  cards: [
    {text: 'Brand experience', image: 'experience', color: '#0057FF'},
    {text: 'Creative production', image: 'creative', color: '#FF6A00'},
    {text: 'Website', image: 'website', color: '#061A4A'},
  ],
  images: loadedImages, // Map or object of HTMLImageElement/ImageBitmap
  activeIndex: 1,
  width: 500, height: 350,
  rotateX: -.09, rotateY: -.16, rotateZ: -.035,
  fontFamily: 'Inter Tight', shadow: true, highlight: true,
});
```

Each fan card has editable `text`, `label`, `subtitle`, `image`, `color`, `background`, `visible`, `scale`, `x`, and `y`. Position is in local fan coordinates. Card backgrounds use real supplied imagery when a loaded image is available. Cards without imagery show explicit arrow graphics. Card titles shrink or wrap to fit the card width. The front card is the center card unless `activeIndex` is specified.

The point field uses a stable Fibonacci sphere, a deterministic coprime permutation into the grid, smooth depth-based size/opacity and a travelling wave. It does not modulate particle opacity with noise. The same time and parameters give the same pixels after arbitrary seeks.

The fan has 3D card vertices, depth sorting, rear thickness faces, soft shadows, and 6×4 perspective texture meshes. Small triangle overlap prevents raster seams. Five default-size cards occupy roughly 970×620 units when fully open; scale `.85–.95` leaves comfortable margins in a 1080p frame. Use three cards for larger, more readable service names. For a hero texture, keep that card frontmost and move the camera only slightly.

`clearGeometryCache()` invalidates cached card textures. Call after loading fonts or replacing assets at the same URL. The point cache is keyed by particle count and contains only deterministic static geometry.

`preview.html` is a standalone visual QA page when served from the repository root. It intentionally uses the previously verified real homepage capture. Production should pass the project's bundled assets.
