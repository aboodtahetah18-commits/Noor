import { readFileSync } from 'node:fs';
const gov=readFileSync('src/app/uiux-governance.css','utf8');
const layout=readFileSync('src/app/layout.tsx','utf8');
const dialog=readFileSync('src/components/overlays/action-dialog.tsx','utf8');
const lucide=readFileSync('src/components/ui/lucide-icon.tsx','utf8');
const checks=[
 ['Mustaqbali identity tokens',gov.includes('--ux-brand-primary:#0B2D5B')&&gov.includes('--ux-brand-secondary:#0EA5A2')&&gov.includes('--ux-page-bg:#F1F5F9')],
 ['Tajawal product typography',layout.includes("Tajawal")&&!gov.includes('IBM Plex Sans Arabic')],
 ['dialog governed surface',gov.includes('background:var(--ux-card-bg)')||gov.includes('background:var(--ux-surface-default)')],
 ['focus visible',gov.includes(':focus-visible')&&gov.includes('--ux-focus-ring:var(--ux-brand-secondary)')],
 ['governed Lucide icon library',lucide.includes('<svg')&&lucide.includes('viewBox="0 0 24 24"')],
 ['dialog semantics retained',dialog.includes('aria-modal')||dialog.includes('role="dialog"')],
];
console.log('=== P49.9 / CR-002 visual system ===');let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++;}if(fail)process.exit(1);console.log('P49.9 / CR-002 visual system: PASS');
