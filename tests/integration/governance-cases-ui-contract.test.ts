import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
const read=(p:string)=>readFileSync(p,'utf8');
describe('governance cases in unified workspace',()=>{
 const list=read('src/app/(protected)/cases/page.tsx');
 const detail=read('src/app/(protected)/cases/[caseId]/page.tsx');
 it('requires authenticated case reads',()=>{
  expect(list).toContain('requireAuthenticatedUser()');
  expect(list).toContain('listGovernanceCaseContracts(user.id');
  expect(detail).toContain('requireAuthenticatedUser()');
  expect(detail).toContain('getGovernanceCaseContract(user.id, caseId)');
 });
 it('preserves responsible next action',()=>{
  for(const page of [list,detail]){expect(page).toContain('nextActionCode');expect(page).toContain('actionOwner');}
 });
 it('uses approved case surfaces without inline visual styles',()=>{
  expect(list).toContain('p47-decision-page');
  expect(list).toContain('p47-analysis-card');
  expect(detail).toContain('p47-analysis-card');
  expect(list).not.toContain('style={{');
  expect(detail).not.toContain('style={{');
 });
 it('exposes cases in shared platform navigation',()=>{
  const registry=read('src/lib/navigation/platform-navigation.ts');
  const more=read('src/app/(protected)/more/page.tsx');
  expect(registry).toContain("href:'/cases'");
  expect(more).toContain("['/cases','القضايا والقرارات'");
 });
});