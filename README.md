# عيادة الوسام لطب الأسنان — منصة الإدارة

منصة إنتاجية لإدارة عيادة أسنان عربية (RTL) مبنية بـ Next.js و PostgreSQL و Prisma و Redis.

## المتطلبات

- Node.js 22+
- Docker Desktop (للتطوير المحلي)
- npm 11+

## المنافذ الافتراضية

لتجنب التعارض مع مشاريع أخرى على الجهاز:

- PostgreSQL: `localhost:5433`
- Redis: `localhost:6380`
- التطبيق: `localhost:3000`

## الإعداد السريع (محلي)

```bash
cp .env.example .env
npm install
npm run docker:up
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

افتح: [http://localhost:3000](http://localhost:3000)

## النشر على Render.com

### الخطوات:

1. **إنشاء خدمات قاعدة البيانات:**
   - PostgreSQL database (Version 16+)
   - Redis instance

2. **متغيرات البيئة المطلوبة:**
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
   REDIS_URL=redis://[user]:[password]@[host]:[port]
   NEXT_PUBLIC_APP_URL=https://[your-app].onrender.com
   SESSION_SECRET=[generate-random-secret-32-chars]
   CSRF_SECRET=[generate-random-secret-32-chars]
   SIGNED_URL_SECRET=[generate-random-secret-32-chars]
   COOKIE_SECURE=true
   ```

3. **إنشاء Web Service:**
   - اربط مستودع GitHub
   - فرع: `render-deployment` (أو `main`)
   - Build command: `npm run build`
   - Start command: `npm start`
   - الميناء: `3000`

### ملاحظات مهمة:

- الترحيلات تعمل تلقائياً عند البدء (Dockerfile)
- البذرة الأولية تحتاج تشغيل يدوي:
  ```bash
  npm run db:seed
  ```
- الملفات المرفوعة تُخزن في ذاكرة التطبيق (Render Free يحذفها عند التوقف)

## حسابات الاختبار

| الدور | البريد |
|------|--------|
| صاحبة العيادة (Admin) | `SEED_DOCTOR_SPECIALIST_EMAIL` |
| سكرتيرة | `SEED_SECRETARY1_EMAIL` |
| طبيب عام | `SEED_DOCTOR_GENERAL_EMAIL` |

**كلمات المرور:** محددة في متغيرات البيئة (`SEED_*_PASSWORD`)

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
npm run db:seed             # بيانات أساسية فقط
npm run docker:up           # Postgres + Redis (محلي)
npm run docker:down         # إيقاف الحاويات
```

## النسخ الاحتياطي

```bash
# محلي
docker exec alwisam-postgres pg_dump -U alwisam alwisam_dental > backup-$(date +%F).sql

# الاستعادة
cat backup.sql | docker exec -i alwisam-postgres psql -U alwisam alwisam_dental
```

## البنية

```
src/
  app/          صفحات App Router و REST API
  components/   واجهة المستخدم
  lib/
    auth/       جلسات، صلاحيات، كلمات مرور
    services/   منطق الأعمال
    audit/      سجل التدقيق
prisma/
  schema.prisma المخطط
  migrations/   ملفات الترحيل
  seed/         بيانات البذرة الأولية
public/         الملفات الثابتة
```

## الأدوار

`ADMIN` · `SECRETARY` · `DOCTOR_SPECIALIST` · `DOCTOR_GENERAL` · `PATIENT`

## ملاحظات أمنية

- كلمات المرور محمية بـ bcrypt
- جلسات HTTP-only cookies
- CSRF على عمليات الكتابة
- تحديد معدل لمحاولات الدخول
- المدفوعات لا تُحذف نهائياً (إبطال مع سبب)
- الأسرار لا ترفع إلى Git
