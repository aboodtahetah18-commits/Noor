export type LocalGovernanceDocument={
  referenceCode:string;
  title:string;
  kind:string;
  version:string|null;
  url:string;
  content:string;
};

import { COMPACT_CORE_GOVERNANCE_DOCUMENTS } from './compact-core-documents';

export const LOCAL_GOVERNANCE_DOCUMENTS:readonly LocalGovernanceDocument[]=[
  ...COMPACT_CORE_GOVERNANCE_DOCUMENTS,
];

export function getLocalGovernanceDocument(referenceCode:string){
  return LOCAL_GOVERNANCE_DOCUMENTS.find(item=>item.referenceCode===referenceCode)??null;
}
