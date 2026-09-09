import { readFileSync } from 'node:fs';
const atLeast=(v,a,b,c)=>{const x=v.split('.').map(Number);return x[0]>a||(x[0]===a&&(x[1]>b||(x[1]===b&&x[2]>=c)));};
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const dialog=readFileSync('src/components/overlays/action-dialog.tsx','utf8');
const tabs=readFileSync('src/components/ui/section-tabs.tsx','utf8');
const icons=readFileSync('src/components/ui/action-icon.tsx','utf8');
const css=readFileSync('src/app/globals.css','utf8');
const gate=readFileSync('scripts/production-quality-gate.mjs','utf8');
const checks=[
 ['version',atLeast(pkg.version,0,49,10)],
 ['quality gate wiring',gate.includes('verify-p49-10.mjs')],
 ['dialog aria modal',dialog.includes('aria-modal="true"')&&dialog.includes('aria-describedby')],
 ['dialog backdrop close',dialog.includes('handleBackdropClick')],
 ['dialog focus return',dialog.includes('triggerRef.current?.focus()')],
 ['dialog icon title',dialog.includes('p49-dialog-title-icon')&&dialog.includes('<ActionIcon name={icon}')],
 ['icon close glyph',icons.includes("'close'")&&icons.includes('name="close"')===false],
 ['tabs aria controls',tabs.includes('aria-controls={panelId}')&&tabs.includes('aria-labelledby={tabId}')],
 ['tabs roving tabindex',tabs.includes('tabIndex={selected?0:-1}')],
 ['tabs keyboard navigation',tabs.includes("event.key==='ArrowRight'")&&tabs.includes("event.key==='Home'")&&tabs.includes("event.key==='End'" )],
 ['dialog sticky header',/\.p49-dialog-header\{position:sticky;top:0;z-index:var\(--ux-z-base\);align-items:center;?\}/.test(css)],
 ['dialog scroll body',css.includes('.p49-dialog-body{overflow:auto;overscroll-behavior:contain')],
 ['consistent focus visible',css.includes('.p49-modal-trigger:focus-visible')],
 ['sticky dialog actions',css.includes('.p49-dialog-actions{position:sticky;bottom:0')],
 ['reduced motion support',css.includes('@media(prefers-reduced-motion:reduce)')],
 ['legacy P49.9 accepts later versions',(()=>{const p49_9=readFileSync('scripts/verify-p49-9.mjs','utf8');return p49_9.includes('atLeast(pkg.version,0,49,9)')||p49_9.includes('P49.9 / CR-002 visual system');})()],
 ['legacy P49.5 accepts later versions',readFileSync('scripts/verify-p49-5.mjs','utf8').includes('atLeast(pkg.version,0,49,5)')],
];
console.log('=== P49.10 final UX consistency sweep ===');
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed)process.exit(1);
console.log('P49.10 final UX consistency sweep: PASS');
