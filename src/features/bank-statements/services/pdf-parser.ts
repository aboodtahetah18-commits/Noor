import { inflateSync } from 'node:zlib';
import { parseBankStatementText } from './text-parser';
import type { ParsedStatementRow } from '../types/bank-statement';

function decodePdfLiteral(input:string):string{
  let out='';
  for(let i=0;i<input.length;i+=1){
    const ch=input[i];
    if(ch!=='\\'){out+=ch??'';continue;}
    const n=input[++i]??'';
    if(n==='n')out+='\n'; else if(n==='r')out+='\r'; else if(n==='t')out+='\t'; else if(n==='b')out+='\b'; else if(n==='f')out+='\f'; else if(n==='('||n===')'||n==='\\')out+=n;
    else if(/[0-7]/.test(n)){let oct=n;for(let j=0;j<2&&/[0-7]/.test(input[i+1]??'');j+=1)oct+=input[++i];out+=String.fromCharCode(parseInt(oct,8));}
    else out+=n;
  }
  return out;
}
function decodeHex(hex:string):string{
  const clean=hex.replace(/\s+/g,''); if(!clean)return '';
  const even=clean.length%2?`${clean}0`:clean; const bytes=Buffer.from(even,'hex');
  if(bytes.length>=2&&bytes[0]===0xfe&&bytes[1]===0xff){let s='';for(let i=2;i+1<bytes.length;i+=2)s+=String.fromCharCode((bytes[i]??0)*256+(bytes[i+1]??0));return s;}
  return bytes.toString('latin1');
}
function extractOperators(content:string):string[]{
  const out:string[]=[];
  for(const bt of content.matchAll(/BT([\s\S]*?)ET/g)){
    const body=bt[1]??'';
    for(const tj of body.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)){
      const literal=tj[0].match(/^\(((?:\\.|[^\\)])*)\)/)?.[1]??''; const v=decodePdfLiteral(literal).trim(); if(v)out.push(v);
    }
    for(const hx of body.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)){const v=decodeHex(hx[1]??'').trim();if(v)out.push(v);}
    for(const arr of body.matchAll(/\[([\s\S]*?)\]\s*TJ/g)){
      const a=arr[1]??'';let line='';
      for(const p of a.matchAll(/\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>/g))line+=p[1]!==undefined?decodePdfLiteral(p[1]):decodeHex(p[2]??'');
      if(line.trim())out.push(line.trim());
    }
    if(/T\*|\bTd\b|\bTD\b/.test(body))out.push('\n');
  }
  return out;
}
export function extractTextFromPdf(buffer:ArrayBuffer):string{
  const buf=Buffer.from(buffer); const raw=buf.toString('latin1');
  if(!raw.startsWith('%PDF-'))throw new Error('الملف لا يبدو PDF صالحًا.');
  const chunks:string[]=[]; const streamRx=/stream\r?\n([\s\S]*?)\r?\nendstream/g;
  for(const m of raw.matchAll(streamRx)){
    const body=m[1]??''; const start=m.index??0; const dict=raw.slice(Math.max(0,start-700),start);
    let content='';
    try{content=/\/FlateDecode/.test(dict)?inflateSync(Buffer.from(body,'latin1')).toString('latin1'):body;}catch{continue;}
    chunks.push(...extractOperators(content));
  }
  const text=chunks.join('\n').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  if(text.length<20)throw new Error('PDF لا يحتوي نصًا قابلًا للاستخراج مباشرة. استخدم نسخة PDF نصية أو CSV/XLSX.');
  return text;
}
export function parseBankStatementPdf(buffer:ArrayBuffer,bankName?:string|null):ParsedStatementRow[]{return parseBankStatementText(extractTextFromPdf(buffer),bankName);}
