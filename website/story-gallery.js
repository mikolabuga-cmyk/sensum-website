/* Peripheral image stacks for the V2 dark reading scene.
   Uses the existing temporary preview manifest; no new network assets. */
(() => {
  const section = document.querySelector('.narrative');
  const stage = section?.querySelector('.narrative__stage');
  const sources = window.sensumPortfolioPreviews || [];
  if (!stage || !sources.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const control = document.querySelector('.motion-toggle');
  const canvas = document.createElement('canvas');
  canvas.className = 'story-gallery'; canvas.setAttribute('aria-hidden','true');
  stage.append(canvas);
  const ctx = canvas.getContext('2d',{alpha:true});
  if (!ctx) return;
  let images=[], width=0, height=0, ratio=1, frame=0, previous=0, elapsed=0, lastPaint=0;
  let inView=false, disposed=false;
  const pointer={x:0,y:0,tx:0,ty:0};
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
  const dark=()=>Number(section.style.getPropertyValue('--text-dark')) || 0;
  const enabled=()=>!disposed && inView && images.length && !document.hidden &&
    section.dataset.textVersion==='v2' && section.dataset.motion==='active' &&
    control?.dataset.paused!=='true' && !reduced.matches && !forced.matches && dark()>.7;

  // Five loose stacks around a quiet center, with small distant cards between.
  // Phase wrapping is hidden by fading both ends of each stack's path.
  function draw() {
    ctx.setTransform(ratio,0,0,ratio,0,0); ctx.clearRect(0,0,width,height);
    const mobile=width<761, stacks=mobile?4:5, layers=mobile?5:8;
    const base=Math.min(width*(mobile?.23:.14),height*.24,205);
    const reveal=smooth((dark()-.7)/.3);
    for(let group=0;group<stacks;group++) {
      const anchor=-Math.PI*.8+group*Math.PI*2/stacks;
      for(let layer=0;layer<layers;layer++) {
        const phase=(layer/layers+elapsed*.028+group*.137)%1;
        const angle=anchor+(phase-.5)*.43+Math.sin(elapsed*.065+group)*.045;
        const depth=.62+phase*.48;
        const x=width*.5+Math.cos(angle)*width*.48+pointer.x*depth;
        const y=height*.5+Math.sin(angle)*height*.56+pointer.y*depth;
        const size=base*depth;
        const img=images[(group*3+layer)%images.length];
        const fade=smooth(phase/.18)*smooth((1-phase)/.20);
        ctx.save();ctx.translate(x,y);
        ctx.rotate(Math.sin(anchor)*.30+(phase-.5)*.52);
        ctx.globalAlpha=reveal*fade*(.23+phase*.29);
        const cardHeight=size*img.height/img.width;
        ctx.drawImage(img,-size/2,-cardHeight/2,size,cardHeight);
        ctx.restore();
      }
    }
    // Smaller satellite images suggest depth without crossing the reading area.
    for(let i=0;i<(mobile?3:7);i++) {
      const angle=i*2.399+elapsed*.018;
      const size=base*(.16+(i%3)*.045);
      const x=width*.5+Math.cos(angle)*width*.43+pointer.x*.35;
      const y=height*.5+Math.sin(angle)*height*.46+pointer.y*.35;
      ctx.save();ctx.translate(x,y);ctx.rotate(angle*.25);
      ctx.globalAlpha=reveal*.35;
      const img=images[i%images.length],cardHeight=size*img.height/img.width;
      ctx.drawImage(img,-size/2,-cardHeight/2,size,cardHeight);ctx.restore();
    }
  }
  function render(time) {
    frame=0;
    if(!enabled()){sync();return;}
    const dt=previous?Math.min(time-previous,64):16;previous=time;elapsed+=dt/1000;
    const ease=1-Math.exp(-dt/650);
    pointer.x+=(pointer.tx-pointer.x)*ease;pointer.y+=(pointer.ty-pointer.y)*ease;
    if(time-lastPaint>=32){draw();lastPaint=time;}
    frame=requestAnimationFrame(render);
  }
  function sync() {
    if(enabled()) {canvas.hidden=false;if(!frame)frame=requestAnimationFrame(render);}
    else {cancelAnimationFrame(frame);frame=0;previous=0;canvas.hidden=true;}
  }
  function measure() {
    width=stage.clientWidth;height=stage.clientHeight;
    ratio=Math.min(window.devicePixelRatio||1,1.5,Math.sqrt(1800000/Math.max(1,width*height)));
    canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));
    const box=section.getBoundingClientRect();inView=box.bottom>0&&box.top<window.innerHeight;
    sync();
  }
  const loaded=new Map();
  function load(src) {
    if(!loaded.has(src))loaded.set(src,new Promise(resolve=>{
      const img=new Image();img.decoding='async';
      img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;
    }));
    return loaded.get(src);
  }
  Promise.all(sources.map(async source=>{
    const img=await load(source.src);if(!img||disposed)return null;
    const [x,y,w,h]=source.crop||[0,0,1,1];
    const tile=document.createElement('canvas');tile.width=384;tile.height=Math.round(384*h*img.naturalHeight/(w*img.naturalWidth));
    const tileCtx=tile.getContext('2d');if(!tileCtx)return null;
    tileCtx.drawImage(img,x*img.naturalWidth,y*img.naturalHeight,w*img.naturalWidth,h*img.naturalHeight,0,0,tile.width,tile.height);
    return tile;
  })).then(tiles=>{if(!disposed){images=tiles.filter(Boolean);measure();}});
  const observer=new MutationObserver(sync);
  observer.observe(section,{attributes:true,attributeFilter:['data-text-version','data-motion','style']});
  if(control)observer.observe(control,{attributes:true,attributeFilter:['data-paused']});
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;resize?.observe(stage);
  const intersection=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();}):null;intersection?.observe(section);
  window.addEventListener('resize',measure,{passive:true});
  window.addEventListener('scroll',()=>{if(!intersection){const b=section.getBoundingClientRect();inView=b.bottom>0&&b.top<window.innerHeight;}sync();},{passive:true});
  section.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||!enabled())return;
    const box=stage.getBoundingClientRect();
    pointer.tx=((event.clientX-box.left)/width-.5)*22;
    pointer.ty=((event.clientY-box.top)/height-.5)*16;
  },{passive:true});
  section.addEventListener('pointerleave',()=>{pointer.tx=0;pointer.ty=0;});
  reduced.addEventListener('change',sync);forced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pageshow',measure);
  window.addEventListener('pagehide',event=>{if(!event.persisted){disposed=true;observer.disconnect();resize?.disconnect();intersection?.disconnect();images=[];}cancelAnimationFrame(frame);frame=0;previous=0;});
  measure();
})();
