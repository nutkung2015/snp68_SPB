# 🚀 Quick Deployment Reference

## สำหรับ Render / Railway / DigitalOcean

### Build Command:
```bash
npm ci --only=production
```

### Start Command:
```bash
npm run production
```

### Root Directory:
```
backend
```

---

## Environment Variables ที่ต้องตั้งค่า:

```bash
NODE_ENV=production
DB_HOST=your-production-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
DB_NAME=your-db-name
JWT_SECRET=your-secure-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**หมายเหตุ:** `PORT` จะถูกตั้งค่าอัตโนมัติโดย platform

---

## สร้าง JWT Secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## ทดสอบบน Local ก่อน Deploy:
```bash
npm ci --only=production
npm run prod
```

---

## 📚 อ่านเพิ่มเติม:
- **DEPLOYMENT_GUIDE.md** - คู่มือฉบับเต็ม
- **ENVIRONMENT_GUIDE.md** - การตั้งค่า environment
- **DB_CONFIG_FIXES.md** - การตั้งค่า database
