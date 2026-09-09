import fs from 'node:fs';
import path from 'node:path';

const root='src/app/(protected)';
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const pages=walk(root).filter(f=>f.endsWith('page.tsx'));
if(pages.length<60) throw new Error(`expected >=60 protected pages, found ${pages.length}`);
const exceptions=new Set(['src/app/(protected)/reports/cycles/[id]/page.tsx']);
const uncovered=[];
for(const file of pages){const s=fs.readFileSync(file,'utf8');if(!s.includes('p47-')&&!exceptions.has(file)) uncovered.push(file);}
if(uncovered.length) throw new Error(`pages outside P47 visual shell:\n${uncovered.join('\n')}`);
const uiText=pages.map(f=>fs.readFileSync(f,'utf8')).join('\n');
if(/WF-\d|VP-\d|P4\d(?:\.|\s|·)/.test(uiText)) throw new Error('internal phase/wireframe identifiers remain user-visible');
if(uiText.includes('2026-08-27')||uiText.includes('27 أغسطس 2026')) throw new Error('stale hardcoded onboarding date remains');
const css=fs.readFileSync('src/app/globals.css','utf8');
for(const n of ['P47.13 + P47.14','.p47-closure-page','@media(max-width:767px)','min-height:var(--ux-size-12)']) if(!css.includes(n)) throw new Error(`missing closure CSS: ${n}`);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const atLeast=(version,major,minor,patch)=>{const [a=0,b=0,c=0]=version.split('.').map(Number);if(a!==major)return a>major;if(b!==minor)return b>minor;return c>=patch};
if(!atLeast(pkg.version,0,47,14)) throw new Error('version must be 0.47.14 or newer');
console.log(`P47 closure audit: PASS (${pages.length} protected pages)`);
console.log('BUILD20-FINAL-CROSS-DEVICE-AUDIT-FINGERPRINT');
