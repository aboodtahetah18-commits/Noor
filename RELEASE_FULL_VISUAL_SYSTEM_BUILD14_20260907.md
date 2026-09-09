# مستقبلي — Build 14 — Full Visual System Rollout

## النطاق المنفذ
- تطبيق النظام البصري المعتمد على جميع الصفحات عبر طبقة الحوكمة العامة.
- شريط علوي داكن مستقل بعرض الشاشة.
- قائمة جانبية داكنة على اليمين تبدأ أسفل الشريط العلوي ولا تتداخل معه.
- نقل زر طي/فتح القائمة والشعار إلى الشريط العلوي.
- نقل صورة المستخدم إلى الشريط العلوي مع التنبيهات والإعدادات.
- تقوية حدود البطاقات والمربعات وإضافة فصل بصري أوضح.
- تلوين بطاقات المؤشرات بألوان دلالية فاتحة ومتنوعة.
- جعل رؤوس الصفحات بارزة بلون مختلف عن الأبيض.
- توحيد صف عنوان الصفحة + الإجراءات على الكمبيوتر.
- إخفاء البحث/التصفية افتراضيًا وإظهاره فقط عند الضغط على زر التصفية.
- نقل التصفية إلى رأس صفحتي الحركة المالية والمستشار.
- إضافة إعدادات رفع شعارين مستقلين: فاتح/داكن، مع استعادة الافتراضي.
- استبدال شعار المشروع الافتراضي بالأصل الأفقي المقدم من المستخدم وإنشاء نسخة بيضاء نظيفة للأسطح الداكنة.
- تحسين الأداء بإزالة استعلام الحسابات من كل تنقل داخل Protected Layout، وتحميل خيارات الحسابات فقط عند فتح نافذة الرسالة البنكية عبر /api/accounts/options.

## عدم التغيير
- لا تغيير في المحرك المالي.
- لا تغيير في قواعد الأعمال أو قاعدة البيانات أو الترحيلات.
- لا تغيير في مسارات الصفحات الحالية.

## التحقق
- UX-P29 static token compliance: PASS — 342 UI files.
- UX-P29 implementation readiness: PASS.
- P63 → P50: PASS.
- P49.13 → P49.3: PASS.
- Route integrity: PASS — 67 pages / 123 links.
- P48 runtime readiness: PASS.
- P47 closure: PASS — 63 protected pages.
- Local quality gate stops at lint only because node_modules/eslint are not present in the source package; Netlify remains authoritative for dependency installation.
- Transpile syntax check passed for all Build 14 modified TS/TSX files.

## Netlify fingerprint
BUILD14-FULL-VISUAL-SYSTEM-FINGERPRINT
