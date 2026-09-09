import fs from 'node:fs';
import path from 'node:path';

const roots=['src'];
const files=[];
function walk(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx|js|mjs|cjs)$/.test(e.name))files.push(p)}}
for(const root of roots)walk(root);
const runtimeHits=[];
for(const file of files){const text=fs.readFileSync(file,'utf8');if(/@supabase\/|from\s+['"]supabase|NEXT_PUBLIC_SUPABASE|SUPABASE_(URL|KEY|ANON|SERVICE)/i.test(text))runtimeHits.push(file)}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const dependencies={...(pkg.dependencies??{}),...(pkg.devDependencies??{})};
for(const name of Object.keys(dependencies))if(name.startsWith('@supabase/'))runtimeHits.push(`package.json:${name}`);
const env=fs.readFileSync('.env.example','utf8');
if(/SUPABASE_/i.test(env))runtimeHits.push('.env.example');
if(!/@neondatabase\/serverless/.test(JSON.stringify(pkg.dependencies??{})))runtimeHits.push('package.json:missing @neondatabase/serverless');
if(!env.includes('DATABASE_URL='))runtimeHits.push('.env.example:missing DATABASE_URL');
if(runtimeHits.length){for(const hit of runtimeHits)console.error('DATABASE-PROVIDER-POLICY-FAIL',hit);process.exit(1)}
console.log(`DATABASE-PROVIDER-POLICY-PASS files=${files.length}`);
