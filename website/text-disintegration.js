/* V2: left-to-right glyph erosion, followed by an independent ring reveal.
   ScrollTrigger drives both scenes; no particles travel between them. */
(() => {
  const section = document.querySelector('.narrative');
  if (!section || section.hidden) return;
  const openingOnly = section.dataset.openingOnly === 'true';
  const paragraph = section?.querySelector('.point-of-view__text');
  const stage = paragraph?.closest('.point-of-view__stage');
  const scene = section?.querySelector('.narrative__stage');
  const switcher = document.querySelector('.text-version-switcher');
  if (!paragraph || !stage || !scene || !switcher) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const control = document.querySelector('.motion-toggle');
  const canvas = document.createElement('canvas');
  canvas.className = 'text-disintegration';
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  const state = { progress: 0 };
  let gl, inkProgram, dotProgram, quad, cloud, ringCloud, texture, tween;
  let ringCount=0;
  let ready = false, initialized = false, lost = false, disposed = false, frame = 0, count = 0;
  let width = 0, height = 0, ratio = 1, particleSize = 1, signature = '';
  let ink = [26/255, 37/255, 48/255];
  let fontsReady = !document.fonts;
  let ambientTime=0, previousTime=0;
  const pointer={x:0,y:0,strength:0,target:0};
  const ringAspect=[1,1];
  const clamp = x => Math.max(0, Math.min(1, x));
  const easeRange = (start,end,value) => { const t=clamp((value-start)/(end-start));return t*t*(3-2*t); };
  const selected = () => ['v2', 'v3', 'v4'].includes(section.dataset.textVersion);
  const allowed = () => !disposed && selected() && !reduced.matches && !forced.matches && control?.dataset.paused !== 'true';
  const supported = () => window.gsap && window.ScrollTrigger;

  const quadVertex = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() { v_uv = vec2(a_position.x*.5+.5,.5-a_position.y*.5); gl_Position = vec4(a_position,0.,1.); }
  `;
  const inkFragment = `
    precision highp float;
    uniform sampler2D u_mask;
    uniform float u_progress;
    uniform vec3 u_ink;
    varying vec2 v_uv;
    void main() {
      vec4 mask = texture2D(u_mask,v_uv);
      // Each microscopic cell has a release time encoded in red. Removing
      // its actual alpha coverage leaves granular holes in the glyph itself.
      float attached = 1.-step(mask.r,u_progress);
      gl_FragColor = vec4(u_ink,mask.a*attached);
    }
  `;
  const dotVertex = `
    precision highp float;
    attribute vec4 a_dot;
    uniform vec2 u_size;
    uniform vec2 u_ringAspect;
    uniform float u_progress, u_ratio, u_pointSize, u_time, u_hover;
    uniform float u_ringPass, u_ringReveal, u_textOpacity, u_ringQuiet;
    uniform vec2 u_pointer;
    varying float v_alpha;
    varying float v_light;
    varying vec3 v_ringColor;
    void main() {
      float age = clamp((u_progress-a_dot.w)/.60,0.,1.);
      float seed = fract(sin(dot(a_dot.xy,vec2(12.9898,78.233)))*43758.5453);
      float seed2 = fract(sin(dot(a_dot.xy,vec2(39.346,11.135)))*47453.5453);
      if(u_ringPass>.5){seed=a_dot.x;seed2=a_dot.y;}
      float phase = a_dot.y*.027+a_dot.x*.008;
      float depth = .55+.45*seed;
      float advance = age*age*(3.-2.*age);
      // Shared low-frequency curls create coherent smoke-like folds rather
      // than independent random explosions. Displacement is zero at release.
      vec2 curl = vec2(sin(phase+age*6.)-sin(phase),cos(phase*.7+age*5.)-cos(phase*.7));
      // Reference motion: fine grains lift up and right in coherent folds,
      // retaining a fleeting impression of the lines before thinning away.
      vec2 drift = vec2(advance*min(u_size.x*.15,190.)*(.35+seed*.6),-advance*(55.+110.*seed));
      vec2 position = a_dot.xy+drift+curl*advance*vec2(28.,36.)*depth;
      position += vec2(sin(seed*18.+age*14.)-sin(seed*18.),cos(seed*13.+age*11.)-cos(seed*13.))*advance*6.;
      if (u_ringPass < .5) {
        // Grain lifetimes follow each glyph's left-to-right release time.
        // Their entire trail fades before the independent ring scene starts.
        float lifetime = max(0.,u_progress-a_dot.w);
        v_alpha = a_dot.z*step(a_dot.w,u_progress)
          *(1.-smoothstep(.04,.36,lifetime))*u_textOpacity;
        v_light = 0.; v_ringColor = vec3(0.);
        gl_PointSize = max(1.,u_pointSize*u_ratio);
        gl_Position = vec4(position/u_size*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
        return;
      }
      // Independent dotted ring: two arcs grow from nine o'clock, following
      // the upper and lower circumference until they meet on the right.
      float baseAngle = seed*6.2831853-1.5707963;
      float route = acos(clamp(-cos(baseAngle),-1.,1.))/3.14159265;
      float direction = sin(baseAngle)<0. ? 1. : -1.;
      float appear = smoothstep(route,route+.10,u_ringReveal*1.10);
      float orbit = u_time*.018*(.7+.3*depth)*smoothstep(.90,1.,u_ringReveal);
      float angle = baseAngle-direction*.12*(1.-appear)+orbit;
      float ringT = fract((angle+1.5707963)/6.2831853);
      float radius = min(u_size.x*.43,u_size.y*.46);
      float gaussian = clamp(sqrt(-2.*log(max(.0001,seed2)))*cos(a_dot.w*6.2831853),-2.8,2.8);
      float breath = sin(u_time*.35+seed*9.)*.007*u_ringReveal;
      // A full circular band with softly scattered dots on both edges.
      vec2 destination = u_size*.5+vec2(cos(angle),sin(angle))*u_ringAspect*radius*(1.+gaussian*.12+breath);
      vec2 away = destination-u_pointer;
      float distance = length(away);
      float influence = 1.-smoothstep(0.,min(220.,min(u_size.x,u_size.y)*.35),distance);
      destination += away/max(distance,1.)*influence*influence*u_hover*14.*u_ringReveal;
      position = destination;
      if(ringT<.16) v_ringColor=mix(vec3(255.,8.,0.),vec3(255.,80.,0.),ringT/.16);
      else if(ringT<.30) v_ringColor=mix(vec3(255.,80.,0.),vec3(255.,190.,0.),(ringT-.16)/.14);
      else if(ringT<.43) v_ringColor=mix(vec3(255.,190.,0.),vec3(0.,220.,120.),(ringT-.30)/.13);
      else if(ringT<.58) v_ringColor=mix(vec3(0.,220.,120.),vec3(0.,205.,245.),(ringT-.43)/.15);
      else if(ringT<.77) v_ringColor=mix(vec3(0.,205.,245.),vec3(255.,165.,105.),(ringT-.58)/.19);
      else v_ringColor=mix(vec3(255.,165.,105.),vec3(255.,8.,0.),(ringT-.77)/.23);
      v_ringColor/=255.;
      // Intensify only the grains near the pointer, using the eased hover state.
      float hoverColor = influence*u_hover*u_ringReveal;
      float luminance = dot(v_ringColor,vec3(.2126,.7152,.0722));
      v_ringColor = clamp(mix(vec3(luminance),v_ringColor,1.+hoverColor*.8),0.,1.);
      v_ringColor = mix(v_ringColor,vec3(1.),u_ringQuiet);
      v_alpha = (.95+.05*a_dot.w)*appear*mix(1.,.22,u_ringQuiet);
      v_light = 1.;
      // Slightly fuller grains strengthen the color while keeping individual dots.
      gl_PointSize = max(1.,a_dot.z*1.45*u_ratio);
      gl_Position = vec4(position/u_size*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
    }
  `;
  const dotFragment = `
    precision mediump float;
    uniform vec3 u_ink;
    varying float v_alpha;
    varying float v_light;
    varying vec3 v_ringColor;
    void main() {
      float edge = 1.-smoothstep(.24,.5,length(gl_PointCoord-.5));
      gl_FragColor = vec4(mix(u_ink,v_ringColor,v_light),v_alpha*edge);
    }
  `;

  function program(vertex, fragment, names) {
    const result = gl.createProgram(), shaders = [];
    try {
      for (const [type, source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
        const shader = gl.createShader(type); shaders.push(shader);
        gl.shaderSource(shader,source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error('Text shader unavailable');
        gl.attachShader(result,shader);
      }
      gl.linkProgram(result);
      if (!gl.getProgramParameter(result,gl.LINK_STATUS)) throw Error('Text shader link unavailable');
      return { program:result, attribute:gl.getAttribLocation(result,names[0]), uniforms:Object.fromEntries(names.slice(1).map(n=>[n,gl.getUniformLocation(result,`u_${n}`)])) };
    } catch (error) { gl.deleteProgram(result); throw error; }
    finally { shaders.forEach(shader=>gl.deleteShader(shader)); }
  }

  function initialize() {
    initialized=false;
    if (!gl) gl = canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,powerPreference:'low-power'});
    if (!gl) return false;
    inkProgram = program(quadVertex,inkFragment,['a_position','mask','progress','ink']);
    dotProgram = program(dotVertex,dotFragment,['a_dot','size','ringAspect','progress','ratio','pointSize','ink','time','hover','pointer','ringPass','ringReveal','textOpacity','ringQuiet']);
    quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,quad);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    cloud = gl.createBuffer(); ringCloud = gl.createBuffer(); texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    initialized=true;
    return true;
  }

  function rebuild() {
    if (!allowed() || !fontsReady || !gl || lost) return;
    const box = stage.getBoundingClientRect(), textBox = paragraph.getBoundingClientRect();
    width = stage.clientWidth; height = stage.clientHeight;
    if (!width || !height) return;
    const style = getComputedStyle(paragraph);
    const chars = [...paragraph.querySelectorAll('.point-of-view__char')];
    if (!chars.length) throw Error('Text layout unavailable');
    // Measure existing glyph positions: preserve the browser's exact wrapping,
    // alignment, tracking, weight and variable font instead of reflowing text.
    // Sample the final letter positions even while the entrance reveal has
    // translated individual glyphs. Restore that reveal before the next paint.
    let rects;
    section.dataset.textSampling = 'true';
    try { rects = chars.map(char=>char.getBoundingClientRect()); }
    finally { delete section.dataset.textSampling; }
    const nextSignature = [width,height,style.font,style.letterSpacing,...rects.map(r=>`${(r.left-box.left).toFixed(2)},${(r.top-box.top).toFixed(2)}`)].join('|');
    if (ready && signature === nextSignature) return;
    ratio = Math.min(window.devicePixelRatio || 1,2,Math.sqrt(2400000/(width*height)));
    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    ratio = Math.min(ratio,maxTexture/width,maxTexture/height);
    const w = Math.max(1,Math.round(width*ratio)), h = Math.max(1,Math.round(height*ratio));
    canvas.width = w; canvas.height = h;
    const raster = document.createElement('canvas'); raster.width = w; raster.height = h;
    const ctx = raster.getContext('2d',{willReadFrequently:true});
    if (!ctx) throw Error('Text mask unavailable');
    ctx.scale(ratio,ratio);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#ffffff';
    const metrics = ctx.measureText('Hg');
    const fontSize = parseFloat(style.fontSize), lineHeight = parseFloat(style.lineHeight) || fontSize*1.2;
    const ascent = metrics.fontBoundingBoxAscent ?? fontSize*.8;
    const descent = metrics.fontBoundingBoxDescent ?? fontSize*.2;
    const baseline = (lineHeight-ascent-descent)/2+ascent;
    chars.forEach((char,i)=>ctx.fillText(char.textContent,rects[i].left-box.left,rects[i].top-box.top+baseline));
    const rgba = style.color.match(/[\d.]+/g);
    if (rgba?.length >= 3) ink = rgba.slice(0,3).map(Number).map(n=>n/255);
    const pixels = ctx.getImageData(0,0,w,h);
    const budget = width < 761 ? 20000 : 48000;
    let covered = 0;
    for (let i=3;i<pixels.data.length;i+=4) if (pixels.data[i]>20) covered++;
    let cell = Math.max(1,Math.ceil(ratio*1.1),Math.ceil(Math.sqrt(covered/budget)));
    const data = [];
    // Stable release times are shared by the surviving text and its particles.
    // Quantize to the texture's 8-bit channel so release occurs on the same frame.
    do {
    data.length = 0;
    for (let y=0;y<h;y+=cell) for (let x=0;x<w;x+=cell) {
      let alpha=0, sx=0, sy=0;
      const seed = ((Math.imul(x+1979,73856093)^Math.imul(y+11,19349663))>>>0)/4294967295;
      const across = clamp((x/ratio-(textBox.left-box.left))/textBox.width);
      const release = Math.round((.025+.28*across+.025*seed+.008*Math.sin(y/ratio*.07))*255);
      for (let cy=y;cy<Math.min(y+cell,h);cy++) for (let cx=x;cx<Math.min(x+cell,w);cx++) {
        const at=(cy*w+cx)*4, a=pixels.data[at+3];
        alpha+=a; sx+=(cx+.5)*a; sy+=(cy+.5)*a;
        pixels.data[at]=release; pixels.data[at+1]=0; pixels.data[at+2]=0;
      }
      if (alpha>20) data.push(sx/alpha/ratio,sy/alpha/ratio,Math.min(1,alpha/(255*cell*cell)),release/255);
    }
    if (data.length/4<=budget) break;
    cell++;
    } while (true);
    particleSize = cell/ratio*1.10;
    count=data.length/4;
    if (!count) throw Error('Empty glyph mask');
    // Dedicated particles make the ring independent of the amount of text.
    // Density alone supplies the soft gradient: there is no painted color bed.
    const ringRadius=Math.min(width*.43,height*.46);
    ringCount=Math.min(width<761?65000:180000,Math.max(16000,Math.round(ringRadius*ringRadius*1.25)));
    const ringData=new Float32Array(ringCount*4);
    let ringSeed=23571;
    const random=()=>{ringSeed=(Math.imul(ringSeed,1664525)+1013904223)>>>0;return (ringSeed+.5)/4294967296;};
    for(let i=0;i<ringCount;i++){
      ringData[i*4]=random();ringData[i*4+1]=random();
      ringData[i*4+2]=.45+random()*.5;ringData[i*4+3]=random();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,ringCloud);gl.bufferData(gl.ARRAY_BUFFER,ringData,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,cloud); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels.data);
    signature=nextSignature; ready=true;
  }

  function paint(time=0) {
    frame=0;
    if (!ready || !allowed() || lost || document.hidden) return;
    const progress=clamp(state.progress), box=stage.getBoundingClientRect();
    // Keep real, selectable DOM typography at rest and in all fallback states.
    section.dataset.textParticles=progress>.001 ? 'active' : 'idle';
    const textOpacity=1-easeRange(.58,.70,progress);
    // Use the closing paragraph's section progress rather than the shorter
    // dissolution timeline, so the ring traces while that text is appearing.
    const storyProgress=-section.getBoundingClientRect().top/Math.max(1,section.offsetHeight-scene.clientHeight);
    const ringReveal=openingOnly||section.dataset.textVersion==='v4'?0:easeRange(.65,.92,storyProgress);
    section.style.setProperty('--ring-formed',ringReveal.toFixed(4));
    if (box.bottom<0 || box.top>window.innerHeight || progress<=.001) { previousTime=0;return; }
    const dt=previousTime?Math.min(time-previousTime,64):16;previousTime=time;
    ambientTime+=dt/1000*ringReveal;
    pointer.strength+=(pointer.target-pointer.strength)*(1-Math.exp(-dt/240));
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(inkProgram.program);
    gl.uniform1f(inkProgram.uniforms.progress,progress); gl.uniform3fv(inkProgram.uniforms.ink,ink);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texture); gl.uniform1i(inkProgram.uniforms.mask,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,quad); gl.enableVertexAttribArray(inkProgram.attribute);
    gl.vertexAttribPointer(inkProgram.attribute,2,gl.FLOAT,false,0,0); gl.drawArrays(gl.TRIANGLES,0,6);
    gl.disableVertexAttribArray(inkProgram.attribute);
    gl.useProgram(dotProgram.program);
    const u=dotProgram.uniforms;
    gl.uniform1f(u.progress,progress); gl.uniform1f(u.ratio,ratio); gl.uniform1f(u.pointSize,particleSize);
    gl.uniform1f(u.textOpacity,textOpacity);gl.uniform1f(u.ringReveal,ringReveal);
    gl.uniform1f(u.ringQuiet,section.dataset.textVersion==='v3'?1:0);
    gl.uniform2f(u.size,width,height); gl.uniform3fv(u.ink,ink);
    gl.uniform2f(u.ringAspect,...ringAspect);
    gl.uniform1f(u.time,ambientTime);gl.uniform1f(u.hover,pointer.strength);
    gl.uniform2f(u.pointer,pointer.x,pointer.y);
    gl.bindBuffer(gl.ARRAY_BUFFER,cloud); gl.enableVertexAttribArray(dotProgram.attribute);
    gl.vertexAttribPointer(dotProgram.attribute,4,gl.FLOAT,false,0,0);
    gl.uniform1f(u.ringPass,0);
    if(textOpacity>0)gl.drawArrays(gl.POINTS,0,count);
    gl.uniform1f(u.ringPass,1);
    if(ringReveal>0){
      gl.bindBuffer(gl.ARRAY_BUFFER,ringCloud);
      gl.vertexAttribPointer(dotProgram.attribute,4,gl.FLOAT,false,0,0);
      gl.drawArrays(gl.POINTS,0,ringCount);
    }
    gl.disableVertexAttribArray(dotProgram.attribute);
    if(ringReveal>0)schedule();
  }
  function schedule() { if (!frame && allowed() && !document.hidden) frame=requestAnimationFrame(paint); }
  function stop() {
    tween?.scrollTrigger?.kill(); tween?.kill(); tween=null;
    cancelAnimationFrame(frame); frame=0;
    previousTime=0;pointer.target=0;pointer.strength=0;
    section.dataset.textParticles='idle';
    delete section.dataset.openingParticles;
    section.style.removeProperty('--ring-formed');
  }
  function fail() { ready=false; stop(); }
  function sync() {
    stop();
    if (!allowed() || !fontsReady || !supported() || lost || disposed) return;
    try {
      if (!initialized && !initialize()) return;
      rebuild();
      if (!ready) return;
      if (openingOnly) {
        section.style.setProperty('--opening-stage-height', `${stage.clientHeight}px`);
        section.dataset.openingParticles = 'active';
      }
      window.gsap.registerPlugin(window.ScrollTrigger);
      state.progress=0;
      // First run the original DOM entrance reveal (complete at top 5%).
      // Once centered, hold the readable paragraph before peeling its grains.
      tween=window.gsap.fromTo(state,{progress:0},{progress:1,ease:p=>clamp((p-.12)/.88),onUpdate:schedule,
        scrollTrigger:{ trigger:section,start:'top top',
          // Reuse the already pinned narrative stage; adding a second pin would
          // change the page's spacing and interfere with the background scene.
          // The opening-only mode keeps its original duration even though
          // the shared stage now continues into the photo composition.
          end:()=>`top+=${openingOnly ? window.innerHeight*.85*.95 : Math.max(1,section.offsetHeight-scene.clientHeight)*.62} top`,
          scrub:.3,invalidateOnRefresh:true,onRefresh:schedule }
      });
      tween.scrollTrigger.refresh();
      // Switching variants mid-scroll starts at the current position, not zero.
      tween.progress(tween.scrollTrigger.progress); schedule();
    } catch { fail(); }
  }
  function measure() {
    if (!allowed() || !fontsReady || lost) return;
    try {
      rebuild();
      if (openingOnly) section.style.setProperty('--opening-stage-height', `${stage.clientHeight}px`);
      tween?.scrollTrigger?.refresh(); schedule();
    } catch { fail(); }
  }
  function select(version) {
    section.dataset.textVersion=version;
    switcher.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.textVersionChoice===version)));
    document.dispatchEvent(new Event('sensum-text-version'));
    sync();
  }
  switcher.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>select(button.dataset.textVersionChoice)));
  switcher.hidden=openingOnly;
  reduced.addEventListener('change',sync); forced.addEventListener('change',sync);
  if (control) new MutationObserver(sync).observe(control,{attributes:true,attributeFilter:['data-paused']});
  document.addEventListener('visibilitychange',()=>{ previousTime=0;if (document.hidden) { cancelAnimationFrame(frame); frame=0; } else schedule(); });
  section.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||!allowed()||state.progress<.48)return;
    const box=stage.getBoundingClientRect();
    pointer.x=event.clientX-box.left;pointer.y=event.clientY-box.top;
    const radius=Math.min(width*.43,height*.46);
    const distance=Math.abs(Math.hypot((pointer.x-width*.5)/ringAspect[0],(pointer.y-height*.5)/ringAspect[1])-radius);
    pointer.target=1-clamp((distance-radius*.25)/(radius*.40));schedule();
  },{passive:true});
  section.addEventListener('pointerleave',()=>{pointer.target=0;schedule();});
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',measure,{passive:true});
  window.addEventListener('pageshow',sync);
  if ('ResizeObserver' in window) {
    const observer=new ResizeObserver(measure);
    // The background's pause/fallback can change the shared pin travel without
    // resizing the paragraph itself. Refresh against all three layout owners.
    observer.observe(stage); observer.observe(scene); observer.observe(section);
  }
  canvas.addEventListener('webglcontextlost',event=>{ event.preventDefault();lost=true;ready=false;initialized=false;stop(); });
  canvas.addEventListener('webglcontextrestored',()=>{
    lost=false; signature='';
    try { if (initialize()) sync(); } catch { fail(); }
  });
  window.addEventListener('pagehide',event=>{
    if (event.persisted) return;
    disposed=true;stop();
    if (gl && !lost) {
      if (quad) gl.deleteBuffer(quad); if (cloud) gl.deleteBuffer(cloud); if (ringCloud) gl.deleteBuffer(ringCloud); if (texture) gl.deleteTexture(texture);
      if (inkProgram) gl.deleteProgram(inkProgram.program); if (dotProgram) gl.deleteProgram(dotProgram.program);
    }
  });
  if (document.fonts) document.fonts.ready.then(()=>{ fontsReady=true;sync(); },fail);
  else sync();
})();
