import {synthesize} from './audio/synth.js';

self.addEventListener('message', async ({data}) => {
  if (data?.type !== 'synthesize') return;
  try {
    const result = await synthesize(data.timeline, {sampleRate: data.sampleRate || 48000});
    const left = result.mix[0];
    const right = result.mix[1];
    self.postMessage({type:'audio', id:data.id, sampleRate:result.sampleRate, left:left.buffer, right:right.buffer, metadata:result.metadata}, [left.buffer, right.buffer]);
  } catch (error) {
    self.postMessage({type:'error', id:data.id, message:error?.message || String(error)});
  }
});
