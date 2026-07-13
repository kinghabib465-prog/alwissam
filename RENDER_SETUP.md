# 🚀 دليل النشر الكامل على Render.com

## الخطوة 1: إعداد Render Dashboard

### 1.1 إنشو حساب Render
1. اذهب إلى [render.com](https://render.com)
2. سجّل دخول أو أنشئ حساباً جديداً

### 1.2 ربط مستودع GitHub
1. في لوحة التحكم، اذهب إلى **Account Settings** → **Connected Services**
2. اختر **GitHub** وأعطِ صلاحيات Render
3. اختر المستودع `kinghabib465-prog/alwissam`

---

## الخطوة 2: إنشاء قاعدة البيانات PostgreSQL

1. اضغط **New** → **PostgreSQL**
2. ملء البيانات:
   - **Name:** `alwissam-postgres`
   - **Database:** `alwissam_dental`
   - **User:** `alwissam_user`
   - **Region:** اختر منطقتك الأقرب
   - **Plan:** Free (أو Paid إذا كنت تريد إنتاجاً أفضل)
3. اضغط **Create Database**
4. **انتظر** حتى ينتهي التهيئة (~2 دقيقة)

### حفظ بيانات الاتصال:
ستجد هذه البيانات في صفحة الـ Database:
```
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
```
**احفظها - ستحتاجها لاحقاً**

---

## الخطوة 3: إنشاء خدمة Redis

1. اضغط **New** → **Redis**
2. ملء البيانات:
   - **Name:** `alwissam-redis`
   - **Region:** نفس منطقة PostgreSQL
   - **Plan:** Free (أو Paid)
3. اضغط **Create Redis**
4. **انتظر** حتى ينتهي التهيئة

### حفظ بيانات الاتصال:
```
REDIS_URL=redis://default:[password]@[host]:[port]
```
**احفظها - ستحتاجها لاحقاً**

---

## الخطوة 4: إنشاء تطبيق الويب

1. اضغط **New** → **Web Service**
2. اختر **Deploy from GitHub Repository**
3. ابحث عن واختر: `kinghabib465-prog/alwissam`
4. اختر الفرع: `render-deployment`

### ملء البيانات:
- **Name:** `alwissam-dental-app`
- **Environment:** `Node`
- **Build Command:** `npm install && npx prisma generate && npm run build`
- **Start Command:** `npm start`
- **Plan:** Free (أو Paid)

---

## الخطوة 5: متغيرات البيئة (الأهم!)

### 5.1 إضافة متغيرات البيئة:

في صفحة Web Service، اضغط **Environment**

أضف المتغيرات التالية واحداً تلو الآخر:

#### من قاعدة البيانات:
```
DATABASE_URL = postgresql://[من Postgres Dashboard]
```

#### من Redis:
```
REDIS_URL = redis://[من Redis Dashboard]
```

#### متغيرات التطبيق:
```
NODE_ENV = production
NEXT_PUBLIC_APP_URL = https://alwissam-dental-app.onrender.com
NEXT_TELEMETRY_DISABLED = 1
COOKIE_SECURE = true
PORT = 3000
APP_NAME = عيادة الوسام لطب الأسنان
```

#### مفاتيح الأمان (يجب توليدها):
في Terminal محليك، شغّل:
```bash
openssl rand -base64 32
```
كرّر هذا 3 مرات لتوليد 3 مفاتيح مختلفة:

```
SESSION_SECRET = [النتيجة من openssl]
CSRF_SECRET = [النتيجة من openssl]
SIGNED_URL_SECRET = [النتيجة من openssl]
```

#### إعدادات الجلسات:
```
SESSION_MAX_AGE_HOURS = 12
SESSION_REMEMBER_DAYS = 30
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 30
```

#### بيانات البذرة الأولية:
```
SEED_ADMIN_EMAIL = admin@alwisam.dz
SEED_ADMIN_PHONE = 0550000001
SEED_ADMIN_PASSWORD = ChangeMe_Admin_123!

SEED_SECRETARY1_EMAIL = samar@alwisam.dz
SEED_SECRETARY1_PHONE = 0550000002
SEED_SECRETARY1_PASSWORD = ChangeMe_Secretary_123!

SEED_DOCTOR_SPECIALIST_EMAIL = manana@alwisam.dz
SEED_DOCTOR_SPECIALIST_PHONE = 0550000003
SEED_DOCTOR_SPECIALIST_PASSWORD = ChangeMe_Doctor_123!

SEED_DOCTOR_GENERAL_EMAIL = wakri@alwisam.dz
SEED_DOCTOR_GENERAL_PHONE = 0550000004
SEED_DOCTOR_GENERAL_PASSWORD = ChangeMe_Doctor_123!
```

#### معلومات العيادة:
```
CLINIC_PHONE = 0550000000
CLINIC_EMAIL = contact@alwisam.dz
CLINIC_ADDRESS = الجزائر
CLINIC_MAP_EMBED_URL = 
```

#### الملفات المرفوعة:
```
UPLOAD_DIR = /tmp/alwissam-uploads
MAX_UPLOAD_SIZE_MB = 20
```

---

## الخطوة 6: البناء والنشر

1. اضغط **Create Web Service**
2. سيبدأ البناء (Build) - **انتظر 3-5 دقائق**
3. إذا نجح، ستجد الرابط:
   ```
   https://alwissam-dental-app.onrender.com
   ```

### مراقبة البناء:
- اذهب إلى **Logs** لترى سجل البناء
- البحث عن `Migrations completed` في السجل
- ستجد `started successfully` عند انتهاء البناء

---

## الخطوة 7: اختبار التطبيق

1. افتح الرابط: `https://alwissam-dental-app.onrender.com`
2. جرّب المداخل:
   - الموقع العام: `/`
   - حجز موعد: `/book-appointment`
   - دخول الطاقم: `/staff/login`
   - دخول المريض: `/patient/login`

### حسابات الاختبار:
استخدم البيانات التي أضفتها في `SEED_*` متغيرات

مثال:
- البريد: `manana@alwisam.dz`
- كلمة المرور: `ChangeMe_Doctor_123!`

---

## ⚠️ ملاحظات مهمة

### 1. الملفات المرفوعة
- على Render، الملفات تُحفظ مؤقتاً في `/tmp`
- **ستُحذف** عند إعادة تشغيل التطبيق
- **للإنتاج:** استخدم AWS S3 أو Cloudinary

### 2. قاعدة البيانات
- الترحيلات تعمل **تلقائياً** عند البدء
- البيانات الأولية (Seed) تُشغّل **تلقائياً**

### 3. كلمات المرور
- **غيّر** كل كلمات المرور الافتراضية **فوراً** بعد أول دخول
- استخدم كلمات مرور قوية (أحرف + أرقام + رموز)

### 4. الأمان
- `COOKIE_SECURE=true` (فقط على HTTPS - وRender توفره مجاناً)
- `SESSION_SECRET` و `CSRF_SECRET` يجب أن تكون عشوائية قوية
- **لا تشارك** قيم السرية مع أحد

---

## 🔄 تحديثات المشروع

عندما تريد نشر تحديثات:

1. ادفع التغييرات إلى GitHub:
```bash
git add .
git commit -m "description of changes"
git push origin render-deployment
```

2. Render سيكتشف التغييرات **تلقائياً**
3. سيبدأ البناء والنشر الجديد **تلقائياً**

---

## 🐛 استكشاف الأخطاء

### التطبيق لا يبدأ:
- اذهب إلى **Logs** → ابحث عن `Error`
- تحقق من:
  - `DATABASE_URL` صحيح
  - `REDIS_URL` صحيح
  - جميع `SEED_*` كاملة

### المحتوى لا يظهر:
- تحقق من الترحيلات: `Migrations completed`
- ادخل إلى `Logs` وابحث عن `db:seed`

### بطء التطبيق:
- Render Free قد يكون بطيء أحياناً
- للأداء الأفضل، ارقَّ إلى Paid Plan

---

## ✅ قائمة التحقق النهائية

- [ ] PostgreSQL Database مُنشأة
- [ ] Redis Service مُنشأة
- [ ] Web Service مُنشأة
- [ ] جميع متغيرات البيئة مُضافة
- [ ] البناء نجح (✓ في Logs)
- [ ] التطبيق يفتح (200 OK)
- [ ] البيانات الأولية مُحمّلة (Seed)
- [ ] تستطيع تسجيل الدخول

---

## 📞 الدعم

إذا واجهت مشاكل:
1. تحقق من Render Logs
2. تأكد من جميع متغيرات البيئة
3. أعد البناء: **Manual Deploy** من Render Dashboard

**مبروك! 🎉 تطبيقك الآن حي على الإنترنت!**
