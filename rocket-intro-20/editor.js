import {compileTimeline} from './core/timeline.js';

const $ = id => document.getElementById(id);
const clone = value => structuredClone(value);
const STORAGE_KEY = 'rocket-intro-20-edit-v1';
const state = {project:null, original:null, timeline:null, scene:0, layer:0, tab:'layer', time:0, playing:false, muted:false, film:null, audio:null, audioSignature:'', audioId:0, audioReady:false, applyPending:false, applyBusy:false};
let raf = 0, audioContext, source, gain, clockStart = 0, performanceStart = 0, audioPromise = Promise.resolve(), audioResolve, applyTimer, audioTimer, toastTimer, playIntent = 0;
const worker = new Worker('./audio-preview-worker.js', {type:'module'});

function element(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key,value] of Object.entries(attributes)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'checked') node.checked = !!value;
    else if (key === 'value') node.value = value;
    else if (value !== undefined && value !== null) node.setAttribute(key, value);
  }
  for (const child of Array.isArray(children) ? children : [children]) if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}

function toast(message, error = false) {
  $('toast').textContent = message;
  $('toast').style.background = error ? '#ffb09c' : '';
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4200);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  const hundredths = Math.floor((seconds % 1) * 100 + .001);
  return `${String(minutes).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(hundredths).padStart(2,'0')}`;
}

function selectedScene() { return state.project.scenes[state.scene]; }
function selectedLayer() { return selectedScene().layers[state.layer]; }
function resolveColor(value) { return state.project.palette[String(value).replace(/^palette\./,'')] || value || '#ffffff'; }
function validateProject(project) {
  if (!project || !Array.isArray(project.scenes) || !project.scenes.length || !project.palette || !Number.isFinite(project.fps)) throw new Error('This file is not a Rocket film project.');
  if (project.scenes.length > 50 || project.fps <= 0 || project.fps > 240) throw new Error('Unsupported scene count or frame rate.');
  const expectedIds=['launch','orbit','flow','fan','lockup'];
  if(project.scenes.length!==expectedIds.length||project.scenes.some((scene,index)=>scene.id!==expectedIds[index]))throw new Error('Keep the five original scene IDs and their sequence when importing a configuration.');
  for (const scene of project.scenes) {
    if (!Number.isFinite(scene.duration) || scene.duration < 90/project.fps || scene.duration > 120 || !Array.isArray(scene.layers)) throw new Error(`Each scene needs a duration of ${(90/project.fps).toFixed(2)}–120 seconds and a layers array.`);
    for (const layer of scene.layers) {
      for (const key of ['x','y','scale','fontSize','maxWidth','maxHeight']) if (layer[key] !== undefined && !Number.isFinite(layer[key])) throw new Error(`Invalid ${key} in ${layer.name || layer.id}.`);
    }
  }
  compileTimeline(project);
  return project;
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.project)); $('save-state').textContent = 'Saved in this browser'; }
  catch { $('save-state').textContent = 'Export config to save'; }
}

function resizePreview() {
  const width = $('preview-frame-wrap').clientWidth;
  const frame = $('film-frame');
  frame.style.width = `${state.project?.width || 1920}px`;
  frame.style.height = `${state.project?.height || 1080}px`;
  frame.style.transform = `scale(${width / (state.project?.width || 1920)})`;
}

function updateTime() {
  $('timecode').replaceChildren(document.createTextNode(formatTime(state.time)), element('span', {text:`/ ${formatTime(state.timeline.duration)}`}));
  $('scrubber').value = String(state.time);
  $('scrubber').style.background = `linear-gradient(to right, #f0c400 ${100 * state.time / state.timeline.duration}%, #333841 0)`;
}

function seek(seconds) {
  state.time = Math.max(0, Math.min(seconds, Math.max(0,state.timeline.duration - 1/state.timeline.fps)));
  if (state.film) state.film.renderAt(state.time);
  updateTime();
}

function stopAudio() {
  if (source) { try { source.stop(); } catch {} source.disconnect(); source = null; }
}

function pause() {
  playIntent++;
  if (state.playing) {
    state.time = Math.min(state.timeline.duration - 1/state.timeline.fps, audioContext ? audioContext.currentTime - clockStart : (performance.now() - performanceStart)/1000);
  }
  state.playing = false;
  cancelAnimationFrame(raf);
  stopAudio();
  $('play-button').replaceChildren(element('span',{class:'play-glyph','aria-hidden':'true'}));
  $('play-button').setAttribute('aria-label','Play film');
  if (state.timeline) seek(state.time);
}

function animate() {
  if (!state.playing) return;
  const time = audioContext ? audioContext.currentTime - clockStart : (performance.now() - performanceStart)/1000;
  if (time >= state.timeline.duration) { pause(); seek(state.timeline.duration - 1/state.timeline.fps); return; }
  seek(time);
  raf = requestAnimationFrame(animate);
}

async function play() {
  if (state.playing) { pause(); return; }
  if (!state.film || state.applyBusy) return;
  const intent = ++playIntent;
  if (state.time >= state.timeline.duration - 2/state.timeline.fps) seek(0);
  if (!audioContext) {
    try { audioContext = new AudioContext({sampleRate:48000}); gain = audioContext.createGain(); gain.connect(audioContext.destination); }
    catch { toast('Audio preview is unavailable in this browser. Visual playback remains available.', true); }
  }
  if (audioContext) await audioContext.resume();
  if (!state.muted && !state.audioReady) {
    $('preview-status').textContent = 'Preparing synchronized soundtrack…';
    await audioPromise;
  }
  if (intent !== playIntent || state.applyBusy) return;
  stopAudio();
  if (audioContext && state.audio) {
    const data = state.audio;
    const buffer = audioContext.createBuffer(2, data.left.length, data.sampleRate);
    buffer.copyToChannel(data.left,0); buffer.copyToChannel(data.right,1);
    source = audioContext.createBufferSource(); source.buffer = buffer; source.connect(gain);
    gain.gain.value = state.muted ? 0 : Number($('volume').value);
    source.start(0, Math.min(state.time, buffer.duration - .001));
  }
  clockStart = (audioContext?.currentTime || 0) - state.time;
  performanceStart = performance.now() - state.time*1000;
  state.playing = true;
  $('play-button').replaceChildren(element('span',{class:'pause-glyph','aria-hidden':'true'}));
  $('play-button').setAttribute('aria-label','Pause film');
  $('preview-status').textContent = 'Playing · picture + sound in sync';
  animate();
}

function requestAudio() {
  const signature = JSON.stringify({fps:state.timeline.fps,duration:state.timeline.duration,scenes:state.timeline.scenes.map(s=>({id:s.id,start:s.start,duration:s.duration})),cues:state.timeline.cues});
  if (signature === state.audioSignature) return;
  state.audioSignature = signature;
  state.audioReady = false;
  state.audio = null;
  $('audio-status').textContent = 'Rebuilding soundtrack';
  if (audioResolve) audioResolve();
  audioPromise = new Promise(resolve => { audioResolve = resolve; });
  const id = ++state.audioId;
  clearTimeout(audioTimer);
  audioTimer = setTimeout(() => worker.postMessage({type:'synthesize',id,timeline:clone(state.timeline),sampleRate:48000}), 250);
}

worker.addEventListener('message', ({data}) => {
  if (data.id !== state.audioId) return;
  if (data.type === 'audio') {
    state.audio = {left:new Float32Array(data.left),right:new Float32Array(data.right),sampleRate:data.sampleRate};
    state.audioReady = true;
    $('audio-status').textContent = 'Soundtrack ready';
  } else {
    state.audioReady = false;
    $('audio-status').textContent = 'Audio preview unavailable';
    toast(`Audio preview: ${data.message}`,true);
  }
  if (audioResolve) audioResolve();
  audioResolve = null;
});
worker.addEventListener('error', () => {
  $('audio-status').textContent = 'Audio preview unavailable';
  if (audioResolve) audioResolve();
  audioResolve = null;
});

async function flushApply() {
  if (!state.film || state.applyBusy) return;
  state.applyBusy = true;
  try {
    while (state.applyPending) {
      state.applyPending = false;
      const project = clone(state.project);
      $('preview-status').textContent = 'Applying controls…';
      await state.film.applyProject(project);
      resizePreview();
      seek(state.time);
    }
    $('preview-status').textContent = 'Live preview · changes applied';
  } catch (error) {
    $('preview-status').textContent = 'Preview error';
    toast(error.message || String(error),true);
  } finally { state.applyBusy = false; }
}

function changed() {
  pause();
  state.timeline = compileTimeline(state.project);
  state.time = Math.min(state.time, Math.max(0,state.timeline.duration - 1/state.timeline.fps));
  persist();
  renderNavigation();
  renderTimeline();
  requestAudio();
  state.applyPending = true;
  clearTimeout(applyTimer);
  applyTimer = setTimeout(flushApply,90);
}

function setScene(index, movePlayhead = true) {
  pause();
  state.scene = index; state.layer = 0;
  renderNavigation(); renderInspector(); renderTimeline();
  if (movePlayhead) seek(state.timeline.scenes[index].start + Math.min(1.25,state.timeline.scenes[index].duration * .45));
}

function renderNavigation() {
  $('scene-count').textContent = String(state.project.scenes.length).padStart(2,'0');
  $('scene-list').replaceChildren(...state.project.scenes.map((scene,index) => {
    const timing = state.timeline.scenes[index];
    return element('button',{class:`scene-item${index===state.scene?' selected':''}`, 'aria-current':index===state.scene?'true':'false', onclick:()=>setScene(index)},[
      element('span',{class:'scene-number',text:String(index+1).padStart(2,'0')}),
      element('span',{class:'scene-item-copy'},[element('strong',{text:scene.name}),element('small',{text:`${timing.start.toFixed(2)}s — ${timing.end.toFixed(2)}s`})])
    ]);
  }));
  const scene = selectedScene();
  $('layer-count').textContent = String(scene.layers.length).padStart(2,'0');
  const symbols = {text:'T',image:'▧',shape:'◇',points:'⠿',fan:'◈'};
  $('layer-list').replaceChildren(...scene.layers.map((layer,index) => element('div',{class:`layer-row${state.layer===index?' selected':''}${layer.visible===false?' invisible':''}`},[
    element('button',{class:'layer-select',onclick:()=>{state.layer=index;state.tab='layer';renderNavigation();renderInspector();}},[element('span',{class:'layer-symbol',text:symbols[layer.type]||'◇'}),element('span',{text:layer.name||layer.id})]),
    element('button',{class:'visibility-button',text:layer.visible===false?'○':'◉',title:layer.visible===false?'Show layer':'Hide layer','aria-label':`${layer.visible===false?'Show':'Hide'} ${layer.name||layer.id}`,onclick:()=>{layer.visible=layer.visible===false;changed();renderInspector();}})
  ])));
  const timing = state.timeline.scenes[state.scene];
  $('selected-scene-name').textContent = scene.name;
  $('selected-scene-time').textContent = `${timing.start.toFixed(2)}–${timing.end.toFixed(2)} sec · ${timing.duration.toFixed(2)} sec duration · ${scene.layers.length} editable layers`;
}

function renderTimeline() {
  $('project-spec').textContent = `${state.project.width} × ${state.project.height} · ${state.timeline.fps} FPS · ${state.timeline.duration.toFixed(2)} SEC`;
  $('scrubber').max = String(state.timeline.duration);
  $('scrubber').step = String(1/state.timeline.fps);
  $('timeline-scenes').replaceChildren(...state.timeline.scenes.map((scene,index) => {
    const node = element('button',{class:`timeline-scene${state.scene===index?' selected':''}`,title:`${scene.name} · ${scene.duration.toFixed(2)}s`,onclick:()=>setScene(index)},[element('b',{text:String(index+1).padStart(2,'0')}),element('span',{text:scene.name})]);
    node.style.flex = `${scene.duration} 1 0`;
    return node;
  }));
  $('timeline-ticks').replaceChildren(...Array.from({length:6},(_,i)=>element('span',{text:`${(state.timeline.duration*i/5).toFixed(1)}s`})));
  $('timing-note').textContent = Math.abs(state.timeline.duration-20)<.001 ? '20-second delivery · picture + sound linked.' : `Custom timing: ${state.timeline.duration.toFixed(2)}s · audio rebuilt.`;
  updateTime();
}

let fieldId = 0;
function field(label, value, setter, options = {}) {
  const id = `field-${++fieldId}`;
  const type = options.type || 'text';
  let input;
  if (type==='select') {
    input = element('select',{id});
    const choices = [...(options.options||[])];
    if (!choices.some(item=>String(typeof item==='object'?item.value:item)===String(value))) choices.unshift(value);
    input.replaceChildren(...choices.map(item=>element('option',{value:typeof item==='object'?item.value:item,text:typeof item==='object'?item.label:String(item)})));
    input.value = String(value);
  } else if (type==='textarea') input = element('textarea',{id,value,rows:options.rows||3,spellcheck:'false'});
  else input = element('input',{id,type,value:type==='checkbox'?undefined:value,checked:type==='checkbox'?value:undefined,min:options.min,max:options.max,step:options.step,spellcheck:'false'});
  input.addEventListener(type==='select'||type==='checkbox'?'change':'input',()=>{
    let next = input.value;
    if (type==='checkbox') next = input.checked;
    if (type==='number') {
      if (next===''||!Number.isFinite(Number(next))) return;
      next=Number(next);
      if (options.min!==undefined&&next<options.min || options.max!==undefined&&next>options.max) return;
    }
    setter(next); changed();
  });
  return element('div',{class:`field${type==='checkbox'?' checkbox-field':''}`},[element('label',{for:id,text:label}),input]);
}

function colorField(label, object, key) {
  const value = object[key] || 'white';
  const id = `field-${++fieldId}`;
  const resolved = resolveColor(value);
  const picker = element('input',{id,type:'color',value:/^#[0-9a-f]{6}$/i.test(resolved)?resolved:'#ffffff','aria-label':`${label} custom colour`});
  const text = element('input',{type:'text',value,'aria-label':`${label} value`,spellcheck:'false'});
  const select = element('select',{'aria-label':`${label} palette binding`});
  select.append(element('option',{value:'custom',text:'Custom'}),...Object.keys(state.project.palette).map(name=>element('option',{value:name,text:name.charAt(0).toUpperCase()+name.slice(1)})));
  select.value = Object.hasOwn(state.project.palette,String(value).replace(/^palette\./,'')) ? String(value).replace(/^palette\./,'') : 'custom';
  picker.addEventListener('input',()=>{object[key]=picker.value;text.value=picker.value;select.value='custom';changed();});
  text.addEventListener('change',()=>{
    const next=text.value.trim();
    if (!CSS.supports('color',next)&&!Object.hasOwn(state.project.palette,next.replace(/^palette\./,''))) {text.value=object[key];toast('Choose a valid colour or palette token.',true);return;}
    object[key]=next;
    const resolved=resolveColor(next);
    if (/^#[0-9a-f]{6}$/i.test(resolved)) picker.value=resolved;
    select.value=Object.hasOwn(state.project.palette,next.replace(/^palette\./,''))?next.replace(/^palette\./,''):'custom';
    changed();
  });
  select.addEventListener('change',()=>{
    object[key]=select.value==='custom'?picker.value:select.value;
    text.value=object[key];
    const resolved=resolveColor(object[key]);if(/^#[0-9a-f]{6}$/i.test(resolved))picker.value=resolved;
    changed();
  });
  return element('div',{class:'field'},[element('label',{for:id,text:label}),element('div',{class:'color-control'},[picker,text,select])]);
}

function section(title, children) { return element('section',{class:'control-section'},[element('h3',{class:'section-label',text:title}),...children]); }
function row(...children) { return element('div',{class:'field-row'},children); }
function help(text) { return element('p',{class:'field-help',text}); }

function transformControls(object) {
  return [row(field('Position X',object.x??0,v=>object.x=v,{type:'number',step:1}),field('Position Y',object.y??0,v=>object.y=v,{type:'number',step:1})),field('Scale',object.scale??1,v=>object.scale=v,{type:'number',step:.01,min:.01,max:10})];
}

function renderInspector() {
  for (const tab of ['layer','scene','palette']) {
    $(`${tab}-tab`).classList.toggle('active',state.tab===tab);
    $(`${tab}-tab`).setAttribute('aria-selected',String(state.tab===tab));
  }
  const container=$('inspector-content');
  if(state.tab==='palette') { renderPalette(container); return; }
  if(state.tab==='scene') { renderSceneControls(container); return; }
  const layer=selectedLayer();
  if(!layer){container.replaceChildren(element('h2',{text:'No layers'}),element('p',{class:'panel-description',text:'Select a scene containing editable layers.'}));return;}
  const content=[element('h2',{text:layer.name||layer.id}),element('p',{class:'panel-description',text:`${layer.type.toUpperCase()} LAYER · ${selectedScene().name}`}),field('Visible',layer.visible!==false,v=>layer.visible=v,{type:'checkbox'})];
  if(layer.type==='text') {
    content.push(section('COPY & TYPE',[
      field('Text',layer.text||'',v=>layer.text=v,{type:'textarea'}),
      field('Font family',layer.fontFamily||state.project.fonts?.[0]||'Arial',v=>layer.fontFamily=v,{type:'select',options:state.project.fonts||['Arial','Helvetica','sans-serif']}),
      row(field('Font size',layer.fontSize||100,v=>layer.fontSize=v,{type:'number',step:1,min:8,max:600}),field('Weight',layer.fontWeight||700,v=>layer.fontWeight=Number(v),{type:'select',options:[100,200,300,400,500,600,700,800,900]})),
      colorField('Text colour',layer,'color')
    ]));
  } else if(layer.color!==undefined || ['points','shape','fan'].includes(layer.type)) content.push(section('APPEARANCE',[colorField('Layer colour',layer,'color'),...(layer.accent!==undefined?[colorField('Accent colour',layer,'accent')]:[])]));
  if(layer.type==='image') content.push(section('ASSET',[field('Image path',layer.image||layer.src||'',v=>{layer.image=v;layer.src=v;}),help('Use a project-relative path. Keep source assets inside the project folder.')]));
  content.push(section('TRANSFORM',transformControls(layer)));
  if(layer.type==='text') content.push(section('RESPONSIVE CONTAINER',[
    row(field('Max width',layer.maxWidth||1400,v=>layer.maxWidth=v,{type:'number',step:10,min:50,max:4000}),field('Max height',layer.maxHeight||500,v=>layer.maxHeight=v,{type:'number',step:10,min:20,max:2000})),
    help('Text wraps and scales down to fit these bounds. The selected font size is the maximum size.')
  ]));
  if(layer.type==='fan'&&Array.isArray(layer.cards)) {
    content.push(section('FAN CARDS',layer.cards.map((card,index)=>element('details',{class:'card-controls'},[
      element('summary',{text:`${String(index+1).padStart(2,'0')} · ${card.text?.replace(/\n/g,' ')||'Image card'}`}),
      field('Visible',card.visible!==false,v=>card.visible=v,{type:'checkbox'}),
      field('Card text',card.text||'',v=>card.text=v,{type:'textarea',rows:2}),
      colorField('Card colour',card,'color'),
      ...(card.background!==undefined?[colorField('Card background',card,'background')]:[]),
      field('Image path',card.image||'',v=>card.image=v),
      ...transformControls(card)
    ]))));
  }
  container.replaceChildren(...content);
}

function renderSceneControls(container) {
  const scene=selectedScene();
  container.replaceChildren(element('h2',{text:scene.name}),element('p',{class:'panel-description',text:'Scene timing updates all later scenes, music changes, and sound cues.'}),
    field('Scene name',scene.name,v=>scene.name=v),
    field('Duration · seconds',scene.duration,v=>scene.duration=v,{type:'number',step:1/state.project.fps,min:90/state.project.fps,max:120}),
    help(`The supplied delivery is exactly 20 seconds. Minimum scene duration is ${(90/state.project.fps).toFixed(2)}s. Custom timing changes total export length.`),
    section('BACKGROUND',[colorField('Scene background',scene,'background')]),
    section('TIMING',[element('p',{class:'panel-description',text:`Starts at ${state.timeline.scenes[state.scene].start.toFixed(2)}s. Transitions use normalized scene progress so they follow duration changes.`})])
  );
}

function renderPalette(container) {
  const names={black:'Brand black',white:'Canvas white',blue:'Electric blue',orange:'Rocket orange',yellow:'Logo yellow',navy:'Deep navy',cool:'Cool neutral'};
  container.replaceChildren(element('h2',{text:'Brand palette'}),element('p',{class:'panel-description',text:'Palette-bound layers update together. Choose Custom on an individual layer to override its colour.'}),...Object.keys(state.project.palette).map(key=>{
    const value=state.project.palette[key];
    const picker=element('input',{type:'color',value:/^#[0-9a-f]{6}$/i.test(value)?value:'#ffffff','aria-label':`${key} palette colour`});
    const text=element('input',{type:'text',value,'aria-label':`${key} HEX value`,spellcheck:'false'});
    picker.addEventListener('input',()=>{state.project.palette[key]=picker.value;text.value=picker.value;changed();});
    text.addEventListener('change',()=>{if(!/^#[0-9a-f]{6}$/i.test(text.value)){text.value=state.project.palette[key];toast('Enter a six-digit HEX colour, such as #0057FF.',true);return;}state.project.palette[key]=text.value;picker.value=text.value;changed();});
    return element('div',{class:'palette-item'},[element('div',{class:'field'},[element('label',{text:names[key]||key}),element('div',{class:'color-control'},[picker,text])]),help(`Token: ${key}`)]);
  }));
}

function exportConfig() {
  const blob = new Blob([JSON.stringify(state.project,null,2)+'\n'],{type:'application/json'});
  const link = element('a',{href:URL.createObjectURL(blob),download:'rocket-project.json'});
  link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  toast('Configuration exported. Use it with scripts/render.mjs.');
}

async function replaceProject(project) {
  validateProject(project); pause();
  state.project=clone(project);state.scene=0;state.layer=0;state.time=0;
  state.timeline=compileTimeline(state.project);
  renderNavigation();renderTimeline();renderInspector();
  persist();requestAudio();state.applyPending=true;await flushApply();
}

$('play-button').addEventListener('click',()=>play().catch(error=>toast(error.message,true)));
$('back-button').addEventListener('click',()=>{pause();seek(0);});
$('scrubber').addEventListener('pointerdown',pause);
$('scrubber').addEventListener('input',()=>{pause();seek(Number($('scrubber').value));});
$('sound-button').addEventListener('click',()=>{state.muted=!state.muted;$('sound-button').textContent=state.muted?'Sound off':'Sound on';$('sound-button').setAttribute('aria-pressed',String(!state.muted));if(gain)gain.gain.setTargetAtTime(state.muted?0:Number($('volume').value),audioContext.currentTime,.015);});
$('volume').addEventListener('input',()=>{if(gain&&!state.muted)gain.gain.setTargetAtTime(Number($('volume').value),audioContext.currentTime,.015);});
for(const tab of ['layer','scene','palette'])$(`${tab}-tab`).addEventListener('click',()=>{state.tab=tab;renderInspector();});
$('export-button').addEventListener('click',exportConfig);
$('dialog-export').addEventListener('click',exportConfig);
$('import-button').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async()=>{
  const file=$('import-file').files[0];if(!file)return;
  try{await replaceProject(JSON.parse(await file.text()));toast(`Imported ${file.name}`);}catch(error){toast(error.message||'Unable to import project.',true);}
  $('import-file').value='';
});
$('reset-button').addEventListener('click',async()=>{
  if(!confirm('Restore the supplied 20-second project? Export your current configuration first if you want to keep it.'))return;
  await replaceProject(state.original);toast('Restored the original 20-second project.');
});
$('render-button').addEventListener('click',()=>{pause();$('render-dialog').showModal();});
$('dialog-close').addEventListener('click',()=>$('render-dialog').close());
$('render-dialog').addEventListener('click',event=>{if(event.target===$('render-dialog')){const r=$('render-dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('render-dialog').close();}});
document.addEventListener('keydown',event=>{
  if(!state.timeline||event.target.closest('input,select,textarea,[contenteditable]')||$('render-dialog').open)return;
  if(event.code==='Space'){event.preventDefault();play().catch(error=>toast(error.message,true));}
  if(event.code==='ArrowLeft'||event.code==='ArrowRight'){event.preventDefault();pause();seek(state.time+(event.code==='ArrowRight'?1:-1)*(event.shiftKey?1:1/state.timeline.fps));}
});
window.addEventListener('pagehide',()=>{pause();worker.terminate();});
new ResizeObserver(resizePreview).observe($('preview-frame-wrap'));

async function initialize() {
  const response=await fetch('project.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Unable to load project.json. Start the local project server first.');
  state.original=validateProject(await response.json());
  let project=clone(state.original);
  try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved){validateProject(saved);project=saved;}}catch{}
  state.project=project;state.timeline=compileTimeline(project);
  renderNavigation();renderTimeline();renderInspector();resizePreview();requestAudio();
  const frame=$('film-frame');
  await new Promise((resolve,reject)=>{
    let attempts=0;
    const check=()=>{
      try{if(frame.contentWindow.RocketFilm){resolve();return;}}catch{}
      if(++attempts>300){reject(new Error('Composition did not initialize. Check the project server and browser console.'));return;}
      setTimeout(check,100);
    };check();
  });
  state.film=frame.contentWindow.RocketFilm;
  await state.film.ready;
  state.applyPending=true;await flushApply();
  seek(0);$('play-button').disabled=false;
  $('save-state').textContent=JSON.stringify(project)===JSON.stringify(state.original)?'Original project loaded':'Restored browser edit';
  window.RocketEditor={getProject:()=>clone(state.project),getTimeline:()=>clone(state.timeline),seek,play,pause,applyProject:replaceProject,getState:()=>({time:state.time,playing:state.playing,audioReady:state.audioReady,applyBusy:state.applyBusy,scene:state.scene,layer:state.layer})};
}

initialize().catch(error=>{$('preview-status').textContent='Project unavailable';$('save-state').textContent='Check local server';toast(error.message,true);console.error(error);});
