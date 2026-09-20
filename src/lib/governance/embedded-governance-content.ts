import { EMBEDDED_GOVERNANCE_CHUNK_01 } from './embedded/chunk-01';
import { EMBEDDED_GOVERNANCE_CHUNK_02 } from './embedded/chunk-02';
import { EMBEDDED_GOVERNANCE_CHUNK_03 } from './embedded/chunk-03';
import { EMBEDDED_GOVERNANCE_CHUNK_04 } from './embedded/chunk-04';
import { EMBEDDED_GOVERNANCE_CHUNK_05 } from './embedded/chunk-05';
import { EMBEDDED_GOVERNANCE_CHUNK_06 } from './embedded/chunk-06';
import { EMBEDDED_GOVERNANCE_CHUNK_07 } from './embedded/chunk-07';
import { EMBEDDED_GOVERNANCE_CHUNK_08 } from './embedded/chunk-08';
import { EMBEDDED_GOVERNANCE_CHUNK_09 } from './embedded/chunk-09';
import { EMBEDDED_GOVERNANCE_CHUNK_10 } from './embedded/chunk-10';

export type EmbeddedGovernanceContent={sourceUrl:string;content:string};

const EMBEDDED_GOVERNANCE_CONTENT:readonly EmbeddedGovernanceContent[]=[
  ...EMBEDDED_GOVERNANCE_CHUNK_01,
  ...EMBEDDED_GOVERNANCE_CHUNK_02,
  ...EMBEDDED_GOVERNANCE_CHUNK_03,
  ...EMBEDDED_GOVERNANCE_CHUNK_04,
  ...EMBEDDED_GOVERNANCE_CHUNK_05,
  ...EMBEDDED_GOVERNANCE_CHUNK_06,
  ...EMBEDDED_GOVERNANCE_CHUNK_07,
  ...EMBEDDED_GOVERNANCE_CHUNK_08,
  ...EMBEDDED_GOVERNANCE_CHUNK_09,
  ...EMBEDDED_GOVERNANCE_CHUNK_10,
];

export function embeddedGovernanceContent(sourceUrl?:string|null){
  if(!sourceUrl)return '';
  return EMBEDDED_GOVERNANCE_CONTENT.find(item=>item.sourceUrl===sourceUrl)?.content??'';
}

export function splitGovernanceContent(content:string){
  const lines=content.replace(/\r/g,'').split('\n').map(line=>line.trim()).filter(Boolean);
  const sections:Array<{title:string;lines:string[]}>=[]; let current:{title:string;lines:string[]}|null=null;
  const heading=/^(?:الباب|الفصل|القسم|المادة|أولًا|ثانيًا|ثالثًا|رابعًا|خامسًا|سادسًا|سابعًا|ثامنًا|تاسعًا|عاشرًا|\d+[.)-])/;
  for(const line of lines){
    if(heading.test(line)||line.length<=70&&/[:：]$/.test(line)){
      current={title:line.replace(/[:：]$/,''),lines:[]}; sections.push(current);
    }else{
      if(!current){current={title:'النص المعتمد',lines:[]};sections.push(current);}
      current.lines.push(line);
    }
  }
  return sections.length?sections:[{title:'النص المعتمد',lines}];
}
