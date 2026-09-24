import { readFileSync } from 'node:fs';

const source=readFileSync('src/lib/conversations/extended-profile-catalog.ts','utf8');
const sectionPattern=/\n  \{\n    key:'([^']+)',([\s\S]*?)(?=\n  \},\n  \{|\n  \},\n\];)/g;
const failures=[];
let match;
let count=0;
while((match=sectionPattern.exec(source))){
  count++;
  const key=match[1];
  const body=match[2];
  const managedElsewhere=/managedElsewhere:true/.test(body);
  if(managedElsewhere) continue;
  if(!/fields:\[\]/.test(body)) failures.push(`${key}: direct fields are not allowed; use a table + add/edit modal`);
  if(!/table:\{/.test(body)) failures.push(`${key}: table definition is required`);
}
if(count<5) failures.push('section parser did not discover the expected catalog');
if(failures.length){
  console.error('EXTENDED-PROFILE-TABLE-RULE-FAIL');
  for(const failure of failures) console.error(' - '+failure);
  process.exit(1);
}
console.log(`EXTENDED-PROFILE-TABLE-RULE-PASS sections=${count}`);
