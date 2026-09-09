import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const UI_EXT = new Set(['.css','.tsx','.jsx','.ts']);
const roots = ['src/app','src/components','src/features'];
const findings = [];
const approvedBreakpointNumbers = new Set(['767','768','1023','1024','1439','1440']);
const allowedVisualVars = /^ux-/;

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
function withoutGovernedRoot(file,text){
  if(file!=='src/app/uiux-governance.css') return text;
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
  // Token compliance audits executable source, not comments. This also avoids
  // legacy contract literals in documentation comments being misclassified as CSS declarations.
  const uncommented=raw.replace(/\/\*[\s\S]*?\*\//g,'');
  const text=withoutGovernedRoot(file,uncommented);
  const patterns=[
    ['raw color',/(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/g],
    ['gradient',/(?:linear|radial|conic)-gradient\(/gi],
  ];
  for(const [kind,re] of patterns){ for(const m of text.matchAll(re)) report(file,lineOf(text,m.index),kind,m[0]); }

  if(file.endsWith('.css')){
    const declarationChecks=[
      ['raw radius',/border-radius\s*:\s*([^;}]*)/gi,(v)=>/(?:^|\s|\/)0(?:\s|$)|(?:\d*\.?\d+)(?:px|rem|em|%)/i.test(v)],
      ['raw shadow',/box-shadow\s*:\s*([^;}]*)/gi,(v)=>!/^\s*var\(--ux-shadow-/i.test(v)],
      ['raw spacing',/(?:margin|padding|gap|row-gap|column-gap|scroll-padding)(?:-[a-z-]+)?\s*:\s*([^;}]*)/gi,(v)=>/(?:^|\s)0(?:\s|$)|-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)\b/i.test(v)],
      ['raw border width/style',/(?:border|border-top|border-right|border-bottom|border-left|border-inline|border-inline-start|border-inline-end|border-block|border-block-start|border-block-end)\s*:\s*([^;}]*)/gi,(v)=>/(?:^|\s)(?:0|\d+(?:\.\d+)?(?:px|rem|em)|solid|dashed|dotted)(?:\s|$)/i.test(v)],
      ['raw z-index',/z-index\s*:\s*([^;}]*)/gi,(v)=>/^\s*\d+\s*$/i.test(v)],
      ['raw font-size',/font-size\s*:\s*([^;}]*)/gi,(v)=>/(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)\b/i.test(v)],
      ['raw line-height',/line-height\s*:\s*([^;}]*)/gi,(v)=>/^\s*(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)?\s*$/i.test(v)],
      ['raw motion duration',/(?:transition|animation)(?:-[a-z-]+)?\s*:\s*([^;}]*)/gi,(v)=>/-?(?:\d+(?:\.\d+)?|\.\d+)(?:ms|s)\b/i.test(v)],
    ];
    for(const [kind,re,bad] of declarationChecks){
      for(const m of text.matchAll(re)){ if(bad(m[1])) report(file,lineOf(text,m.index),kind,m[1].trim()); }
    }
    for(const m of text.matchAll(/var\(--([a-zA-Z0-9_-]+)/g)){
      if(!allowedVisualVars.test(m[1])) report(file,lineOf(text,m.index),'non-governed visual variable',m[0]);
    }
    for(const m of text.matchAll(/backdrop-filter\s*:\s*blur\(/gi)) report(file,lineOf(text,m.index),'unapproved blur/glass effect',m[0]);
    for(const m of text.matchAll(/@media\s*\((?:min|max)-width\s*:\s*(\d+)px\)/gi)){
      if(!approvedBreakpointNumbers.has(m[1])) report(file,lineOf(text,m.index),'unapproved breakpoint',m[0]);
    }
    for(const m of text.matchAll(/@media[^\{]+/gi)){
      for(const n of m[0].matchAll(/(?:min|max)-width\s*:\s*(\d+)px/gi)) if(!approvedBreakpointNumbers.has(n[1])) report(file,lineOf(text,m.index),'unapproved breakpoint',n[0]);
    }
  } else {
    for(const m of text.matchAll(/style=\{\{([^}]*)\}\}/g)){
      const v=m[1];
      if(/(?:margin|padding|gap|borderRadius|boxShadow|color|background(?:Color)?|fontSize|lineHeight|zIndex)\s*:\s*['"]?-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)?['"]?/i.test(v)) report(file,lineOf(text,m.index),'raw inline visual value',v.trim());
    }
  }
}

// Governed registry integrity: these exact primitives must exist in the one authoritative root.
const gov=fs.readFileSync(path.join(root,'src/app/uiux-governance.css'),'utf8');
const required=[
  '--ux-brand-primary:#0B2D5B','--ux-brand-secondary:#0EA5A2','--ux-brand-accent:#22C55E','--ux-success:#16A34A','--ux-warning:#F59E0B','--ux-error:#EF4444','--ux-neutral-800:#334155','--ux-neutral-400:#94A3B8','--ux-page-bg:#F1F5F9','--ux-card-bg:#FFFFFF','--ux-shell-topbar-bg:#E6EDF5','--ux-shell-sidebar-bg:#0B2D5B',
  '--ux-space-1:4px','--ux-space-2:8px','--ux-space-3:12px','--ux-space-4:16px','--ux-space-5:20px','--ux-space-6:24px','--ux-space-8:32px','--ux-space-10:40px','--ux-space-12:48px',
  '--ux-radius-xs:8px','--ux-radius-sm:10px','--ux-radius-md:12px','--ux-radius-lg:16px','--ux-radius-xl:20px','--ux-shell-sidebar-expanded:248px','--ux-shell-sidebar-collapsed:72px','--ux-shell-topbar-height:64px','--ux-mobile-header-height:56px'
];
for(const token of required) if(!gov.includes(token)) report('src/app/uiux-governance.css',1,'missing/changed governed token',token);

if(findings.length){
  console.error(`UI-TOKEN-COMPLIANCE-FAIL ${findings.length} violation(s)`);
  for(const f of findings.slice(0,200)) console.error(`${f.file}:${f.line} ${f.kind}: ${f.value}`);
  if(findings.length>200) console.error(`... ${findings.length-200} additional violations`);
  process.exit(1);
}
console.log(`UI-TOKEN-COMPLIANCE-PASS ${files.length} UI source files audited`);
