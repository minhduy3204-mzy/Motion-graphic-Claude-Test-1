import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
const args=process.argv.slice(2),arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const config=arg('--config','project.json'),output=arg('--output','out/rocket-studio-launch-15s.mp4');
function run(bin,argv){const r=spawnSync(bin,argv,{cwd:root,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
run(process.execPath,['scripts/prepare.mjs','--config',config]);
fs.mkdirSync('out',{recursive:true});fs.mkdirSync(path.dirname(output),{recursive:true});
const timeline=JSON.parse(fs.readFileSync('timeline.json','utf8'));
const props=JSON.parse(fs.readFileSync('render-props.json','utf8'));
const gain=props.audioEnabled===false?0:(props.masterVolume??1);
const audioFilter=gain===1?[]:['-af','volume='+String(gain)];
run(process.execPath,['node_modules/@remotion/cli/remotion-cli.js','render','src/index.ts','RocketStudio','out/rocket-studio-native.mp4','--props=render-props.json','--codec=h264','--crf=16','--image-format=png','--color-space=bt709','--pixel-format=yuv420p','--concurrency='+arg('--workers','4'),'--browser-executable='+arg('--browser',process.env.CHROME_PATH||'/usr/bin/chromium')]);
// Encode the original PCM mix once and give the master an exact timeline end.
run('ffmpeg',['-hide_banner','-y','-i','out/rocket-studio-native.mp4','-i','public/audio/soundtrack.wav','-map','0:v:0','-map','1:a:0','-c:v','copy',...audioFilter,'-c:a','aac','-b:a','320k','-ar','48000','-t',String(timeline.duration),'-movflags','+faststart',output]);
console.log(`Finished ${output}: ${timeline.duration.toFixed(3)} seconds, ${timeline.frames} frames.`);
