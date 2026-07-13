# عيادة الوسام لطب الأسنان — منصة الإدارة

منصة إنتاجية لإدارة عيادة أسنان عربية (RTL) مبنية بـ Next.js و PostgreSQL و Prisma و Redis.

🌐 **الموقع الحي:** https://alwissam-nine.vercel.app

---

## 📋 المتطلبات

### للتطوير المحلي:
- Node.js 22+
- Docker Desktop
- npm 11+

### للنشر على Render:
- حساب [Render.com](https://render.com) (مجاني)
- مستودع GitHub
- لا تحتاج أي شيء آخر! ✨

---

## 🚀 النشر على Render.com (الطريقة الموصى بها)

### الخطوات السريعة:

1. **اقرأ الدليل الكامل:**
   ```bash
   # انظر إلى ملف RENDER_SETUP.md للحصول على تعليمات مفصلة خطوة بخطوة
   cat RENDER_SETUP.md
   ```

2. **إنشاء الخدمات على Render:**
   - PostgreSQL Database (Free)
   - Redis Service (Free)
   - Web Service (Free) - سيربط تلقائياً من GitHub

3. **إضافة متغيرات البيئة:**
   ```bash
   # استخدم .env.render كمرجع
   cat .env.render
   ```

4. **النشر التلقائي:**
   - كل push إلى `render-deployment` سيُنشر **تلقائياً**
   - سيتم تشغيل الترحيلات والبيانات الأولية **تلقائياً**

✅ **بهذا تنتهي! تطبيقك حي الآن على الإنترنت!**

---

## 💻 التطوير المحلي

### الإعداد السريع:

```bash
# 1. استنساخ المستودع
git clone https://github.com/kinghabib465-prog/alwissam.git
cd alwissam

# 2. نسخ متغيرات البيئة
cp .env.example .env

# 3. تثبيت الحزم
npm install

# 4. بدء خدمات قاعدة البيانات والـ Redis
npm run docker:up

# 5. تطبيق الترحيلات
npx prisma migrate dev --name init

# 6. تحميل البيانات الأولية
npm run db:seed

# 7. بدء خادم التطوير
npm run dev
```

**افتح:** [http://localhost:3000](http://localhost:3000)

---

## 🔑 حسابات الاختبار (المحلية)

| الدور | البريد | كلمة المرور |
|------|--------|-------|
| صاحبة العيادة (Admin) | `manana@alwisam.dz` | من `.env` |
| سكرتيرة | `samar@alwisam.dz` | من `.env` |
| طبيب عام | `wakri@alwisam.dz` | من `.env` |

---

## 📱 المداخل الرئيسية

- **الموقع العام:** `/`
- **حجز موعد:** `/book-appointment`
- **دخول الطاقم:** `/staff/login`
- **دخول المريض:** `/patient/login`

---

## 📚 الأوامر المتاحة

```bash
# التطوير
npm run dev               # تشغيل خادم التطوير
npm run build             # بناء للإنتاج
npm run start             # تشغيل الإنتاج

# التحقق من الجودة
npm run typecheck         # فحص TypeScript
npm run lint              # ESLint

# قاعدة البيانات
npm run db:migrate        # تطبيق ترحيلات التطوير
npm run db:migrate:deploy # تطبيق ترحيلات الإنتاج
npm run db:seed           # تحميل البيانات الأولية
npm run db:studio         # فتح واجهة Prisma Studio

# Docker (محلي)
npm run docker:up         # بدء PostgreSQL + Redis
npm run docker:down       # إيقاف الحاويات

# النسخ الاحتياطي (محلي)
docker exec alwisam-postgres pg_dump -U alwisam alwisam_dental > backup-$(date +%F).sql
```

---

## 🏗️ البنية

```
src/
  app/          صفحات App Router و REST API endpoints
  components/   مكونات واجهة المستخدم
  lib/
    auth/       منطق المصادقة والجلسات
    services/   منطق الأعمال الأساسي
    audit/      سجل التدقيق والأنشطة

prisma/
  schema.prisma    تعريف قاعدة البيانات
  migrations/      تاريخ التغييرات
  seed/            البيانات الأولية

public/            الملفات الثابتة
```

---

## 👥 الأدوار والصلاحيات

- `ADMIN` - صاحبة العيادة (تحكم كامل)
- `SECRETARY` - سكرتيرة (إدارة المواعيد والمرضى)
- `DOCTOR_SPECIALIST` - طبيب متخصص
- `DOCTOR_GENERAL` - طبيب عام
- `PATIENT` - مريض (حجز وعرض بيانات شخصية)

---

## 🔒 ملاحظات الأمان

✅ **كلمات المرور:**
- محمية بـ bcrypt (hash قوي)
- تُؤخذ من متغيرات البيئة فقط
- لا تُخزّن في الكود

✅ **الجلسات:**
- HTTP-only cookies (لا يمكن الوصول عبر JavaScript)
- تنتهي صلاحيتها تلقائياً
- خاصة برمز CSRF

✅ **حماية الطلبات:**
- CSRF protection على جميع عمليات الكتابة
- تحديد معدل دخول (5 محاولات قبل الحظر)
- تسجيل جميع الأنشطة الحساسة

✅ **المدفوعات:**
- لا تُحذف نهائياً
- فقط "إبطال" مع تسجيل السبب

---

## 🤝 المساهمة

1. أنشئ فرع جديد: `git checkout -b feature/your-feature`
2. قم بالتغييرات واختبرها محلياً
3. ادفع إلى GitHub: `git push origin feature/your-feature`
4. افتح Pull Request

---

## 📞 الدعم

إذا واجهت مشاكل:

1. **في التطوير المحلي:**
   - تحقق من `.env` متطابق مع `.env.example`
   - أعد تشغيل Docker: `npm run docker:down && npm run docker:up`
   - امسح cache: `rm -rf .next && npm run build`

2. **على Render:**
   - اقرأ `RENDER_SETUP.md` للتعليمات المفصلة
   - تحقق من Render Logs في Dashboard
   - تأكد من جميع متغيرات البيئة

---

## 📄 الترخيص

هذا المشروع خاص. جميع الحقوق محفوظة.

---

**آخر تحديث:** July 2026 ✨
