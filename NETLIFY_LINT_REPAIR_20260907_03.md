# Netlify Lint Repair — 2026-09-07 — Build 03

تم إصلاح الخطأين الظاهرين في سجل Netlify:

1. `src/app/(protected)/desktop-top-nav.tsx`
   - إزالة نمط `setState` المتزامن داخل `useEffect`.
   - استبداله بـ `useSyncExternalStore` لقراءة حالة الشريط الجانبي من `localStorage`.
   - تتم مزامنة `data-sidebar` عبر effect فقط، بدون تحديث state داخله.
   - زر الطي يرسل حدث `mustaqbali:sidebar-state` لتحديث الواجهة فورًا.

2. `src/app/(protected)/internal-funding/page.tsx`
   - إزالة المتغير غير المستخدم `totalGrowth`.

لا تغيير في منطق الأعمال أو الخوارزميات المالية أو قاعدة البيانات أو المسارات.
