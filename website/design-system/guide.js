(async()=>{
 const text=await fetch('../design-tokens.css').then(r=>r.text());
 const tokens=[...text.matchAll(/(--[\w-]+):\s*([^;]+);/g)];
 for(const [,name,value] of tokens){
  if(name.startsWith('--color-')){
   const card=document.createElement('div');card.className='swatch';
   const chip=document.createElement('div');chip.className='chip';chip.style.background='var('+name+')';
   const label=document.createElement('code');label.textContent=name;
   const val=document.createElement('small');val.textContent=value;
   card.append(chip,label,val);document.querySelector('#color-tokens').append(card);
  }
  if(name.startsWith('--space-')){
   const row=document.createElement('div');row.className='space-row';
   const label=document.createElement('code');label.textContent=name+' / '+value;
   const bar=document.createElement('div');bar.className='space-bar';bar.style.width='var('+name+')';
   row.append(label,bar);document.querySelector('#space-tokens').append(row);
  }
 }
})().catch(()=>{document.querySelector('#color-tokens').textContent='Token source unavailable. See design-tokens.css.'});
