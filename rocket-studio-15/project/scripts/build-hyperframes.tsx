// Build the independent, editable HyperFrames composition from the same document
// and visual motion tracks used by Remotion. No React runtime or proxy clock is
// needed in the generated composition: GSAP directly animates visual CSS values.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile, writeFile, mkdir, cp} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {Workspace} from '../src/Workspace';
import {motionPlan} from '../src/motion.mjs';

async function main() {
const root = path.resolve(path.dirname(process.argv[1]), '..');
const output = path.join(root, 'hyperframes');
const configArg = process.argv.indexOf('--config');
const configPath = configArg >= 0 ? path.resolve(process.argv[configArg + 1]) : path.join(root, 'project.json');
const source = JSON.parse(await readFile(configPath, 'utf8'));
const config = source.config || source;
const plan = motionPlan(config);
const markup = renderToStaticMarkup(createElement(Workspace, {config, variables:plan.initial}))
  .replace(/data-layer=/g, 'data-document-layer=');
const serialize = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
await mkdir(output, {recursive: true});
await cp(path.join(root, 'src', 'workspace.css'), path.join(output, 'workspace.css'));
await cp(path.join(root, 'node_modules', 'gsap', 'dist', 'gsap.min.js'), path.join(output, 'gsap.min.js'));
await cp(path.join(root, 'public', 'fonts'), path.join(output, 'fonts'), {recursive: true});
await cp(path.join(root, 'public', 'audio'), path.join(output, 'audio'), {recursive: true});
await cp(path.join(root, 'DESIGN.md'), path.join(output, 'DESIGN.md'));
await writeFile(path.join(output, 'project.json'), JSON.stringify(config, null, 2) + '\n');
await writeFile(path.join(output, 'timeline.json'), JSON.stringify(plan.timeline, null, 2) + '\n');
await writeFile(path.join(output, 'motion-tracks.json'), JSON.stringify(plan, null, 2) + '\n');
// Regenerate this adapter's own audio from this exact timeline. This also makes
// --config retiming safe when the Remotion/public mix has not been rebuilt yet.
execFileSync(process.execPath, [path.join(root, 'scripts', 'build-audio.mjs'), path.join(output, 'timeline.json'), path.join(output, 'audio')], {stdio:'inherit'});
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${config.width}, height=${config.height}">
  <title>${String(config.name).replace(/[<>&\"]/g, '')}</title>
  <link rel="stylesheet" href="workspace.css">
  <style>
    @font-face {font-family:'Manrope';src:url('fonts/manrope.woff2') format('woff2');font-style:normal;font-weight:200 800;font-display:block;}
    @font-face {font-family:'IBM Plex Mono';src:url('fonts/plex-mono-regular.woff2') format('woff2');font-style:normal;font-weight:400;font-display:block;}
    @font-face {font-family:'IBM Plex Mono';src:url('fonts/plex-mono-medium.woff2') format('woff2');font-style:normal;font-weight:500;font-display:block;}
    html, body {margin:0; padding:0; width:${config.width}px; height:${config.height}px; overflow:hidden; background:${config.palette.ink};}
    [data-composition-id="rocket-studio"] {position:relative; width:${config.width}px; height:${config.height}px; overflow:hidden;}
    .clip {position:absolute; inset:0; width:100%; height:100%;}
  </style>
  <script src="gsap.min.js"></script>
</head>
<body>
  <div id="rocket-studio" data-composition-id="rocket-studio" data-start="0" data-duration="${plan.timeline.duration}" data-width="${config.width}" data-height="${config.height}">
    ${markup}
    <audio id="soundtrack" src="audio/soundtrack.wav" data-start="0" data-duration="${plan.timeline.duration}" data-track-index="1" data-volume="${source.audioEnabled === false ? 0 : (source.masterVolume ?? 1)}" preload="auto"></audio>
  </div>
  <script>
    // Synchronously registered, paused, finite visual timeline. HyperFrames owns
    // playback and soundtrack synchronization. All tracks target the real root.
    window.__timelines = window.__timelines || {};
    window.RocketStudioProject = ${serialize(config)};
    window.RocketStudioMotion = ${serialize(plan)};
    const ease = {
      linear: t => t,
      smooth: t => t * t * (3 - 2 * t),
      out: t => 1 - (1 - t) ** 3,
      inOut: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
    };
    const root = document.getElementById('rocket-film');
    if (!root) throw new Error('Missing shared workspace root #rocket-film');
    const timeline = gsap.timeline({paused:true});
    for (const track of window.RocketStudioMotion.tracks) {
      timeline.fromTo(root,
        {['--' + track.prop]:track.from},
        {['--' + track.prop]:track.to, duration:track.duration,
         ease:ease[track.ease], immediateRender:false, overwrite:false}, track.at);
    }
    window.__timelines['rocket-studio'] = timeline;
    timeline.seek(0);
    // Layout fitting is independent from timeline construction. The maximum
    // designed type size is measured once after local fonts settle, then the
    // same fit factor applies throughout the editable weight/size animation.
    function fitTitle() {
      const probe = root.querySelector('.title-probe');
      if (!probe) return;
      const maximum = Number(probe.dataset.maxHeight) || 286;
      const maxFont = Number(probe.dataset.maxFont);
      let factor = 1;
      probe.style.fontSize = maxFont + 'px';
      for (let i = 0; i < 100 && probe.scrollHeight > maximum; i++) {
        factor *= .965;
        probe.style.fontSize = maxFont * factor + 'px';
      }
      root.style.setProperty('--title-fit', String(factor));
      root.dataset.titleFit = String(factor);
      const wordmark = root.querySelector('.brand-wordmark h1');
      if (wordmark) {
        let brandFit = 1;
        wordmark.style.fontSize = '135px';
        for (let i = 0; i < 100 && wordmark.scrollWidth > 1390; i++) {
          brandFit *= .965;
          wordmark.style.fontSize = 135 * brandFit + 'px';
        }
        root.style.setProperty('--brand-fit', String(brandFit));
        wordmark.style.fontSize = '';
      }
      const button = root.querySelector('.site-cta');
      if (button) {
        const scale = Number(button.dataset.scale) || 1;
        const x = 960 + (331 + button.offsetLeft - 960) * 1.13 - 12;
        const y = 540 + (307 + button.offsetTop - 540) * 1.13 + 8;
        const width = button.offsetWidth * scale * 1.13;
        const height = button.offsetHeight * scale * 1.13;
        root.style.setProperty('--brand-origin-top', y / 1080 * 100 + '%');
        root.style.setProperty('--brand-origin-right', (1920 - x - width) / 1920 * 100 + '%');
        root.style.setProperty('--brand-origin-bottom', (1080 - y - height) / 1080 * 100 + '%');
        root.style.setProperty('--brand-origin-left', x / 1920 * 100 + '%');
      }
    }
    fitTitle();
    document.fonts.ready.then(fitTitle);
  </script>
</body>
</html>
`;
await writeFile(path.join(output, 'index.html'), html);
console.log(`HyperFrames composition: ${plan.timeline.duration}s / ${plan.timeline.frames} frames / ${plan.tracks.length} visual tracks`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});

