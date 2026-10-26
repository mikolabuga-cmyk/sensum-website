/* A single selected step; hover, focus and tap share the same state. */
(() => {
 const section=document.querySelector('.how-we-work');
 if(!section)return;
 const steps=[...section.querySelectorAll('.work-step')];
 const compact=matchMedia('(max-width: 900px)');
 let selected=-1;
 // Flex distributes the remaining space after each item's padding and borders.
 // Measure only the rail, never the animated item width, to keep wrapping stable.
 const rail=section.querySelector('.how-we-work__steps');
 function sizeDescriptions(){
  if(compact.matches)return;
  const boxes=steps.map(step=>{
   const style=getComputedStyle(step);
   const padding=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight);
   const border=parseFloat(style.borderLeftWidth)+parseFloat(style.borderRightWidth);
   return {padding,border};
  });
  const free=rail.clientWidth-boxes.reduce((sum,box)=>sum+box.padding+box.border,0);
  boxes.forEach((box,i)=>{
   const finalWidth=free*2.7/(steps.length-1+2.7)+box.padding;
   steps[i].style.setProperty('--work-step-detail-width',Math.max(0,finalWidth*.55-24)+'px');
  });
 }
 const resizeObserver=new ResizeObserver(sizeDescriptions);
 resizeObserver.observe(rail);
 function select(index){
  selected=index;
  steps.forEach((step,i)=>{
   const open=compact.matches||i===selected;
   step.toggleAttribute('data-active',i===selected);
   step.querySelector('button').setAttribute('aria-expanded',String(open));
   step.querySelector('.work-step__detail').setAttribute('aria-hidden',String(!open));
  });
 }
 steps.forEach((step,i)=>{
  step.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&!compact.matches)select(i)});
  step.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'&&!compact.matches)select(-1)});
  step.querySelector('button').addEventListener('focus',()=>select(i));
  step.querySelector('button').addEventListener('blur',()=>{if(selected===i)select(-1)});
  step.querySelector('button').addEventListener('click',()=>select(i));
  step.querySelector('button').addEventListener('keydown',event=>{
   const next=event.key==='ArrowRight'?Math.min(i+1,steps.length-1):event.key==='ArrowLeft'?Math.max(i-1,0):event.key==='Home'?0:event.key==='End'?steps.length-1:null;
   if(next!==null){event.preventDefault();steps[next].querySelector('button').focus()}
  });
 });
 compact.addEventListener('change',()=>{sizeDescriptions();select(selected)});
 section.setAttribute('data-enhanced','');
 sizeDescriptions();
 select(-1);
})();
