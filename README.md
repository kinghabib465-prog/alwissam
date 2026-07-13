<<<<<<< HEAD
﻿# عيادة الوسام لطب الأسنان — منصة الإدارة

منصة إنتاجية لإدارة عيادة أسنان عربية (RTL) مبنية بـ Next.js و PostgreSQL و Prisma و Redis.

## المتطلبات

- Node.js 22+
- Docker Desktop
- npm 11+

## المنافذ الافتراضية

لتجنب التعارض مع مشاريع أخرى على الجهاز:

- PostgreSQL: `localhost:5433`
- Redis: `localhost:6380`
- التطبيق: `localhost:3000`

## الإعداد السريع

```bash
cp .env.example .env
npm install
npm run docker:up
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

افتح: [http://localhost:3000](http://localhost:3000)

## حسابات الاختبار (من `.env`)

| الدور | البريد |
|------|--------|
| صاحبة العيادة — الدكتور منانة فؤاد (صلاحيات الإدارة) | `SEED_DOCTOR_SPECIALIST_EMAIL` |
| سكرتيرة — سمار بدر الدين | `SEED_SECRETARY1_EMAIL` |
| طبيب عام — الدكتور قعري أسامة | `SEED_DOCTOR_GENERAL_EMAIL` |

لا يوجد حساب أدمن منفصل.

كلمات المرور تُؤخذ من متغيرات البيئة فقط — لا تُثبَّت في الكود.

## المداخل

- الموقع العام: `/`
- حجز موعد: `/book-appointment`
- دخول الطاقم: `/staff/login`
- دخول المريض: `/patient/login`

## الأوامر

```bash
npm run dev                 # تطوير
npm run build               # بناء إنتاج
npm run start               # تشغيل إنتاج
npm run typecheck           # فحص TypeScript
npm run lint                # ESLint
npm run db:migrate          # ترحيل تطوير
npm run db:migrate:deploy   # ترحيل إنتاج
npm run db:seed             # بيانات أساسية فقط (بدون مرضى وهميين)
npm run docker:up           # Postgres + Redis
docker compose up -d --build # كامل مع التطبيق
```

## النسخ الاحتياطي

```bash
docker exec alwisam-postgres pg_dump -U alwisam alwisam_dental > backup-$(date +%F).sql
```

الاستعادة:

```bash
cat backup.sql | docker exec -i alwisam-postgres psql -U alwisam alwisam_dental
```

## البنية

- `src/app` — صفحات App Router و REST API
- `src/components` — واجهة المستخدم
- `src/lib/auth` — جلسات، صلاحيات، كلمات مرور
- `src/lib/services` — منطق الأعمال
- `src/lib/audit` — سجل التدقيق
- `prisma` — المخطط والترحيلات والبذرة

## الأدوار

`ADMIN` · `SECRETARY` · `DOCTOR_SPECIALIST` · `DOCTOR_GENERAL` · `PATIENT`

السكرتيران يستخدمان نفس لوحة التحكم؛ يظهر اسم المستخدم المسجّل ديناميكيًا في السجل والتدقيق.

## ملاحظات أمنية

- كلمات المرور بـ bcrypt
- جلسات HTTP-only cookies
- CSRF على عمليات الكتابة
- تحديد معدل لمحاولات الدخول
- لا تُحذف المدفوعات نهائيًا (إبطال مع سبب)
- لا ترفع أسرارًا إلى Git
=======
"# alwissam" 
>>>>>>> a35ce186ac8e151e2cca5517b9ceb254e64c4cc3
