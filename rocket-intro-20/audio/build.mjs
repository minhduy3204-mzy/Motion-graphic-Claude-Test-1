#!/usr/bin/env node
/** Rebuild the score and separate stems after editing ../timeline.json. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {synthesize} from './synth.js';

const directory=path.dirname(fileURLToPath(import.meta.url));
const timelinePath=process.argv[2]?path.resolve(process.argv[2]):path.resolve(directory,'../timeline.json');
const timeline=JSON.parse(fs.readFileSync(timelinePath,'utf8'));
const result=synthesize(timeline,{sampleRate:48000});

function writeWav(file,stereo,sampleRate){
  const frames=stereo[0].length,channels=2,bytes=2;
  const data=Buffer.alloc(44+frames*channels*bytes);
  data.write('RIFF',0);data.writeUInt32LE(data.length-8,4);data.write('WAVE',8);
  data.write('fmt ',12);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);
  data.writeUInt16LE(channels,22);data.writeUInt32LE(sampleRate,24);
  data.writeUInt32LE(sampleRate*channels*bytes,28);data.writeUInt16LE(channels*bytes,32);
  data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(data.length-44,40);
  for(let i=0;i<frames;i++)for(let c=0;c<channels;c++)
    data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,stereo[c][i]))*32767),44+(i*channels+c)*bytes);
  fs.writeFileSync(file,data);
}

for(const name of ['music','sfx','soundtrack']){
  writeWav(path.join(directory,`${name}.wav`),result[name==='soundtrack'?'mix':name],result.sampleRate);
}
fs.writeFileSync(path.join(directory,'metadata.json'),JSON.stringify(result.metadata,null,2)+'\n');
console.log(JSON.stringify({duration:result.metadata.duration,sampleRate:result.sampleRate,
  samples:result.metadata.samples,peakDbFS:result.metadata.peakDbFS,
  rmsDbFS:result.metadata.rmsDbFS,files:['music.wav','sfx.wav','soundtrack.wav']},null,2));
