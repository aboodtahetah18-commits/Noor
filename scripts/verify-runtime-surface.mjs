import fs from 'node:fs';
import path from 'node:path';
const required=[
'src/app/(public)/login/page.tsx','src/app/(protected)/layout.tsx','src/app/(protected)/loading.tsx','src/app/(protected)/error.tsx',
'src/app/(protected)/mobile-bottom-nav.tsx','src/app/(protected)/tablet-top-nav.tsx','src/app/(protected)/desktop-top-nav.tsx',
'src/components/overlays/action-dialog.tsx','src/app/api/health/route.ts','src/app/api/ready/route.ts','src/app/api/auth/[...all]/route.ts'
];
const missing=required.filter(file=>!fs.existsSync(path.join(process.cwd(),file)));
const migrations=fs.readdirSync('database/migrations').filter(name=>name.endsWith('.sql'));
if(!migrations.length)missing.push('database/migrations/*.sql');
if(missing.length){for(const item of missing)console.error('RUNTIME-SURFACE-FAIL',item);process.exit(1)}
console.log(`RUNTIME-SURFACE-PASS required=${required.length} migrations=${migrations.length}`);
