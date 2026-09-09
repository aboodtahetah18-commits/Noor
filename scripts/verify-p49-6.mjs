import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const src = join(root, 'src');

function walk(dir) {
  const out=[];
  for (const name of readdirSync(dir)) {
    const full=join(dir,name);
    const st=statSync(full);
    if(st.isDirectory()) out.push(...walk(full));
    else if(/\.tsx$/.test(name)) out.push(full);
  }
  return out;
}

const files=walk(src);
let totalButtons=0;
const failures=[];
for (const file of files) {
  const text=readFileSync(file,'utf8');
  let formDepth=0;
  const token=/<\/?form\b[^>]*>|<button\b[^>]*>/gs;
  for (const match of text.matchAll(token)) {
    const tag=match[0];
    if(tag.startsWith('<form')) { formDepth += 1; continue; }
    if(tag.startsWith('</form')) { formDepth=Math.max(0,formDepth-1); continue; }
    totalButtons += 1;
    if(formDepth>0) continue;
    const hasHandler=/\b(onClick|onMouseDown|onPointerDown|onKeyDown|formAction)\s*=/.test(tag);
    const explicitSubmit=/\btype\s*=\s*["']submit["']/.test(tag);
    if(hasHandler || explicitSubmit) continue;
    const index=match.index ?? 0;
    const line=text.slice(0,index).split('\n').length;
    failures.push(`${relative(root,file)}:${line} — button has no execution path`);
  }
}

const mobileNav=readFileSync(join(src,'app','(protected)','mobile-bottom-nav.tsx'),'utf8');
const dashboard=readFileSync(join(src,'app','(protected)','dashboard','page.tsx'),'utf8');
const expensesPage=join(src,'app','(protected)','expenses','page.tsx');
const governedDestinations=['/dashboard','/transactions','/budget','/advisor','/more'];
for(const route of governedDestinations){
  if(!mobileNav.includes(`href: '${route}'`)) failures.push(`mobile governed destination missing ${route}`);
}
if(/role=["']dialog["']/.test(mobileNav)||/mobile-quick-add/.test(mobileNav)) failures.push('legacy mobile quick-add dialog must not return under CR-002');
if(!statSync(expensesPage).isFile() || !dashboard.includes('href="/expenses"')) failures.push('CR-002 full-page financial add entrypoint missing');

console.log('=== P49.6 interactive control execution hardening ===');
console.log(`TSX files checked: ${files.length}`);
console.log(`Buttons checked: ${totalButtons}`);
if(failures.length){
  for(const item of failures) console.error(`FAIL ${item}`);
  process.exit(1);
}
console.log(`PASS all ${totalButtons} buttons have an execution path`);
console.log('PASS CR-002 mobile navigation and full-page financial entrypoint retain executable controls');
console.log('P49.6 interactive control execution hardening: PASS');
