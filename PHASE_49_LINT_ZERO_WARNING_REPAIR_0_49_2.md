# P49.2 — Zero-Warning Lint Repair

## هدف الإصدار
إصلاح فشل Netlify الناتج عن `eslint . --max-warnings=0` بعد P49.1.

## السبب الجذري
أضاف حارس P49.1 استيرادًا غير مستخدم من `node:url` داخل `scripts/verify-p49-1.mjs`.
ومع سياسة المشروع `--max-warnings=0` فإن تحذيرًا واحدًا فقط يكفي لإيقاف `quality:gate`.

## الإصلاح
- إزالة الاستيراد غير المستخدم `fileURLToPath`.
- الإبقاء على Runtime alias في Vitest.
- الإبقاء على مسارات Mobile Bottom Navigation.
- الإبقاء على `data-label="المبلغ"` في سجل العمليات.

## النتيجة المتوقعة
مرحلة ESLint في Netlify تمر بدون تحذيرات ناتجة عن P49.1.
