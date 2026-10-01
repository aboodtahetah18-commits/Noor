export type TemporaryEstimateConfidenceLevel='LOW'|'MEDIUM'|'HIGH';

export type TemporaryEstimateConfidenceInput={
  observedMonths:number;
  coefficientOfVariation:number|null;
  outcomeCount:number;
  averageErrorRatio:number|null;
  learningConfirmations:number;
  biasStability:'INSUFFICIENT'|'STABLE_UNDER'|'STABLE_OVER'|'MIXED'|'SHIFTING';
  biasApplied:boolean;
  seasonalityApplied:boolean;
  namedSeasonApplied:boolean;
  namedSeasonHistoricalOccurrences:number;
};

export type TemporaryEstimateConfidenceResult={
  score:number;
  level:TemporaryEstimateConfidenceLevel;
  label:string;
  summary:string;
  requiresManualAmount:boolean;
  evidence:string[];
};

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,value));
}

export function evaluateTemporaryEstimateConfidence(
  input:TemporaryEstimateConfidenceInput,
):TemporaryEstimateConfidenceResult{
  const observedMonths=Math.max(0,input.observedMonths);
  const cv=input.coefficientOfVariation;

  let score=0;
  const evidence:string[]=[];

  // جودة التاريخ الأساسي — الحد الأكبر 45 نقطة.
  if(observedMonths>=8) score+=35;
  else if(observedMonths>=5) score+=30;
  else if(observedMonths>=3) score+=22;
  else if(observedMonths>=2) score+=14;

  if(cv!==null){
    if(cv<=0.25){
      score+=10;
      evidence.push('الصرف التاريخي مستقر نسبيًا');
    }else if(cv<=0.5){
      score+=7;
      evidence.push('تذبذب الصرف التاريخي ضمن نطاق مقبول');
    }else if(cv<=0.75){
      score+=3;
      evidence.push('يوجد تذبذب ملحوظ في الصرف التاريخي');
    }else{
      score-=6;
      evidence.push('الصرف التاريخي شديد التذبذب');
    }
  }

  evidence.unshift(`${observedMonths} أشهر مكتملة متاحة للتحليل`);

  // دقة النتائج السابقة — حتى 25 نقطة.
  if(input.outcomeCount>0&&input.averageErrorRatio!==null){
    const accuracy=1-clamp(input.averageErrorRatio,0,1);
    const evidenceWeight=clamp(input.outcomeCount/5,0,1);
    score+=25*accuracy*evidenceWeight;
    evidence.push(
      input.averageErrorRatio<=0.2
        ? `نتائج سابقة دقيقة نسبيًا (${input.outcomeCount})`
        : input.averageErrorRatio<=0.5
          ? `دقة النتائج السابقة متوسطة (${input.outcomeCount})`
          : `النتائج السابقة كثيرة الخطأ (${input.outcomeCount})`,
    );
  }else{
    evidence.push('لا توجد نتائج مكتملة كافية لاختبار دقة التقدير بعد');
  }

  // تعلم اختيارات المستخدم — حتى 10 نقاط.
  if(input.learningConfirmations>=3){
    score+=Math.min(10,input.learningConfirmations*1.5);
    evidence.push(`النطاق يستفيد من ${input.learningConfirmations} اختيارات مؤكدة سابقة`);
  }

  // الموسمية تزيد الثقة فقط عندما يكون لها دليل تاريخي متكرر.
  if(input.namedSeasonApplied&&input.namedSeasonHistoricalOccurrences>=2){
    score+=Math.min(10,4+input.namedSeasonHistoricalOccurrences*2);
    evidence.push(`توجد إشارة موسمية مسماة من ${input.namedSeasonHistoricalOccurrences} مواسم تاريخية`);
  }else if(input.seasonalityApplied){
    score+=3;
    evidence.push('تمت مراعاة موسمية تاريخية عامة');
  }

  // ثبات الانحياز يمكن أن يدعم التوصية، أما تغير الاتجاه فيخفضها.
  if(input.biasApplied&&(input.biasStability==='STABLE_UNDER'||input.biasStability==='STABLE_OVER')){
    score+=4;
    evidence.push('اتجاه الانحياز السابق ثابت بما يكفي للتصحيح');
  }
  if(input.biasStability==='SHIFTING'){
    score-=20;
    evidence.push('السلوك الحديث تغيّر عن النمط التاريخي');
  }else if(input.biasStability==='MIXED'){
    score-=10;
    evidence.push('النتائج الحديثة مختلطة الاتجاه');
  }

  score=Math.round(clamp(score,0,100));

  // لا نسمح بثقة عالية من تاريخ قصير مهما ارتفع باقي المؤشر.
  if(observedMonths<3) score=Math.min(score,49);

  const level:TemporaryEstimateConfidenceLevel=
    score>=75&&observedMonths>=5
      ? 'HIGH'
      : score>=50
        ? 'MEDIUM'
        : 'LOW';

  const label=level==='HIGH'
    ? 'ثقة نهائية عالية'
    : level==='MEDIUM'
      ? 'ثقة نهائية متوسطة'
      : 'ثقة نهائية منخفضة';

  const summary=level==='HIGH'
    ? 'يمكن استخدام التقدير مباشرة؛ التاريخ والنتائج السابقة متسقة بما يكفي.'
    : level==='MEDIUM'
      ? 'التقدير مفيد كنقطة بداية، لكن يلزم تأكيد المبلغ النهائي قبل بناء التغطية.'
      : 'التقدير إرشادي فقط؛ البيانات أو استقرار السلوك لا يكفيان لتطبيق رقم واحد تلقائيًا.';

  return {
    score,
    level,
    label,
    summary,
    requiresManualAmount:level!=='HIGH',
    evidence:evidence.slice(0,6),
  };
}
