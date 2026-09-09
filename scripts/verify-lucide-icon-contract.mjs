import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const allowed = new Set([16,20,24,32]);
const exts = new Set(['.tsx','.ts','.jsx','.js']);
const ignored = new Set(['node_modules','.next','.git','coverage','dist','build']);
const violations = [];

function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignored.has(entry.name)) continue;
    const full = path.join(dir,entry.name);
    if(entry.isDirectory()) walk(full);
    else if(exts.has(path.extname(entry.name))){
      const text=fs.readFileSync(full,'utf8');
      const re=/<LucideIcon\b[^>]*\bsize=\{(\d+)\}/g;
      let m;
      while((m=re.exec(text))){
        const size=Number(m[1]);
        if(!allowed.has(size)){
          const line=text.slice(0,m.index).split('\n').length;
          violations.push(`${path.relative(root,full)}:${line} size=${size}`);
        }
      }
    }
  }
}
walk(path.join(root,'src'));
if(violations.length){
  console.error('LUCIDE-ICON-CONTRACT-FAIL allowed sizes: 16,20,24,32');
  for(const v of violations) console.error(` - ${v}`);
  process.exit(1);
}
console.log('LUCIDE-ICON-CONTRACT-PASS allowed sizes=16,20,24,32');
