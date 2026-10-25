import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const out=path.resolve(root,'../_site');
fs.mkdirSync(out,{recursive:true});
// Publish only runtime files and the public library; never node_modules or tooling.
for(const name of fs.readdirSync(root)){
 if(/\.(css|js|html|md)$/.test(name)||['assets','vendor','design-system','storybook'].includes(name))fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true});
}
fs.writeFileSync(path.join(out,'.nojekyll'),'');
