const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup({reduced=false,shared=false}={}) {
  const frames=new Map(), events={}, docEvents={}, media={}, values={};
  let top=576, time=0, id=0, mutations=[];
  const style=()=>({transform:'',setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}});
  const element=()=>({children:[],attrs:{},style:style(),setAttribute(k,v){this.attrs[k]=v},append(child){this.children.push(child)},replaceChildren(...children){this.children=children}});
  const messages=['Sensum helps you make better product decisions.','You can invest in the right ideas and focus on revenue.'].map(text=>Object.assign(element(),{textContent:text}));
  const positions=[[50,128,150,166],[650,-32,180,183],[790,480,155,149],[150,160,220,125],[800,408,225,160],[220,624,215,150]];
  const items=['flowers','window','keyboard','direction','review','outcomes'].map((name,i)=>({dataset:{float:name},style:style(),offsetLeft:positions[i][0],offsetTop:positions[i][1],offsetWidth:positions[i][2],offsetHeight:positions[i][3]}));
  const stage={clientWidth:1000,clientHeight:800};
  const narrative={dataset:{openingParticles:'active'},getBoundingClientRect:()=>({top,bottom:top+2440})};
  const section={dataset:{},closest:()=>shared?narrative:null,offsetHeight:1760,querySelector:()=>stage,querySelectorAll:s=>s==='[data-float]'?items:messages,
    style:{setProperty:(k,v)=>values[k]=v,removeProperty:k=>delete values[k]},getBoundingClientRect:()=>({top,bottom:top+1760})};
  const control={dataset:{}};
  const document={hidden:false,createElement:element,createTextNode:text=>({textContent:text}),querySelector:s=>s==='.photo-story'?section:control,addEventListener:(k,f)=>docEvents[k]=f};
  vm.runInNewContext(fs.readFileSync('website/text-motion.js','utf8') + '\n' + fs.readFileSync('website/photo-story.js','utf8'),{document,innerHeight:800,
    window:{addEventListener:(k,f)=>events[k]=f},matchMedia:q=>media[q]={matches:q.includes('reduced')&&reduced,addEventListener(k,f){this.change=f}},
    requestAnimationFrame:f=>{frames.set(++id,f);return id},cancelAnimationFrame:i=>frames.delete(i),
    MutationObserver:class{constructor(f){mutations.push(f)}observe(){}}});
  function settle(){let n=0;while(frames.size){assert.ok(n++<300);const callbacks=[...frames.values()];frames.clear();time+=16;callbacks.forEach(f=>f(time));}}
  settle();
  return {section,narrative,stage,items,messages,values,frames,control,document,events,docEvents,media,settle,
    at(p){this.move(p);settle()},
    move(p){top=shared?-(480+p*1040):576-p*1536;events.scroll()},
    tick(){const callbacks=[...frames.values()];frames.clear();time+=16;callbacks.forEach(f=>f(time))},
    pause(v){control.dataset.paused=String(v);mutations.forEach(f=>f());settle()}};
}
test('photos grow into view, drift independently, and reverse to identical positions',()=>{
  const h=setup();assert.equal(h.section.dataset.motion,'active');
  const initial=h.items.map(i=>i.style.transform);
  h.at(.4);const middle=h.items.map(i=>i.style.transform);
  assert.notDeepEqual(middle,initial);assert.equal(h.values['--photo-first'],'1.0000');
  assert.equal(h.values['--photo-second'],'0.0000');
  h.at(.9);assert.equal(h.values['--photo-first'],'0.0000');assert.equal(h.values['--photo-second'],'1.0000');
  assert.notDeepEqual(h.items.map(i=>i.style.transform),middle);
  h.at(.4);assert.deepEqual(h.items.map(i=>i.style.transform),middle);
  assert.equal(h.frames.size,0,'settled composition does not render continuously');
});
test('pause, reduced motion, hidden tab and offscreen states stop animation',()=>{
  const staticView=setup({reduced:true});assert.equal(staticView.section.dataset.motion,'static');assert.equal(staticView.frames.size,0);
  const h=setup();h.at(.7);h.pause(true);assert.equal(h.section.dataset.motion,'static');
  assert.ok(h.items.every(i=>!i.style.transform));assert.equal(h.values['--photo-second'],undefined);
  h.pause(false);assert.equal(h.values['--photo-second'],'0.1983');
  h.document.hidden=true;h.docEvents.visibilitychange();assert.equal(h.frames.size,0);
  h.document.hidden=false;h.docEvents.visibilitychange();h.settle();
  h.at(2);assert.equal(h.frames.size,0);
});

test('shared viewport gently reveals substantial fragments after dissolution',()=>{
  const h=setup({shared:true});
  assert.equal(h.values['--photo-enter'],'0.0000');
  assert.ok(h.items.every(i=>i.style.opacity==='0.0000'));
  assert.ok(h.items.every(i=>i.style.transform.endsWith('scale(0.7200)')));
  h.at(.1);
  const arriving=h.items.map(i=>i.style.transform);
  assert.equal(h.values['--photo-enter'],'0.5000');
  assert.ok(h.items.some(i=>Number(i.style.opacity)>0&&Number(i.style.opacity)<1));
  h.at(.45);
  assert.ok(h.items.every(i=>i.style.transform.endsWith('scale(1.0000)')));
  assert.equal(h.values['--photo-first'],'1.0000');
  assert.equal(h.values['--photo-second'],'0.0000');
  h.at(.9);assert.equal(h.values['--photo-second'],'1.0000');
  h.at(.1);assert.deepEqual(h.items.map(i=>i.style.transform),arriving);
  h.at(0);assert.equal(h.values['--photo-enter'],'0.0000');
  assert.equal(h.frames.size,0);
  h.pause(true);assert.equal(h.section.dataset.motion,'static');
  assert.equal(h.values['--photo-enter'],undefined);
  assert.ok(h.items.every(i=>i.style.opacity===undefined));
});

test('the first scroll tick after resting eases into the entrance instead of jumping',()=>{
  const h=setup({shared:true});
  h.at(0);
  h.move(.2);h.tick();
  const first=Number(h.items[0].style.opacity);
  assert.ok(first>0&&first<.1,'first wheel tick only begins the reveal');
  h.settle();
  assert.equal(h.items[0].style.opacity,'1.0000');
  const settled=h.items[0].style.transform;
  h.move(.3);h.tick();
  const tick=h.items[0].style.transform;
  assert.notEqual(tick,settled);
  h.settle();assert.notEqual(h.items[0].style.transform,tick);
  h.at(0);assert.ok(h.items.every(i=>i.style.opacity==='0.0000'));
});

test('photos orbit clockwise around the text while staying upright and keeping their distance',()=>{
  const h=setup({shared:true});
  function position(item) {
    const match=item.style.transform.match(/translate3d\(([-\d.]+)px,([-\d.]+)px,0\)/);
    assert.ok(match,'orbit uses measured pixel offsets');
    assert.ok(!item.style.transform.includes('rotate('),'photo itself stays upright');
    return [(item.offsetLeft+item.offsetWidth/2+Number(match[1])-h.stage.clientWidth/2)/(h.stage.clientWidth/2),
      (item.offsetTop+item.offsetHeight/2+Number(match[2])-400)/400];
  }
  h.at(.08);const start=h.items.map(position);
  h.at(.45);const middle=h.items.map(position);
  for(let i=0;i<start.length;i++) {
    const a=start[i],b=middle[i];
    assert.ok(a[0]*b[1]-a[1]*b[0]>0,'clockwise motion rather than straight-line entry');
    assert.ok(Math.abs(Math.hypot(...a)-Math.hypot(...b))<.00001,'orbit preserves the clear center');
  }
  h.stage.clientWidth=390;
  h.items.forEach(item=>{item.offsetLeft*=.39;item.offsetWidth*=.39;});
  h.events.resize();h.settle();
  h.items.map(position).forEach((p,i)=>{
    assert.ok(Math.abs(p[0]-middle[i][0])<.00001);
    assert.ok(Math.abs(p[1]-middle[i][1])<.00001);
  });
});

test('both photo messages reveal letters in reading order using the preceding text feather',()=>{
  const h=setup({shared:true});
  const chars=i=>h.messages[i].children[1].children.flatMap(word=>word.children??[]);
  const values=i=>chars(i).map(char=>char.style['--reveal']);
  h.at(0);assert.ok(values(0).every(v=>v===0));assert.ok(values(1).every(v=>v===0));
  h.at(.14);
  const midway=values(0);
  assert.equal(midway[0],1);assert.equal(midway.at(-1),0);
  assert.ok(midway.some(v=>v>0&&v<1));
  assert.ok(midway.every((v,i)=>!i||v<=midway[i-1]));
  h.at(.4);assert.ok(values(0).every(v=>v===1));
  assert.ok(values(1).every(v=>v===0));
  h.at(.77);assert.equal(values(1)[0],1);assert.equal(values(1).at(-1),0);
  h.at(.9);assert.ok(values(1).every(v=>v===1));
  h.at(.14);assert.deepEqual(values(0),midway);
  h.messages.forEach(message=>{
    assert.equal(message.children[0].textContent,message.textContent,'full accessible copy preserved');
    assert.equal(message.children[1].attrs['aria-hidden'],'true');
  });
});
