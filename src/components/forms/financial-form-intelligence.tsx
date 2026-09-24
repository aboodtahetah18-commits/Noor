'use client';

import { useEffect } from 'react';
import { remainingAfter, sumFinancialValues } from '@/lib/financial-form-calculations';

function numericInput(form:HTMLFormElement,name:string){
  const element=form.elements.namedItem(name);
  if(!(element instanceof HTMLInputElement)) return 0;
  const value=Number(element.value||0);
  return Number.isFinite(value)?value:0;
}

function setOutput(form:HTMLFormElement,value:number,label?:string){
  const output=form.querySelector<HTMLOutputElement>('[data-financial-output]');
  if(!output) return;
  output.value=value.toFixed(2);
  output.textContent=label?`${label}: ${value.toFixed(2)} ريال`:`${value.toFixed(2)} ريال`;
}

function recalcForm(form:HTMLFormElement){
  const mode=form.dataset.financialCalc;
  if(!mode) return;

  if(mode==='sum'){
    const values=[...form.querySelectorAll<HTMLInputElement>('[data-financial-value]')].map(input=>input.value);
    setOutput(form,sumFinancialValues(values),'الإجمالي');
    return;
  }

  if(mode==='remaining'){
    const base=Number(form.dataset.financialBase||0);
    setOutput(form,remainingAfter(base,numericInput(form,'amount')),form.dataset.financialLabel||'المتبقي بعد العملية');
    return;
  }

  if(mode==='goal-new'){
    const target=numericInput(form,'targetAmount');
    const current=numericInput(form,'openingBalance');
    setOutput(form,remainingAfter(target,current),'المتبقي للوصول للهدف');
    return;
  }

  if(mode==='source-balance'){
    const select=form.elements.namedItem('fromAccountId');
    if(!(select instanceof HTMLSelectElement)) return;
    const option=select.selectedOptions[0];
    const balance=Number(option?.dataset.balance||0);
    const amount=numericInput(form,'amount');
    setOutput(form,remainingAfter(balance,amount),'رصيد الحساب بعد العملية');
  }
}

function recalcFromTarget(target:EventTarget|null){
  if(!(target instanceof HTMLElement)) return;
  const form=target.closest<HTMLFormElement>('form[data-financial-calc]');
  if(form) recalcForm(form);
}

export function FinancialFormIntelligence(){
  useEffect(()=>{
    const forms=[...document.querySelectorAll<HTMLFormElement>('form[data-financial-calc]')];
    for(const form of forms) recalcForm(form);
    const handler=(event:Event)=>recalcFromTarget(event.target);
    document.addEventListener('input',handler,true);
    document.addEventListener('change',handler,true);
    return()=>{
      document.removeEventListener('input',handler,true);
      document.removeEventListener('change',handler,true);
    };
  },[]);
  return null;
}
