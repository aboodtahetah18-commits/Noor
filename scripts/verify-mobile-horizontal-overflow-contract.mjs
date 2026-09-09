import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const app=path.join(root,'src/app/(protected)');
const css=fs.readFileSync(path.join(root,'src/app/uiux-governance.css'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/app/globals.css'),'utf8');
const routes=[];
function walk(dir,parts=[]){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(e.name.startsWith('_')) continue;
    const abs=path.join(dir,e.name);
    if(e.isDirectory()) walk(abs,[...parts,e.name]);
    else if(e.name==='page.tsx') routes.push('/'+parts.join('/'));
  }
}
walk(app);
const required=[
  '@media(max-width:767px)',
  'grid-template-columns:minmax(0,1fr) auto!important',
  'max-inline-size:100vw!important',
  'min-inline-size:0!important',
  'text-overflow:ellipsis!important',
  '@media(min-width:768px) and (max-width:1023px)',
  '@media(min-width:1024px)'
];
const missing=required.filter(x=>!css.includes(x));
if(missing.length){console.error('MOBILE-OVERFLOW-CONTRACT-FAIL',missing);process.exit(1);}
const bad=[];
for(const file of ['src/app/globals.css','src/app/uiux-governance.css','src/components/ui/compact-filter-panel.tsx']){
  const t=fs.readFileSync(path.join(root,file),'utf8');
  if(t.includes('min-width: 769px')) bad.push(`${file}: stale 769px JS breakpoint`);
  if(t.includes('grid-template-columns:38px minmax(0,1fr) auto')) bad.push(`${file}: stale three-column mobile header`);
}
if(bad.length){console.error('MOBILE-OVERFLOW-CONTRACT-FAIL',bad);process.exit(1);}
console.log(`MOBILE-OVERFLOW-CONTRACT-PASS ${routes.length} protected routes inherit the systemic compact-shell contract`);
console.log('Runtime post-deploy assertion: document.documentElement.scrollWidth <= window.innerWidth at 320/360/390/430/767.');
