import Image from 'next/image';
import { Money } from '@/financial-engine/money';
import { formatSar } from '@/lib/format-money';

/** The approved Saudi riyal artwork avoids missing-font square glyphs. */
export function SaudiAmount({value}:{value:string|Money}){
  const number=formatSar(value).replace(/\s*\u20c1$/u,'');
  return <span className="namaa-riyal-money" aria-label={number+' ريال سعودي'}>
    <span>{number}</span>
    <Image src="/brand/saudi-riyal-symbol.png" alt="" width={20} height={20} unoptimized />
  </span>;
}
