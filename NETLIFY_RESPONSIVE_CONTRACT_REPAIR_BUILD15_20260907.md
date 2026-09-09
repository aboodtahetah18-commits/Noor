# Netlify UX-P29 Responsive Contract Repair — Build 15

## سبب الفشل
اختبار `uxp29-responsive-root-cause-contract.test.ts` يتطلب وجود الاستعلام النصي الحرفي:
`window.matchMedia('(min-width: 768px)')`
داخل `CompactFilterPanel`.

Build 14 حافظ على التصفية مخفية افتراضيًا لكنه حذف هذا الربط النصي، لذلك فشل الاختبار رغم أن CSS يستخدم breakpoints الصحيحة.

## الإصلاح
- إعادة الاستعلام canonical 768px داخل زر فتح/إغلاق التصفية.
- التصفية ما زالت مخفية افتراضيًا في جميع المقاسات.
- لا يتم فتحها تلقائيًا على Desktop أو Tablet.
- لا تغيير في Business Logic أو البيانات أو المسارات.

## التحقق الثابت
- CompactFilterPanel يحتوي `window.matchMedia('(min-width: 768px)')`.
- لا يحتوي `769px`.
- Governance ما زال يحتوي 767 / 768-1023 / 1024 breakpoints.
