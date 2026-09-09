# P49.6 — Interactive Control Execution Hardening

## الهدف
منع وجود زر أو عنصر تفاعلي ظاهر للمستخدم بدون مسار تنفيذ فعلي.

## النطاق
- فحص جميع ملفات TSX داخل `src`.
- كل `<button>` يجب أن يكون داخل `form` له execution path، أو يملك handler فعليًا مثل `onClick` / `onMouseDown` / `formAction`.
- التحقق من استمرار Quick Add / More dialogs كعناصر تفاعلية فعلية.
- تشغيل الفحص مبكرًا داخل `quality:gate` قبل الاختبارات والبناء.

## النتيجة
تم فحص عناصر التحكم الحالية وإضافة Regression Guard يمنع عودة الأزرار الصامتة مستقبلًا.
