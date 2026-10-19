const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../story-gallery.js'),'utf8');
async function setup({failed=false,width=1200}={}) {
  const frames=new Map(),events={},docEvents={},media={},watchers=[];
  let id=0,draws=0,loads=0,dark=0;
  const ctx={setTransform(){},clearRect(){},save(){},restore(){},translate(){},rotate(){},drawImage(){draws++}};
  const canvas=()=>({width:0,height:0,hidden:false,setAttribute(){},getContext:()=>ctx});
  const stage={clientWidth:width,clientHeight:800,append(c){this.canvas=c},getBoundingClientRect:()=>({left:0,top:0})};
  const section={dataset:{textVersion:'v2',motion:'active'},style:{getPropertyValue:()=>dark},querySelector:()=>stage,getBoundingClientRect:()=>({top:0,bottom:1760}),addEventListener(k,f){this[k]=f}};
  const control={dataset:{paused:'false'}};
  const document={hidden:false,querySelector:s=>s==='.narrative'?section:control,createElement:canvas,addEventListener:(k,f)=>docEvents[k]=f};
  const window={innerHeight:800,devicePixelRatio:2,sensumPortfolioPreviews:[{src:'same.png',crop:[0,0,.5,.5]},{src:'same.png',crop:[.5,0,.5,.5]}],addEventListener:(k,f)=>events[k]=f};
  vm.runInNewContext(source,{window,document,Image:class{constructor(){this.naturalWidth=1000;this.naturalHeight=800}set src(v){loads++;queueMicrotask(()=>failed?this.onerror():this.onload())}},
    matchMedia:q=>media[q]??={matches:false,addEventListener(k,f){this.change=f}},
    requestAnimationFrame:f=>{frames.set(++id,f);return id},cancelAnimationFrame:i=>frames.delete(i),
    MutationObserver:class{constructor(f){watchers.push(f)}observe(){}disconnect(){}},queueMicrotask});
  await new Promise(resolve=>setImmediate(resolve));
  const tick=t=>{const f=[...frames.values()];frames.clear();f.forEach(fn=>fn(t))};
  return {stage,section,control,document,events,docEvents,media,frames,tick,get draws(){return draws},get loads(){return loads},sync(){watchers.forEach(f=>f())},dark(v){dark=v;watchers.forEach(f=>f())}};
}
test('images load once and only animate on the dark V2 scene',async()=>{
  const h=await setup();assert.equal(h.loads,1);assert.equal(h.stage.canvas.hidden,true);assert.equal(h.frames.size,0);
  h.dark(1);h.tick(40);assert.ok(h.draws>30);assert.equal(h.frames.size,1);assert.equal(h.stage.canvas.hidden,false);
  const n=h.draws;h.tick(50);assert.equal(h.draws,n,'rendering is capped near 30fps');
  h.section.dataset.textVersion='v1';h.sync();assert.equal(h.frames.size,0);assert.equal(h.stage.canvas.hidden,true);
  h.section.dataset.textVersion='v2';h.sync();assert.equal(h.frames.size,1);
  h.dark(.4);assert.equal(h.frames.size,0,'reverse scroll removes images before the light scene');
});
test('pause, reduced motion, visibility, viewport exit and teardown stop animation',async()=>{
  const h=await setup();h.dark(1);
  h.control.dataset.paused='true';h.sync();assert.equal(h.frames.size,0);
  h.control.dataset.paused='false';h.sync();assert.equal(h.frames.size,1);
  const reduced=h.media['(prefers-reduced-motion: reduce)'];reduced.matches=true;reduced.change();assert.equal(h.frames.size,0);
  reduced.matches=false;reduced.change();h.document.hidden=true;h.docEvents.visibilitychange();assert.equal(h.frames.size,0);
  h.document.hidden=false;h.docEvents.visibilitychange();assert.equal(h.frames.size,1);
  h.section.getBoundingClientRect=()=>({top:-2000,bottom:-1});h.events.scroll();assert.equal(h.frames.size,0);
  h.section.getBoundingClientRect=()=>({top:0,bottom:1760});h.events.scroll();assert.equal(h.frames.size,1);
  h.events.pagehide({persisted:false});assert.equal(h.frames.size,0);
});
test('image failures preserve the scene and mobile uses fewer cards',async()=>{
  const failed=await setup({failed:true});failed.dark(1);assert.equal(failed.frames.size,0);assert.equal(failed.stage.canvas.hidden,true);
  const mobile=await setup({width:390}),desktop=await setup();mobile.dark(1);desktop.dark(1);mobile.tick(40);desktop.tick(40);
  assert.ok(mobile.draws<desktop.draws);assert.ok(desktop.stage.canvas.width*desktop.stage.canvas.height<1803000);
});
