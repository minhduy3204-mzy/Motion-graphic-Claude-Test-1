/** Check both arbitrary seeking and the direct CSS-variable GSAP adapter. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import puppeteer from 'puppeteer-core';
import {visualState} from '../src/motion.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(await fs.readFile(path.join(directory, 'project.json'), 'utf8'));
const server=createServer(async(req,res)=>{
  try {
    const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
    const file=path.resolve(directory,relative);
    if(!file.startsWith(directory+path.sep))throw new Error('Outside project');
    const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.wav':'audio/wav'};
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch {res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser = await puppeteer.launch({executablePath:process.env.HYPERFRAMES_BROWSER_PATH || '/usr/bin/chromium', headless:true, args:['--no-sandbox', '--disable-dev-shm-usage']});
const page = await browser.newPage();
await page.setViewport({width:config.width,height:config.height,deviceScaleFactor:1});
const errors=[];
page.on('pageerror', error=>errors.push(String(error)));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'networkidle0'});
await page.evaluate(()=>document.fonts.ready);
const total=config.scenes.reduce((sum,s)=>sum+Math.max(90,Math.round(s.duration*config.fps))/config.fps,0);
const times=[0,.4,1.8,3.6,4.8,5.6,6.7,8.6,9.6,11.6,13.5,total-1/config.fps,5.6,0,total-1/config.fps];
const samples=[];
await fs.mkdir(path.join(directory,'.hyperframes','snapshots'),{recursive:true});
for(const time of times) {
  const expected=visualState(time,config);
  const actual=await page.evaluate(({time,props})=>{
    window.__timelines['rocket-studio'].seek(time);
    const style=getComputedStyle(document.getElementById('rocket-film'));
    return Object.fromEntries(props.map(prop=>[prop,parseFloat(style.getPropertyValue('--'+prop))]));
  },{time,props:Object.keys(expected)});
  const differences=Object.entries(expected).filter(([prop,value])=>!Number.isFinite(actual[prop])||Math.abs(actual[prop]-value)>.001).map(([prop,value])=>({prop,expected:value,actual:actual[prop],difference:actual[prop]-value}));
  samples.push({time,differences});
  if([1.8,3.6,5.6,6.7,9.6,13.5].includes(time))await page.screenshot({path:path.join(directory,'.hyperframes','snapshots',`frame-${time.toFixed(1)}.png`)});
}
const brandStart=config.scenes.slice(0,config.scenes.findIndex(scene=>scene.id==='brand')).reduce((sum,scene)=>sum+Math.max(90,Math.round(scene.duration*config.fps))/config.fps,0);
const brandOrigin=await page.evaluate(time=>{
  window.__timelines['rocket-studio'].seek(time);
  const root=document.getElementById('rocket-film'),style=getComputedStyle(root);
  const button=root.querySelector('.site-cta').getBoundingClientRect();
  const top=parseFloat(style.getPropertyValue('--brand-origin-top'))/100*1080;
  const left=parseFloat(style.getPropertyValue('--brand-origin-left'))/100*1920;
  const right=parseFloat(style.getPropertyValue('--brand-origin-right'))/100*1920;
  const bottom=parseFloat(style.getPropertyValue('--brand-origin-bottom'))/100*1080;
  const origin={x:left,y:top,width:1920-left-right,height:1080-top-bottom};
  const actual={x:button.x,y:button.y,width:button.width,height:button.height};
  return {time,origin,actual,maxErrorPx:Math.max(...Object.keys(origin).map(key=>Math.abs(origin[key]-actual[key])))};
},brandStart);
for(const time of [brandStart,brandStart+.25,brandStart+.6]) {
  await page.evaluate(t=>{window.__timelines['rocket-studio'].seek(t);},time);
  await page.screenshot({path:path.join(directory,'.hyperframes','snapshots',`brand-origin-${time.toFixed(2)}.png`)});
}
await fs.mkdir(path.join(directory,'.hyperframes'),{recursive:true});
await fs.writeFile(path.join(directory,'.hyperframes','adapter-conformance.json'),JSON.stringify({duration:total,samples,errors,brandOrigin,passed:!errors.length&&samples.every(sample=>!sample.differences.length)&&brandOrigin.maxErrorPx<=2},null,2)+'\n');
await browser.close();
await new Promise(resolve=>server.close(resolve));
if(errors.length||samples.some(sample=>sample.differences.length)||brandOrigin.maxErrorPx>2) {
  console.error(JSON.stringify({errors,samples:samples.filter(sample=>sample.differences.length),brandOrigin},null,2));
  process.exitCode=1;
} else console.log(`HyperFrames/Remotion visual conformance passed at ${samples.length} forward and reverse seeks.`);
