const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('shared components reproduce the checked-in static homepage exactly',()=>{
 const before=fs.readFileSync(path.join(root,'index.html'),'utf8');
 execFileSync(process.execPath,[path.join(root,'tools/build-components.mjs')]);
 assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),before);
 assert.equal(before.includes('<!-- component:'),false);
});
test('all component previews resolve local runtime assets under a project base',()=>{
 for(const name of fs.readdirSync(path.join(root,'design-system/previews'))){
  const html=fs.readFileSync(path.join(root,'design-system/previews',name),'utf8');
  assert.ok(html.includes('<base href="../../">'),name);
  for(const [,url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
   if(/^(https?:|mailto:|\.\.\/)/.test(url))continue;
   assert.ok(fs.existsSync(path.join(root,url.split('?')[0])),name+': '+url);
  }
 }
});
