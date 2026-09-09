import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const failures=[];
const pass=(name,ok)=>{console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failures.push(name)};

const pkg=JSON.parse(read('package.json'));
const netlify=read('netlify.toml');
const preview=read('src/app/preview/page.tsx');
const ready=read('src/app/api/ready/route.ts');
const db=read('src/infrastructure/db/client.ts');
const env=read('src/config/env.ts');

const atLeast=(version,major,minor,patch)=>{const [a=0,b=0,c=0]=version.split('.').map(Number);if(a!==major)return a>major;if(b!==minor)return b>minor;return c>=patch};
pass('version is P48 or newer',atLeast(pkg.version,0,48,0));
pass('deployment preflight wired',pkg.scripts['deploy:preflight']==='node scripts/deployment-preflight.mjs');
pass('deployment migration wired',pkg.scripts['deploy:migrate']==='node scripts/migrate-deployment.mjs');
pass('production context explicit',netlify.includes('[context.production.environment]')&&netlify.includes('APP_ENV = "production"'));
pass('deploy preview migrations disabled',netlify.includes('[context.deploy-preview.environment]')&&/\[context\.deploy-preview\.environment\][\s\S]*?ALLOW_DB_MIGRATIONS = "false"/.test(netlify));
pass('preview route development only',preview.includes("process.env.APP_ENV !== 'development'")&&preview.includes("redirect('/')"));
pass('readiness checks database',ready.includes('rawSql`select 1 as ready`')&&ready.includes('status:503'));
pass('database is Neon HTTP',db.includes("@neondatabase/serverless")&&db.includes('neon-http'));
pass('Netlify URL resolution supported',env.includes('DEPLOY_PRIME_URL')&&env.includes('DEPLOY_URL')&&env.includes('TRUSTED_ORIGINS'));

const sourceFiles=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else if(/\.(ts|tsx|js|mjs)$/.test(ent.name))sourceFiles.push(p)}}
walk(path.join(root,'src'));
const sourceText=sourceFiles.map(p=>fs.readFileSync(p,'utf8')).join('\n');
pass('no Supabase runtime import in src',!/@supabase\//.test(sourceText)&&!/from ['"]supabase/.test(sourceText));

const pages=[];
walkPages(path.join(root,'src/app'));
function walkPages(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walkPages(p);else if(ent.name==='page.tsx')pages.push(p)}}
const routeSet=new Set(pages.map(p=>{
 let r=p.slice(path.join(root,'src/app').length).replace(/\\/g,'/').replace(/\/page\.tsx$/,'');
 r=r.replace(/\/\([^/]+\)/g,'').replace(/\/\[[^/]+\]/g,'/:dynamic');
 return r||'/';
}));
pass('application pages discovered',pages.length>=60);
pass('operational root route exists',routeSet.has('/'));
pass('dashboard route exists',routeSet.has('/dashboard'));
pass('login route exists',routeSet.has('/login'));
pass('readiness route source exists',fs.existsSync(path.join(root,'src/app/api/ready/route.ts')));

if(failures.length){console.error(`P48.1/P48.2 verification FAILED (${failures.length})`);process.exit(1)}
console.log(`P48.1/P48.2 verification: PASS (${pages.length} pages scanned)`);
