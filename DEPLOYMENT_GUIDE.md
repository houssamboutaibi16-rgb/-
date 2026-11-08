# 📖 دليل النشر والاستضافة الخارجية لمشروع NovaPulse AI Studio

هذا الدليل يشرح خطوة بخطوة كيفية استضافة وتشغيل منصة **NovaPulse AI Studio** على خوادمك الخاصة أو أي خدمة سحابية خارجية.

---

## 🖥️ الخيار 1: النشر على سيرفر VPS (Ubuntu / Debian / AlmaLinux)

### 1. تجهيز السيرفر وتثبيت Node.js و Git و FFmpeg:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ffmpeg

# تثبيت Node.js 20 LTS:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. فك ضغط المشروع أو نسخه:
```bash
# إنشاء مجلد للمشروع
mkdir -p /var/www/novapulse
cd /var/www/novapulse

# فك ضغط novapulse-ai-studio.zip هنا
unzip novapulse-ai-studio.zip
```

### 3. تثبيت الحزم والبناء:
```bash
npm install
cp .env.example .env
nano .env  # عدل المفاتيح ورابط الموقع
npm run build
```

### 4. التشغيل الدائم عبر مدير العمليات PM2:
```bash
# تثبيت PM2 عالمياً
sudo npm install -g pm2

# تشغيل التطبيق في الخلفية
pm2 start "npm start" --name "novapulse-ai"

# حفظ التشغيل التلقائي عند إعادة تشغيل السيرفر
pm2 save
pm2 startup
```

### 5. إعداد Nginx كـ Reverse Proxy وشهادة SSL (Let's Encrypt):
```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
ثم تفعيل SSL مجاناً عبر Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🐳 الخيار 2: النشر عبر Docker و Docker Compose

إذا كان لديك سيرفر مثبت عليه Docker:
```bash
# 1. الدخول إلى مجلد المشروع
cd novapulse-ai-studio

# 2. إنشاء ملف .env وتعديل القيم
cp .env.example .env
nano .env

# 3. تشغيل الحاوية
docker compose up -d --build
```
سيعمل التطبيق على المنفذ 3000 ويتم حفظ بيانات المستخدمين تلقائياً في مجلد `./data`.

---

## ☁️ الخيار 3: النشر على المنصات السحابية (Railway / Render / Fly.io / Cloud Run)

### 1. النشر على Railway:
- اربط مستودع GitHub أو ارفع الكود المصدري.
- يقوم Railway باكتشاف `Dockerfile` أو `package.json` تلقائياً.
- أضف المتغيرات البيئية من لوحة تحكم Railway:
  - `PORT`: 3000
  - `NODE_ENV`: production
  - `APP_URL`: رابط الخدمة المعطى من Railway
  - `NOVA_AI_API_KEY`: مفتاح OpenRouter
  - `META_APP_ID`: معرف فيسبوك

### 2. النشر على Render:
- أنشئ **Web Service** جديدة.
- حدد Environment: `Node`.
- أمر البناء Build Command: `npm install && npm run build`.
- أمر التشغيل Start Command: `npm start`.
- أضف `Disk` ثابت مربوط بالمسار `/app/data` للحفاظ على بيانات المستخدمين.

---

## 💾 النسخ الاحتياطي لقاعدة البيانات

قاعدة بيانات المنصة مخزنة بصيغة JSON خفيفة وعالية الكفاءة في:
`/data/store.json`
لأخذ نسخة احتياطية في أي وقت:
```bash
cp /var/www/novapulse/data/store.json /backup/store-$(date +%F).json
```
ولاستعادة البيانات على أي استضافة جديدة، يكفي وضع الملف داخل مجلد `data/` وسيتعرف عليه النظام فوراً دون الحاجة لتثبيت PostgreSQL أو MySQL معقد.
