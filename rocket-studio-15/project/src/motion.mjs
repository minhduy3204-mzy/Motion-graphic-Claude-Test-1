export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const ease={linear:t=>t,smooth:t=>t*t*(3-2*t),out:t=>1-(1-t)**3,inOut:t=>t<.5?4*t*t*t:1-(-2*t+2)**3/2};
export function compileTimeline(config){
 const fps=config.fps||60;let frame=0;
 const scenes=config.scenes.map((s,index)=>{const frames=Math.max(90,Math.round(s.duration*fps));const value={...s,index,start:frame/fps,startFrame:frame,frames,duration:frames/fps,end:(frame+frames)/fps};frame+=frames;return value;});
 const S=Object.fromEntries(scenes.map(s=>[s.id,s]));
 const definitions=[['select','select',.28,'select'],['weight','style',.20,'click'],['fill','style',.56,'style'],['preview','reveal',.36,'click'],['expand','brand',.02,'whoosh'],['resolve','brand',.35,'resolve']];
 const cues=definitions.map(([id,sceneId,p,type])=>({id,sceneId,type,time:S[sceneId].start+S[sceneId].duration*p,duration:type==='resolve'?1.4:type==='whoosh'?.65:.22,strength:type==='click'?.6:.8,pan:sceneId==='style'?.5:0}));
 return {width:config.width,height:config.height,fps,duration:frame/fps,frames:frame,scenes,cues};
}
export function motionPlan(config){
 const timeline=compileTimeline(config),S=Object.fromEntries(timeline.scenes.map(s=>[s.id,s])),cue=id=>timeline.cues.find(c=>c.id===id).time;
 const initial={'camera-x':0,'camera-y':22,'camera-scale':.90,'camera-rx':5,'camera-ry':-6,'presence':.42,'select':0,'weight':0,'fill':0,'weight-value':0,'fill-value':0,'focus-weight':0,'focus-fill':0,'preview':0,'brand':0,'brand-type':0,'brand-cta':0,'cursor-x':1160,'cursor-y':750,'cursor-alpha':config.motion?.cursorVisible===false?0:1,'press':0,'art-turn':-12};
 const tracks=[];const end={...initial};
 const add=(prop,to,at,duration,easing='smooth')=>{tracks.push({prop,from:end[prop],to,at,duration,ease:easing});end[prop]=to;};
 add('presence',1,.12,.75,'out');add('camera-scale',.98,.12,1.5,'out');add('camera-y',0,.12,1.5,'out');add('camera-rx',1.8,.12,1.5,'out');add('camera-ry',-2.5,.12,1.5,'out');
 add('camera-x',115,S.select.start-.25,S.select.duration*.66,'inOut');add('camera-scale',1.10,S.select.start-.25,S.select.duration*.66,'inOut');
 add('cursor-x',290+config.layers.title.x+Math.min(438,config.layers.title.maxWidth*.68)*config.layers.title.scale,S.select.start-.18,S.select.duration*.28,'inOut');add('cursor-y',246+config.layers.title.y+60*config.layers.title.scale,S.select.start-.18,S.select.duration*.28,'inOut');
 const click=(time)=>{add('press',1,time-.045,.045,'out');add('press',0,time,.13,'out');};
 click(cue('select'));add('select',1,cue('select'),.18,'out');
 add('camera-x',-195,S.style.start-.24,S.style.duration*.26,'inOut');add('camera-y',-22,S.style.start-.24,S.style.duration*.26,'inOut');add('camera-scale',1.035,S.style.start-.24,S.style.duration*.26,'inOut');add('camera-ry',2.1,S.style.start-.24,S.style.duration*.26,'inOut');
 add('cursor-x',1752.5,S.style.start-.32,S.style.duration*.22,'inOut');add('cursor-y',559.5,S.style.start-.32,S.style.duration*.22,'inOut');
 add('focus-weight',1,cue('weight')-.30,.12,'out');
 click(cue('weight'));add('weight-value',1,cue('weight'),.001,'linear');add('weight',1,cue('weight'),.5,'out');
 add('cursor-x',1667,cue('weight')+S.style.duration*(.28/3.4),S.style.duration*(.52/3.4),'inOut');add('cursor-y',808,cue('weight')+S.style.duration*(.28/3.4),S.style.duration*(.52/3.4),'inOut');
 add('focus-weight',0,cue('fill')-.38,.12,'out');add('focus-fill',1,cue('fill')-.38,.12,'out');
 click(cue('fill'));add('fill-value',1,cue('fill'),.001,'linear');add('fill',1,cue('fill'),.45,'out');
 add('camera-x',30,S.reveal.start-.15,1,'inOut');add('camera-y',8,S.reveal.start-.15,1,'inOut');add('camera-scale',1.01,S.reveal.start-.15,1,'inOut');add('camera-rx',-1,S.reveal.start-.15,1,'inOut');add('camera-ry',-2,S.reveal.start-.15,1,'inOut');
 add('focus-fill',0,S.reveal.start,.2,'out');add('cursor-x',1744.5,S.reveal.start+.2,S.reveal.duration*.21,'inOut');add('cursor-y',91,S.reveal.start+.2,S.reveal.duration*.21,'inOut');
 click(cue('preview'));add('preview',1,cue('preview'),.7,'inOut');add('select',0,cue('preview'),.2,'out');
 add('camera-scale',1.13,cue('preview'),.95,'inOut');add('camera-x',-12,cue('preview'),.95,'inOut');add('camera-rx',0,cue('preview'),.95,'inOut');add('camera-ry',0,cue('preview'),.95,'inOut');
 add('cursor-alpha',0,cue('preview')+.4,.25,'out');
 add('brand',1,S.brand.start,S.brand.duration*.28,'inOut');add('brand-type',1,S.brand.start+S.brand.duration*.14,S.brand.duration*.22,'out');add('brand-cta',1,S.brand.start+S.brand.duration*.25,S.brand.duration*.14,'out');
 add('art-turn',18,.12,S.brand.start-.12,'smooth');
 return {timeline,initial,tracks};
}
export function visualState(time,config){const {initial,tracks}=motionPlan(config);const values={...initial};for(const t of tracks){if(time<t.at)continue;const p=clamp((time-t.at)/Math.max(.001,t.duration));values[t.prop]=t.from+(t.to-t.from)*ease[t.ease](p);}return values;}
export const cssVariables=values=>Object.fromEntries(Object.entries(values).map(([k,v])=>['--'+k,v]));
