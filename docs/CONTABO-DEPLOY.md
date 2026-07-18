# رفع المشروع على Contabo (VPS)

دليل تشغيل **عيادة الوسام** على سيرفر Contabo (Ubuntu) باستخدام Docker — قاعدة بيانات، Redis، HTTPS، ونسخ احتياطي.

## ما الذي ستحصل عليه؟

- موقع يعمل 24/7 على نطاق العيادة أو IP السيرفر
- قاعدة PostgreSQL و Redis داخل Docker (لا حاجة لخدمات خارجية)
- شهادة HTTPS مجانية تلقائياً عند استخدام نطاق حقيقي
- ملفات المرضى محفوظة على قرص السيرفر (`uploads` volume)

---

## 1) شراء وتجهيز السيرفر

**المواصفات الموصى بها:**

| المورد | الحد الأدنى | الموصى به |
|--------|-------------|-----------|
| CPU | 4 vCPU | 4–6 vCPU |
| RAM | 8 GB | 8–16 GB |
| قرص | 100 GB SSD | 200 GB SSD |
| نظام | Ubuntu 22.04 أو 24.04 LTS | |

1. أنشئ VPS من لوحة Contabo.
2. سجّل **IP السيرفر** وكلمة مرور root.
3. (موصى به) اربط **نطاقاً** (من Hostinger/GoDaddy) بـ IP السيرفر:
   - سجل `A` → `@` → IP السيرفر
   - سجل `A` → `www` → IP السيرفر (اختياري)

---

## 2) رفع ملف المشروع

### الطريقة أ — ملف ZIP (للعميل)

على جهاز التطوير (Windows):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package-for-contabo.ps1
```

يُنشئ: `deploy/contabo/al-wisam-dental-contabo.zip`

ارفع الملف إلى السيرفر:

```bash
scp deploy/contabo/al-wisam-dental-contabo.zip root@YOUR_SERVER_IP:/opt/
```

على السيرفر:

```bash
cd /opt
unzip al-wisam-dental-contabo.zip -d al-wisam-dental
cd al-wisam-dental
```

### الطريقة ب — Git

```bash
cd /opt
git clone https://github.com/kinghabib465-prog/alwissam.git al-wisam-dental
cd al-wisam-dental
```

---

## 3) إعداد السيرفر (مرة واحدة)

```bash
sudo bash deploy/contabo/setup-server.sh
```

يثبّت Docker ويفتح المنافذ 22 و 80 و 443.

---

## 4) ضبط ملف البيئة `.env`

```bash
cp deploy/contabo/.env.production.example .env
bash deploy/contabo/generate-secrets.sh >> .env.secrets
nano .env
```

**أهم القيم:**

| المتغير | مثال | ملاحظة |
|---------|------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://alwisam.example.dz` | رابط العيادة النهائي |
| `DOMAIN` | `alwisam.example.dz` | بدون `https://` |
| `ACME_EMAIL` | `admin@alwisam.dz` | لشهادة Let's Encrypt |
| `COOKIE_SECURE` | `true` | `false` فقط مع HTTP/IP |
| `SMTP_*` | Brevo / Gmail | **مطلوب** لنسيان كلمة المرور |
| `SEED_*_PASSWORD` | كلمات قوية | حسابات البداية |

---

## 5) التشغيل

```bash
bash deploy/contabo/deploy.sh
```

أو يدوياً:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

بعد 1–2 دقيقة افتح الرابط من `.env`.

---

## 6) التحقق

```bash
docker compose -f docker-compose.prod.yml ps
curl -I "https://YOUR-DOMAIN/staff/login"
```

جرّب الدخول بحساب منانة من `/staff/login`.

---

## 7) النسخ الاحتياطي

```bash
# يومياً (أضفه لـ cron)
docker exec alwisam-postgres pg_dump -U alwisam alwisam_dental | gzip > /opt/backups/alwisam-$(date +%F).sql.gz
```

استعادة:

```bash
gunzip -c backup.sql.gz | docker exec -i alwisam-postgres psql -U alwisam alwisam_dental
```

---

## 8) التحديث بعد تعديل الكود

```bash
cd /opt/al-wisam-dental
git pull   # أو ارفع ZIP جديد
bash deploy/contabo/deploy.sh
```

---

## تشغيل مؤقت بـ IP فقط (بدون نطاق)

في `.env`:

```env
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER_IP
DOMAIN=YOUR_SERVER_IP
COOKIE_SECURE=false
```

ثم أعد النشر. **للإنتاج الفعلي استخدم نطاقاً مع HTTPS.**

---

## تسليم العميل

أعطِ العيادة ملف: `deploy/contabo/CLIENT-HANDOFF-AR.md` مع:

- رابط الموقع
- حسابات البداية (بعد تغيير كلمات المرور)
- جهة اتصال الدعم

---

## استكشاف الأخطاء

```bash
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f postgres
```

| الخطأ | السبب المحتمل |
|-------|----------------|
| `502` من Caddy | التطبيق لم يكتمل البناء — راجع سجلات `app` |
| شهادة SSL فاشلة | `DOMAIN` لا يشير لـ IP السيرفر |
| الدخول يفشل | بريد/كلمة مرور خاطئة أو `COOKIE_SECURE` مع HTTP |
| لا يصل بريد الاستعادة | `SMTP_*` غير مضبوط |
