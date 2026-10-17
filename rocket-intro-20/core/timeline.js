export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
export const easeOut=v=>1-Math.pow(1-clamp(v),4);
export const lerp=(a,b,t)=>a+(b-a)*t;
export function compileTimeline(project){
 const fps=Number(project.fps)||60;
 let frame=0;
 const scenes=project.scenes.map((s,i)=>{
  const frames=Math.max(90,Math.round(Number(s.duration)*fps));
  const value={id:s.id,name:s.name,index:i,start:frame/fps,startFrame:frame,frames,duration:frames/fps,end:(frame+frames)/fps};
  frame+=frames;return value;
 });
 const definition={launch:[['select',.36,'select'],['launch',.70,'launch']],orbit:[['expand',.13,'whoosh'],['orbit',.58,'scan']],flow:[['grid',.12,'scan'],['convert',.35,'select'],['automate',.62,'select']],fan:[['unfold',.13,'unfold'],['front-card',.61,'select']],lockup:[['resolve',.22,'resolve']]};
 const cues=scenes.flatMap(s=>(definition[s.id]||[]).map(([name,p,type])=>({id:s.id+'-'+name,sceneId:s.id,type,time:s.start+s.duration*p,duration:type==='resolve'?Math.min(1.6,s.duration*.5):Math.min(.65,s.duration*.2),strength:type==='select'?.55:.85})));
 return {fps,duration:frame/fps,frames:frame,width:project.width||1920,height:project.height||1080,scenes,cues};
}
export function resolveColor(value,project){return project.palette[String(value).replace(/^palette\./,'')]||value||'#000000'}
export function sceneAt(t,timeline){return timeline.scenes.find(s=>t>=s.start&&t<s.end)||timeline.scenes.at(-1)}
export function progress(t,s){return clamp((t-s.start)/s.duration)}
export function sceneWeight(t,s,timeline,transition=.68){
 const enter=s.index===0?1:smooth((t-(s.start-transition*.5))/transition);
 const last=s.index===timeline.scenes.length-1;
 const exit=last?1:1-smooth((t-(s.end-transition*.5))/transition);
 return clamp(enter*exit);
}
export function hexMix(a,b,t){
 const parse=x=>{x=x.replace('#','');if(x.length===3)x=[...x].map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(x.slice(i,i+2),16));};
 const A=parse(a),B=parse(b);return '#'+A.map((n,i)=>Math.round(lerp(n,B[i],t)).toString(16).padStart(2,'0')).join('');
}
