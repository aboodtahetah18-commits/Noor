import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const UI_EXT = new Set(['.css','.tsx','.jsx','.ts']);
const roots = ['src/app','src/components','src/features'];
const findings = [];
const approvedBreakpointNumbers = new Set(['767','768','1023','1024','1439','1440']);
const allowedVisualVars = /^(ux-|namaa-|ndos-)/;

const tokensPath = path.join(root,'src/design-system/ndos-v1.2.tokens.json');
const ndosPath = path.join(root,'src/design-system/ndos-v1.2.css');
const tokens = JSON.parse(fs.readFileSync(tokensPath,'utf8'));
const ndos = fs.readFileSync(ndosPath,'utf8');

function filesUnder(dir){
  const abs=path.join(root,dir);
  if(!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs,{withFileTypes:true}).flatMap(entry=>{
    const rel=path.join(dir,entry.name);
    if(entry.isDirectory()) return filesUnder(rel);
    return UI_EXT.has(path.extname(entry.name)) ? [rel] : [];
  });
}
function report(file,line,kind,value){ findings.push({file,line,kind,value:String(value).slice(0,180)}); }
function lineOf(text,index){ return text.slice(0,index).split('\n').length; }
function withoutGovernedRoots(file,text){
  if(file!=='src/app/uiux-governance.css' && file!=='src/design-system/ndos-v1.2.css') return text;
  let out=text;
  while(true){
    const start=out.indexOf(':root');
    if(start<0) break;
    const open=out.indexOf('{',start); if(open<0) break;
    let depth=0,end=-1;
    for(let i=open;i<out.length;i++){
      if(out[i]==='{') depth++;
      else if(out[i]==='}' && --depth===0){ end=i+1; break; }
    }
    if(end<0) break;
    out=out.slice(0,start)+'\n'.repeat(out.slice(start,end).split('\n').length-1)+out.slice(end);
  }
  return out;
}

const files=[...new Set(roots.flatMap(filesUnder))].sort();
for(const file of files){
  const raw=fs.readFileSync(path.join(root,file),'utf8');
  const uncommented=raw.replace(/\/\*[\s\S]*?\*\//g,'');
  const text=withoutGovernedRoots(file,uncommented);
  for(const [kind,re] of [
    ['raw color',/(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/g],
    ['gradient',/(?:linear|radial|conic)-gradient\(/gi],
  ]) for(const m of text.matchAll(re)) report(file,lineOf(text,m.index),kind,m[0]);

  if(file.endsWith('.css')){
    const checks=[
      ['raw radius',/border-radius\s*:\s*([^;}]*)/gi,(v)=>/(?:\d*\.?\d+)(?:px|rem|em|%)/i.test(v)],
      ['raw shadow',/box-shadow\s*:\s*([^;}]*)/gi,(v)=>!/^\s*var\(--(?:ux|namaa|ndos)-/i.test(v)],
      ['raw spacing',/(?:margin|padding|gap|row-gap|column-gap|scroll-padding)(?:-[a-z-]+)?\s*:\s*([^;}]*)/gi,(v)=>/-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)\b/i.test(v)],
      ['raw font-size',/font-size\s*:\s*([^;}]*)/gi,(v)=>/(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)\b/i.test(v)],
      ['raw motion duration',/(?:transition|animation)(?:-[a-z-]+)?\s*:\s*([^;}]*)/gi,(v)=>/-?(?:\d+(?:\.\d+)?|\.\d+)(?:ms|s)\b/i.test(v)],
    ];
    for(const [kind,re,bad] of checks) for(const m of text.matchAll(re)) if(bad(m[1])) report(file,lineOf(text,m.index),kind,m[1].trim());
    for(const m of text.matchAll(/var\(--([a-zA-Z0-9_-]+)/g)) if(!allowedVisualVars.test(m[1])) report(file,lineOf(text,m.index),'non-governed visual variable',m[0]);
    for(const m of text.matchAll(/backdrop-filter\s*:\s*blur\(/gi)) report(file,lineOf(text,m.index),'unapproved blur/glass effect',m[0]);
    for(const m of text.matchAll(/@media[^\{]+/gi)) for(const n of m[0].matchAll(/(?:min|max)-width\s*:\s*(\d+)px/gi)) if(!approvedBreakpointNumbers.has(n[1])) report(file,lineOf(text,m.index),'unapproved breakpoint',n[0]);
  }
}

if(tokens.meta?.identity_status!=='FROZEN') report('src/design-system/ndos-v1.2.tokens.json',1,'identity not frozen',tokens.meta?.identity_status);
if(tokens.meta?.version!=='1.2 FINAL') report('src/design-system/ndos-v1.2.tokens.json',1,'unexpected NDOS version',tokens.meta?.version);

const expectedAliases = new Map([
  ['--namaa-green-900',tokens.color['brand.green.900']],
  ['--namaa-green-700',tokens.color['brand.green.700']],
  ['--namaa-gold-500',tokens.color['brand.gold.500']],
  ['--namaa-gold-action',tokens.color['brand.gold.action']],
  ['--namaa-cream',tokens.color['surface.cream']],
  ['--namaa-surface-warm',tokens.color['surface.warm']],
  ['--namaa-card',tokens.color['surface.card']],
  ['--namaa-text',tokens.color['text.primary']],
  ['--namaa-muted',tokens.color['text.muted']],
  ['--namaa-border',tokens.color['border.default']],
  ['--namaa-border-strong',tokens.color['border.strong']],
  ['--namaa-success',tokens.color['state.success']],
  ['--namaa-warning',tokens.color['state.warning']],
  ['--namaa-danger',tokens.color['state.danger']],
]);
for(const [name,value] of expectedAliases){
  const needle=`${name}:${value}`;
  if(!ndos.includes(needle)) report('src/design-system/ndos-v1.2.css',1,'frozen alias mismatch',needle);
}

const forbiddenLegacy = ['#0B2D5B','#0EA5A2','#2563EB','#06B6D4','"Tajawal"'];
for(const value of forbiddenLegacy) if(ndos.includes(value)) report('src/design-system/ndos-v1.2.css',1,'legacy identity literal in final NDOS layer',value);

const typographyChecks = [
  `--ux-type-page-title-size:${tokens.typography.h1.size}px`,
  `--ux-type-section-title-size:${tokens.typography.h2.size}px`,
  `--ux-type-card-title-size:${tokens.typography.h3.size}px`,
  `--ux-type-body-size:${tokens.typography.body.size}px`,
  `--ux-type-caption-size:${tokens.typography.caption.size}px`,
  `--ux-type-number-lg-size:${tokens.typography.kpi.size}px`,
];
for(const needle of typographyChecks) if(!ndos.includes(needle)) report('src/design-system/ndos-v1.2.css',1,'typography token mismatch',needle);
for(const value of tokens.spacing) if(!ndos.includes(`:${value}px`) && !ndos.includes(`-${value}:`)) report('src/design-system/ndos-v1.2.css',1,'spacing scale value not represented',`${value}px`);

if(findings.length){
  console.error(`UI-TOKEN-COMPLIANCE-FAIL ${findings.length} violation(s)`);
  for(const f of findings.slice(0,200)) console.error(`${f.file}:${f.line} ${f.kind}: ${f.value}`);
  if(findings.length>200) console.error(`... ${findings.length-200} additional violations`);
  process.exit(1);
}
console.log(`UI-TOKEN-COMPLIANCE-PASS ${files.length} UI source files audited against frozen NDOS ${tokens.meta.version}`);
