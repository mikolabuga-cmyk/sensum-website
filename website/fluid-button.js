/* Original lightweight glass shader; the anchor remains the interactive control. */
(() => {
  document.querySelectorAll('.button--primary, .portfolio-project__preview').forEach(button => {
  const isPreview = button.classList.contains('portfolio-project__preview');
  const canvas = document.createElement('canvas');
  canvas.className = isPreview ? 'portfolio-project__fluid-surface' : 'fluid-button__surface';
  canvas.setAttribute('aria-hidden', 'true');
  button.prepend(canvas);
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, depth: false, antialias: false });
  if (!gl) { canvas.remove(); return; }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  let program, uniforms, frame = 0, visible = true, hovered = false, focused = false;
  let pressure = 0, previous = 0, time = 0, hoverTime = 0, ripple = 10;
  let px = .5, py = .5, cursorX = .5, cursorY = .5;
  let edgePhase = 0;
  function compile(type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error('Glass shader unavailable');
    return shader;
  }
  function init() {
    const vertex = compile(gl.VERTEX_SHADER, 'attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}');
    const fragment = compile(gl.FRAGMENT_SHADER, `precision highp float;
      varying vec2 uv; uniform vec2 size; uniform vec2 pointer;
      uniform float time; uniform float hover; uniform float ripple; uniform float energy;
      uniform float edgePhase; uniform float surfacePadding; uniform float idleMotion;
      uniform float previewSurface;
      void main(){
        // Extend the lighting beyond the resting capsule into its liquid edge.
        vec2 p=(uv-.5)*(size+vec2(surfacePadding*2.)); vec2 b=size*.5;
        // The capsule geometry stays fixed; only its internal lighting moves.
        // CSS clips the full-bleed surface to the fixed button silhouette.
        vec2 cursor=(pointer-.5)*size;
        // The raised color wave swells and settles during the hover pulse.
        float activity=hover*energy;
        float flow=time*.38;
        // A quiet idle breath: roughly one cycle every six seconds.
        float idle=idleMotion*(1.-hover*.7);
        float idlePulse=sin(time*1.05);
        float drift=.055*sin(flow)+.025*sin(flow*.63+1.2)+idle*.085*sin(time*.62);
        vec2 touch=(pointer-.5)*hover;
        // Slide the light around the full capsule perimeter, including the top edge.
        // Rotate only the light field into the edge's inward-facing coordinate frame.
        float pi=3.14159265359;
        float phase=mod(edgePhase+pi,2.*pi)-pi;
        float radius=b.y;
        float straight=max(0.,b.x-radius);
        float distanceAlong=abs(phase)/pi*(2.*straight+pi*radius);
        float angle=sign(phase)*clamp((distanceAlong-straight)/radius,0.,pi);
        float topTravel=max(0.,distanceAlong-straight-pi*radius);
        vec2 origin=vec2(sign(phase)*(min(distanceAlong,straight)-topTravel)+radius*sin(angle),
          -radius*cos(angle));
        vec2 tangent=vec2(cos(angle),sin(angle));
        vec2 inward=vec2(-sin(angle),cos(angle));
        if(previewSurface>.5){
          // Image lighting stays on the bottom edge and follows horizontal motion only.
          float hoverDrift=hover*sin(time*1.15)*min(size.x*.025,14.);
          origin=vec2((pointer.x-.5)*size.x*.65+hoverDrift,-b.y);
          inward=vec2(0.,1.);
          tangent=vec2(1.,0.);
          angle=0.;
        }
        vec2 local=p-origin;
        float x=dot(local,tangent)/b.x;
        float bottom=max(0.,dot(local,inward)/(previewSurface>.5?min(size.y,100.):size.y));
        float corner=smoothstep(.30,.95,abs(sin(angle)));
        // One broad asymmetric crest, shallow at the ends and lifted centrally.
        // All measurements follow the button height, preserving the reference shape.
        float center=(-.08+drift)*(1.-corner*.65);
        float sideWidth=x<center?(.49+.05*activity):(.61+.06*activity);
        float crest=exp(-pow(abs((x-center)/sideWidth),1.8));
        float fold=.014*sin(x*5.+flow*.91)+.009*sin(x*8.-flow*.67);
        float shoulder=exp(-pow((x+.34+.08*sin(flow*.8))/.34,2.));
        float height=.022+(.27+idle*.045*idlePulse+.085*hover+.05*activity+touch.y*.035+fold)*crest
          +.025*shoulder;
        float haze=exp(-pow(bottom/height,1.4));
        // Long, faint color diffusion reaches upward without lifting the bright base.
        float veil=exp(-pow((x-center-.05-.05*sin(flow*.52+bottom*2.))/.54,2.)
          -pow(bottom/(.64+.12*activity),2.));
        // Overlapping colors blend into the same raised, diffused light surface.
        float colorX=x+bottom*(.22+.09*activity)+.07*sin(flow*.73+bottom*3.);
        float amber=exp(-pow((colorX+.58+.10*sin(flow*.81))/.30,2.));
        float green=exp(-pow((colorX+.24+.12*sin(flow*.67+1.))/.28,2.));
        float cyan=exp(-pow((colorX+.02+.10*sin(flow*.93+2.))/.26,2.));
        float violet=exp(-pow((colorX-.15+.13*sin(flow*.71+3.))/.29,2.));
        float pink=exp(-pow((colorX-.34+.11*sin(flow*.88+4.))/.31,2.));
        float peach=exp(-pow((colorX-.64+.09*sin(flow*.60+5.))/.33,2.));
        vec3 spectrum=(vec3(.67,.51,.20)*amber+vec3(.24,.57,.42)*green
          +vec3(.22,.57,.65)*cyan+vec3(.43,.32,.65)*violet
          +vec3(.65,.31,.49)*pink+vec3(.73,.42,.25)*peach)
          /max(.8,amber+green+cyan+violet+pink+peach);
        float breath=.91+.10*hover+.07*activity+.025*sin(flow*.85)+idle*.15*idlePulse;
        vec3 color=vec3(.105,.108,.112);
        color+=spectrum*(haze*.92+veil*(.16+.06*activity))*breath;
        // A broad pearly lift joins the colors at the base, never a sharp line.
        float baseBloom=exp(-pow(bottom/(.085+.025*activity),2.))*exp(-pow((x-center)/.61,2.));
        color+=mix(spectrum,vec3(.91,.95,.98),.48)*baseBloom*.30;
        // Overlapping, softly warped light volumes dissolve the upper wave into a mesh.
        // Independent slow drift avoids a continuous highlight tracing the silhouette.
        float shineCenter=center+.035+.07*sin(flow*.74);
        float meshX=x-shineCenter+.08*sin(bottom*6.+flow*.65);
        float meshY=bottom+.024*sin(x*5.-flow*.56);
        float lift=.085*hover+.05*activity;
        float mintY=meshY-(.20+lift+.025*sin(flow*.81));
        float pearlY=meshY-(.28+lift+.025*cos(flow*.73));
        float roseY=meshY-(.16+lift+.025*sin(flow*.59));
        // Stretch only the upper shoulders into translucent, feathered shades.
        float mintCloud=exp(-pow((meshX+.20+.045*sin(flow*.71))/.39,2.)
          -pow(mintY/(mintY>0.? .35:.20),2.));
        float pearlCloud=exp(-pow((meshX-.035-.055*sin(flow*.63))/.36,2.)
          -pow(pearlY/(pearlY>0.? .32:.22),2.));
        float roseCloud=exp(-pow((meshX-.31+.04*cos(flow*.82))/.43,2.)
          -pow(roseY/(roseY>0.? .39:.19),2.));
        float crestHalo=exp(-pow((bottom-height*.76)/.27,2.))
          *exp(-pow((x-shineCenter)/.55,2.));
        vec3 pearl=mix(spectrum,vec3(.86,.90,.97),.48);
        vec3 meshLight=vec3(.49,.79,.72)*mintCloud*.50
          +pearl*pearlCloud*.64+vec3(.83,.57,.73)*roseCloud*.43;
        float shimmer=.94+.06*sin(flow*1.1);
        color+=(meshLight*(.25+hover*(.035+.04*energy))
          +pearl*crestHalo*(.065+.02*hover))*shimmer;
        // At a corner, gather the light locally and leave the opposite side dark.
        float gathered=exp(-pow((x-center)/.68,2.));
        color=mix(vec3(.105,.108,.112),color,mix(1.,gathered,corner*.92));
        // Soft reflections stay within the fixed, borderless silhouette.
        vec3 glassLight=mix(vec3(.52,.55,.59),min(vec3(1.),spectrum*1.8+vec3(.22)),.68);
        float surge=exp(-pow((length(p-cursor)-ripple*130.)/9.,2.))*exp(-ripple*3.);
        color+=glassLight*surge*.55;
        float alpha=1.;
        if(previewSurface>.5){
          // Dissolve the light into the image, retaining the button's colored crest.
          alpha=clamp(haze*.85+veil*.22+mintCloud*.12+pearlCloud*.16+roseCloud*.12,0.,.94);
          // Gentle five-second breathing, confined to the bottom light field.
          float previewPulse=.5-.5*cos(time*1.256637);
          alpha*=mix(1.,.86+.14*previewPulse,hover);
          color*=1.+hover*.10*previewPulse;
        }
        gl_FragColor=vec4(color,alpha);
      }`);
    program=gl.createProgram(); gl.attachShader(program,vertex); gl.attachShader(program,fragment); gl.linkProgram(program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('Glass shader link unavailable');
    gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    uniforms=Object.fromEntries(['size','pointer','time','hover','ripple','energy','edgePhase','surfacePadding','idleMotion','previewSurface'].map(k=>[k,gl.getUniformLocation(program,k)]));
    button.classList.add('fluid-button--ready');
  }
  // A long, seamless breath gently lifts and settles the light during hover.
  function energyAt(t) {
    return .24+.76*(.5-.5*Math.cos((t%8)/8*Math.PI*2));
  }
  function draw(now) {
    frame=0;
    if (!program || gl.isContextLost() || document.hidden || !visible || forced.matches) { previous=0; return; }
    const dt=previous?Math.min(.05,(now-previous)/1000):1/60; previous=now;
    const paused=document.querySelector('.motion-toggle')?.dataset.paused === 'true';
    const still=reduced.matches || paused;
    const target=hovered || focused ? 1:0;
    pressure=still?target:pressure+(target-pressure)*(1-Math.exp(-dt*7));
    const follow=still?1:1-Math.exp(-dt*3.2);
    cursorX+=((hovered?px:.5)-cursorX)*follow;
    cursorY+=((hovered?py:.5)-cursorY)*follow;
    const dx=(px-.5)*2, dy=(py-.5)*2;
    const desiredPhase=hovered && Math.hypot(dx,dy)>.12 ? Math.atan2(dx,-dy):0;
    // Take the shortest route across the top seam; never snap between left and right.
    const phaseDelta=Math.atan2(Math.sin(desiredPhase-edgePhase),Math.cos(desiredPhase-edgePhase));
    edgePhase+=phaseDelta*follow;
    edgePhase=Math.atan2(Math.sin(edgePhase),Math.cos(edgePhase));
    if(!still) {
      // Slow the color drift on hover without resetting its phase.
      time+=dt*(isPreview?1.:1-pressure*.60);
      if(target) hoverTime+=dt;
      ripple+=dt;
    }
    if(Math.abs(pressure-target)<.001) pressure=target;
    const width=button.clientWidth,height=button.clientHeight,ratio=Math.min(devicePixelRatio,2);
    const padding=button.classList.contains('liquid-button')?18:0;
    const renderWidth=Math.round((width+padding*2)*ratio),renderHeight=Math.round((height+padding*2)*ratio);
    if(canvas.width!==renderWidth||canvas.height!==renderHeight) {canvas.width=renderWidth;canvas.height=renderHeight;gl.viewport(0,0,canvas.width,canvas.height);}
    gl.uniform1f(uniforms.surfacePadding,padding);
    gl.uniform1f(uniforms.previewSurface,isPreview?1:0);
    gl.uniform1f(uniforms.idleMotion,button.closest('.hero') && !still ? 1:0);
    gl.uniform2f(uniforms.size,width,height);gl.uniform2f(uniforms.pointer,cursorX,cursorY);
    gl.uniform1f(uniforms.edgePhase,edgePhase);
    gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.hover,pressure);gl.uniform1f(uniforms.ripple,ripple);gl.uniform1f(uniforms.energy,energyAt(hoverTime));
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);
    if(!still && (!isPreview || hovered || focused || pressure > .001)) frame=requestAnimationFrame(draw); else previous=0;
  }
  const wake=()=>{if(!frame)frame=requestAnimationFrame(draw);};
  const trackPointer=e=>{
    const r=button.getBoundingClientRect();
    if(!r.width || !r.height) return;
    px=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    py=Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height));
  };
  button.addEventListener('pointermove',e=>{trackPointer(e);wake();},{passive:true});
  button.addEventListener('pointerenter',e=>{trackPointer(e);if(!hovered && !focused) hoverTime=0;hovered=true;wake();});
  button.addEventListener('pointerleave',()=>{hovered=false;wake();});
  (isPreview ? button.closest('a') : button).addEventListener('focus',()=>{if(!hovered && !focused) hoverTime=0;focused=true;wake();});
  (isPreview ? button.closest('a') : button).addEventListener('blur',()=>{focused=false;wake();});
  button.addEventListener('pointerdown',()=>{ripple=reduced.matches?10:0;wake();});
  button.addEventListener('keydown',e=>{if(e.key==='Enter'){ripple=reduced.matches?10:0;wake();}});
  document.addEventListener('visibilitychange',wake);
  document.querySelector('.motion-toggle')?.addEventListener('click',wake);
  reduced.addEventListener('change',wake); forced.addEventListener('change',wake);
  new ResizeObserver(wake).observe(button);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();}).observe(button);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);frame=0;button.classList.remove('fluid-button--ready');});
  canvas.addEventListener('webglcontextrestored',()=>{try{init();wake();}catch{button.classList.remove('fluid-button--ready');}});
  try{init();wake();}catch{canvas.remove();button.classList.remove('fluid-button--ready');}
  });
})();

/* A fixed hit area with a locally deforming liquid surface. */
(() => {
  const button = document.querySelector('.hero .button--primary');
  if (!button) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const surface = document.createElement('span');
  surface.className = 'liquid-button__shape';
  surface.setAttribute('aria-hidden', 'true');
  const canvas = button.querySelector('.fluid-button__surface');
  if (canvas) surface.append(canvas);
  button.prepend(surface);
  button.classList.add('liquid-button');
  let frame = 0, previous = 0, amount = 0, target = 0;
  let pointer = { x: 0, y: 0 }, cursor = { x: 0, y: 0 };
  const padding = 18;
  function outline() {
    const w = button.offsetWidth, h = button.offsetHeight;
    const r = h / 2, straight = Math.max(0, w / 2 - r);
    const points = [];
    // Sample the capsule by rays, including its straight top and bottom edges.
    for (let i = 0; i < 128; i++) {
      const angle = i / 128 * Math.PI * 2;
      const x = Math.cos(angle), y = Math.sin(angle);
      const topDistance = r / Math.max(.00001, Math.abs(y));
      const distance = Math.abs(x * topDistance) <= straight ? topDistance
        : straight * Math.abs(x) + Math.sqrt(Math.max(0, r*r - straight*straight*y*y));
      let px = w / 2 + x * distance, py = h / 2 + y * distance;
      const dx = cursor.x - px, dy = cursor.y - py;
      const length = Math.hypot(dx, dy);
      // A narrow patch of the edge follows the magnet; the rest stays still.
      const pull = amount * 12 * Math.exp(-Math.pow(length / 44, 2));
      px += dx / Math.max(1, length) * pull;
      py += dy / Math.max(1, length) * pull;
      points.push(`${(px + padding).toFixed(2)}px ${(py + padding).toFixed(2)}px`);
    }
    surface.style.clipPath = `polygon(${points.join(',')})`;
  }
  function draw(now) {
    const dt = Math.min(40, previous ? now - previous : 16); previous = now;
    const ease = 1 - Math.exp(-dt / 85);
    amount += (target - amount) * ease;
    cursor.x += (pointer.x - cursor.x) * ease;
    cursor.y += (pointer.y - cursor.y) * ease;
    const moving = Math.abs(target - amount) > .001 || (target > 0 && Math.hypot(pointer.x-cursor.x,pointer.y-cursor.y) > .05);
    if (!moving) amount = target;
    outline();
    frame = moving ? requestAnimationFrame(draw) : 0;
    if (!moving) previous = 0;
  }
  const wake = () => { if (!frame) frame = requestAnimationFrame(draw); };
  const reset = () => { target = 0; wake(); };
  window.addEventListener('pointermove', event => {
    if (!fine.matches || reduced.matches || event.pointerType !== 'mouse' || button.closest('.hero--entering') || document.documentElement.hasAttribute('data-loading')) { reset(); return; }
    const rect = button.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const dx = Math.max(0, Math.abs(pointer.x-rect.width/2) - (rect.width-rect.height)/2);
    const edgeDistance = Math.hypot(dx,pointer.y-rect.height/2) - rect.height/2;
    // Pull only from outside: never cave the surface in beneath the label.
    target = edgeDistance >= 0 ? Math.max(0, 1 - edgeDistance/70) : 0;
    wake();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', reset);
  window.addEventListener('blur', reset);
  window.addEventListener('scroll', reset, { passive: true });
  button.addEventListener('focus', reset);
  const restore = () => { cancelAnimationFrame(frame); frame=0; previous=0; amount=target=0; outline(); };
  fine.addEventListener('change', restore); reduced.addEventListener('change', restore);
  document.addEventListener('visibilitychange', restore);
  new ResizeObserver(outline).observe(button);
  outline();
})();

/* Local edge pull with a stable project hit area; light and image share the mask. */
(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.portfolio-project__preview').forEach(preview => {
    const surface = document.createElement('div');
    surface.className = 'portfolio-project__liquid-shape';
    while (preview.firstChild) surface.append(preview.firstChild);
    preview.append(surface);
    preview.classList.add('portfolio-project__preview--fluid');
    const image = surface.querySelector('.portfolio-project__image');
    let frame = 0, last = 0, strength = 0, target = 0;
    let x = 0, y = 0, tx = 0, ty = 0;
    const pad = 12;
    const maxPull = 12;
    function paint(now) {
      const dt = Math.min(40, last ? now-last : 16); last = now;
      const ease = 1-Math.exp(-dt/90);
      strength += (target-strength)*ease; x += (tx-x)*ease; y += (ty-y)*ease;
      const w = preview.clientWidth, h = preview.clientHeight;
      const r = Math.min(parseFloat(getComputedStyle(preview).borderRadius)||24,w/2,h/2);
      const points = [];
      // Sample each rounded corner and its adjacent straight edge uniformly.
      const corners = [[w-r,r,-Math.PI/2],[w-r,h-r,0],[r,h-r,Math.PI/2],[r,r,Math.PI]];
      for (let c=0;c<4;c++) {
        const [cx,cy,a] = corners[c];
        const next = corners[(c+1)%4];
        for(let i=0;i<16;i++) add(cx+r*Math.cos(a+i/16*Math.PI/2),cy+r*Math.sin(a+i/16*Math.PI/2));
        const ex=cx+r*Math.cos(a+Math.PI/2), ey=cy+r*Math.sin(a+Math.PI/2);
        const nx=next[0]+r*Math.cos(next[2]), ny=next[1]+r*Math.sin(next[2]);
        for(let i=0;i<32;i++) add(ex+(nx-ex)*i/32,ey+(ny-ey)*i/32);
      }
      function add(px,py) {
        const dx=x-px,dy=y-py,d=Math.hypot(dx,dy);
        const pull=strength*maxPull*Math.exp(-Math.pow(d/58,2));
        points.push(`${(px+pad+dx/Math.max(d,1)*pull).toFixed(2)}px ${(py+pad+dy/Math.max(d,1)*pull).toFixed(2)}px`);
      }
      surface.style.clipPath=`polygon(${points.join(',')})`;
      if (image && w && h) {
        // Follow the same damped pointer as the edge. Uniform overscan covers
        // the edge pull plus the 4px translation, including the opposite edge.
        const offsetX = Math.max(-1, Math.min(1, (x-w/2)/(w/2))) * 4 * strength;
        const offsetY = Math.max(-1, Math.min(1, (y-h/2)/(h/2))) * 4 * strength;
        const scale = 1 + 2 * (maxPull + 5) * strength / Math.min(w,h);
        image.style.transform = strength > .001
          ? `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`
          : '';
      }
      const moving=Math.abs(target-strength)>.001 || (target && Math.hypot(tx-x,ty-y)>.1);
      frame=moving?requestAnimationFrame(paint):0;
      if(!moving) last=0;
    }
    function wake(){if(!frame)frame=requestAnimationFrame(paint);}
    function reset(){target=0;wake();}
    window.addEventListener('pointermove',e=>{
      if(!fine.matches || reduced.matches || e.pointerType!=='mouse'){if(target)reset();return;}
      const rect=preview.getBoundingClientRect();tx=e.clientX-rect.left;ty=e.clientY-rect.top;
      const dx=Math.max(0,-tx,tx-rect.width),dy=Math.max(0,-ty,ty-rect.height);
      const distance=Math.hypot(dx,dy);
      const proximity=Math.max(0,1-distance/32);
      const next = proximity * (1 + proximity * (1 - proximity));
      if(next || target || strength>.001){target=next;wake();}
    },{passive:true});
    document.documentElement.addEventListener('pointerleave',reset);
    window.addEventListener('scroll',reset,{passive:true});
    window.addEventListener('blur',reset);
    reduced.addEventListener('change',()=>{strength=target=0;wake();});
    fine.addEventListener('change',reset);
    new ResizeObserver(wake).observe(preview);
    wake();
  });
})();
