# P49.4 — Functional Execution Audit + Netlify npmrc Resilience

## الهدف
إغلاق فشل Netlify الناتج عن غياب `.npmrc` من جذر البناء، ثم الانتقال من فحص وجود الصفحات إلى فحص وجود مسار تنفيذ فعلي للنماذج والنوافذ الأساسية.

## الإصلاح الجذري للنشر
- أضيف `scripts/ensure-npmrc.mjs`.
- يعمل قبل `dependency policy` داخل `quality:gate`.
- إذا كان `.npmrc` مفقودًا في بيئة Netlify، ينشئه بالقيم المعتمدة.
- إذا كان موجودًا لكنه ناقص، يكمل القيم المطلوبة دون حذف إعدادات أخرى.
- القيم الملزمة: `engine-strict=true` و`save-exact=true`، مع `audit=false` و`fund=false`.

## التدقيق الوظيفي
- منع الروابط الوهمية `href="#"` و`javascript:` داخل الواجهة المحمية والمكونات.
- كل `<form>` يجب أن يكون GET واضحًا أو يملك `action`/`onSubmit`.
- استمرار Quick Add ومسار «المزيد» وحالة الخطأ القابلة لإعادة المحاولة.
- هذا الحارس Static/Contract audit؛ الاختبارات وE2E تبقى المرجع لتأكيد السلوك Runtime.
