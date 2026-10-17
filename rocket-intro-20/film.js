import {compileTimeline,clamp,smooth,easeOut,lerp,resolveColor,sceneWeight,hexMix} from './core/timeline.js';
import {drawPointField,drawFan,clearGeometryCache} from './visuals/geometry.js';
const canvas=document.querySelector('#geometry'),ctx=canvas.getContext('2d',{alpha:true});
const fanCanvas=document.createElement('canvas');fanCanvas.width=1920;fanCanvas.height=1080;const fanCtx=fanCanvas.getContext('2d');
const film=document.querySelector('#film'),sceneRoot=document.querySelector('#scene-layers');
let project,timeline,layerNodes=new Map(),sceneNodes=new Map(),images={},lastTime=0;
const ready=(async()=>{const file=new URLSearchParams(location.search).get('config')||'project.json';await applyProject(await (await fetch(file)).json());renderAt(0);})();
window.RocketFilm={ready,applyProject,renderAt,get duration(){return timeline?.duration||20},get timeline(){return timeline},get project(){return project},getState:()=>({time:lastTime,timeline,project})};
function key(scene,id){return scene+'::'+id}
function nodeFor(scene,id){return layerNodes.get(key(scene,id))}
function layerFor(scene,id){return project.scenes.find(s=>s.id===scene)?.layers.find(l=>l.id===id)}
function col(v){return resolveColor(v,project)}
async function loadImage(src){if(!images[src]){const img=new Image();img.src=src;await img.decode();images[src]=img;}return images[src]}
async function applyProject(next){
 project=structuredClone(next);timeline=compileTimeline(project);sceneRoot.innerHTML='';layerNodes.clear();sceneNodes.clear();
 const requests=[];
 for(const scene of project.scenes){
  const section=document.createElement('section');section.className='scene';section.dataset.scene=scene.id;section.setAttribute('aria-label',scene.name);sceneRoot.append(section);sceneNodes.set(scene.id,section);
  for(const layer of scene.layers){
   if(layer.type==='image')requests.push(loadImage(layer.src));
   if(layer.type==='fan')for(const card of layer.cards||[])if(card.image)requests.push(loadImage(card.image));
   if(!['text','image'].includes(layer.type))continue;
   const node=document.createElement('div');node.className='layer '+(layer.type==='text'?'text-layer':'image-layer');node.dataset.layer=layer.id;node.dataset.sceneId=scene.id;node.dataset.kind=/kicker|location/.test(layer.id)?'kicker':/subtitle/.test(layer.id)?'subtitle':'title';
   node.style.left=layer.x+'px';node.style.top=layer.y+'px';node.style.color=col(layer.color);node.style.opacity=layer.visible===false?'0':'1';
   if(layer.type==='text'){
    node.textContent=layer.text||'';node.style.fontFamily=layer.fontFamily||'Inter Tight';node.style.fontWeight=layer.fontWeight||600;node.style.fontSize=(layer.fontSize||100)+'px';node.style.width='fit-content';node.style.maxWidth=(layer.maxWidth||1000)+'px';
   }else{const img=document.createElement('img');img.src=layer.src;img.alt=layer.name;node.append(img);node.style.width=(layer.width||1200)+'px';}
   section.append(node);layerNodes.set(key(scene.id,layer.id),node);
  }
 }
 await Promise.all(requests);await document.fonts.ready;clearGeometryCache();
 // Fit once per edit. Containers retain auto height; wrap naturally as copy changes.
 for(const scene of project.scenes)for(const layer of scene.layers){
  if(layer.type!=='text')continue;
  const n=nodeFor(scene.id,layer.id);let size=Number(layer.fontSize)||100;
  const maxHeight=layer.maxHeight||400;
  for(let i=0;i<80&&(n.scrollHeight>maxHeight+1||n.scrollWidth>(layer.maxWidth||1000)+1);i++){size*=.965;n.style.fontSize=size+'px';}
  n.dataset.fittedSize=size.toFixed(2);
 }
 renderAt(Math.min(lastTime,timeline.duration));return {duration:timeline.duration,frames:timeline.frames};
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function arrow(x,y,size,color,rotation=0,alpha=1){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-size*.5,-size*.5);ctx.lineTo(size*.04,-size*.5);ctx.lineTo(size*.54,0);ctx.lineTo(size*.04,size*.5);ctx.lineTo(-size*.5,size*.5);ctx.lineTo(0,0);ctx.closePath();ctx.fill();ctx.restore();}
function renderAt(seconds){
 if(!timeline)return;
 const t=clamp(Number(seconds)||0,0,timeline.duration);lastTime=t;
 const S=Object.fromEntries(timeline.scenes.map(s=>[s.id,s]));
 const P={};for(const s of timeline.scenes)P[s.id]=clamp((t-s.start)/s.duration);
 const transition=Math.min(project.motion?.transition||.68,...timeline.scenes.map(s=>s.duration*.28));
 let background=col(project.scenes[0].background);
 for(let i=1;i<timeline.scenes.length;i++){
  const s=timeline.scenes[i],b=smooth((t-s.start+transition*.5)/transition),next=col(project.scenes[i].background);
  if(b>=1)background=next;
  else if(b>0){const cut=1920*(1-b);background=`linear-gradient(90deg,${background} 0px,${background} ${cut}px,${next} ${cut}px,${next} 1920px)`;break;}
 }
 film.style.background=background;ctx.clearRect(0,0,1920,1080);
 const orbitWeight=sceneWeight(t,S.orbit,timeline,transition),flowWeight=sceneWeight(t,S.flow,timeline,transition);
 // A continuous rightward camera track reverses gently as the sphere opens into a plane.
 const cameraX=lerp(18,-12,smooth(t/timeline.duration)),cameraY=Math.sin(t/timeline.duration*Math.PI)*-9;
 for(const s of timeline.scenes){
  const el=sceneNodes.get(s.id),w=sceneWeight(t,s,timeline,transition);
  const enterMask=s.index===0?1:smooth((t-s.start+transition*.5)/transition),exitMask=s.index===timeline.scenes.length-1?0:smooth((t-s.end+transition*.5)/transition);
  el.style.opacity=enterMask>0&&exitMask<1?1:0;
  el.style.clipPath=`inset(0px ${1920*exitMask}px 0px ${1920*(1-enterMask)}px)`;
  const enter=easeOut((t-s.start+transition*.22)/(s.duration*.21));
  const exit=s.index===timeline.scenes.length-1?0:smooth((t-(s.end-transition*.35))/(transition*.95));
  const cameraScale=s.id==='lockup'?lerp(.985,1,easeOut(P.lockup/.45)):1+(project.motion?.cameraDepth||.045)*smooth(P[s.id]);
  el.style.transform=`translate(${s.id==='lockup'?0:cameraX}px,${s.id==='lockup'?0:cameraY}px) scale(${cameraScale})`;
  const source=project.scenes.find(x=>x.id===s.id);
  for(let i=0;i<source.layers.length;i++){
   const layer=source.layers[i],node=nodeFor(s.id,layer.id);if(!node)continue;
   const label=/kicker|location|subtitle/.test(layer.id);let delay=label?.015:.035+(i*.018);
   if(s.id==='flow'){delay=layer.id==='flow-transform'?.05:layer.id==='flow-convert'?.24:layer.id==='flow-automate'?.46:.01;}
   if(s.id==='lockup')delay=layer.id==='wordmark'?.06:layer.id==='lockup-cta'?.20:layer.id==='lockup-url'?.27:.01;
   const amount=easeOut((P[s.id]-delay)/(s.id==='lockup'?.20:label?.16:.22));
   const exitReadability=s.id==='fan'?1-smooth((P.fan-.73)/.18):1;
   const alpha=layer.visible===false?0:(s.index===0?lerp(.22,1,amount):amount)*exitReadability;
   node.style.opacity=alpha;
   const slide=(1-amount)*(label?18:75),x=(1-enter)*32-exit*110;
   node.style.transform=`translate(${x}px,${slide}px) scale(${layer.scale||1})`;
   node.style.clipPath=label?'none':`inset(0% ${Math.max(0,(1-amount)*100)}% 0% 0%)`;
  }
 }
 const brand=document.querySelector('#brand-corner'),dark=orbitWeight;
 brand.style.color=hexMix(col('black'),col('white'),dark);brand.style.opacity=lerp(1,.45,smooth((t-S.lockup.start)/transition));
 brand.querySelector('img').style.filter=dark>.001?`brightness(0) invert(${dark})`:'none';
 const corners=document.querySelector('#frame-corners');corners.style.color=hexMix(col('black'),col('cool'),dark);corners.style.opacity=lerp(.13,.16,dark);
 const stroke=document.querySelector('#progress-stroke');stroke.style.color=hexMix(col('blue'),col('white'),dark);stroke.style.transform=`scaleX(${Math.min(1,t/(S.lockup.start+S.lockup.duration*.45))})`;
 // Visible initiating action: the arrow tracks along the selected word before becoming a point.
 const launchArrow=layerFor('launch','launch-arrow');
 if(launchArrow?.visible!==false&&t<S.orbit.start+transition){
  const p=P.launch,travel=smooth((p-.1)/.62),out=smooth((t-S.orbit.start+transition*.4)/transition);
  const x=lerp(210,launchArrow.x,travel),y=lerp(600,launchArrow.y,travel);
  arrow(x,y,74*(launchArrow.scale||1)*(1-out*.85),col(launchArrow.color),0,1-out);
  ctx.save();ctx.globalAlpha=(1-out)*.8;ctx.strokeStyle=col('yellow');ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(120,795);ctx.lineTo(120+1450*travel,795);ctx.stroke();ctx.restore();
 }
 // The same deterministic point field exists across the sphere-to-grid handoff.
 if(t>S.orbit.start-transition*.75&&t<S.fan.start+transition*.65){
  const sphere=layerFor('orbit','sphere'),grid=layerFor('flow','grid');
  const shape=smooth((t-S.flow.start+transition*.6)/(transition*1.65));
  const expansion=easeOut((t-S.orbit.start+transition*.4)/(S.orbit.duration*.24));
  const opacity=clamp((orbitWeight+flowWeight)*1.06)*(sphere.visible===false&&shape<.5?0:grid.visible===false&&shape>=.5?0:1);
  const fanHandoff=smooth((t-S.fan.start+transition*.7)/(transition*1.4)),fanLayer=layerFor('fan','service-fan');
  drawPointField(ctx,{time:t,shape,expansion,x:lerp(lerp(sphere.x,grid.x,shape),fanLayer.x,fanHandoff),y:lerp(lerp(sphere.y,grid.y,shape),fanLayer.y,fanHandoff),scale:lerp(sphere.scale,grid.scale,shape)*(1-fanHandoff*.35),alpha:opacity,color:hexMix(col(sphere.color),col(grid.color),shape),accent:hexMix(col(sphere.accent),col(grid.accent),shape),dotSize:lerp(sphere.dotSize||2.65,grid.dotSize||2.5,shape),count:sphere.count||756});
  if(fanHandoff>0&&fanHandoff<1){ctx.save();ctx.globalAlpha=Math.sin(fanHandoff*Math.PI)*.8;ctx.strokeStyle=col('orange');ctx.lineWidth=2;ctx.strokeRect(fanLayer.x-280,fanLayer.y-175,560,350);ctx.fillStyle=col('orange');ctx.beginPath();ctx.arc(fanLayer.x-280,fanLayer.y-175,5,0,Math.PI*2);ctx.fill();ctx.restore();}
 }
 // Selected grid point sweeps a plane into the service fan.
 const fanWeight=sceneWeight(t,S.fan,timeline,transition),fan=layerFor('fan','service-fan');
 if(fanWeight>.001&&fan.visible!==false){
  const open=easeOut((P.fan-.04)/.48),cards=fan.cards.map(c=>({...c,color:col(c.color)}));
  const resolve=smooth((P.fan-.78)/.22);
  fanCtx.clearRect(0,0,1920,1080);
  drawFan(fanCtx,{time:t-S.fan.start,progress:open,x:lerp(fan.x,1050,resolve),y:lerp(fan.y,560,resolve),scale:fan.scale*(1+resolve*.65),alpha:1,colors:[col('blue'),col('orange'),col('navy'),col('yellow'),col('white')],cards,images,activeIndex:2});
  ctx.save();ctx.globalAlpha=fanWeight;ctx.drawImage(fanCanvas,0,0);ctx.restore();
 }
 const closingArrow=layerFor('lockup','lockup-arrow');
 if(t>S.lockup.start-transition*.5&&closingArrow?.visible!==false){
  const a=easeOut((P.lockup-.04)/.30);arrow(lerp(1325,closingArrow.x,a),lerp(520,closingArrow.y,a),76*closingArrow.scale,col(closingArrow.color),0,a);
  ctx.save();ctx.strokeStyle=col('black');ctx.globalAlpha=.22*a;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(350,662);ctx.lineTo(350+1200*a,662);ctx.stroke();ctx.restore();
 }
 const cursor=document.querySelector('#cursor');
 const c0=smooth(P.launch/.32),c1=smooth((t-S.fan.start+transition*.3)/(S.fan.duration*.8));
 const headlineBounds=nodeFor('launch','launch-accent').getBoundingClientRect();
 let cx=lerp(1690,headlineBounds.right-8,c0),cy=lerp(850,headlineBounds.bottom-24,c0),ca=1-smooth((P.launch-.64)/.25);
 if(fanWeight>.01){cx=lerp(1700,1290,c1);cy=lerp(920,670,c1);ca=fanWeight*(1-smooth((P.fan-.72)/.25));}
 cursor.style.opacity=ca;cursor.style.transform=`translate(${cx}px,${cy}px) scale(${1-Math.sin(clamp((P.launch-.32)/.08)*Math.PI)*.12})`;
 // Selection frames are coupled to actual fitted headline dimensions.
 for(const old of document.querySelectorAll('.selection-box'))old.remove();
 const selected=t<S.orbit.start?nodeFor('launch','launch-accent'):fanWeight>.01?null:null;
 if(selected&&P.launch>.34&&P.launch<.88){
  const r=selected.getBoundingClientRect(),p=smooth((P.launch-.34)/.08)*(1-smooth((P.launch-.78)/.1));
  ctx.save();ctx.strokeStyle=col('blue');ctx.globalAlpha=p;ctx.lineWidth=1.4;ctx.strokeRect(r.x-12,r.y-8,r.width+24,r.height+16);
  for(const [x,y]of[[r.x-12,r.y-8],[r.right+12,r.y-8],[r.x-12,r.bottom+8],[r.right+12,r.bottom+8]]){ctx.fillStyle='#fff';ctx.fillRect(x-4,y-4,8,8);ctx.strokeRect(x-4,y-4,8,8);}ctx.restore();
 }
}
