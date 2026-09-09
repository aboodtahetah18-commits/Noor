# Netlify P49.11 Visible UI Repair — Build 07

## سبب الفشل
Build 06 اجتاز UX-P29 static token compliance، لكن P49.11 لديه شرط مستقل يمنع أي:
- `linear-gradient(...)`
- `radial-gradient(...)`
- `conic-gradient(...)`

حتى لو كان التدرج داخل Design Token.

## الإصلاح
- استبدال token:
  `--ux-auth-visual-gradient: linear-gradient(...)`
  بـ:
  `--ux-auth-visual-bg: var(--ux-brand-primary)`
- إبقاء صفحة الدخول بنفس الهوية واللون الأساسي بدون Gradient.
- لا تغيير في الوظائف، المسارات، قاعدة البيانات، الخوارزميات المالية، أو منطق التشغيل.

## التحقق
- `node scripts/verify-ui-token-compliance.mjs` — PASS
- `node scripts/verify-p49-11.mjs` — PASS
- `PASS no gradients remain`
