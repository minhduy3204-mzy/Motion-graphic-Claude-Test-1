/**
 * Rocket Group — deterministic, editable geometric motion layers.
 * Canvas2D only. All coordinates and phases derive from the supplied `time`.
 * The fan uses 3D vertices, perspective projection, depth sorting and a
 * subdivided texture mesh; no CSS perspective or pre-rendered footage.
 */
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => (t = clamp(t)) * t * (3 - 2 * t);
const pointCache = new Map();
const textureCache = new Map();

function getPoints(count) {
  if (pointCache.has(count)) return pointCache.get(count);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const cols = Math.ceil(Math.sqrt(count * 1.55));
  const rows = Math.ceil(count / cols);
  const points = Array.from({length: count}, (_, i) => {
    const sy = 1 - 2 * (i + 0.5) / count;
    const r = Math.sqrt(1 - sy * sy);
    const theta = i * goldenAngle;
    // Coprime permutation prevents the ordered sphere latitude bands from
    // becoming ordered grid rows during the transition.
    let stride = Math.floor(count * 0.61803398875);
    while (gcd(stride, count) !== 1) stride++;
    const k = (i * stride) % count;
    return {
      x: Math.cos(theta) * r, y: sy, z: Math.sin(theta) * r,
      gx: ((k % cols) / (cols - 1) - .5) * 2,
      gy: (Math.floor(k / cols) / Math.max(1, rows - 1) - .5) * 2,
      accent: i % 29 === 0,
      phase: (i * .38196601125 % 1) * TAU,
    };
  });
  pointCache.set(count, points);
  return points;
}

function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
function rotate(v, rx, ry, rz) {
  let {x, y, z} = v;
  let c = Math.cos(rx), s = Math.sin(rx);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ry); s = Math.sin(ry);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(rz); s = Math.sin(rz);
  return {x: x * c - y * s, y: x * s + y * c, z};
}
function project(v, focal = 1050) {
  const perspective = focal / (focal - v.z);
  return {x: v.x * perspective, y: v.y * perspective, z: v.z, p: perspective};
}

/** Stable Fibonacci particle sphere → gently travelling perspective wave grid.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{time:number,shape?:number,expansion?:number,x?:number,y?:number,
 * scale?:number,alpha?:number,color?:string,accent?:string,dotSize?:number,
 * count?:number,orbit?:boolean}} opts
 */
export function drawPointField(ctx, opts = {}) {
  const {
    time = 0, shape = 0, expansion = 0, x = 0, y = 0, scale = 1,
    alpha = 1, color = '#0057FF', accent = '#F0C400', dotSize = 2.4,
    count = 700, orbit = false,
  } = opts;
  if (alpha <= 0 || scale <= 0 || count < 2) return;
  const morph = smooth(shape);
  const spread = clamp(expansion);
  const radius = mix(230, 267, spread);
  const points = getPoints(Math.max(2, Math.round(count)));
  const transformed = points.map((p, i) => {
    const s = rotate({x:p.x * radius, y:p.y * radius, z:p.z * radius},
      -.18 + Math.sin(time * .12) * .035, time * .16 + .28, -.12);
    const gx = p.gx * mix(355, 425, spread);
    const gy = p.gy * mix(205, 248, spread);
    const wave = Math.sin(p.gx * 3.4 + time * .78) * 29
      + Math.cos(p.gy * 3.1 - time * .55) * 21;
    const g = rotate({x:gx, y:gy, z:wave}, -.23, -.10 + Math.sin(time * .10)*.025, -.035);
    const v = {x:mix(s.x,g.x,morph), y:mix(s.y,g.y,morph), z:mix(s.z,g.z,morph)};
    return {...project(v), accent:p.accent, i};
  });
  transformed.sort((a,b)=>a.z-b.z);
  ctx.save();
  ctx.translate(x,y); ctx.scale(scale,scale);
  if (orbit && morph < .9) {
    ctx.save();
    ctx.globalAlpha = alpha * (1-morph) * .17;
    ctx.strokeStyle=color; ctx.lineWidth=.8;
    ctx.rotate(-.34); ctx.beginPath();
    ctx.ellipse(0,0,radius*1.2,radius*.43,0,0,TAU); ctx.stroke();
    ctx.restore();
  }
  for (const p of transformed) {
    // No sinusoidal opacity modulation: points do not blink, and back-facing
    // particles stay visible. Size/alpha are smooth functions of world depth.
    const depth = clamp((p.z + radius) / (radius * 2));
    ctx.globalAlpha = alpha * mix(.25,.95,depth);
    ctx.fillStyle=p.accent?accent:color;
    const r = dotSize * mix(.73,1.13,depth) * Math.sqrt(p.p);
    ctx.beginPath(); ctx.arc(p.x,p.y,r,0,TAU); ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx,x,y,w,h,r=0) {
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);return ctx;
}
function resolveImage(images, key) {
  if (!key) return null;
  if (typeof key === 'object' && (key.naturalWidth || key.width)) return key;
  return images instanceof Map ? images.get(key) : images?.[key];
}
function coverImage(ctx,image,x,y,w,h) {
  const iw=image.naturalWidth||image.width, ih=image.naturalHeight||image.height;
  if (!(iw>0&&ih>0)) return;
  const ratio=Math.max(w/iw,h/ih), sw=w/ratio, sh=h/ratio;
  ctx.drawImage(image,(iw-sw)/2,0,sw,sh,x,y,w,h);
}
function fitText(ctx,text,maxWidth,initialSize,minSize=26,weight=650,fontFamily='Inter Tight') {
  let size=initialSize;
  do {ctx.font=`${weight} ${size}px "${fontFamily}", Arial, sans-serif`;if(ctx.measureText(text).width<=maxWidth)break;size-=1;}while(size>minSize);
  return size;
}
function wrapText(ctx,text,maxWidth,maxLines=2) {
  const words=String(text).split(/\s+/),lines=[]; let line='';
  for(const word of words){const next=line?`${line} ${word}`:word;
    if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word;}else line=next;
  }
  if(line)lines.push(line);
  if(lines.length<=maxLines)return lines;
  return [...lines.slice(0,maxLines-1),lines.slice(maxLines-1).join(' ')];
}
function cardTexture(card,index,color,image,fontFamily='Inter Tight') {
  const imageKey=image?.src||image?.currentSrc||'';
  const key=JSON.stringify([card.text,card.label,card.subtitle,color,imageKey,image?.naturalWidth||image?.width||0,fontFamily,card.background,card.imageFit]);
  if(textureCache.has(key))return textureCache.get(key);
  const canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(1000,700):Object.assign(document.createElement('canvas'),{width:1000,height:700});
  const c=canvas.getContext('2d');
  c.fillStyle=card.background||'#FFFFFF';c.fillRect(0,0,1000,700);
  // Compact, functional header rails rather than a decorative fake product UI.
  c.fillStyle='#101010';c.fillRect(0,0,1000,57);
  c.fillStyle='#FFF';c.font=`500 18px "${fontFamily}",Arial,sans-serif`;
  c.fillText(card.label||'ROCKET GROUP',31,35);
  c.fillStyle=color;c.beginPath();c.arc(966,28,6,0,TAU);c.fill();
  c.fillStyle=color;c.fillRect(0,57,1000,7);
  c.fillStyle='#6F737B';c.font=`500 19px "${fontFamily}",Arial,sans-serif`;
  c.fillText(String(index+1).padStart(2,'0'),31,104);
  c.fillStyle='#111';
  const title=String(card.text||'Rocket Group');
  let size=fitText(c,title,900,title.length>24?55:65,36,650,fontFamily);
  let lines=wrapText(c,title,920,2);
  if(lines.length===1&&c.measureText(lines[0]).width>920){size=fitText(c,title,920,size,24,650,fontFamily);lines=[title];}
  c.textBaseline='alphabetic';
  lines.forEach((line,i)=>{fitText(c,line,920,size,26,650,fontFamily);c.fillText(line,31,180+i*67);});
  const top=lines.length>1?286:224;
  if(image&&(image.naturalWidth||image.width)>0){
    c.save();roundRect(c,30,top,940,700-top-30,5).clip();
    coverImage(c,image,30,top,940,700-top-30);c.restore();
    c.strokeStyle='rgba(0,0,0,.13)';c.lineWidth=1;roundRect(c,30,top,940,700-top-30,5).stroke();
  }else{
    // An explicit graphic composition, never an invented product interface.
    c.fillStyle=color;roundRect(c,30,top,940,700-top-30,5).fill();
    c.save();c.beginPath();c.rect(30,top,940,700-top-30);c.clip();
    c.globalAlpha=.18;c.strokeStyle='#FFF';c.lineWidth=2;
    for(let k=-2;k<12;k++){c.beginPath();c.moveTo(k*128,top);c.lineTo(k*128+280,700);c.stroke();}
    c.globalAlpha=.98;c.fillStyle='#FFF';
    c.translate(725,top+(700-top)/2-10);
    c.beginPath();c.moveTo(-104,-55);c.lineTo(0,-55);c.lineTo(0,-110);c.lineTo(112,0);c.lineTo(0,110);c.lineTo(0,55);c.lineTo(-104,55);c.closePath();c.fill();
    c.restore();
    if(card.subtitle){
      c.fillStyle='#FFF';c.font=`500 29px "${fontFamily}",Arial,sans-serif`;
      const subLines=wrapText(c,card.subtitle,550,3);
      subLines.forEach((line,i)=>c.fillText(line,68,top+81+i*39));
    }
  }
  c.strokeStyle='#111';c.lineWidth=3;c.strokeRect(1.5,1.5,997,697);
  textureCache.set(key,canvas);return canvas;
}

function pathPoly(ctx,points){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();}
function triangle(ctx,image,s0,s1,s2,d0,d1,d2){
  const det=s0.x*(s1.y-s2.y)+s1.x*(s2.y-s0.y)+s2.x*(s0.y-s1.y);
  if(Math.abs(det)<.0001)return;
  const a=(d0.x*(s1.y-s2.y)+d1.x*(s2.y-s0.y)+d2.x*(s0.y-s1.y))/det;
  const c=(d0.x*(s2.x-s1.x)+d1.x*(s0.x-s2.x)+d2.x*(s1.x-s0.x))/det;
  const e=(d0.x*(s1.x*s2.y-s2.x*s1.y)+d1.x*(s2.x*s0.y-s0.x*s2.y)+d2.x*(s0.x*s1.y-s1.x*s0.y))/det;
  const b=(d0.y*(s1.y-s2.y)+d1.y*(s2.y-s0.y)+d2.y*(s0.y-s1.y))/det;
  const d=(d0.y*(s2.x-s1.x)+d1.y*(s0.x-s2.x)+d2.y*(s1.x-s0.x))/det;
  const f=(d0.y*(s1.x*s2.y-s2.x*s1.y)+d1.y*(s2.x*s0.y-s0.x*s2.y)+d2.y*(s0.x*s1.y-s1.x*s0.y))/det;
  ctx.save();
  // Small triangle overlap removes subpixel pinholes at mesh boundaries.
  const mx=(d0.x+d1.x+d2.x)/3,my=(d0.y+d1.y+d2.y)/3;
  const expand=p=>({x:mx+(p.x-mx)*1.018,y:my+(p.y-my)*1.018});
  pathPoly(ctx,[expand(d0),expand(d1),expand(d2)]);ctx.clip();
  ctx.transform(a,b,c,d,e,f);ctx.drawImage(image,0,0);ctx.restore();
}
function drawTexturedPlane(ctx,texture,projectVertex,cols=6,rows=4){
  const grid=[];
  for(let y=0;y<=rows;y++){grid[y]=[];for(let x=0;x<=cols;x++)grid[y][x]=projectVertex(x/cols,y/rows);}
  const w=texture.width,h=texture.height;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const s00={x:x/cols*w,y:y/rows*h},s10={x:(x+1)/cols*w,y:y/rows*h},s01={x:x/cols*w,y:(y+1)/rows*h},s11={x:(x+1)/cols*w,y:(y+1)/rows*h};
    triangle(ctx,texture,s00,s10,s11,grid[y][x],grid[y][x+1],grid[y+1][x+1]);
    triangle(ctx,texture,s00,s11,s01,grid[y][x],grid[y+1][x+1],grid[y+1][x]);
  }
}

/** Genuine 3D card fan. Typical geometry fits a roughly 850×600 region.
 * Optional extensions: activeIndex, rotateX,rotateY,rotateZ, width,height,
 * fontFamily, shadow, highlight. Card `.x/.y/.scale` are local editable controls.
 */
export function drawFan(ctx,opts={}){
  const {
    time=0,progress=1,x=0,y=0,scale=1,alpha=1,
    colors=['#0057FF','#FF6A00','#061A4A','#F0C400'],
    cards=[{text:'Transform'},{text:'Convert'},{text:'Automate'}],
    images={},activeIndex=Math.floor(cards.length/2),
    rotateX=-.09,rotateY=-.16,rotateZ=-.035,
    width=500,height=350,fontFamily='Inter Tight',shadow=true,highlight=true,
  }=opts;
  if(alpha<=0||scale<=0||!cards.length)return;
  const open=smooth(progress),center=(cards.length-1)/2;
  const fan=cards.map((card,i)=>({card,i})).filter(({card})=>card.visible!==false).map(({card,i})=>{
    const fanOffset=(i-center),dist=Math.abs(i-activeIndex),cardScale=card.scale??1;
    const angle=fanOffset*.21*open;
    const tx=fanOffset*62*open+(card.x||0),ty=dist*15*open+(card.y||0);
    const tz=95-dist*73 + (1-open)*dist*41;
    const pivot={x:0,y:height*.48,z:0};
    const transform=(u,v,back=0)=>{
      let p={x:(u-.5)*width*cardScale,y:(v-.5)*height*cardScale-pivot.y,z:back};
      p=rotate(p,0,-fanOffset*.07*open,angle);
      p.y+=pivot.y;p.x+=tx;p.y+=ty;p.z+=tz;
      p=rotate(p,rotateX,rotateY+Math.sin(time*.2)*.018,rotateZ);
      return p;
    };
    const corners=[[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>project(transform(u,v)));
    return {card,i,corners,transform,z:transform(.5,.5).z};
  }).sort((a,b)=>a.z-b.z);
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha=alpha;
  for(const item of fan){
    const {card,i,corners,transform}=item;
    const image=resolveImage(images,card.image);
    const color=card.color||colors[i%colors.length];
    const tex=cardTexture(card,i,color,image,fontFamily);
    if(shadow){
      ctx.save();ctx.shadowColor='rgba(0,0,0,.24)';ctx.shadowBlur=22;ctx.shadowOffsetX=6;ctx.shadowOffsetY=13;
      ctx.fillStyle='#0A0A0A';pathPoly(ctx,corners);ctx.fill();ctx.restore();
    }
    // Visible thickness. Faces are projected from an actual second Z plane.
    const back=[[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>project(transform(u,v,-6)));
    ctx.fillStyle='#181B20';pathPoly(ctx,[corners[1],back[1],back[2],corners[2]]);ctx.fill();
    ctx.fillStyle='#3A3D43';pathPoly(ctx,[corners[2],back[2],back[3],corners[3]]);ctx.fill();
    ctx.save();pathPoly(ctx,corners);ctx.clip();
    ctx.fillStyle=card.background||'#FFFFFF';ctx.fill();
    drawTexturedPlane(ctx,tex,(u,v)=>project(transform(u,v)),6,4);
    if(highlight){
      const gradient=ctx.createLinearGradient(corners[0].x,corners[0].y,corners[2].x,corners[2].y);
      gradient.addColorStop(0,'rgba(255,255,255,.075)');gradient.addColorStop(.5,'rgba(255,255,255,0)');gradient.addColorStop(1,'rgba(0,0,0,.055)');
      ctx.fillStyle=gradient;pathPoly(ctx,corners);ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle='rgba(0,0,0,.85)';ctx.lineWidth=.9;pathPoly(ctx,corners);ctx.stroke();
  }
  ctx.restore();
}

/** Call after fonts load or when replacing an image in an existing source key. */
export function clearGeometryCache(){textureCache.clear();}
