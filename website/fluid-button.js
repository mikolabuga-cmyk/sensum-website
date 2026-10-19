/* Original lightweight glass shader; the anchor remains the interactive control. */
(() => {
  document.querySelectorAll('.button--primary').forEach(button => {
  const canvas = document.createElement('canvas');
  canvas.className = 'fluid-button__surface';
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
      uniform float edgePhase;
      void main(){
        vec2 p=(uv-.5)*size; vec2 b=size*.5;
        // The capsule geometry stays fixed; only its internal lighting moves.
        // CSS clips the full-bleed surface to the fixed button silhouette.
        vec2 cursor=(pointer-.5)*size;
        // The raised color wave swells and settles during the hover pulse.
        float activity=hover*energy;
        float flow=time*.38;
        float drift=.055*sin(flow)+.025*sin(flow*.63+1.2);
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
        vec2 local=p-origin;
        float x=dot(local,tangent)/b.x;
        float bottom=max(0.,dot(local,inward)/size.y);
        float corner=smoothstep(.30,.95,abs(sin(angle)));
        // One broad asymmetric crest, shallow at the ends and lifted centrally.
        // All measurements follow the button height, preserving the reference shape.
        float center=(-.08+drift)*(1.-corner*.65);
        float sideWidth=x<center?(.49+.05*activity):(.61+.06*activity);
        float crest=exp(-pow(abs((x-center)/sideWidth),1.8));
        float fold=.014*sin(x*5.+flow*.91)+.009*sin(x*8.-flow*.67);
        float shoulder=exp(-pow((x+.34+.08*sin(flow*.8))/.34,2.));
        float height=.022+(.27+.085*hover+.05*activity+touch.y*.035+fold)*crest
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
        float breath=.91+.10*hover+.07*activity+.025*sin(flow*.85);
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
        gl_FragColor=vec4(color,1.);
      }`);
    program=gl.createProgram(); gl.attachShader(program,vertex); gl.attachShader(program,fragment); gl.linkProgram(program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('Glass shader link unavailable');
    gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    uniforms=Object.fromEntries(['size','pointer','time','hover','ripple','energy','edgePhase'].map(k=>[k,gl.getUniformLocation(program,k)]));
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
      time+=dt*(1-pressure*.60);
      if(target) hoverTime+=dt;
      ripple+=dt;
    }
    if(Math.abs(pressure-target)<.001) pressure=target;
    const width=button.clientWidth,height=button.clientHeight,ratio=Math.min(devicePixelRatio,2);
    if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)) {canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);gl.viewport(0,0,canvas.width,canvas.height);}
    gl.uniform2f(uniforms.size,width,height);gl.uniform2f(uniforms.pointer,cursorX,cursorY);
    gl.uniform1f(uniforms.edgePhase,edgePhase);
    gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.hover,pressure);gl.uniform1f(uniforms.ripple,ripple);gl.uniform1f(uniforms.energy,energyAt(hoverTime));
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);
    if(!still) frame=requestAnimationFrame(draw); else previous=0;
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
  button.addEventListener('focus',()=>{if(!hovered && !focused) hoverTime=0;focused=true;wake();});
  button.addEventListener('blur',()=>{focused=false;wake();});
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
