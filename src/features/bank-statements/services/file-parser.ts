import { inflateRawSync } from 'node:zlib';
import { parseBankStatementCsv } from './csv-parser';
import { parseBankStatementPdf } from './pdf-parser';
import { applyBankAdapter } from './bank-adapters';
import type { ParsedStatementRow } from '../types/bank-statement';

export type SupportedStatementFileType = 'CSV'|'XLSX'|'PDF';

export const BANK_FILE_PARSER_REVISION = '0.44.8-safe-capture';

function capture(match: RegExpMatchArray | null, index = 1): string {
  const value = match?.at(index);
  return typeof value === 'string' ? value : '';
}

type ZipEntry={name:string;method:number;compressedSize:number;localOffset:number};

function decodeCsv(buffer:ArrayBuffer):string{
  return new TextDecoder('utf-8',{fatal:false}).decode(new Uint8Array(buffer));
}

function findEocd(buf:Buffer):number{
  for(let i=buf.length-22;i>=Math.max(0,buf.length-65557);i-=1){
    if(buf.readUInt32LE(i)===0x06054b50)return i;
  }
  throw new Error('ملف Excel غير صالح أو غير مكتمل.');
}

function zipEntries(buf:Buffer):Map<string,ZipEntry>{
  const eocd=findEocd(buf);
  const count=buf.readUInt16LE(eocd+10);
  const centralOffset=buf.readUInt32LE(eocd+16);
  const entries=new Map<string,ZipEntry>();
  let p=centralOffset;
  for(let i=0;i<count;i+=1){
    if(buf.readUInt32LE(p)!==0x02014b50)throw new Error('تعذر قراءة بنية ملف Excel.');
    const method=buf.readUInt16LE(p+10);
    const compressedSize=buf.readUInt32LE(p+20);
    const nameLen=buf.readUInt16LE(p+28);
    const extraLen=buf.readUInt16LE(p+30);
    const commentLen=buf.readUInt16LE(p+32);
    const localOffset=buf.readUInt32LE(p+42);
    const name=buf.subarray(p+46,p+46+nameLen).toString('utf8');
    entries.set(name,{name,method,compressedSize,localOffset});
    p+=46+nameLen+extraLen+commentLen;
  }
  return entries;
}

function readEntry(buf:Buffer,entry:ZipEntry):string{
  const p=entry.localOffset;
  if(buf.readUInt32LE(p)!==0x04034b50)throw new Error('ملف Excel يحتوي على جزء غير صالح.');
  const nameLen=buf.readUInt16LE(p+26);
  const extraLen=buf.readUInt16LE(p+28);
  const start=p+30+nameLen+extraLen;
  const compressed=buf.subarray(start,start+entry.compressedSize);
  const data=entry.method===0?compressed:entry.method===8?inflateRawSync(compressed):null;
  if(!data)throw new Error('نوع ضغط ملف Excel غير مدعوم.');
  return data.toString('utf8');
}

function xmlText(value:string):string{
  return value.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
}
function colIndex(ref:string):number{
  const letters=(ref.match(/[A-Z]+/i)?.[0]??'A').toUpperCase();
  let n=0;for(const c of letters)n=n*26+(c.charCodeAt(0)-64);return n-1;
}
function csvCell(v:string):string{return /[",\n\r]/.test(v)?`"${v.replace(/"/g,'""')}"`:v;}

function xlsxToCsv(buffer:ArrayBuffer):string{
  const buf=Buffer.from(buffer);
  const entries=zipEntries(buf);
  const workbookEntry=entries.get('xl/workbook.xml');
  const relsEntry=entries.get('xl/_rels/workbook.xml.rels');
  if(!workbookEntry||!relsEntry)throw new Error('ملف Excel لا يحتوي على مصنف صالح.');
  const workbook=readEntry(buf,workbookEntry);
  const rels=readEntry(buf,relsEntry);
  const firstRid=capture(workbook.match(/<sheet\b[^>]*\br:id="([^"]+)"/i));
  if(!firstRid)throw new Error('ملف Excel لا يحتوي على ورقة بيانات.');
  const relRe=new RegExp(`<Relationship\\b[^>]*\\bId="${firstRid.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"[^>]*\\bTarget="([^"]+)"`,'i');
  const target=capture(rels.match(relRe));
  if(!target)throw new Error('تعذر تحديد ورقة Excel الأولى.');
  const sheetPath=target.startsWith('/')?target.slice(1):`xl/${target.replace(/^\.\//,'')}`.replace(/\/\.\//g,'/');
  const sheetEntry=entries.get(sheetPath);
  if(!sheetEntry)throw new Error('تعذر قراءة ورقة Excel الأولى.');
  const sheet=readEntry(buf,sheetEntry);
  const sharedEntry=entries.get('xl/sharedStrings.xml');
  const shared:string[]=[];
  if(sharedEntry){
    const sx=readEntry(buf,sharedEntry);
    for(const m of sx.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)){
      const siBody=typeof m.at(1)==='string'?m.at(1)!:'';
      const txt=[...siBody.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)].map(x=>xmlText(typeof x.at(1)==='string'?x.at(1)!:'')).join('');
      shared.push(txt);
    }
  }
  const rows:string[]=[];
  for(const rm of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)){
    const cells:string[]=[];
    const rowBody=typeof rm.at(1)==='string'?rm.at(1)!:'';
    for(const cm of rowBody.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)){
      const attrs=typeof cm.at(1)==='string'?cm.at(1)!:'';
      const body=typeof cm.at(2)==='string'?cm.at(2)!:'';
      const ref=capture(attrs.match(/\br="([^"]+)"/i))||'A1';
      const idx=colIndex(ref); const type=capture(attrs.match(/\bt="([^"]+)"/i));
      let value='';
      if(type==='inlineStr') value=xmlText(capture(body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/i)));
      else {
        const raw=capture(body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i));
        value=type==='s'?shared[Number(raw)]??'':xmlText(raw);
      }
      cells[idx]=value;
    }
    if(cells.some(v=>String(v??'').trim()))rows.push(cells.map(v=>csvCell(String(v??''))).join(','));
  }
  if(rows.length<2)throw new Error('ورقة Excel لا تحتوي على صفوف بيانات كافية.');
  return rows.join('\n');
}

export async function parseBankStatementFile(fileName:string,buffer:ArrayBuffer,bankName?:string|null):Promise<{rows:ParsedStatementRow[];fileType:SupportedStatementFileType}>{
  const lower=fileName.toLowerCase();
  if(lower.endsWith('.csv'))return {rows:applyBankAdapter(parseBankStatementCsv(decodeCsv(buffer)),bankName),fileType:'CSV'};
  if(lower.endsWith('.xlsx'))return {rows:applyBankAdapter(parseBankStatementCsv(xlsxToCsv(buffer)),bankName),fileType:'XLSX'};
  if(lower.endsWith('.pdf'))return {rows:applyBankAdapter(parseBankStatementPdf(buffer,bankName),bankName),fileType:'PDF'};
  throw new Error('صيغة الملف غير مدعومة. استخدم CSV أو XLSX أو PDF نصي.');
}
