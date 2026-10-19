const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../text-disintegration.js'),'utf8');
function setup({noGL=false,shaderFail=false,reduced=false,width=300,height=220,fullInk=false,openingOnly=false}={}) {
  let rafId=0, progress=0, lastTween, mask, points, disposed=false, clock=0;
  const uniforms={};
  const frames=new Map(),events={},docEvents={},media={},glCalls=[],mutations=[];
  const rect=(x,y,w,h)=>({left:x,top:y,width:w,height:h,bottom:y+h,right:x+w});
  const stage={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>rect(0,0,width,height),append(c){this.canvas=c}};
  const chars=[{textContent:'A',getBoundingClientRect:()=>rect(35,70,30,72)},{textContent:'I',getBoundingClientRect:()=>rect(65,70,16,72)}];
  const paragraph={closest:()=>stage,querySelectorAll:()=>chars,getBoundingClientRect:()=>rect(35,70,100,72)};
  const scene={clientHeight:height};
  const values={};
  const section={addEventListener(k,f){this[k]=f},style:{setProperty:(k,v)=>values[k]=v,removeProperty:k=>delete values[k]},dataset:{textVersion:'v2',openingOnly:String(openingOnly)},offsetHeight:height*2.2,getBoundingClientRect:()=>rect(0,-progress*.62*height*1.2,width,height*2.2),querySelector:s=>s==='.point-of-view__text'?paragraph:scene};
  const control={dataset:{}};
  const buttons=['v1','v2','v3','v4'].map(v=>({dataset:{textVersionChoice:v},attrs:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,f){this[k]=f}}));
  const switcher={hidden:true,querySelectorAll:()=>buttons};
  const canvas={width:0,height:0,setAttribute(){},events:{},addEventListener(k,f){this.events[k]=f},getContext:()=>noGL?null:gl};
  const raster={width:0,height:0,getContext:()=>ctx};
  const fills=[];
  const ctx={scale(){},measureText:()=>({fontBoundingBoxAscent:44,fontBoundingBoxDescent:12}),fillText:(s,x,y)=>fills.push({s,x,y}),getImageData(x,y,w,h){
    const data=new Uint8ClampedArray(w*h*4);
    for(let j=0;j<h;j++) for(let i=0;i<w;i++) if(fullInk || (i>=35&&i<55&&j>=82&&j<126)) data[(j*w+i)*4+3]=255;
    return {data};
  }};
  const gl=new Proxy({
    createProgram:()=>({}),createShader:()=>({}),getShaderParameter:()=>!shaderFail,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:(p,n)=>n,
    createBuffer:()=>({}),createTexture:()=>({}),getParameter:()=>8192,
    bufferData(t,data){if(data.length>12)points=data},texImage2D(...args){mask=args.at(-1)},
    uniform1f(k,v){uniforms[k]=v},drawArrays(...args){glCalls.push(args)},deleteProgram(){disposed=true},deleteBuffer(){disposed=true},deleteTexture(){disposed=true}
  },{get(o,k){return k in o?o[k]:k.toUpperCase()===k?k:()=>{}}});
  const document={hidden:false,querySelector:s=>s==='.narrative'?section:s==='.text-version-switcher'?switcher:control,
    createElement:()=>stage.canvas?raster:canvas,addEventListener:(k,f)=>docEvents[k]=f,dispatchEvent(e){docEvents[e.type]?.(e)}};
  const gsap={registerPlugin(){},fromTo(state,from,to){
    const tr={progress,start:0,refresh(){this.progress=progress;to.scrollTrigger.onRefresh?.()},kill(){this.killed=true}};
    lastTween={scrollTrigger:tr,config:to,kill(){this.killed=true},progress(p){progress=p;tr.progress=p;state.progress=to.ease(p);to.onUpdate();return this}};
    return lastTween;
  }};
  const window={gsap,ScrollTrigger:{},devicePixelRatio:1,innerHeight:height,addEventListener:(k,f)=>events[k]=f};
  vm.runInNewContext(source,{document,window,Event:class{constructor(type){this.type=type}},getComputedStyle:()=>({font:'500 57px Google Sans',fontStyle:'normal',fontWeight:'500',fontSize:'57px',fontFamily:'Google Sans',lineHeight:'72px',color:'rgb(26, 37, 48)'}),
    matchMedia:q=>media[q]??=( {matches:q.includes('reduced')&&reduced,addEventListener(k,f){this.change=f}} ),
    requestAnimationFrame:f=>{frames.set(++rafId,f);return rafId},cancelAnimationFrame:id=>frames.delete(id),
    MutationObserver:class{constructor(f){mutations.push(f)}observe(){}},Uint8ClampedArray,Float32Array});
  const tick=()=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(clock+=40))};tick();
  return {uniforms,values,section,control,buttons,switcher,canvas,fills,frames,events,docEvents,media,glCalls,tick,
    get mask(){return mask},get points(){return points},get tween(){return lastTween},get disposed(){return disposed},
    scroll(p){lastTween.progress(p);tick()},pause(value){control.dataset.paused=String(value);mutations.forEach(f=>f());tick()}};
}
test('glyph samples preserve placement and share exact release times with the erosion mask',()=>{
  const h=setup();assert.equal(h.switcher.hidden,false);assert.equal(h.section.dataset.textParticles,'idle');
  assert.deepEqual(h.fills[0],{s:'A',x:35,y:122});assert.ok(h.points.length>0);
  for(let i=0;i<h.points.length;i+=4){const x=h.points[i],y=h.points[i+1],release=h.points[i+3];assert.ok(x>=35&&x<55&&y>=82&&y<126);assert.ok(Math.abs(h.mask[(Math.floor(y)*300+Math.floor(x))*4]/255-release)<1e-6)}
});
test('peeling starts after the entrance reveal and readable hold, reverses and switches without changing scroll position',()=>{
  const h=setup();assert.equal(h.tween.config.scrollTrigger.scrub,.3);assert.equal(h.tween.config.scrollTrigger.pin,undefined,'existing CSS pin is reused');
  assert.equal(h.tween.config.scrollTrigger.start,'top top','entrance reveal finishes before the peeling timeline starts');
  assert.equal(h.tween.config.scrollTrigger.end(),`top+=${(h.section.offsetHeight-220)*.62} top`,'restore the compact reference scroll timing');
  assert.equal(h.section.dataset.textSampling,undefined,'glyph measurement restores the entrance transforms');
  h.scroll(.1);assert.equal(h.section.dataset.textParticles,'idle');h.scroll(.65);assert.equal(h.section.dataset.textParticles,'active');assert.ok(h.glCalls.length>=2);
  h.scroll(1/.62);const count=h.glCalls.length;assert.equal(h.section.dataset.textParticles,'active');h.tick();assert.ok(h.glCalls.length>count,'formed ring continues its gentle ambient movement');
  h.scroll(0);assert.equal(h.section.dataset.textParticles,'idle');h.scroll(.8);
  const old=h.tween;h.buttons[0].click();assert.equal(h.section.dataset.textVersion,'v1');assert.equal(h.section.dataset.textParticles,'idle');assert.ok(old.killed&&old.scrollTrigger.killed);
  h.buttons[1].click();h.tick();assert.equal(h.section.dataset.textVersion,'v2');assert.equal(h.section.dataset.textParticles,'active');assert.equal(h.tween.scrollTrigger.progress,.8);
});
test('reduced motion, no WebGL, shader failure and pause preserve readable DOM fallback',()=>{
  for(const options of [{reduced:true},{noGL:true},{shaderFail:true}]){const h=setup(options);assert.equal(h.section.dataset.textParticles,'idle');assert.equal(h.frames.size,0)}
  const h=setup();h.scroll(.8);h.pause(true);assert.equal(h.section.dataset.textParticles,'idle');h.pause(false);assert.equal(h.section.dataset.textParticles,'active');
});
test('context restoration, resize and teardown preserve state and release resources',()=>{
  const h=setup();h.scroll(.8);h.canvas.events.webglcontextlost({preventDefault(){}});assert.equal(h.section.dataset.textParticles,'idle');
  h.canvas.events.webglcontextrestored();h.tick();assert.equal(h.section.dataset.textParticles,'active');h.events.resize();h.tick();assert.equal(h.tween.scrollTrigger.progress,.8);
  h.events.pagehide({persisted:false});assert.ok(h.disposed);assert.equal(h.frames.size,0);
});
test('adaptive sampling keeps mobile and desktop point budgets bounded',()=>{
  for(const [width,height,budget] of [[390,500,20000],[900,500,48000]]){const h=setup({width,height,fullInk:true});assert.ok(h.points.length/4<=budget);assert.ok(h.canvas.width*h.canvas.height<=2402000)}
});

test('independent ring appears after dissolution and hides on reverse',()=>{
  const h=setup();h.scroll(.1);assert.equal(h.values['--ring-formed'],'0.0000');
  h.scroll(.78/.62);const partial=Number(h.values['--ring-formed']);assert.ok(partial>0&&partial<1);
  const before=h.glCalls.length;h.scroll(1/.62);assert.ok(h.glCalls.length>before,'independent ring pass still renders');
  assert.equal(h.values['--ring-formed'],'1.0000');assert.equal(h.glCalls.at(-1)[0],'POINTS');
  h.scroll(0);assert.equal(h.section.dataset.textParticles,'idle');assert.equal(h.values['--ring-formed'],'0.0000');
  h.buttons[0].click();assert.equal(h.values['--ring-formed'],undefined);
});

test('formed ring animates, reacts locally to pointer hover, settles and stops when paused',()=>{
  const h=setup();h.scroll(1/.62);const before=h.uniforms.u_time;h.tick();assert.ok(h.uniforms.u_time>before);
  h.section.pointermove({pointerType:'mouse',clientX:251,clientY:110});
  for(let i=0;i<20;i++)h.tick();assert.ok(h.uniforms.u_hover>.9);
  h.section.pointerleave();for(let i=0;i<30;i++)h.tick();assert.ok(h.uniforms.u_hover<.01);
  h.scroll(0);h.tick();assert.equal(h.frames.size,0,'no animation while original text is at rest');
  h.scroll(1);h.pause(true);assert.equal(h.frames.size,0);
});

test('independent dotted ring traces alongside the closing text, after the text particles disappear',()=>{
  const h=setup();
  const atStory=p=>h.scroll(p/.62);
  atStory(.45);assert.ok(h.uniforms.u_textOpacity>0);
  assert.equal(h.uniforms.u_ringReveal,0);
  atStory(.62);assert.equal(h.uniforms.u_textOpacity,0);assert.equal(h.uniforms.u_ringReveal,0);
  const count=h.glCalls.length;h.tick();assert.equal(h.glCalls.length,count);
  atStory(.65);assert.equal(h.uniforms.u_ringReveal,0);
  atStory(.785);const halfway=h.uniforms.u_ringReveal;assert.ok(Math.abs(halfway-.5)<1e-6);
  assert.equal(h.uniforms.u_textOpacity,0);
  atStory(.93);assert.equal(h.uniforms.u_ringReveal,1);
  atStory(.785);assert.equal(h.uniforms.u_ringReveal,halfway);
  atStory(.62);assert.equal(h.uniforms.u_ringReveal,0);
  atStory(.45);assert.ok(h.uniforms.u_textOpacity>0);
});

test('actual glyph cells release left to right',()=>{
  const h=setup({fullInk:true});
  const left=[],right=[];
  for(let i=0;i<h.points.length;i+=4){
    if(h.points[i]<35)left.push(h.points[i+3]);
    if(h.points[i]>135)right.push(h.points[i+3]);
  }
  assert.ok(left.length&&right.length);
  assert.ok(Math.max(...left)<Math.min(...right));
});

test('ring has its own responsive particle budget independent of glyph coverage',()=>{
  for(const [width,height,limit] of [[390,700,65000],[1440,900,180000]]){
    const h=setup({width,height});h.scroll(1/.62);
    const ringDraw=h.glCalls.at(-1);
    assert.equal(ringDraw[0],'POINTS');
    assert.ok(ringDraw[2]>=16000&&ringDraw[2]<=limit);
    assert.ok(ringDraw[2]>h.points.length/4,'ring density does not depend on the few sampled letters');
    h.events.pagehide({persisted:false});assert.equal(h.frames.size,0);
  }
});


test('V3 shares V2 particles and switches at the current scroll position',()=>{
  const h=setup();h.scroll(.78/.62);
  const reveal=h.values['--ring-formed'];
  h.buttons[2].click();h.tick();
  assert.equal(h.section.dataset.textVersion,'v3');
  assert.equal(h.buttons[2].attrs['aria-pressed'],'true');
  assert.equal(h.buttons[1].attrs['aria-pressed'],'false');
  assert.equal(h.values['--ring-formed'],reveal);
  assert.equal(h.section.dataset.textParticles,'active');
  h.scroll(0);assert.equal(h.section.dataset.textParticles,'idle');
  h.buttons[1].click();h.tick();assert.equal(h.section.dataset.textVersion,'v2');
});

test('V4 retains text dissolution but does not draw the ring',()=>{
  const h=setup();h.scroll(.7);h.buttons[3].click();h.tick();
  assert.equal(h.section.dataset.textVersion,'v4');
  assert.equal(h.section.dataset.textParticles,'active');
  h.scroll(1/.62);assert.equal(h.values['--ring-formed'],'0.0000');
  h.tick();assert.equal(h.frames.size,0,'no ambient ring loop in flashlight mode');
  h.buttons[1].click();h.tick();assert.equal(h.values['--ring-formed'],'1.0000');
});

test('opening-only restores reversible particle exit without ring or version switcher',()=>{
  const h=setup({openingOnly:true});
  assert.equal(h.switcher.hidden,true);
  assert.equal(h.section.dataset.openingParticles,'active');
  assert.equal(h.tween.config.scrollTrigger.end(),`top+=${220*.85*.95} top`);
  h.scroll(.1);assert.equal(h.section.dataset.textParticles,'idle');
  h.scroll(.7);assert.equal(h.section.dataset.textParticles,'active');
  h.scroll(1);assert.equal(h.uniforms.u_ringReveal,0);
  h.scroll(0);assert.equal(h.section.dataset.textParticles,'idle');
  h.pause(true);assert.equal(h.section.dataset.openingParticles,undefined);
  for(const options of [{reduced:true},{noGL:true},{shaderFail:true}]) {
    const fallback=setup({openingOnly:true,...options});
    assert.equal(fallback.section.dataset.openingParticles,undefined);
    assert.equal(fallback.switcher.hidden,true);
  }
});

test('extending the shared stage for photos does not slow the original text dissolution',()=>{
  const h=setup({openingOnly:true});
  const end=h.tween.config.scrollTrigger.end();
  h.section.offsetHeight=220*3.05;
  assert.equal(h.tween.config.scrollTrigger.end(),end);
  assert.equal(h.values['--opening-stage-height'],'220px');
});
