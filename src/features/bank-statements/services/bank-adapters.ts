import type { ParsedStatementRow } from '../types/bank-statement';

export type SaudiBankAdapter = {
  id:string;
  displayName:string;
  aliases:string[];
  descriptionNoise:RegExp[];
};

const ADAPTERS:SaudiBankAdapter[]=[
  {id:'alrajhi',displayName:'مصرف الراجحي',aliases:['الراجحي','al rajhi','alrajhi'],descriptionNoise:[/\bmada\b/gi,/\bpos\b/gi,/\btxn\b/gi]},
  {id:'alahli',displayName:'البنك الأهلي السعودي',aliases:['الأهلي','الاهلي','saudi national bank','snb','alahli'],descriptionNoise:[/\bmada\b/gi,/\bpos\b/gi]},
  {id:'alinma',displayName:'مصرف الإنماء',aliases:['الإنماء','الانماء','alinma'],descriptionNoise:[/\bmada\b/gi,/\bpos\b/gi]},
  {id:'riyad',displayName:'بنك الرياض',aliases:['بنك الرياض','riyad bank'],descriptionNoise:[/\bmada\b/gi,/\bpos\b/gi]},
  {id:'sab',displayName:'البنك السعودي الأول',aliases:['الأول','الاول','sab','saudi awaal bank'],descriptionNoise:[/\bmada\b/gi,/\bpos\b/gi]},
  {id:'anb',displayName:'البنك العربي الوطني',aliases:['العربي الوطني','arab national bank','anb'],descriptionNoise:[/\bmada\b/gi,/\bpos\b/gi]},
  {id:'bsf',displayName:'البنك السعودي الفرنسي',aliases:['السعودي الفرنسي','banque saudi fransi','bsf'],descriptionNoise:[/\bmada\b/gi,/\bpos\b/gi]},
  {id:'albilad',displayName:'بنك البلاد',aliases:['البلاد','bank albilad','albilad'],descriptionNoise:[/\bmada\b/gi,/\bpos\b/gi]},
  {id:'aljazira',displayName:'بنك الجزيرة',aliases:['الجزيرة','bank aljazira','aljazira'],descriptionNoise:[/\bmada\b/gi,/\bpos\b/gi]},
  {id:'stcbank',displayName:'STC Bank',aliases:['stc bank','stcbank'],descriptionNoise:[/\bcard\b/gi]},
  {id:'d360',displayName:'D360 Bank',aliases:['d360','d360 bank'],descriptionNoise:[/\bcard\b/gi]},
];

export function resolveSaudiBankAdapter(bankName:string|null|undefined):SaudiBankAdapter|null{
  const name=(bankName??'').trim().toLowerCase();
  if(!name)return null;
  return ADAPTERS.find(a=>a.aliases.some(alias=>name.includes(alias.toLowerCase())))??null;
}

export function detectSaudiBankFromText(text:string):SaudiBankAdapter|null{
  const value=text.toLowerCase();
  return ADAPTERS.find(a=>a.aliases.some(alias=>value.includes(alias.toLowerCase())))??null;
}

export function cleanBankDescription(description:string,bankName?:string|null):string{
  const adapter=resolveSaudiBankAdapter(bankName);
  let value=description.replace(/\s+/g,' ').trim();
  for(const rx of adapter?.descriptionNoise??[]) value=value.replace(rx,' ');
  return value
    .replace(/\b(?:ref|reference|rrn|stan|auth|terminal|merchant id|transaction id)\s*[:#-]?\s*[a-z0-9-]+\b/gi,' ')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,500);
}

export function applyBankAdapter(rows:ParsedStatementRow[],bankName?:string|null):ParsedStatementRow[]{
  return rows.map(row=>{
    const description=cleanBankDescription(row.description,bankName)||row.description;
    return {...row,description};
  });
}

export function listSaudiBankAdapters(){return ADAPTERS.map(({id,displayName,aliases})=>({id,displayName,aliases}));}
