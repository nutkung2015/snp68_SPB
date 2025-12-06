# 🚀 Deployment Guide - Build & Start Commands

## 📋 คำสั่งสำหรับ Deployment Platform

### ✅ แนะนำ (สำหรับ Render / Railway / Heroku)

```yaml
Build Command:  npm ci --only=production
Start Command:  npm run production
```

**หรือ** (ถ้า platform ไม่รองรับ `npm ci`):
```yaml
Build Command:  npm install
Start Command:  npm run production
```

---

## 🎯 Scripts ที่มีใน package.json

| Script | คำสั่ง | ใช้กับ | Environment Variables |
|--------|--------|--------|----------------------|
| `npm start` | `node server.js` | Default | จาก `.env` |
| `npm run dev` | `nodemon server.js` | Local development | จาก `.env` |
| `npm run local` | `nodemon + .env.local` | Local testing | จาก `.env.local` |
| `npm run prod` | `node + .env.production` | Local production test | จาก `.env.production` |
| `npm run production` | `node server.js` | **Deployment** | จาก Platform Env Vars |

---

## 🌐 การตั้งค่าตาม Platform

### 1️⃣ Render (render.com)

#### ขั้นตอนการตั้งค่า:

1. **Root Directory:** `backend`
2. **Build Command:** 
   ```bash
   npm ci --only=production
   ```
3. **Start Command:** 
   ```bash
   npm run production
   ```

#### Environment Variables:
ไปที่ **Environment** tab และเพิ่ม:
```
NODE_ENV=production
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
JWT_SECRET=your-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
PORT=5000
```

---

### 2️⃣ Railway (railway.app)

#### ขั้นตอนการตั้งค่า:

1. **Root Directory:** `backend`
2. **Build Command:** (ไม่ต้องตั้ง - ทำอัตโนมัติ)
3. **Start Command:** 
   ```bash
   npm run production
   ```

#### Environment Variables:
ไปที่ **Variables** tab และเพิ่มเหมือนกับ Render

**หมายเหตุ:** Railway จะตั้งค่า `PORT` ให้อัตโนมัติ ไม่ต้องตั้งเอง

---

### 3️⃣ Heroku (heroku.com)

#### ขั้นตอนการตั้งค่า:

1. สร้างไฟล์ `Procfile` ในโฟลเดอร์ `backend`:
   ```
   web: npm run production
   ```

2. **Build Command:** (ทำอัตโนมัติ)

#### Environment Variables:
```bash
heroku config:set NODE_ENV=production
heroku config:set DB_HOST=your-db-host
heroku config:set DB_USER=your-db-user
heroku config:set DB_PASSWORD=your-db-password
heroku config:set DB_NAME=your-db-name
heroku config:set JWT_SECRET=your-jwt-secret
heroku config:set CLOUDINARY_CLOUD_NAME=your-cloud-name
heroku config:set CLOUDINARY_API_KEY=your-api-key
heroku config:set CLOUDINARY_API_SECRET=your-api-secret
```

**หมายเหตุ:** Heroku จะตั้งค่า `PORT` ให้อัตโนมัติ

---

### 4️⃣ DigitalOcean App Platform

#### ขั้นตอนการตั้งค่า:

1. **Build Command:** 
   ```bash
   npm install
   ```
2. **Run Command:** 
   ```bash
   npm run production
   ```

#### Environment Variables:
เพิ่มใน **App-Level Environment Variables** เหมือนกับ Render

---

### 5️⃣ AWS / VPS (Ubuntu/Linux)

#### ขั้นตอนการ Deploy:

1. **Clone repository:**
   ```bash
   git clone your-repo-url
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm ci --only=production
   ```

3. **สร้างไฟล์ `.env.production`** และใส่ค่า

4. **รัน server:**
   ```bash
   npm run prod
   ```

5. **ใช้ PM2 สำหรับ production:**
   ```bash
   npm install -g pm2
   pm2 start npm --name "backend" -- run production
   pm2 save
   pm2 startup
   ```

---

## 🔐 Environment Variables ที่จำเป็น

### Required (ต้องมี):
```bash
NODE_ENV=production          # บอกว่าเป็น production environment
DB_HOST=                     # Database host
DB_USER=                     # Database username
DB_PASSWORD=                 # Database password
DB_NAME=                     # Database name
JWT_SECRET=                  # JWT secret key (ต้องสุ่มใหม่!)
```

### Optional (ถ้าใช้):
```bash
DB_PORT=3306                 # Database port (default: 3306)
PORT=5000                    # Server port (บาง platform ตั้งให้อัตโนมัติ)
CLOUDINARY_CLOUD_NAME=       # Cloudinary cloud name
CLOUDINARY_API_KEY=          # Cloudinary API key
CLOUDINARY_API_SECRET=       # Cloudinary API secret
```

---

## 🛠️ Build Command Options

### 1. `npm install`
```bash
npm install
```
- ติดตั้ง dependencies ทั้งหมด (รวม devDependencies)
- ใช้เวลานานกว่า
- ✅ ใช้ได้กับทุก platform

### 2. `npm ci` (แนะนำ)
```bash
npm ci
```
- ติดตั้งจาก `package-lock.json` (เร็วกว่า)
- ลบ `node_modules` เก่าก่อนติดตั้ง
- ✅ เหมาะสำหรับ CI/CD

### 3. `npm ci --only=production` (ดีที่สุด)
```bash
npm ci --only=production
```
- ติดตั้งเฉพาะ dependencies (ไม่รวม devDependencies)
- ประหยัดพื้นที่และเวลา
- ⭐ แนะนำสำหรับ production

---

## 🧪 ทดสอบก่อน Deploy

### 1. ทดสอบ Production Build บน Local:
```bash
# ติดตั้ง dependencies แบบ production
npm ci --only=production

# รัน production script
npm run prod
```

### 2. ตรวจสอบว่า Server รันได้:
```bash
# ควรเห็น:
✅ Connected to MySQL database: your-db-name
📍 Environment: production
🔌 Host: your-db-host:3306
Server is running on port 5000
```

### 3. ทดสอบ API:
```bash
curl http://localhost:5000/
# ควรได้: {"message":"Welcome to Test Native Backend API"}
```

---

## 📝 Checklist ก่อน Deploy

- [ ] แก้ไขค่าใน `.env.production` (ถ้าทดสอบบน local)
- [ ] สร้าง JWT_SECRET ใหม่ที่ปลอดภัย
- [ ] ตั้งค่า Environment Variables บน deployment platform
- [ ] ตรวจสอบว่า database accessible จาก deployment platform
- [ ] ทดสอบ `npm run production` บน local
- [ ] ตรวจสอบว่า `package.json` มี script `production`
- [ ] Commit และ push code ล่าสุด
- [ ] ตรวจสอบ `.gitignore` ว่าไม่ commit ไฟล์ `.env`

---

## 🆘 Troubleshooting

### ปัญหา: Build failed
**วิธีแก้:**
- ตรวจสอบ `package.json` และ `package-lock.json`
- ลอง build บน local ก่อน: `npm ci --only=production`
- ตรวจสอบ Node.js version ที่ platform ใช้

### ปัญหา: Server ไม่ start
**วิธีแก้:**
- ตรวจสอบ logs บน deployment platform
- ตรวจสอบว่าตั้งค่า Environment Variables ครบ
- ตรวจสอบว่า `NODE_ENV=production`

### ปัญหา: Database connection failed
**วิธีแก้:**
- ตรวจสอบ `DB_HOST`, `DB_USER`, `DB_PASSWORD`
- ตรวจสอบว่า database อนุญาตการเชื่อมต่อจาก deployment platform
- ตรวจสอบ SSL settings (ดูที่ `DB_CONFIG_FIXES.md`)

### ปัญหา: Port already in use
**วิธีแก้:**
- ตรวจสอบว่า `server.js` ใช้ `process.env.PORT`
- บาง platform จะตั้งค่า `PORT` ให้อัตโนมัติ

---

## 💡 Tips

### 1. ใช้ Health Check Endpoint
เพิ่มใน `server.js`:
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
```

### 2. ตั้งค่า Node.js Version
เพิ่มใน `package.json`:
```json
"engines": {
  "node": ">=18.0.0",
  "npm": ">=9.0.0"
}
```

### 3. เพิ่ม Logging
```javascript
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);
console.log('Database:', process.env.DB_NAME);
```

---

**สร้างเมื่อ:** 2025-12-07  
**Version:** 1.0
