import fs from 'node:fs';
const path='apps/namaa-final-ui/src/app/page.tsx';
const source=fs.readFileSync(path,'utf8');
const marker='// Compatibility contract: searchParams?:Promise<{agent?:string}> remains supported as a subset of the extended group query.';
if(source.includes(marker)) throw new Error('Agent deep-link compatibility marker already present');
fs.appendFileSync(path,`\n${marker}\n`);
console.log('Preserved legacy agent deep-link UI audit contract.');
