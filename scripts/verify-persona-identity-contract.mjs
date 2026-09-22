import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const requiredPersonaKeys=[
  'central-governor','central-bank-manager','hilal-manager','solvency-manager','assets-manager',
  'budget-spending-owner','obligations-owner','goals-owner','investment-owner',
  'liquidity-protection-owner','economic-advisor','central-secretary',
];
const assetSource=fs.readFileSync(path.join(root,'src/components/conversations/persona-assets.ts'),'utf8');
const workspace=fs.readFileSync(path.join(root,'src/components/conversations/persistent-conversation-workspace.tsx'),'utf8');
const roleSheet=fs.readFileSync(path.join(root,'src/components/conversations/algorithm-role-mobile-sheet.tsx'),'utf8');
const mappings=new Map([...assetSource.matchAll(/'([^']+)':'([^']+)'/g)].map(match=>[match[1],match[2]]));
const failures=[];
for(const key of requiredPersonaKeys){
  const asset=mappings.get(key);
  if(!asset){failures.push('missing persona mapping: '+key);continue;}
  const absolute=path.join(root,'public',asset.replace(/^\//,''));
  if(!fs.existsSync(absolute)) failures.push('missing persona asset: '+asset);
  else if(fs.statSync(absolute).size<3000) failures.push('persona asset appears invalid or too small: '+asset);
}
if(workspace.includes('personaBankBadge')) failures.push('bank badge must not be rendered inside person portraits');
if(workspace.includes('namaa-algorithmic-personas.jpg')&&workspace.includes('entityPersonaReference')) failures.push('aggregate persona sheet must not be rendered in team view');
if(!workspace.includes('const rolePortraitByKey=NAMAA_PERSONA_ASSETS')) failures.push('team cards must use NAMAA_PERSONA_ASSETS');
if(!roleSheet.includes('const roleAvatar=NAMAA_PERSONA_ASSETS')) failures.push('role sheet must use NAMAA_PERSONA_ASSETS');
if(failures.length){console.error('PERSONA-IDENTITY-CONTRACT-FAIL');for(const failure of failures)console.error('- '+failure);process.exit(1);}
console.log('PERSONA-IDENTITY-CONTRACT-PASS');
