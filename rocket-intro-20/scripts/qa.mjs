import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage();await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4180/index.html',{waitUntil:'domcontentloaded'});await page.evaluate(async()=>{await window.RocketFilm.ready;});
await fs.mkdir('review',{recursive:true});
const times=[0,.6,1.6,2.8,3.2,4.2,5.6,7.4,8.3,9.4,10.7,11.8,12.6,13.8,15.2,16,16.8,18,19.983333];
const layouts=[];
for(const t of times){
 await page.evaluate(t=>{window.RocketFilm.renderAt(t);},t);
 await page.screenshot({path:`review/frame-${t.toFixed(3)}.png`});
 layouts.push(await page.evaluate(t=>({time:t,layers:[...document.querySelectorAll('.text-layer')].filter(el=>Number(getComputedStyle(el.closest('.scene')).opacity)>.95&&Number(getComputedStyle(el).opacity)>.95).map(el=>{const r=el.getBoundingClientRect();return {id:el.dataset.layer,text:el.textContent,font:getComputedStyle(el).fontSize,x:r.x,y:r.y,width:r.width,height:r.height,overflow:el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2,outside:r.x<0||r.y<0||r.right>1920||r.bottom>1080}})}),t));
}
await fs.writeFile('review/layout.json',JSON.stringify({errors,layouts},null,2));console.log(JSON.stringify({frames:times.length,runtimeErrors:errors,overflow:layouts.flatMap(l=>l.layers.filter(x=>x.overflow||x.outside).map(x=>({t:l.time,...x})))},null,2));
await browser.close();if(errors.length)process.exitCode=1;
