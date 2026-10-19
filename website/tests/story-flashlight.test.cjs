const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('flashlight fades with scroll, aims smoothly, reverses and respects motion controls',()=>{
  const events={},docEvents={},media={},values={},frames=new Map();
  let id=0,time=0,progress=0,mutation;
  const stage={clientHeight:800,getBoundingClientRect:()=>({left:0,top:0,width:1200,height:800,bottom:800})};
  const section={dataset:{textVersion:'v4'},offsetHeight:1760,querySelector:()=>stage,
    style:{setProperty:(k,v)=>values[k]=v},getBoundingClientRect:()=>({top:-960*progress}),addEventListener(k,f){this[k]=f}};
  const control={dataset:{}};
  const document={hidden:false,querySelector:s=>s==='.narrative'?section:control,addEventListener:(k,f)=>docEvents[k]=f};
  vm.runInNewContext(fs.readFileSync('website/story-flashlight.js','utf8'),{
    document,innerHeight:800,window:{addEventListener:(k,f)=>events[k]=f},
    matchMedia:q=>media[q]={matches:false,addEventListener(k,f){this.change=f}},
    requestAnimationFrame:f=>{frames.set(++id,f);return id},cancelAnimationFrame:i=>frames.delete(i),
    MutationObserver:class{constructor(f){mutation=f}observe(){}}
  });
  const tick=()=>{const callbacks=[...frames.values()];frames.clear();time+=16;callbacks.forEach(f=>f(time));};
  const settle=()=>{let n=0;while(frames.size){assert.ok(n++<300);tick();}};
  settle();assert.equal(values['--flashlight-power'],'0.0000');
  for (const p of [.6,.64]) {progress=p;events.scroll();settle();assert.equal(values['--flashlight-power'],'0.0000','light waits for full darkness');}
  progress=.73;events.scroll();settle();assert.equal(values['--flashlight-power'],'0.5000');
  progress=.9;events.scroll();settle();assert.equal(values['--flashlight-power'],'1.0000');
  section.pointermove({pointerType:'mouse',clientX:1000,clientY:300});tick();
  assert.ok(parseFloat(values['--flashlight-angle'])>0&&parseFloat(values['--flashlight-angle'])<18);
  settle();assert.equal(values['--flashlight-angle'],'18.000deg');
  section.pointerleave();settle();assert.equal(values['--flashlight-angle'],'0.000deg');
  section.pointermove({pointerType:'touch',clientX:0,clientY:300});assert.equal(frames.size,0);
  progress=.4;events.scroll();settle();assert.equal(values['--flashlight-power'],'0.0000');
  section.dataset.textVersion='v2';docEvents['sensum-text-version']();assert.equal(frames.size,0);
  section.dataset.textVersion='v4';docEvents['sensum-text-version']();settle();
  media['(prefers-reduced-motion: reduce)'].matches=true;media['(prefers-reduced-motion: reduce)'].change();assert.equal(frames.size,0);
  media['(prefers-reduced-motion: reduce)'].matches=false;
  control.dataset.paused='true';mutation();assert.equal(frames.size,0);
  control.dataset.paused='false';mutation();document.hidden=true;docEvents.visibilitychange();assert.equal(frames.size,0);
});
