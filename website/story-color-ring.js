/* Seeded, fine-grain spectrum ring for the V2 reading scene.
   Rasterized only on resize; scroll opacity is handled by CSS. */
(() => {
  const section=document.querySelector('.narrative');
  const stage=section?.querySelector('.narrative__stage');
  if(!stage)return;
  const canvas=document.createElement('canvas');
  canvas.className='story-color-ring';canvas.setAttribute('aria-hidden','true');
  stage.append(canvas);
  const ctx=canvas.getContext('2d');if(!ctx)return;
  let frame=0,signature='',disposed=false;
  const stops=[[0,255,85,69],[.16,255,155,83],[.30,255,222,135],[.43,158,229,199],[.58,139,231,232],[.77,244,222,205],[1,255,85,69]];
  function draw(){
    frame=0;if(disposed)return;
    const w=stage.clientWidth,h=stage.clientHeight;
    if(!w||!h)return;
    const dpr=Math.min(window.devicePixelRatio||1,1.5,Math.sqrt(1800000/(w*h)));
    const key=`${w}:${h}:${dpr}`;if(signature===key)return;signature=key;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const radius=Math.min(w*.43,h*.46),spread=radius*.12;
    // A diffused color bed joins the microscopic grains into the reference's
    // luminous band; the separately drawn dots retain their crisp texture.
    if(typeof ctx.createConicGradient==='function'){
      const glow=ctx.createConicGradient(-Math.PI/2,w*.5,h*.5);
      stops.forEach(([t,r,g,b])=>{
        const alpha=t>.60&&t<.85?.20:.72;
        glow.addColorStop(t,`rgba(${r},${g},${b},${alpha})`);
      });
      ctx.filter=`blur(${spread*.72}px)`;
      ctx.strokeStyle=glow;ctx.lineWidth=spread*1.65;
      ctx.beginPath();ctx.arc(w*.5,h*.5,radius,0,Math.PI*2);ctx.stroke();ctx.filter='none';
    }
    const count=Math.min(110000,Math.max(24000,Math.round(radius*radius*.62)));
    let seed=23571;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed+.5)/4294967296};
    // A Gaussian band gives feathered inner and outer edges without a hard rim.
    for(let i=0;i<count;i++){
      const t=random(),angle=t*Math.PI*2-Math.PI/2;
      const gaussian=Math.sqrt(-2*Math.log(random()))*Math.cos(random()*Math.PI*2);
      const r=radius+gaussian*spread;
      if(r<radius*.55||r>radius*1.5)continue;
      let j=0;while(j<stops.length-2&&t>stops[j+1][0])j++;
      const a=stops[j],b=stops[j+1],blend=(t-a[0])/(b[0]-a[0]);
      const color=[1,2,3].map(k=>Math.round(a[k]+(b[k]-a[k])*blend));
      // Warm top and cool right stay vivid; lower-left dissolves into the paper.
      const strength=.20+.25*(.5+.5*Math.cos(angle+Math.PI/3));
      ctx.fillStyle=`rgba(${color.join(',')},${strength*(.55+random()*.45)})`;
      const size=.4+random()*.8;
      ctx.beginPath();ctx.arc(w*.5+Math.cos(angle)*r,h*.5+Math.sin(angle)*r,size*.5,0,Math.PI*2);ctx.fill();
    }
  }
  function schedule(){if(!frame&&!disposed)frame=requestAnimationFrame(draw)}
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
  observer?.observe(stage);
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pageshow',schedule);
  window.addEventListener('pagehide',event=>{cancelAnimationFrame(frame);frame=0;if(!event.persisted){disposed=true;observer?.disconnect();}});
  schedule();
})();
