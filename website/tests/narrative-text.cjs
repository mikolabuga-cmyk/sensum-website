const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const html = fs.readFileSync('website/index.html', 'utf8');
const copy = [...html.matchAll(/<p class="point-of-view__text">([^<]+)<\/p>/g)].map(m => m[1]);
assert.equal(copy.length, 1);
class Element {
  constructor(text = '') { this.textContent = text; this.children = []; this.dataset = {}; this.attrs = {}; this.values = {}; this.offsetHeight = 720; this.style = {setProperty:(k,v)=>{this.values[k]=v}}; }
  append(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(k,v) {this.attrs[k]=v;}
}
const paragraphs = copy.map(text => new Element(text));
const stages = copy.map(() => new Element());
const chapters = copy.map((_,i) => {
 const e = new Element(); e.top = 720 + i * 1440;
 e.querySelector = s => s.includes('__text') ? paragraphs[i] : stages[i];
 e.getBoundingClientRect = () => ({top:e.top}); return e;
});
const section = new Element(); section.querySelectorAll = () => chapters;

const closingText = new Element('Sensum helps you decide what’s worth building, test it early, and design a product customers choose, with a clear path from product decisions to business results.');
const closing = new Element(); closing.querySelector = () => closingText;
closing.getBoundingClientRect = () => ({top:0});
const scene = {clientHeight:720};
section.querySelector = s => s === '.story-reveal__overlay' ? closing : scene;
section.dataset.textVersion = 'v2'; section.dataset.motion = 'active';
section.offsetHeight = 1584; section.top = 720;
section.getBoundingClientRect = () => ({top:section.top});
const closingValues = () => closingText.children[1].children.flatMap(w=>w.children).map(c=>c.values['--reveal']);
const control = new Element();

const events = {}, docEvents = {}, media = {};
let frameId = 0, time = 0; const queue = new Map();
const document = {querySelector:s=>s==='.point-of-view'?section:control,createElement:()=>new Element(),createTextNode:t=>new Element(t),hidden:false,addEventListener:(k,v)=>docEvents[k]=v};
const window = {innerHeight:720,addEventListener:(k,v)=>events[k]=v};
let observer;
vm.runInNewContext(fs.readFileSync('website/text-motion.js','utf8') + '\n' + fs.readFileSync('website/text-reveal.js','utf8'), {document,window,matchMedia:q=>(media[q]={matches:false,addEventListener:(k,fn)=>media[q].change=fn}),requestAnimationFrame:fn=>{queue.set(++frameId,fn);return frameId},cancelAnimationFrame:id=>queue.delete(id),MutationObserver:class{constructor(fn){observer=fn}observe(){}}});
function settle(){let count=0;while(queue.size){assert.ok(count++<300,'animation must settle');let frames=[...queue.values()];queue.clear();time+=16;frames.forEach(fn=>fn(time));}}
function values(i){return paragraphs[i].children[1].children.flatMap(w=>w.children).map(c=>c.values['--reveal']);}
settle();assert.ok(values(0).every(v=>v===0));
assert.equal(paragraphs[0].children[0].textContent,copy[0]);
assert.equal(paragraphs[0].children[1].attrs['aria-hidden'],'true');
chapters[0].top=250;events.scroll();settle();
let halfway=values(0);assert.equal(halfway[0],1);assert.equal(halfway.at(-1),0);assert.ok(halfway.some(v=>v>0&&v<1));
chapters[0].top=30;events.scroll();settle();assert.ok(values(0).every(v=>v===1));
chapters[0].top=720;events.scroll();settle();assert.ok(values(0).every(v=>v===0));

media['(prefers-reduced-motion: reduce)'].matches=true;media['(prefers-reduced-motion: reduce)'].change();assert.equal(section.dataset.reveal,'static');assert.equal(queue.size,0);
media['(prefers-reduced-motion: reduce)'].matches=false;media['(prefers-reduced-motion: reduce)'].change();settle();assert.equal(section.dataset.reveal,'active');
control.dataset.paused='true';observer();assert.equal(section.dataset.reveal,'static');
control.dataset.paused='false';observer();settle();
document.hidden=true;docEvents.visibilitychange();assert.equal(queue.size,0);
console.log('PASS: sequential reveal, blur feather, reverse scroll, completion before reaching viewport top, semantic copy, reduced motion, pause, hidden tab, idle frame shutdown.');

document.hidden=false;docEvents.visibilitychange();settle();
for (const p of [0,.4,.6,.65]) {section.top=-864*p;events.scroll();settle();assert.ok(closingValues().every(v=>v===0),'second paragraph waits for particle dispersion');}
section.top=-864*.78;events.scroll();settle();assert.equal(closingValues()[0],1);assert.equal(closingValues().at(-1),0);
for (const p of [.93,1,1.3]) {section.top=-864*p;events.scroll();settle();assert.ok(closingValues().every(v=>v===1),'closing text never dissolves on forward exit');}
section.top=-864*.4;events.scroll();settle();assert.ok(closingValues().every(v=>v===0),'reverse scroll restores previous phase');
section.dataset.textVersion='v1';docEvents['sensum-text-version']();settle();assert.ok(closingValues().every(v=>v===1),'V1 retains original closing copy');
console.log('PASS: V2 closing reveal order, persistent forward exit, reverse, and V1 switching.');

section.dataset.textVersion='v2';docEvents['sensum-text-version']();
for (const [p,expected] of [[.4,'0.0000'],[.6,'1.0000'],[1,'1.0000'],[.4,'0.0000']]) {section.top=-864*p;events.scroll();settle();assert.equal(section.values['--text-dark'],expected);}
console.log('PASS: darkening follows dispersion, completes before white text reveal, and reverses.');

section.dataset.textVersion='v3';docEvents['sensum-text-version']();
for (const [p,expected] of [[.4,'0.0000'],[.52,'0.5000'],[.6,'1.0000'],[1,'1.0000'],[.4,'0.0000']]) {
  section.top=-864*p;events.scroll();settle();assert.equal(section.values['--text-dark'],expected);
}
assert.ok(closingValues().every(v=>v===0));
section.top=-864*.93;events.scroll();settle();assert.ok(closingValues().every(v=>v===1));
console.log('PASS: V3 background crossfade reverses and completes before the closing paragraph reveal.');

section.dataset.textVersion='v4';docEvents['sensum-text-version']();
section.top=-864*.4;events.scroll();settle();assert.equal(section.values['--text-dark'],'0.0000');assert.ok(closingValues().every(v=>v===0));
section.top=-864*.7;events.scroll();settle();assert.equal(section.values['--text-dark'],'1.0000');assert.ok(closingValues().every(v=>v===0),'light begins before text');
section.top=-864*.97;events.scroll();settle();assert.equal(section.values['--text-dark'],'1.0000');assert.ok(closingValues().every(v=>v===1));
console.log('PASS: V4 preserves the sequential background and text reveal.');

section.top=-864*.4;events.scroll();settle();
section.top=-864*.45;events.scroll();
const callbacks=[...queue.values()];queue.clear();time+=16;callbacks.forEach(fn=>fn(time));
assert.ok(Number(section.values['--text-dark'])>0 && Number(section.values['--text-dark'])<1,'fade starts immediately');
settle();assert.equal(section.values['--text-dark'],'1.0000','fade finishes without additional scrolling');
section.top=-864*.4;events.scroll();settle();assert.equal(section.values['--text-dark'],'0.0000');
console.log('PASS: V4 eases smoothly to black at the scroll threshold and reverses.');
