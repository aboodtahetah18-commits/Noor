import fs from 'node:fs';
const fail=[];
const must=[
 ['src/components/ui/entity-actions.tsx','EntityActionRail'],
 ['src/components/ui/print-button.tsx','window.print'],
 ['src/design-system/experience.css','.mx-action-rail'],
 ['src/design-system/experience.css','touch-action:pan-x'],
 ['src/components/overlays/action-dialog.tsx','PrintButton'],
 ['docs/ui-ux/INTERACTION_CAPABILITIES_CONTRACT_20260909.md','hard deletion is forbidden'],
];
for(const [file,token] of must){const text=fs.readFileSync(file,'utf8');if(!text.includes(token))fail.push(`${file} missing ${token}`)}
if(fail.length){console.error('INTERACTION-CAPABILITIES-CONTRACT-FAIL');fail.forEach(x=>console.error('-',x));process.exit(1)}
console.log('INTERACTION-CAPABILITIES-CONTRACT-PASS');
