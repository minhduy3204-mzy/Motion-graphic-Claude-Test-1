import React, {useLayoutEffect, useRef} from 'react';
import {cssVariables} from './motion.mjs';
import type {ProjectConfig} from './schema';

type Props={config:ProjectConfig;variables:Record<string,number>;style?:React.CSSProperties};
const Icon=({kind,size=22}:{kind:string;size?:number})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='cursor'?<path d="m5 3 14 10-7 1-3 7z"/>:kind==='frame'?<><path d="M7 2v20M17 2v20M2 7h20M2 17h20"/></>:kind==='text'?<path d="M4 5V3h16v2M12 3v18M8 21h8"/>:kind==='play'?<path d="m8 4 12 8-12 8z"/>:kind==='chevron'?<path d="m9 5 7 7-7 7"/>:kind==='layers'?<><path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/></>:kind==='eye'?<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>:kind==='check'?<path d="m5 12 4 4L19 6"/>:kind==='arrow'?<path d="M3 12h17M13 5l7 7-7 7"/>:<><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12h8M12 8v8"/></>}</svg>;
const BrandMark=({className=''}:{className?:string})=><svg className={className} viewBox="0 0 72 72" fill="none" aria-hidden="true"><path d="M10 12h31l21 24-21 24H10l21-24z" fill="currentColor"/><path d="m34 23 12 13-12 13" stroke="var(--ink)" strokeWidth="7"/></svg>;
const Swap=({before,after,variable='weight-value'}:{before:React.ReactNode;after:React.ReactNode;variable?:string})=><span className="value-swap"><span style={{opacity:`calc(1 - var(--${variable}))`}}>{before}</span><span style={{opacity:`var(--${variable})`}}>{after}</span></span>;

export function fitWorkspaceTitle(root:HTMLElement){
 const probe=root.querySelector<HTMLElement>('.title-probe');if(!probe)return;
 const max=Number(probe.dataset.maxHeight)||286;let factor=1;
 probe.style.fontSize=probe.dataset.maxFont+'px';
 for(let i=0;i<100&&probe.scrollHeight>max;i++){factor*=.965;probe.style.fontSize=(Number(probe.dataset.maxFont)*factor)+'px';}
 root.style.setProperty('--title-fit',String(factor));root.dataset.titleFit=String(factor);
 const wordmark=root.querySelector<HTMLElement>('.brand-wordmark h1');if(wordmark){let brandFit=1;wordmark.style.fontSize='135px';for(let i=0;i<100&&wordmark.scrollWidth>1390;i++){brandFit*=.965;wordmark.style.fontSize=(135*brandFit)+'px';}root.style.setProperty('--brand-fit',String(brandFit));wordmark.style.fontSize='';}
 const button=root.querySelector<HTMLElement>('.site-cta');if(button){const scale=Number(button.dataset.scale)||1;const x=960+(331+button.offsetLeft-960)*1.13-12,y=540+(307+button.offsetTop-540)*1.13+8,w=button.offsetWidth*scale*1.13,h=button.offsetHeight*scale*1.13;root.style.setProperty('--brand-origin-top',y/1080*100+'%');root.style.setProperty('--brand-origin-right',(1920-x-w)/1920*100+'%');root.style.setProperty('--brand-origin-bottom',(1080-y-h)/1080*100+'%');root.style.setProperty('--brand-origin-left',x/1920*100+'%');}
}

export const Workspace:React.FC<Props>=({config:c,variables,style})=>{
 const root=useRef<HTMLDivElement>(null),L=c.layers,p=c.palette;
 useLayoutEffect(()=>{let active=true;const fit=()=>{if(active&&root.current)fitWorkspaceTitle(root.current);};fit();document.fonts.ready.then(fit);return()=>{active=false};},[c]);
 const vars={...cssVariables(variables),'--depth':c.motion.cameraDepth,'--ink':p.ink,'--acid':p.acid,'--ivory':p.ivory,'--coral':p.coral,'--sage':p.sage,'--canvas':p.canvas,'--line':p.line,'--display':c.fonts.display,'--data':c.fonts.data,'--start-size':L.title.initialSize,'--end-size':L.title.finalSize,'--start-weight':L.title.initialWeight,'--end-weight':L.title.finalWeight,'--title-width':L.title.maxWidth,'--title-height':L.title.maxHeight,'--object-x':L.title.x,'--object-y':L.title.y,...style} as React.CSSProperties;
 return <div id="rocket-film" ref={root} style={vars} data-width="1920" data-height="1080">
  <div className="world-grid" data-layout-ignore="true"/>
  <div className="workspace-camera" data-layout-allow-occlusion="true" data-layout-allow-overflow="true">
   <div className="workspace" data-document={c.copy.document}>
    <header className="app-bar">
     <div className="app-identity"><BrandMark/><strong>{c.brand.appName}</strong><span className="beta-tag">WORKSPACE</span></div>
     <div className="document-name"><span className="status-dot"/>{c.copy.document}<span className="document-chevron down-icon"><Icon kind="chevron" size={17}/></span></div>
     <div className="top-actions"><span className="avatar">RG</span><span className="share-button">Share</span></div>
    </header>
    <div className="toolbar">
     <div className="tool-group"><span className="tool selected-tool"><Icon kind="cursor"/></span><span className="tool"><Icon kind="frame"/></span><span className="tool text-tool"><Icon kind="text"/></span><span className="tool"><Icon kind="add"/></span><span className="tool-divider"/><span className="tool-caption">Design</span></div>
     <div className="toolbar-center"><span className="save-icon"><Icon kind="check" size={18}/></span>{c.copy.status}</div>
     <div className="tool-group"><span className="zoom-readout">100% <small className="down-icon"><Icon kind="chevron" size={14}/></small></span><span className="preview-button" data-action="preview"><Icon kind="play" size={18}/><Swap before="Preview" after="Presenting" variable="preview"/></span></div>
    </div>
    <aside className="left-sidebar">
     <div className="sidebar-tabs"><strong>Layers</strong><span>Assets</span><span className="sidebar-plus">+</span></div>
     <div className="section-caption">PAGES <span>+</span></div>
     <div className="page-row"><Icon kind="frame" size={19}/>{c.ui.page}<span>1</span></div>
     <div className="section-caption section-layers">DOCUMENT <span><Icon kind="layers" size={17}/></span></div>
     <div className="layer-tree">
      <div className="tree-row parent-row"><span className="down-icon"><Icon kind="chevron" size={14}/></span><Icon kind="frame" size={18}/><span>Desktop</span><span className="tree-eye"><Icon kind="eye" size={16}/></span></div>
      <div className="tree-row"><span className="tree-indent"/><Icon kind="frame" size={17}/><span>Navigation</span></div>
      <div className="tree-row title-row" data-object={c.ui.selectedObject}><span className="row-active"/><span className="tree-indent"/><Icon kind="text" size={18}/><span>{c.ui.selectedObject}</span><span className="tree-eye"><Icon kind="eye" size={16}/></span></div>
      <div className="tree-row"><span className="tree-indent"/><Icon kind="text" size={17}/><span>{c.ui.copyLayer}</span></div>
      <div className="tree-row"><span className="tree-indent"/><Icon kind="frame" size={17}/><span>{c.ui.ctaLayer}</span></div>
      <div className="tree-row"><span className="tree-indent"/><Icon kind="layers" size={17}/><span>{c.ui.artLayer}</span></div>
     </div>
     <div className="sidebar-bottom"><div className="library-thumb"><BrandMark/><span>Rocket / Core</span></div><div className="library-note">Brand library <span className="diagonal-icon"><Icon kind="arrow" size={17}/></span></div><span className="file-format">WEB · 1180 × 650</span></div>
    </aside>
    <main className="canvas-stage">
     <div className="ruler ruler-x" data-layout-ignore="true">{Array.from({length:14},(_,i)=><span key={i}>{i*100}</span>)}</div>
     <div className="ruler ruler-y" data-layout-ignore="true">{Array.from({length:8},(_,i)=><span key={i}>{i*100}</span>)}</div>
     <div className="artboard-caption"><span>{c.copy.artboard}</span><span>1180 × 650</span></div>
     <div className="artboard" data-document-layer="Website artboard">
      <nav className="site-nav"><div className="site-brand"><BrandMark/><span>{c.brand.company}</span></div><div className="site-links"><span>Work</span><span>Expertise</span><span>Contact <Icon kind="arrow" size={16}/></span></div></nav>
      <div className="hero-eyebrow">{c.copy.eyebrow}</div>
      <div className="title-object" data-document-layer="Hero / Title" data-object={c.ui.selectedObject} style={{left:L.title.x,top:L.title.y,maxWidth:L.title.maxWidth,scale:L.title.scale,opacity:L.title.visible?1:0}}>
       <div className="hero-title">{c.copy.title}</div>
       <div className="selection-frame" data-selection={c.ui.selectedObject}><span className="selection-label">{c.ui.selectedObject}</span><i/><i/><i/><i/><b className="anchor-point"/><span className="dimension-label"><Swap before={`${L.title.initialSize}px · ${L.title.initialWeight}`} after={`${L.title.finalSize}px · ${L.title.finalWeight}`}/></span></div>
      </div>
      <div className="title-probe" data-layout-ignore="true" data-max-font={L.title.finalSize} data-max-height={L.title.maxHeight} style={{width:L.title.maxWidth,fontWeight:L.title.finalWeight,fontFamily:c.fonts.display}}>{c.copy.title}</div>
      <div className="hero-subtitle" data-document-layer="Supporting copy" style={{left:L.subtitle.x,top:L.subtitle.y,scale:L.subtitle.scale,opacity:L.subtitle.visible?1:0}}>{c.copy.subtitle}</div>
      <div className="site-cta" data-document-layer="Launch CTA" data-scale={L.button.scale} style={{left:L.button.x,top:L.button.y,scale:L.button.scale,opacity:L.button.visible?1:0}}><span>{c.copy.websiteCta}</span><Icon kind="arrow" size={22}/></div>
      <div className="directional-art" data-document-layer="Directional form" style={{left:L.art.x,top:L.art.y,scale:L.art.scale,opacity:L.art.visible?1:0}}>
       <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
       <div className="ribbon-sculpture"><svg viewBox="0 0 350 380" aria-hidden="true"><path d="M36 20h160l126 170-126 170H36l126-170z" fill="var(--coral)"/><path d="M36 20v35l101 136L36 326v34l126-170z" fill="color-mix(in srgb,var(--coral) 64%,var(--ink))"/><path d="m196 20 126 170-126 170 62-170z" fill="color-mix(in srgb,var(--coral) 68%,var(--ivory))"/><path d="M76 76h94l83 114-83 114H76l84-114z" fill="var(--acid)"/><path d="m170 76 83 114-83 114 38-114z" fill="color-mix(in srgb,var(--acid) 82%,var(--ink))"/><path d="M76 76v22l67 92-67 92v22l84-114z" fill="color-mix(in srgb,var(--acid) 60%,var(--ink))"/></svg></div>
       <div className="art-label">FORWARD / ALWAYS <span className="diagonal-icon"><Icon kind="arrow" size={21}/></span></div>
      </div>
      <div className="alignment-guide guide-x" data-layout-ignore="true"/><div className="alignment-guide guide-y" data-layout-ignore="true"/>
     </div>
     <div className="canvas-status"><span><i/> Desktop</span><span>Design at your own pace.</span></div>
    </main>
    <aside className="properties-panel">
     <div className="properties-tabs"><strong>Design</strong><span>Prototype</span><span className="diagonal-icon"><Icon kind="arrow" size={18}/></span></div>
     <div className="inspector-title"><Icon kind="text"/><strong>{c.ui.selectedObject}</strong><span className="inspector-selected"><Icon kind="check" size={17}/></span></div>
     <div className="property-block layout-block"><div className="property-heading">Layout <Icon kind="frame" size={16}/></div><div className="position-fields"><span><small>X</small>{L.title.x}</span><span><small>Y</small>{L.title.y}</span></div><div className="position-fields"><span><small>W</small>Auto</span><span><small>H</small>Auto</span></div></div>
     <div className="property-block typography-block"><div className="property-heading">Typography <Icon kind="text" size={16}/></div><div className="font-field">{c.fonts.display}<span className="down-icon"><Icon kind="chevron" size={15}/></span></div><div className="weight-preset"><span className="preset-light"><small>Aa</small>Light</span><span className="preset-bold" data-action="weight"><small>Aa</small>Bold</span></div><div className="position-fields type-values"><span><small>SIZE</small><Swap before={L.title.initialSize} after={L.title.finalSize}/></span><span><small>WGHT</small><Swap before={L.title.initialWeight} after={L.title.finalWeight}/></span></div><div className="type-detail"><span>Auto height</span><span>−4%</span></div></div>
     <div className="property-block fill-block"><div className="property-heading">Fill <span>+</span></div><div className="fill-current"><i/><Swap before={p.sage.slice(1)} after={p.acid.slice(1)} variable="fill-value"/><span>100%</span></div><div className="color-palette"><span style={{background:p.ivory}}/><span style={{background:p.coral}}/><span data-action="fill" className="active-fill" style={{background:p.acid}}/><span style={{background:p.ink}}/></div><div className="fill-caption">Rocket / Brand colors</div></div>
     <div className="property-block export-block"><div className="property-heading">Export <span>+</span></div></div>
     <div className="inspector-footer"><span className="status-dot"/> Components stay connected</div>
    </aside>
    <div className="workspace-cursor" data-layout-ignore="true"><svg viewBox="0 0 40 48"><path d="m4 3 30 23-14 2-6 16z" fill="var(--ivory)" stroke="var(--ink)" strokeWidth="2.4"/></svg><span className="cursor-person">You</span><i className="cursor-click"/></div>
   </div>
  </div>
  <div className="brand-plane">
   <div className="brand-content"><div className="brand-kicker">{c.brand.company} / INTRODUCING</div><div className="brand-wordmark"><BrandMark/><h1>{c.brand.appName}</h1></div><p>{c.brand.tagline}</p><div className="brand-action"><span>{c.brand.cta}</span><Icon kind="arrow" size={34}/></div><span className="brand-url">{c.brand.url}</span><div className="brand-corner">ONE CANVAS. FORWARD MOTION.</div></div>
  </div>
 </div>;
};
