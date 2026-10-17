/**
 * Rocket Studio — Make Something Move.
 * Original deterministic score and interface sound design. No third-party samples.
 * Browser-safe ESM: the editor and the Node renderer use this identical function.
 */
export const AUDIO_VERSION = '1.0.0';
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const smooth = x => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const midi = n => 440 * 2 ** ((n - 69) / 12);
const DEFAULTS = [
  {id:'establish',duration:2.4}, {id:'select',duration:2.2},
  {id:'style',duration:3.4}, {id:'reveal',duration:3.4},
  {id:'brand',duration:3.6},
];
function random(seed) {
  let n = seed >>> 0;
  return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 2147483648 - 1; };
}
function normalize(input) {
  let start = 0;
  const scenes = (input.scenes?.length ? input.scenes : DEFAULTS).map((scene, i) => {
    const duration = Math.max(.1, Number(scene.duration) || 1);
    const at = Number.isFinite(scene.start) ? scene.start : start;
    start = at + duration;
    return {...scene, id:scene.id || `scene-${i}`, start:at, duration, end:start};
  });
  return {...input, scenes, duration:Math.max(...scenes.map(s => s.end)),
    cues:Array.isArray(input.cues) ? input.cues : []};
}

export function synthesize(input = {}, {sampleRate = 48000} = {}) {
  sampleRate = Math.round(clamp(sampleRate, 8000, 96000));
  const timeline = normalize(input);
  const duration = timeline.duration;
  const samples = Math.round(duration * sampleRate);
  const music = [new Float32Array(samples), new Float32Array(samples)];
  const sfx = [new Float32Array(samples), new Float32Array(samples)];
  const events = [];
  const cueEvents = [];
  const sceneMap = new Map(timeline.scenes.map(s => [s.id, s]));

  function write(stem, at, length, pan, fn) {
    if (!(length > 0) || at >= duration || at + length <= 0) return;
    const from = Math.max(0, Math.round(at * sampleRate));
    const to = Math.min(samples, Math.round((at + length) * sampleRate));
    const angle = (clamp(pan, -1, 1) + 1) * Math.PI / 4;
    const l = Math.cos(angle), r = Math.sin(angle);
    for (let i = from; i < to; i++) {
      const t = Math.max(0, i / sampleRate - at);
      const v = fn(t, length);
      stem[0][i] += v * l;
      stem[1][i] += v * r;
    }
  }

  function keys(at, note, gain=.10, pan=0, length=.85) {
    const f = midi(note);
    write(music, at, length, pan, (t,d) => {
      const attack = 1 - Math.exp(-t * 390);
      const body = Math.exp(-t * 4.7), bell = Math.exp(-t * 14);
      const tone = Math.sin(TAU*f*t) + .22*bell*Math.sin(TAU*f*2*t)
        + .07*bell*Math.sin(TAU*f*3*t) + .11*Math.sin(TAU*f*1.0017*t);
      return tone * attack * body * gain * smooth((d-t)/.13);
    });
    // Tempo-compatible dotted-eighth reflections on the dry instrument.
    const beat = duration / 32;
    for (const [multiple, level] of [[.75,.16],[1.5,.055]]) {
      write(music, at+beat*multiple, Math.min(length,.62), -pan*.8, (t,d) =>
        Math.sin(TAU*f*t)*(1-Math.exp(-t*420))*Math.exp(-t*6.5)
        *gain*level*smooth((d-t)/.12));
    }
  }
  function pad(at, length, notes, gain=.020) {
    notes.forEach((note,i) => {
      const f = midi(note), pan = (i/(notes.length-1)*2-1)*.78;
      write(music, at, length, pan, (t,d) => {
        const envelope = smooth(t/.34)*smooth((d-t)/.58);
        const tone = Math.sin(TAU*f*t)+.18*Math.sin(TAU*f*.998*t)
          + .09*Math.sin(TAU*f*2.001*t);
        return tone * envelope * gain * (.96+.04*Math.sin(TAU*.29*t+i));
      });
    });
  }
  function bass(at,note,length=.31,gain=.13) {
    const f = midi(note);
    write(music,at,length,0,(t,d) => (Math.sin(TAU*f*t)
      + .19*Math.sin(TAU*f*2*t)+.045*Math.sin(TAU*f*3*t))
      *(1-Math.exp(-t*170))*Math.exp(-t*4.8)*gain*smooth((d-t)/.07));
  }
  function kick(at,gain=.19) {
    write(music,at,.26,0,t => {
      const phase = TAU*(48*t+78*.018*(1-Math.exp(-t/.018)));
      return Math.sin(phase)*Math.exp(-t*22)*(1-Math.exp(-t*2300))*gain;
    });
  }
  function tick(at,gain=.018,seed=1,open=false) {
    const rnd=random(seed); let low=0;
    write(music,at,open?.13:.047,.34,t => {
      const n=rnd(); low+=.24*(n-low);
      return (n-low)*Math.exp(-t*(open?39:110))*gain*(1-Math.exp(-t*3000));
    });
  }
  function rim(at,gain=.035,seed=5) {
    const rnd=random(seed); let low=0;
    write(music,at,.12,-.23,t => {
      const n=rnd(); low+=.15*(n-low);
      return ((n-low)*.65*Math.exp(-t*58)+Math.sin(TAU*181*t)*.55*Math.exp(-t*82))
        *gain*(1-Math.exp(-t*3200));
    });
  }

  // A fresh five-section Bm9 → Dmaj9 → Gmaj9 → Aadd9 → Dmaj9 harmonic arc.
  const harmony = [
    {notes:[47,54,57,61,62],root:35,melody:[73,78,73,69]},
    {notes:[50,57,61,64,66],root:38,melody:[78,76,73,69]},
    {notes:[43,50,54,57,59],root:31,melody:[74,78,81,78]},
    {notes:[45,52,57,61,71],root:33,melody:[76,73,71,73]},
    {notes:[50,57,61,64,66],root:38,melody:[78,76,73,69]},
  ];
  let baseCursor = 0;
  const base = DEFAULTS.map((s,i) => {
    const target = sceneMap.get(s.id) || timeline.scenes[i];
    const record={...s,start:baseCursor,end:baseCursor+s.duration,target,index:i};
    baseCursor += s.duration;
    return record;
  });
  const baseBeat = 60/128;

  function mapBase(at) {
    const record=base.find(s => at>=s.start-1e-8 && at<s.end-1e-8) || base[base.length-1];
    const scene=record.target;
    if (!scene) return {time:at/15*duration,index:record.index,scale:duration/15};
    const phase=clamp((at-record.start)/record.duration,0,1);
    return {time:scene.start+phase*scene.duration,index:record.index,
      scale:scene.duration/record.duration,sceneId:scene.id};
  }
  timeline.scenes.forEach((scene,index) => {
    const h=harmony[Math.min(index,4)];
    pad(Math.max(0,scene.start-.10),scene.duration+.37,h.notes,index===0?.017:.0205);
    events.push({type:'section',sceneId:scene.id,time:scene.start,end:scene.end,
      chord:h.notes,localBpm:128*(DEFAULTS[index]?.duration || scene.duration)/scene.duration});
  });
  const finalScene=timeline.scenes[timeline.scenes.length-1];
  const resolveCue=timeline.cues.find(c => c.type==='resolve' && c.sceneId===finalScene.id)
    || timeline.cues.find(c => c.type==='resolve');
  const cadence=resolveCue && Number.isFinite(resolveCue.time) ? resolveCue.time
    : finalScene.start+finalScene.duration*.30;

  // Default score is exactly 32 beats at 128 BPM. Scene edits remap each event
  // through its owning scene, preserving scene intent and shifting everything after it.
  for (let eighth=0; eighth<64; eighth++) {
    const originalAt=eighth*.5*baseBeat;
    const mapped=mapBase(originalAt);
    const at=mapped.time, index=mapped.index;
    const h=harmony[index];
    const scene=base[index].target;
    if (!scene) continue;
    const last=index===4;
    if (last && at>=cadence-.10) continue;
    const beat=Math.floor(eighth/2);
    if (eighth%2===0) {
      if (index>0 || beat===0 || beat===4) kick(at,index===0?.16:.185);
      if (beat%2===0) bass(at+.015,h.root,.31*mapped.scale,index===0?.105:.125);
      if (index>0 && beat%2===1) rim(at,.027,4301+beat);
      if (beat%2===0 || index===2 || index===3) {
        const note=h.melody[(Math.floor(beat/2)+index)%4];
        keys(at+.02,note,index===0?.078:.088,beat%4===0?-.32:.32,.87*mapped.scale);
      }
    } else if (index>0) {
      tick(at,index===3?.019:.014,1801+eighth,index===3&&beat%4===3);
      if ((index===2 || index===3) && beat%2===1)
        keys(at,h.melody[(beat+1)%4]+12,.027,beat%4===1?-.58:.58,.45*mapped.scale);
    }
    events.push({type:'pulse',sceneId:scene.id,time:at,beat:eighth/2});
  }

  const ring=Math.max(.12,Math.min(finalScene.end-cadence,duration-cadence));
  pad(cadence,ring,[50,57,61,64,69,78],.026);
  bass(cadence,38,Math.min(1.3,ring*.7),.13);
  [69,73,78,81].forEach((note,i) => keys(cadence+i*.045,note,.070,(i-1.5)*.22,
    Math.max(.1,Math.min(1.35,ring-i*.045))));
  events.push({type:'cadence',sceneId:finalScene.id,time:cadence,end:duration});

  function effect(cue,index) {
    const type=cue.type || 'whoosh', at=Number(cue.time)||0;
    const length=clamp(Number(cue.duration)||.1,.018,2.5);
    const strength=clamp(Number(cue.strength ?? .7),0,2);
    const rnd=random(12001+index*7919); let low=0,slow=0;
    cueEvents.push({...cue,type,time:at,duration:length,strength});
    if (type==='click' || type==='select') {
      const selected=type==='select';
      write(sfx,at,Math.min(length,selected?.15:.065),Number.isFinite(cue.pan)?cue.pan:(selected?-.12:0),(t,d) => {
        const n=rnd();low+=.22*(n-low);
        const body=Math.sin(TAU*(selected?630:910)*t)*Math.exp(-t*(selected?68:115));
        const weight=Math.sin(TAU*171*t)*Math.exp(-t*94);
        return ((n-low)*.11*Math.exp(-t*160)+body*.095+weight*.075)
          *(1-Math.exp(-t*6000))*strength*smooth((d-t)/.014);
      });
    } else if (type==='style') {
      // A quiet two-tone confirmation follows the property adjustment.
      [0,.045].forEach((offset,j) => write(sfx,at+offset,Math.max(.025,Math.min(.25,length-offset)),
        clamp((cue.pan||0)+(j?.12:-.12),-1,1),(t,d) => Math.sin(TAU*midi(j?85:81)*t)
          *(1-Math.exp(-t*1700))*Math.exp(-t*20)*.08*strength*smooth((d-t)/.04)));
      write(sfx,at,Math.min(.08,length),cue.pan||0,(t,d) =>
        (rnd()*.070*Math.exp(-t*145)+Math.sin(TAU*920*t)*.085*Math.exp(-t*105))
        *(1-Math.exp(-t*4000))*strength*smooth((d-t)/.013));
    } else if (type==='resolve' || type==='open' || type==='launch') {
      write(sfx,at,length,0,(t,d) => {
        const n=rnd();low+=.036*(n-low);
        const phase=TAU*(55*t+37*.025*(1-Math.exp(-t/.025)));
        return (Math.sin(phase)*.13*Math.exp(-t*7)+low*.23*Math.exp(-t*8)
          +Math.sin(TAU*1479.98*t)*.018*Math.exp(-t*17))
          *(1-Math.exp(-t*1800))*strength*smooth((d-t)/.16);
      });
    } else {
      // Stereo motion follows a continuous left-to-right camera move.
      const pan=Number.isFinite(cue.pan)?cue.pan:-.15;
      write(sfx,at,length,pan,(t,d) => {
        const x=clamp(t/d,0,1),n=rnd();
        low+=(.025+.12*Math.sin(Math.PI*x))*(n-low);slow+=.009*(n-slow);
        return (low-slow)*Math.sin(Math.PI*x)**1.8*.29*strength;
      });
      write(sfx,at+length*.14,length*.82,-pan+.22,(t,d) => {
        const x=clamp(t/d,0,1);
        return Math.sin(TAU*(150*t+190*t*t/d))*.012*Math.sin(Math.PI*x)**2*strength;
      });
    }
  }
  const fallback=timeline.scenes.flatMap((scene,i) => [
    {id:`${scene.id}-in`,sceneId:scene.id,type:i===0?'open':i===4?'resolve':'whoosh',
      time:scene.start+(i===4?scene.duration*.3:0),duration:i===4?.65:.42,strength:.65},
    ...(i===1?[{id:'select-object',sceneId:scene.id,type:'select',
      time:scene.start+.45,duration:.13,strength:.8}]:[]),
    ...(i===2?[{id:'property-change',sceneId:scene.id,type:'style',
      time:scene.start+.9,duration:.28,strength:.7}]:[]),
  ]);
  (timeline.cues.length?timeline.cues:fallback).forEach(effect);

  // A tiny dark room gives depth without smearing precise interface clicks.
  const dry=[music[0].slice(),music[1].slice()];
  for (const [j,[delay,gain]] of [[.049,.060],[.107,.040],[.181,.023]].entries()) {
    const offset=Math.round(delay*sampleRate);
    for (let ch=0;ch<2;ch++) {
      let low=0;
      for (let i=offset;i<samples;i++) {
        low+=.19*(dry[j%2?1-ch:ch][i-offset]-low);
        music[ch][i]+=low*gain;
      }
    }
  }
  let peak=0,energy=0;
  for (let i=0;i<samples;i++) {
    const t=i/sampleRate;
    const envelope=smooth(t/.012)*smooth((duration-t)/.58);
    for (let ch=0;ch<2;ch++) {
      music[ch][i]*=envelope;sfx[ch][i]*=envelope;
      const sum=music[ch][i]+sfx[ch][i];
      peak=Math.max(peak,Math.abs(sum));energy+=sum*sum;
    }
  }
  const target=.77,masterGain=peak?target/peak:1;
  const mix=[new Float32Array(samples),new Float32Array(samples)];
  for (let ch=0;ch<2;ch++) for (let i=0;i<samples;i++) {
    music[ch][i]*=masterGain;sfx[ch][i]*=masterGain;
    mix[ch][i]=music[ch][i]+sfx[ch][i];
  }
  // The final sample is literal zero, including after subsequent PCM conversion.
  for(const stem of [music,sfx,mix])for(const channel of stem)channel[samples-1]=0;
  return {music,sfx,mix,sampleRate,metadata:{
    title:'Rocket Studio — Make Something Move',version:AUDIO_VERSION,
    composer:'Original procedural composition for the Rocket Studio launch film',
    license:'Original synthesis. No external music, recordings, or samples.',
    duration,samples,channels:2,defaultTempoBpm:128,defaultBeats:32,
    peakDbFS:20*Math.log10(target),
    rmsDbFS:20*Math.log10(Math.sqrt(energy/(samples*2))*masterGain),masterGain,
    sections:events.filter(e=>e.type==='section'),events,cues:cueEvents,
    retiming:'Music pulses map through scene-normalized positions. Scene changes shift later sections, cadence and timeline cue effects. Pitches remain fixed.',
  }};
}
