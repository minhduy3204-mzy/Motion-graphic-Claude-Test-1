import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import puppeteer from 'puppeteer-core';
const file='out/rocket-studio-launch-15s.mp4';
const probe=JSON.parse(spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}).stdout);
const v=probe.streams.find(s=>s.codec_type==='video'),a=probe.streams.find(s=>s.codec_type==='audio');
const errors=[];
if(v.width!==1920||v.height!==1080||v.r_frame_rate!=='60/1'||Number(v.nb_frames)!==900||Number(probe.format.duration)!==15)errors.push('Unexpected master video format or duration');
if(a.codec_name!=='aac'||a.channels!==2||Number(a.sample_rate)!==48000)errors.push('Unexpected audio format');
const decode=spawnSync('ffmpeg',['-v','error','-i',file,'-f','null','-'],{encoding:'utf8'});
if(decode.status||decode.stderr.trim())errors.push('Decode errors: '+decode.stderr);
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
let playback;
try{
 const page=await browser.newPage();await page.setViewport({width:1920,height:1080});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3024/README.md',{waitUntil:'domcontentloaded'});
 playback=await page.evaluate(async()=>{
  document.body.innerHTML='<video id="review-video" style="width:1920px;height:1080px;display:block" preload="auto" src="out/rocket-studio-launch-15s.mp4"></video>';
  const video=document.querySelector('video'),samples=[],frames=[];
  await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(new Error('Video load error'));});
  video.playbackRate=1;video.volume=1;video.muted=false;
  const start=performance.now();
  const timer=setInterval(()=>samples.push({wall:(performance.now()-start)/1000,media:video.currentTime,ready:video.readyState}),1000);
  const track=(now,m)=>{frames.push({media:m.mediaTime,presented:m.presentedFrames});if(!video.ended)video.requestVideoFrameCallback(track);};
  video.requestVideoFrameCallback(track);
  const ended=new Promise((resolve,reject)=>{video.onended=resolve;video.onerror=()=>reject(new Error('Playback error'));});
  await video.play();await ended;clearInterval(timer);
  const q=video.getVideoPlaybackQuality();
  return {rate:video.playbackRate,muted:video.muted,duration:video.duration,wallSeconds:(performance.now()-start)/1000,ended:video.ended,quality:{totalVideoFrames:q.totalVideoFrames,droppedVideoFrames:q.droppedVideoFrames,corruptedVideoFrames:q.corruptedVideoFrames},samples,firstFrame:frames[0],lastFrame:frames.at(-1),frameCallbacks:frames.length};
 });
 if(!playback.ended||playback.rate!==1||Math.abs(playback.wallSeconds-15)>.7)errors.push('Normal-speed playback did not complete correctly');
}finally{await browser.close();}
const report={video:{codec:v.codec_name,width:v.width,height:v.height,fps:v.r_frame_rate,frames:Number(v.nb_frames),duration:Number(v.duration)},audio:{codec:a.codec_name,channels:a.channels,sampleRate:Number(a.sample_rate),duration:Number(a.duration)},containerDuration:Number(probe.format.duration),fullDecodePassed:decode.status===0&&!decode.stderr.trim(),playback,errors,passed:errors.length===0};
await fs.writeFile('review/export-check.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
