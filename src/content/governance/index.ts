import { GOVERNANCE_BATCH_01 } from './batch-01';
import { GOVERNANCE_BATCH_02 } from './batch-02';
import { GOVERNANCE_BATCH_03 } from './batch-03';
import { GOVERNANCE_BATCH_04 } from './batch-04';
import { GOVERNANCE_BATCH_05 } from './batch-05';
import { GOVERNANCE_BATCH_06 } from './batch-06';
import { GOVERNANCE_BATCH_07 } from './batch-07';
import { GOVERNANCE_BATCH_08 } from './batch-08';
import { GOVERNANCE_BATCH_09 } from './batch-09';

export type LocalGovernanceDocument={
  referenceCode:string;
  title:string;
  kind:string;
  version:string|null;
  url:string;
  content:string;
};

export const LOCAL_GOVERNANCE_DOCUMENTS:readonly LocalGovernanceDocument[]=[
  ...GOVERNANCE_BATCH_01,
  ...GOVERNANCE_BATCH_02,
  ...GOVERNANCE_BATCH_03,
  ...GOVERNANCE_BATCH_04,
  ...GOVERNANCE_BATCH_05,
  ...GOVERNANCE_BATCH_06,
  ...GOVERNANCE_BATCH_07,
  ...GOVERNANCE_BATCH_08,
  ...GOVERNANCE_BATCH_09,
];

export function getLocalGovernanceDocument(referenceCode:string){
  return LOCAL_GOVERNANCE_DOCUMENTS.find(item=>item.referenceCode===referenceCode)??null;
}
