import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const check=process.argv.includes('--check');
function expand(name,stack=[]){
 if(stack.includes(name))throw Error('Circular component: '+[...stack,name].join(' -> '));
 return fs.readFileSync(path.join(root,'components',name+'.html'),'utf8').replace(/<!-- component:([\w-]+) -->/g,(_,child)=>expand(child,[...stack,name]));
}
function output(file,content){const target=path.join(root,file);if(check){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==content)throw Error('Stale generated file: '+file)}else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content)}}
const page=expand('page');output('index.html',page);
const head=page.match(/<head>([\s\S]*?)<\/head>/)[1];
const attributes=page.match(/<html ([^>]+)>/)[1];
const names=fs.readdirSync(path.join(root,'components')).filter(n=>n.endsWith('.html')&&n!=='page.html').map(n=>n.slice(0,-5));
for(const name of [...names,'navigation-dark']){
 const dark=/service|capabilities|team|navigation-dark|how-we-work/.test(name);
 let markup=expand(name==='navigation-dark'?'navigation':name);
 // Preview the loader over the complete page so scrolling and section links work after dismissal.
 if(name==='site-loader'){
  output('design-system/previews/site-loader.html',page.replace('<head>','<head><base href="../../">'));
  continue;
 }
 if(name==='navigation-dark')markup=markup.replace('class="header-chrome"','class="header-chrome" data-theme="dark"');
 if(name.startsWith('service-')||name==='capabilities')markup=`<section class="services-stack">${markup}</section>`;
 if(name==='team-switcher')markup=expand('team'); // Controls need their controlled bio and portrait.
 if(name.startsWith('work-card'))markup=`<section class="portfolio-grid" style="max-width:720px;margin:auto">${markup}</section>`;
 if(name.includes('button'))markup=`<div style="display:grid;place-items:center;min-height:320px">${markup}</div>`;
 // Product clarity is a coordinated child of the narrative; keep its parent scene.
 if(name==='product-clarity')markup=expand('point-of-view');
 const scripts = name === 'footer' ? ['text-motion.js','portfolio-heading.js','fluid-button.js','footer.js']
 : name === 'why-us' ? ['text-motion.js','portfolio-heading.js','why-us.js']
 : name === 'why-work' ? ['text-motion.js','vendor/gsap.min.js','vendor/ScrollTrigger.min.js','why-work.js']
 : name === 'selected-work-v2' ? ['selected-work-v2.js']
 : name === 'how-we-work' ? ['text-motion.js','portfolio-heading.js','how-we-work.js']
 : name.startsWith('navigation') ? ['site.js','logo-words.js','fluid-button.js']
 : name.includes('button') ? ['fluid-button.js']
 : name.startsWith('service-') || name === 'capabilities' ? ['services-orb.js']
 : name === 'services' ? ['text-motion.js','portfolio-heading.js','services-orb.js']
 : name.startsWith('team') ? ['text-motion.js','text-reveal.js','particle-portrait.js']
 : name.startsWith('work-card') || name === 'selected-work' ? ['text-motion.js','portfolio-heading.js','portfolio-grid.js','portfolio-hover.js','fluid-button.js']
 : null;
 const previewHead=head.replace(/<script[^>]*src="([^"?]+)[^"]*"[^>]*><\/script>/g,(tag,src)=> scripts ? (scripts.includes(src)?tag:'') : (src==='site.js' && !['hero-v4','site-loader'].includes(name)?'':tag));
 const style=`body{background:${dark?'var(--color-inverse-canvas)':'var(--color-section)'}} ${name.startsWith('navigation')?'.header-chrome{position:relative!important}body{min-height:400px}':''}`;
 output('design-system/previews/'+name+'.html',`<!doctype html><html ${attributes}><head><base href="../../">${previewHead}<style>${style}</style></head><body>${['hero-v4','site-loader'].includes(name)?expand('site-loader')+expand('navigation'):''}<main id="main">${markup}</main></body></html>`);
}
// Case studies: cases/<slug>.html is the content; cases/_shell.html is the page around it.
// Pages are written to work/<slug>.html and share the homepage header and footer.
const caseDir=path.join(root,'cases');
const shell=fs.readFileSync(path.join(caseDir,'_shell.html'),'utf8');
const escapeHtml=text=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const cases=fs.readdirSync(caseDir).filter(n=>n.endsWith('.html')&&!n.startsWith('_'));
for(const file of cases){
 const source=fs.readFileSync(path.join(caseDir,file),'utf8');
 const meta=source.match(/^<!-- case: (\{.*\}) -->\n/);
 if(!meta)throw Error('Missing case metadata comment: cases/'+file);
 const {title,description,cta}=JSON.parse(meta[1]);
 // Section links in the shared header point back at the homepage.
 const navigation=expand('navigation').replace(/href="#/g,'href="../#');
 const footer=expand('footer').replace("Let's build together",escapeHtml(cta));
 const values={title:escapeHtml(title),description:escapeHtml(description),navigation,footer,content:source.slice(meta[0].length).trimEnd()};
 if(source.includes('case-tbd'))console.warn(`Placeholder figures remain in cases/${file}; replace or remove them before publishing.`);
 output('work/'+file,shell.replace(/\{\{(\w+)\}\}/g,(_,key)=>values[key]));
}
console.log(`${check?'Verified':'Built'} homepage, ${names.length} component previews and ${cases.length} case ${cases.length===1?'study':'studies'}.`);
