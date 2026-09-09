import { readFileSync } from 'node:fs';
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const css=readFileSync('src/app/globals.css','utf8');
const gov=readFileSync('src/app/uiux-governance.css','utf8');
const gate=readFileSync('scripts/production-quality-gate.mjs','utf8');
const checks=[
 ['version',(()=>{const [a,b,c]=pkg.version.split('.').map(Number);return a>0||(a===0&&(b>49||(b===49&&c>=11)));})()],
 ['quality gate wiring',gate.includes('verify-p49-11.mjs')],
 ['governed canvas background',gov.includes('--ux-surface-canvas:var(--ux-color-canvas)')&&gov.includes('.protected-app-shell')],
 ['page header hierarchy',gov.includes('h1,.protected-app-shell h1')&&gov.includes('var(--ux-type-page-title-size)')],
 ['system-wide card tokens',gov.includes('.card,.panel,.account-total,.account-card')&&gov.includes('var(--ux-shadow-xs)')],
 ['semantic feedback tokens',gov.includes('--ux-state-success')&&gov.includes('--ux-state-warning')&&gov.includes('--ux-state-error')],
 ['primary buttons use approved token',gov.includes('background:var(--ux-action-primary)!important')&&gov.includes('color:var(--ux-text-inverse)!important')],
 ['strong field affordance tokenized',gov.includes('border:var(--ux-border-width-1) var(--ux-border-style-default) var(--ux-border-strong)!important')&&gov.includes('outline:var(--ux-border-width-2) var(--ux-border-style-default) var(--ux-focus-ring)!important')],
 ['modal workspace tokenized',gov.includes('.p49-action-dialog::backdrop')&&gov.includes('var(--ux-ink-a32)')&&gov.includes('var(--ux-shadow-md)')],
 ['segmented internal pages retained',css.includes('.p49-section-tabs')&&css.includes('.p49-tabs-bar')],
 ['desktop navigation governed',gov.includes('.p47-desktop-sidebar')&&gov.includes('background:var(--ux-surface-inverse)!important')],
 ['mobile visual system governed',gov.includes('.p47-mobile-topbar.p4913-mobile-topbar')&&gov.includes('.mobile-bottom-nav')],
 ['no gradients remain',!/(?:linear|radial|conic)-gradient\(/i.test(css+gov)],
 ['P49.10 future-compatible',readFileSync('scripts/verify-p49-10.mjs','utf8').includes('atLeast(pkg.version,0,49,10)')],
];
console.log('=== P49.11 governed visible UI system ===');let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log('P49.11 governed visible UI system: PASS');
