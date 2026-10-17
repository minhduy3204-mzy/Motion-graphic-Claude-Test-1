#!/usr/bin/env node
/** Build uncompressed music, sound-design and master stems from the shared timeline. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {synthesize} from '../public/audio/synth.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'timeline.json');
const output=process.argv[3]?path.resolve(process.argv[3]):path.join(root,'public/audio');
const timeline=JSON.parse(fs.readFileSync(source,'utf8'));
const result=synthesize(timeline,{sampleRate:48000});
fs.mkdirSync(output,{recursive:true});
function wav(file,channels,rate) {
  const count=channels[0].length;
  const data=Buffer.alloc(44+count*4);
  data.write('RIFF',0);data.writeUInt32LE(data.length-8,4);data.write('WAVE',8);
  data.write('fmt ',12);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);
  data.writeUInt16LE(2,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*4,28);
  data.writeUInt16LE(4,32);data.writeUInt16LE(16,34);data.write('data',36);
  data.writeUInt32LE(data.length-44,40);
  for(let i=0;i<count;i++)for(let ch=0;ch<2;ch++) {
    const value=channels[ch][i];
    if(!Number.isFinite(value))throw new Error(`Non-finite audio sample ${i}/${ch}`);
    if(Math.abs(value)>1)throw new Error(`Audio clipping at ${i}/${ch}: ${value}`);
    data.writeInt16LE(Math.round(value*32767),44+(i*2+ch)*2);
  }
  fs.writeFileSync(file,data);
}
for(const [file,key] of [['music.wav','music'],['sfx.wav','sfx'],['soundtrack.wav','mix']])
  wav(path.join(output,file),result[key],result.sampleRate);
fs.writeFileSync(path.join(output,'metadata.json'),JSON.stringify(result.metadata,null,2)+'\n');
console.log(JSON.stringify({duration:result.metadata.duration,samples:result.metadata.samples,
  sampleRate:result.sampleRate,peakDbFS:result.metadata.peakDbFS,rmsDbFS:result.metadata.rmsDbFS,
  cues:result.metadata.cues.length,output},null,2));
