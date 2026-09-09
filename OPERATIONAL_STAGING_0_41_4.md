# Operational Staging — 0.41.4

## الهدف
تحويل Staging من Design Preview افتراضي إلى التطبيق التشغيلي الحقيقي.

## السلوك
- `/` يفحص الجلسة.
- المستخدم غير المصادق -> `/login`.
- المستخدم المصادق -> `/dashboard`.
- `/preview` يبقى متاحًا فقط كرابط اختياري للمقارنة البصرية.
- لا يوجد Preview bypass داخل Protected Layout أو CSRF/origin guard.
- لا توجد أسرار/قاعدة بيانات وهمية عند `PREVIEW_MODE`.

## متطلبات Netlify
- `APP_ENV=staging`
- `DATABASEURL` أو `DATABASE_URL` يشير إلى Neon staging branch.

## ملاحظة Neon
فرع `staging` موجود، لكن تطبيق الـMigrations من خلال الموصل لم يتم بسبب خلل في واجهة Neon connector يمنع `run_sql` من قبول أسماء المعاملات المعلنة. لا تمس هذه النسخة `main`.
