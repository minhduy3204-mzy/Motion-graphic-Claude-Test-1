/**
 * Rocket Group / Forward Momentum — original generative score, 2026.
 * Pure, deterministic, browser-safe ESM. No network, packages, or DOM needed.
 * API: synthesize(timeline, {sampleRate:48000}) -> stereo music/sfx/mix buffers.
 * Every event is scheduled from the SAME scene boundaries and cues as the film.
 */
export const AUDIO_VERSION = '1.0.0';
const TAU = Math.PI * 2;
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = x => x * x * (3 - 2 * x);

function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296 * 2 - 1;
  };
}

function normalizeTimeline(t) {
  const fallback = [
    {id:'launch',duration:3.2}, {id:'orbit',duration:4.2},
    {id:'flow',duration:4.4}, {id:'fan',duration:4.2},
    {id:'lockup',duration:4},
  ];
  let cursor = 0;
  const scenes = (t.scenes?.length ? t.scenes : fallback).map((s, i) => {
    const start = Number.isFinite(s.start) ? s.start : cursor;
    const duration = Math.max(.1, Number(s.duration) || 1);
    cursor = start + duration;
    return {...s, id:s.id || `scene-${i}`, start, duration, end:cursor};
  });
  const duration = Math.max(...scenes.map(s => s.end));
  return {...t, scenes, duration, cues:Array.isArray(t.cues) ? t.cues : []};
}

export function synthesize(input = {}, {sampleRate = 48000} = {}) {
  sampleRate = Math.round(clamp(sampleRate, 8000, 96000));
  const timeline = normalizeTimeline(input);
  const duration = timeline.duration;
  const count = Math.round(duration * sampleRate);
  const music = [new Float32Array(count), new Float32Array(count)];
  const sfx = [new Float32Array(count), new Float32Array(count)];
  const musicalEvents = [];
  const cueEvents = [];

  function write(stem, start, length, pan, fn) {
    const first = Math.max(0, Math.round(start * sampleRate));
    const last = Math.min(count, Math.round((start + length) * sampleRate));
    const p = clamp(pan, -1, 1);
    const l = Math.cos((p + 1) * Math.PI / 4);
    const r = Math.sin((p + 1) * Math.PI / 4);
    for (let i = first; i < last; i++) {
      const sec = Math.max(0, i / sampleRate - start);
      const v = fn(sec, length);
      stem[0][i] += v * l;
      stem[1][i] += v * r;
    }
  }

  function pad(start, len, notes, gain=.045, width=.75) {
    notes.forEach((note, n) => {
      const f = midi(note);
      const pan = ((n / Math.max(1, notes.length - 1)) * 2 - 1) * width;
      write(music, start, len, pan, (t, d) => {
        const attack = ease(clamp(t / .42, 0, 1));
        const release = ease(clamp((d - t) / .8, 0, 1));
        const breathe = .91 + .09 * Math.sin(TAU * .32 * t + n);
        const tone = Math.sin(TAU*f*t) + .21*Math.sin(TAU*f*2.003*t)
          + .08*Math.sin(TAU*f*3*t) + .13*Math.sin(TAU*f*.9984*t);
        return tone * gain * attack * release * breathe;
      });
    });
  }

  function pluck(start, note, gain=.12, pan=0, length=1.1, bright=1) {
    const f = midi(note);
    write(music, start, length, pan, (t,d) => {
      const env = (1-Math.exp(-t*450))*Math.exp(-t*4.5)*ease(clamp((d-t)/.15,0,1));
      const harmonic = Math.exp(-t*11) * bright;
      const wave = Math.sin(TAU*f*t)
        + .28*harmonic*Math.sin(TAU*f*2*t)
        + .12*harmonic*Math.sin(TAU*f*3.001*t);
      return wave * env * gain;
    });
    // Subtle clocked stereo echoes; deterministic, without masking the dry note.
    if (gain>.04) {
      write(music,start+.268,Math.min(.85,length),-pan*.8,(t,d) =>
        Math.sin(TAU*f*t)*Math.exp(-t*5.8)*(1-Math.exp(-t*400))*gain*.20
        *ease(clamp((d-t)/.13,0,1)));
      write(music,start+.536,Math.min(.7,length),pan*.8,(t,d) =>
        Math.sin(TAU*f*t)*Math.exp(-t*6.5)*(1-Math.exp(-t*400))*gain*.08
        *ease(clamp((d-t)/.12,0,1)));
    }
  }

  function bass(start, note, len=.35, gain=.15) {
    const f=midi(note);
    write(music,start,len,0,(t,d) => {
      const env=(1-Math.exp(-t*120))*Math.exp(-t*3.5)*ease(clamp((d-t)/.07,0,1));
      return (Math.sin(TAU*f*t)+.24*Math.sin(TAU*f*2*t)+.07*Math.sin(TAU*f*3*t))*env*gain;
    });
  }

  function kick(start,gain=.22) {
    write(music,start,.31,0,t => {
      const phase=TAU*(46*t+70*.021*(1-Math.exp(-t/.021)));
      return Math.sin(phase)*Math.exp(-t*19)*Math.min(1,t*1800)*gain;
    });
  }

  function hat(start,gain=.018,seed=1,open=false) {
    const rnd=random(seed);
    let lp=0;
    const len=open?.15:.055;
    write(music,start,len,.35,t => {
      const noise=rnd(); lp += .21*(noise-lp);
      return (noise-lp)*Math.exp(-t*(open?35:95))*gain*(1-Math.exp(-t*2500));
    });
  }

  function clap(start,gain=.033,seed=2) {
    const rnd=random(seed); let lp=0;
    write(music,start,.16,-.13,t=>{
      const n=rnd(); lp+=.12*(n-lp);
      const burst=Math.exp(-t*35)+.5*Math.exp(-Math.max(0,t-.013)*80)*(t>=.013)
        +.3*Math.exp(-Math.max(0,t-.025)*60)*(t>=.025);
      return (n-lp)*burst*gain;
    });
  }

  // A five-part harmonic arc. Notes are score data, not copyrighted samples.
  const harmony = [
    {pad:[50,57,61,64,69],bass:38,lead:[73,69,76,73]}, // D major 9
    {pad:[54,57,61,64,68],bass:30,lead:[73,76,81,80]}, // F# minor 9
    {pad:[45,52,57,61,71],bass:33,lead:[76,73,71,69]}, // A add 9
    {pad:[52,56,59,66,71],bass:40,lead:[71,76,78,80]}, // E add 9
    {pad:[45,52,57,61,64,71],bass:33,lead:[73,76,81,80]}, // A major 9
  ];

  timeline.scenes.forEach((scene,index) => {
    const h=harmony[Math.min(index,harmony.length-1)];
    const last=index===timeline.scenes.length-1;
    const beats=index===0?6:8;
    const beat=scene.duration/beats;
    const sectionEnd=last?scene.start+scene.duration*.51:scene.end;
    musicalEvents.push({type:'section',scene:scene.id,time:scene.start,end:scene.end,
      chord:h.pad,beats,beatDuration:beat});
    pad(Math.max(0,scene.start-.10),scene.duration+.55,h.pad,index===0?.029:.034);

    // A sparse, recognisable melodic motif develops through the film.
    const pattern=index===0?[0,2.5,4.5]:[0,1.5,3,4.5,6,7];
    pattern.forEach((b,j)=>{
      const at=scene.start+b*beat;
      if(at>=sectionEnd-.10)return;
      pluck(at,h.lead[j%h.lead.length],index===0?.075:.083,
        j%2? .33:-.33,Math.min(1.25,scene.end-at+.2),index===3?1:.75);
    });

    for(let b=0;b<beats;b++){
      const at=scene.start+b*beat;
      if(at>=sectionEnd-.12)break;
      // The first section begins open; density then grows with the imagery.
      if(index>0 || b===0 || b===4) kick(at,index===0?.16:.20);
      if(b%2===0)bass(at+.025,h.bass,beat*.76,index===0?.105:.14);
      if(index>0 && b%2===1)clap(at,.026,index*100+b);
      if(index>0){
        hat(at+beat*.5,index===3?.021:.016,index*113+b);
        if(index===2||index===3)hat(at+beat*.75,.009,index*777+b);
      }
      if(index===3&&b%2===0)pluck(at+beat*.75,h.lead[(b+1)%4]+12,.027,
        b%4?-.65:.65,.55,.5);
    }

    if(last){
      const resolve=scene.start+scene.duration*.50;
      // All final material is relative to the lockup duration, including its release.
      pad(resolve,scene.end-resolve,[45,57,61,64,69,76],.040,.8);
      bass(resolve,33,Math.min(1.6,scene.duration*.4),.115);
      [69,73,76,81].forEach((n,j)=>pluck(resolve+j*.052,n,.065,(j-1.5)*.24,
        Math.min(1.4,scene.end-resolve-j*.052),.65));
      musicalEvents.push({type:'cadence',time:resolve,end:scene.end});
    }
  });

  function effect(type,start,length,strength=1,seed=5){
    const gain=clamp(strength,.05,2);
    const len=clamp(length||.5,.02,3);
    const rnd=random(seed); let low=0,slow=0;
    cueEvents.push({type,time:start,duration:len,strength:gain});
    if(type==='select'){
      write(sfx,start,Math.min(len,.13),-.1,(t,d)=>{
        const noise=rnd();
        return ((noise*.19*Math.exp(-t*140))
          +Math.sin(TAU*780*t)*Math.exp(-t*95)*.13
          +Math.sin(TAU*155*t)*Math.exp(-t*78)*.20)*gain
          *(1-Math.exp(-t*4000))*ease(clamp((d-t)/.015,0,1));
      });
    }else if(type==='launch'||type==='resolve'){
      const resolve=type==='resolve';
      write(sfx,start,len,0,(t,d)=>{
        const x=t/d;
        const n=rnd(); low+=.035*(n-low);
        const sub=Math.sin(TAU*(resolve?55:46)*t+2.4*(1-Math.exp(-t*25)));
        const e=(1-Math.exp(-t*600))*Math.exp(-t*(resolve?5:9));
        const shimmer=Math.sin(TAU*(resolve?1760:1108.73)*t)*Math.exp(-t*16)*.025;
        return (sub*.19*e+low*.33*e+shimmer)*gain*ease(clamp((1-x)*5,0,1));
      });
    }else if(type==='unfold'){
      write(sfx,start,len,-.15,(t,d)=>{
        const x=t/d;const n=rnd();low+=.055*(n-low);
        const env=Math.pow(Math.sin(Math.PI*x),1.6);
        const sweep=Math.sin(TAU*(145*t+220*t*t/d));
        return (low*.36+sweep*.027)*env*gain;
      });
      [0,.12,.25,.40].forEach((f,j)=>effect('select',start+len*f,.06,gain*.35,seed+j+9));
    }else if(type==='scan'){
      write(sfx,start,len,.30,(t,d)=>{
        const x=t/d;const n=rnd();low+=.09*(n-low);slow+=.015*(n-slow);
        return (low-slow)*Math.sin(Math.PI*x)*.23*gain;
      });
    }else{
      // Smooth filtered motion whoosh; no harsh white-noise top end.
      write(sfx,start,len,-.2,(t,d)=>{
        const x=t/d,n=rnd();
        low+=(.025+.11*Math.sin(Math.PI*x))*(n-low);slow+=.008*(n-slow);
        const env=Math.pow(Math.sin(Math.PI*x),1.8);
        return (low-slow)*env*.38*gain;
      });
    }
  }

  const cues=timeline.cues.length?timeline.cues:timeline.scenes.flatMap((s,i)=>[
    {id:`${s.id}-in`,type:i===0?'launch':i===3?'unfold':i===4?'resolve':'whoosh',
      time:Math.max(0,s.start-(i===0?0:.18)),duration:i===0?.6:.64,strength:.8},
    ...(i===1||i===2?[{id:`${s.id}-select`,type:'select',time:s.start+.6,duration:.1,strength:.65}]:[])
  ]);
  cues.forEach((c,i)=>effect(c.type||'whoosh',Number(c.time)||0,
    c.duration||.5,c.strength??.8,9201+i*137));

  // Short stereo room, a dark early-reflection return, entirely procedural.
  const dry=[music[0].slice(),music[1].slice()];
  [[.071,.075],[.113,.052],[.173,.041],[.229,.025]].forEach(([delay,gain],j)=>{
    const off=Math.round(delay*sampleRate);
    for(let ch=0;ch<2;ch++){
      let lp=0;
      for(let i=off;i<count;i++){
        lp+=.21*(dry[j%2?1-ch:ch][i-off]-lp);
        music[ch][i]+=lp*gain;
      }
    }
  });

  // End exactly at the film boundary. No abrupt chopped delay or residual DC.
  let peak=0;
  let sumSquares=0;
  for(let i=0;i<count;i++){
    const t=i/sampleRate;
    const fadeIn=ease(clamp(t/.014,0,1));
    const fadeOut=ease(clamp((duration-t)/.65,0,1));
    const fade=fadeIn*fadeOut;
    for(let ch=0;ch<2;ch++){
      music[ch][i]*=fade;sfx[ch][i]*=fade;
      const v=music[ch][i]+sfx[ch][i];
      peak=Math.max(peak,Math.abs(v));sumSquares+=v*v;
    }
  }
  // Leave codec reconstruction headroom for the final AAC delivery.
  const targetPeak=.78;
  const masterGain=peak>0?targetPeak/peak:1;
  const mix=[new Float32Array(count),new Float32Array(count)];
  for(let ch=0;ch<2;ch++)for(let i=0;i<count;i++){
    music[ch][i]*=masterGain;sfx[ch][i]*=masterGain;
    mix[ch][i]=music[ch][i]+sfx[ch][i];
  }
  return {music,sfx,mix,sampleRate,metadata:{
    title:'Forward Momentum',composer:'Original procedural score for Rocket Group',
    version:AUDIO_VERSION,license:'Original synthesis; no third-party music or samples.',
    duration,samples:count,channels:2,peakDbFS:20*Math.log10(targetPeak),
    rmsDbFS:20*Math.log10(Math.sqrt(sumSquares/(count*2))*masterGain),
    masterGain,sections:musicalEvents,cues:cueEvents,
    retiming:'All section harmony, rhythmic patterns, final cadence, and SFX are regenerated from timeline.json.',
  }};
}
