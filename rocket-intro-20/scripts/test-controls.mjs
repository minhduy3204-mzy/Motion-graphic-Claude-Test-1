import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const projectFile=path.join(root,'project.json');
const source=await fs.readFile(projectFile,'utf8');
const original=JSON.parse(source);
const digest=value=>createHash('sha256').update(value).digest('hex');
const evidence={test:'Real browser editor controls and shared picture/audio timeline',started:new Date().toISOString(),viewport:{width:1280,height:900},checks:[],errors:[],projectSha256Before:digest(source)};
let browser,page,failure;
const record=(name,details)=>evidence.checks.push({name,passed:true,...details});

async function fill(label,value){
  const id=await page.evaluate(text=>[...document.querySelectorAll('#inspector-content label')].find(n=>n.textContent===text)?.htmlFor,label);
  assert(id,`Missing control: ${label}`);
  const input=await page.$(`#${id}`);
  await input.click({clickCount:3});await page.keyboard.down('Control');await page.keyboard.press('KeyA');await page.keyboard.up('Control');await input.type(String(value));await input.press('Tab');
}
async function waitForLayer(id,expected){
  await page.waitForFunction((id,expected)=>{
    const editor=window.RocketEditor,film=document.querySelector('iframe').contentWindow.RocketFilm;
    if(!editor||editor.getState().applyBusy)return false;
    const layer=film.project.scenes.flatMap(s=>s.layers).find(l=>l.id===id);
    return layer&&Object.entries(expected).every(([key,value])=>layer[key]===value);
  },{timeout:15000},id,expected);
}

try{
  browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
  page=await browser.newPage();await page.setViewport(evidence.viewport);
  page.on('pageerror',error=>evidence.errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)evidence.errors.push(`${response.status()} ${response.url()}`);});
  await page.evaluateOnNewDocument(()=>{
    window.__audioJobs=[];window.__audioResults=[];
    const NativeWorker=window.Worker;
    window.Worker=class extends NativeWorker{
      constructor(...args){super(...args);this.addEventListener('message',({data})=>{if(data?.type==='audio')window.__audioResults.push({id:data.id,sampleRate:data.sampleRate,samples:data.left.byteLength/4,channels:2});});}
      postMessage(data,...args){if(data?.type==='synthesize')window.__audioJobs.push({id:data.id,duration:data.timeline.duration,frames:data.timeline.frames,scenes:data.timeline.scenes.map(s=>({id:s.id,start:s.start,duration:s.duration})),cues:data.timeline.cues.map(c=>({id:c.id,time:c.time}))});return super.postMessage(data,...args);}
    };
  });
  await page.goto('http://127.0.0.1:4180/editor.html',{waitUntil:'networkidle0',timeout:30000});
  await page.waitForFunction(()=>window.RocketEditor?.getState().audioReady,{timeout:60000});
  await page.evaluate(async project=>{await RocketEditor.applyProject(project);RocketEditor.seek(1.8);},original);
  await page.waitForFunction(()=>RocketEditor.getState().audioReady&&!RocketEditor.getState().applyBusy);
  const initial=await page.evaluate(()=>({duration:RocketEditor.getTimeline().duration,audio:window.__audioResults.at(-1),scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.equal(initial.duration,20);assert.equal(initial.audio.samples,960000);assert.equal(initial.scrollWidth,initial.viewport);
  record('Initial 20-second project, stereo soundtrack, and responsive controls',initial);

  await page.click('.layer-row:nth-child(2) .layer-select');
  const longCopy='Transforming brands and businesses through integrated communication, creative experiences, and digital performance.';
  await fill('Text',longCopy);await waitForLayer('launch-title',{text:longCopy});
  const fit=await page.evaluate(()=>{
    const film=document.querySelector('iframe').contentWindow,layer=film.RocketFilm.project.scenes[0].layers.find(l=>l.id==='launch-title'),node=film.document.querySelector('[data-layer="launch-title"]');
    return {fontSize:layer.fontSize,fittedSize:Number(node.dataset.fittedSize),maxWidth:layer.maxWidth,maxHeight:layer.maxHeight,scrollWidth:node.scrollWidth,scrollHeight:node.scrollHeight,text:node.textContent};
  });
  assert.equal(fit.text,longCopy);assert(fit.fittedSize<fit.fontSize,'Long copy must shrink');assert(fit.scrollWidth<=fit.maxWidth+1);assert(fit.scrollHeight<=fit.maxHeight+1);
  record('Long-copy auto fit through actual textarea',fit);

  await fill('Position X',184);await fill('Position Y',330);await fill('Scale',.88);
  await waitForLayer('launch-title',{x:184,y:330,scale:.88});
  const transform=await page.evaluate(()=>{const f=document.querySelector('iframe').contentWindow;const n=f.document.querySelector('[data-layer="launch-title"]');return {left:n.style.left,top:n.style.top,transform:n.style.transform};});
  assert.equal(transform.left,'184px');assert.equal(transform.top,'330px');assert.match(transform.transform,/scale\(0\.88\)/);
  const visibleSelector=await page.evaluate(()=>`#${[...document.querySelectorAll('#inspector-content label')].find(n=>n.textContent==='Visible').htmlFor}`);
  await page.click(visibleSelector);await waitForLayer('launch-title',{visible:false});
  const hidden=await page.evaluate(()=>document.querySelector('iframe').contentWindow.document.querySelector('[data-layer="launch-title"]').style.opacity);
  assert.equal(Number(hidden),0);await page.click(visibleSelector);await waitForLayer('launch-title',{visible:true});
  record('Layer position, scale, and visibility controls',{...transform,hiddenOpacity:Number(hidden),restoredVisible:true});

  await page.click('#palette-tab');
  const blueInput=await page.evaluateHandle(()=>[...document.querySelectorAll('.palette-item')].find(n=>n.querySelector('.field-help').textContent==='Token: blue').querySelector('input[type=text]'));
  await blueInput.click({clickCount:3});await page.keyboard.down('Control');await page.keyboard.press('KeyA');await page.keyboard.up('Control');await blueInput.type('#1348D7');await blueInput.press('Tab');
  await page.waitForFunction(()=>document.querySelector('iframe').contentWindow.RocketFilm.project.palette.blue==='#1348D7');
  const palette=await page.evaluate(()=>{const f=document.querySelector('iframe').contentWindow;return {blue:f.RocketFilm.project.palette.blue,kickerColour:f.getComputedStyle(f.document.querySelector('[data-layer="launch-kicker"]')).color};});
  assert.equal(palette.kickerColour,'rgb(19, 72, 215)');record('Palette binding updates actual text colour',palette);

  await page.click('#scene-tab');await fill('Duration · seconds',4.2);
  await page.waitForFunction(()=>RocketEditor.getTimeline().duration===21&&RocketEditor.getState().audioReady&&!RocketEditor.getState().applyBusy&&document.querySelector('iframe').contentWindow.RocketFilm.duration===21,{timeout:60000});
  const timing=await page.evaluate(()=>({timeline:RocketEditor.getTimeline(),audioJob:window.__audioJobs.at(-1),audioResult:window.__audioResults.at(-1)}));
  assert.equal(timing.timeline.scenes[1].start,4.2);assert.equal(timing.timeline.scenes[4].start,17);
  assert.equal(timing.audioJob.duration,21);assert.equal(timing.audioResult.samples,1008000);assert.equal(timing.audioResult.id,timing.audioJob.id);
  assert.deepEqual(timing.audioJob.scenes,timing.timeline.scenes.map(s=>({id:s.id,start:s.start,duration:s.duration})));
  assert.deepEqual(timing.audioJob.cues,timing.timeline.cues.map(c=>({id:c.id,time:c.time})));
  record('Duration edit recompiles subsequent scenes, music, and sound cues',{duration:timing.timeline.duration,sceneStarts:timing.timeline.scenes.map(s=>({id:s.id,start:s.start})),audioSamples:timing.audioResult.samples,audioSampleRate:timing.audioResult.sampleRate,cueCount:timing.audioJob.cues.length});

  const hold=await page.evaluate(()=>{
    const film=document.querySelector('iframe').contentWindow;
    return [19,20,21-1/60].map(time=>{
      RocketEditor.seek(time);
      const section=film.document.querySelector('[data-scene="lockup"]');
      return {time,sceneOpacity:Number(section.style.opacity),layers:['wordmark','lockup-cta','lockup-url'].map(id=>{
        const n=film.document.querySelector(`[data-layer="${id}"]`),r=n.getBoundingClientRect();
        return {id,text:n.textContent,opacity:Number(n.style.opacity),x:r.x,y:r.y,width:r.width,height:r.height,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth};
      })};
    });
  });
  for(const frame of hold){assert(frame.sceneOpacity>.99);for(const layer of frame.layers){assert(layer.opacity>.99,`${layer.id} not readable at ${frame.time}`);assert(layer.x>=0&&layer.y>=0&&layer.x+layer.width<=1920&&layer.y+layer.height<=1080,`${layer.id} clips`);assert(layer.scrollWidth<=layer.clientWidth+1);}}
  const first=hold[0].layers,last=hold.at(-1).layers;
  for(let i=0;i<first.length;i++){assert(Math.abs(first[i].x-last[i].x)<.1);assert(Math.abs(first[i].y-last[i].y)<.1);assert(Math.abs(first[i].width-last[i].width)<.1);}
  assert.equal(first[2].text,'rocketgroup.asia');record('Final brand lockup stays readable and stationary for final two seconds after retime',{sampleTimes:hold.map(f=>f.time),layers:first});

  await page.evaluate(()=>RocketEditor.seek(2));await page.click('#play-button');
  await new Promise(resolve=>setTimeout(resolve,500));await page.click('#play-button');
  const playback=await page.evaluate(()=>RocketEditor.getState());assert(playback.time>2.25&&!playback.playing);record('Actual transport starts and pauses synchronized playback',{time:playback.time,playing:playback.playing,audioReady:playback.audioReady});
  assert.equal(evidence.errors.length,0,`Browser errors: ${evidence.errors.join('; ')}`);
}catch(error){failure=error;evidence.failure=error.stack||String(error);}
finally{
  if(page){try{await page.evaluate(async project=>{await RocketEditor.applyProject(project);RocketEditor.seek(0);},original);await page.waitForFunction(()=>RocketEditor.getTimeline().duration===20&&RocketEditor.getState().audioReady&&!RocketEditor.getState().applyBusy,{timeout:60000});evidence.restoredDefault=await page.evaluate(()=>({duration:RocketEditor.getTimeline().duration,projectMatches:JSON.stringify(RocketEditor.getProject())===JSON.stringify(document.querySelector('iframe').contentWindow.RocketFilm.project),audioSamples:window.__audioResults.at(-1).samples}));}catch(error){evidence.restoreError=error.message;failure||=error;}}
  evidence.projectSha256After=digest(await fs.readFile(projectFile,'utf8'));
  if(evidence.projectSha256After!==evidence.projectSha256Before){failure||=new Error('project.json changed during controls test');evidence.failure||=failure.message;}
  evidence.passed=!failure;evidence.finished=new Date().toISOString();
  await fs.mkdir(path.join(root,'review'),{recursive:true});await fs.writeFile(path.join(root,'review','controls-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  if(browser)await browser.close();
}
console.log(JSON.stringify({passed:evidence.passed,checks:evidence.checks.map(c=>c.name),restoredDefault:evidence.restoredDefault,evidence:'review/controls-evidence.json',failure:failure?.message},null,2));
if(failure)process.exitCode=1;
