import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
const tests=readdirSync(path.join(root,'website/tests')).filter(name=>name.endsWith('.test.cjs')).map(name=>path.join(root,'website/tests',name));
const result=spawnSync(process.execPath,['--test',...tests],{cwd:root,stdio:'inherit'});
process.exit(result.status??1);
