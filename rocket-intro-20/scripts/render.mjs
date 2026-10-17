import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import {createServer} from './serve.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
const argv=process.argv.slice(2),arg=(k,d)=>argv.includes(k)?argv[argv.indexOf(k)+1]:d;
const config=arg('--config','project.json'),workers=Number(arg('--workers','4')),output=arg('--output','renders/rocket-group-introduction-20s.mp4');
const prep=spawnSync(process.execPath,['scripts/prepare.mjs','--config',config],{cwd:root,stdio:'inherit'});if(prep.status)process.exit(prep.status);
const timeline=JSON.parse(await fs.readFile('timeline.json','utf8'));
await fs.mkdir('renders/frames',{recursive:true});
const port=4189,server=await createServer(port);let next=0,completed=0;
const start=performance.now();
try{
 await Promise.all(Array.from({length:workers},async(_,worker)=>{
  const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--force-color-profile=srgb']});
  try{
   const page=await browser.newPage();await page.setViewport({width:timeline.width,height:timeline.height,deviceScaleFactor:1});
   page.on('pageerror',e=>{throw e});
   await page.goto(`http://127.0.0.1:${port}/index.html?config=render-project.json`,{waitUntil:'domcontentloaded'});await page.evaluate(async()=>{await window.RocketFilm.ready;});
   while(true){const frame=next++;if(frame>=timeline.frames)break;
    await page.evaluate(t=>{window.RocketFilm.renderAt(t);},frame/timeline.fps);
    await page.screenshot({path:`renders/frames/${String(frame).padStart(5,'0')}.png`,type:'png',captureBeyondViewport:false});
    completed++;if(completed%60===0)console.log(`${completed}/${timeline.frames} frames (${((performance.now()-start)/1000).toFixed(1)}s)`);
   }
  }finally{await browser.close();}
 }));
 const ff=['-hide_banner','-y','-framerate',String(timeline.fps),'-i','renders/frames/%05d.png','-i','audio/soundtrack.wav','-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-c:a','aac','-b:a','320k','-ar','48000','-t',timeline.duration.toFixed(9),'-movflags','+faststart',output];
 const result=spawnSync('ffmpeg',ff,{cwd:root,stdio:'inherit'});if(result.status)process.exitCode=result.status;
 console.log(`Rendered ${output}: ${timeline.duration}s, ${timeline.frames} frames.`);
}finally{server.close();}
