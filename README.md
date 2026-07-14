# عيادة الوسام لطب الأسنان — منصة الإدارة

منصة إنتاجية لإدارة عيادة أسنان عربية (RTL) مبنية بـ Next.js و PostgreSQL و Prisma و Redis.

## المتطلبات

- Node.js 20+ (يُفضَّل 22)
- Docker Desktop (للتطوير المحلي)
- npm 11+

## المنافذ الافتراضية (محلي)

لتجنب التعارض مع مشاريع أخرى على الجهاز:

- PostgreSQL: `localhost:5433`
- Redis: `localhost:6380`
- التطبيق: `localhost:3000`

## الإعداد السريع (محلي / تدريب)

```bash
cp .env.example .env
npm install
npm run docker:up
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

افتح: [http://localhost:3000](http://localhost:3000)

أو بالكامل عبر Docker:

```bash
cp .env.example .env
docker compose up -d --build
```

## الرفع على منصات الاستضافة (Vercel / Render / Railway)

نفس الكود المحلي يعمل على المنصات عبر متغيرات البيئة فقط (بدون `output: standalone` خارج Docker).

1. أنشئ قاعدة PostgreSQL مُدارة (Neon / Supabase / Railway / Render).
2. في لوحة المنصة اضبط المتغيرات التالية على الأقل:
   - `DATABASE_URL` — رابط Postgres مع SSL (`?sslmode=require` عادة)
   - `SESSION_SECRET` و `CSRF_SECRET` و `SIGNED_URL_SECRET` — قيم عشوائية طويلة
   - `NEXT_PUBLIC_APP_URL` — رابط الموقع النهائي (https://...)
   - `COOKIE_SECURE=true` (أو اتركه؛ يُفعَّل تلقائيًا في الإنتاج)
   - `BLOB_READ_WRITE_TOKEN` — إن أردت رفع ملفات طبية دائمة (Vercel Blob)
   - `REDIS_URL` — اختياري (Upstash). إن تُرك فارغًا يعمل التطبيق بتخزين مؤقت في الذاكرة
3. أمر البناء: `npm run build` (يشغّل `prisma generate` تلقائيًا)
4. بعد أول رفع شغّل الترحيل مرة واحدة:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```
   (على Render/Railway ضع `prisma migrate deploy` كـ release command إن وُجد)

### ملاحظات المنصات

| الموضوع | محلي (Docker) | منصة رفع |
|--------|----------------|----------|
| Next output | `standalone` داخل Docker | افتراضي (بدون standalone) |
| قاعدة البيانات | حاوية Postgres | Neon/Supabase/… عبر `DATABASE_URL` |
| Redis | حاوية Redis | اختياري |
| الملفات | مجلد `uploads` | Vercel Blob عبر `BLOB_READ_WRITE_TOKEN` |

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
