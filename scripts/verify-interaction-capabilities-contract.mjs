import fs from 'node:fs';
const fail=[];
const must=[
 ['src/components/ui/entity-actions.tsx','EntityActionRail'],
 ['src/components/ui/entity-actions.tsx','mx-action-rail'],
 ['src/components/ui/print-button.tsx','window.print'],
 ['src/design-system/interaction-components.css','.mx-action-rail'],
 ['src/design-system/interaction-components.css','touch-action:pan-x'],
 ['src/design-system/interaction-components.css','.mx-action-chip'],
 ['src/components/overlays/action-dialog.tsx','PrintButton'],
 ['docs/ui-ux/INTERACTION_CAPABILITIES_CONTRACT_20260909.md','hard deletion is forbidden'],
];
for(const [file,token] of must){
  if(!fs.existsSync(file)){fail.push(`${file} missing`);continue}
  const text=fs.readFileSync(file,'utf8');
  if(!text.includes(token))fail.push(`${file} missing ${token}`)
}
for(const retired of ['src/design-system/experience.css','src/design-system/brand-refresh.css']){
  if(fs.existsSync(retired))fail.push(`retired interaction/brand layer still exists: ${retired}`)
}
if(fail.length){console.error('INTERACTION-CAPABILITIES-CONTRACT-FAIL');fail.forEach(x=>console.error('-',x));process.exit(1)}
console.log('INTERACTION-CAPABILITIES-CONTRACT-PASS governed action rail, print capability and hard-delete prohibition are preserved');
