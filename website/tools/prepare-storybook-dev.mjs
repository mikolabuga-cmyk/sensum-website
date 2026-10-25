import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'.storybook-public');
fs.mkdirSync(out,{recursive:true});
for(const name of fs.readdirSync(root)){
 if(/\.(css|js|html|md)$/.test(name)||['assets','vendor','design-system'].includes(name))fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true});
}
