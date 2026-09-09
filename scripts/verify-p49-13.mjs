import { readFileSync } from 'node:fs';
const css=readFileSync('src/app/globals.css','utf8')+'\n'+readFileSync('src/app/uiux-governance.css','utf8');
const top=readFileSync('src/app/(protected)/mobile-top-bar.tsx','utf8');
const bottom=readFileSync('src/app/(protected)/mobile-bottom-nav.tsx','utf8');
const checks=[
 ['mobile compact boundary',css.includes('@media(max-width:767px)')],
 ['mobile header approved shell',top.includes('mustaqbali-mobile-header')&&top.includes('/brand/mustaqbali-logo.png')],
 ['secondary mobile drawer',top.includes('mustaqbali-mobile-drawer')&&top.includes('aria-modal="true"')],
 ['bottom nav five primary destinations',['/dashboard','/transactions','/budget','/advisor','/more'].every(r=>bottom.includes(r))],
 ['adaptive 1–2 column forms',css.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important')],
 ['44px effective target',css.includes('--ux-size-11:44px')],
 ['safe-area handling',css.includes('safe-area-inset-top')&&css.includes('safe-area-inset-bottom')],
];
console.log('=== P49.13 / CR-002 global mobile compact UX ===');let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++;}if(fail)process.exit(1);console.log('P49.13 / CR-002 mobile compact UX: PASS');
