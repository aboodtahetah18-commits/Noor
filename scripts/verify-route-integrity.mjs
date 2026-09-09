import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const appDir=path.join(root,'src/app');
const files=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory()) walk(p); else files.push(p)}}
walk(appDir);

const pages=files.filter(p=>p.endsWith(`${path.sep}page.tsx`));
function routePattern(file){
  let rel=path.relative(appDir,path.dirname(file)).replace(/\\/g,'/');
  rel=rel.split('/').filter(part=>!/^\(.+\)$/.test(part)).join('/');
  const parts=rel?rel.split('/'):[];
  const regexParts=parts.map(part=>{
    if(/^\[\.\.\..+\]$/.test(part)) return '.+';
    if(/^\[\[\.\.\..+\]\]$/.test(part)) return '.*';
    if(/^\[.+\]$/.test(part)) return '[^/]+';
    return part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  });
  return new RegExp(`^/${regexParts.join('/')}${regexParts.length?'':'?'}$`);
}
const patterns=pages.map(routePattern);
const staticLinks=[];
for(const file of files.filter(p=>/\.(tsx|ts)$/.test(p))){
  const text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(/href\s*=\s*["'](\/[^"']*)["']/g)){
    let href=match[1].split('#')[0].split('?')[0]||'/';
    if(href.startsWith('/api/')) continue;
    staticLinks.push({file:path.relative(root,file),href});
  }
}
const broken=[];
for(const link of staticLinks){if(!patterns.some(r=>r.test(link.href))) broken.push(link)}
console.log(`Pages discovered: ${pages.length}`);
console.log(`Static internal links scanned: ${staticLinks.length}`);
if(broken.length){
  console.error('Broken static routes:');
  for(const b of broken) console.error(`- ${b.href} in ${b.file}`);
  process.exit(1);
}
console.log('Route integrity: PASS');
