# 🔧 แก้ไข Render Deployment Error

## ❌ Error ที่เกิด

```
npm error Missing script: "production"
npm error Exited with status 1 while running your code
```

---

## 🔍 สาเหตุ

### 1. Database Connection Failed (สาเหตุหลัก)
- Database ไม่สามารถเชื่อมต่อได้
- Environment variables ไม่ครบหรือไม่ถูกต้อง
- Database ไม่อนุญาตการเชื่อมต่อจาก Render IP

### 2. PORT Conflict
- Render ตั้งค่า PORT ให้เอง
- ถ้าเรา force PORT อาจทำให้ขัดแย้ง

---

## ✅ วิธีแก้ไข

### ขั้นตอนที่ 1: ลบ PORT Environment Variable

1. ไปที่ **Render Dashboard**
2. เลือก service `snp68_SPB`
3. ไปที่ **Environment** tab
4. **ลบ `PORT` variable ออก** (ถ้ามี)
5. คลิก **Save Changes**

### ขั้นตอนที่ 2: ตรวจสอบ Environment Variables

ตรวจสอบว่ามีครบทั้งหมดนี้:

```bash
NODE_ENV=production
DB_HOST=your-database-host.com
DB_PORT=3306
DB_USER=your-db-username
DB_PASSWORD=your-db-password
DB_NAME=your-database-name
JWT_SECRET=your-secure-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**⚠️ ไม่ต้องมี `PORT`** - Render จะตั้งให้เอง

### ขั้นตอนที่ 3: ตรวจสอบ Database Connection

#### ถ้าใช้ External Database (AWS RDS, DigitalOcean, etc.):

1. **Whitelist Render IP addresses:**
   - ไปที่ database firewall settings
   - เพิ่ม Render IP ranges หรือเปิด `0.0.0.0/0` (ทุก IP)

2. **ตรวจสอบ Database Host:**
   - ต้องเป็น public endpoint
   - ไม่ใช่ `localhost` หรือ `127.0.0.1`

3. **ตรวจสอบ SSL:**
   - Database ของคุณต้องการ SSL หรือไม่?
   - ถ้าไม่ต้องการ ให้เพิ่ม env var:
     ```bash
     DB_SSL=false
     ```

#### ถ้าใช้ Render Database:

1. ใช้ **Internal Connection String**
2. ไม่ต้อง whitelist IP

### ขั้นตอนที่ 4: Push Code ใหม่

```bash
cd "d:\React Native\snp68_SPB"
git add backend/server.js
git commit -m "fix: Improve server error handling for Render deployment"
git push origin main
```

Render จะ auto-deploy ใหม่

---

## 🧪 ทดสอบหลัง Deploy

### 1. ดู Logs บน Render

ไปที่ **Logs** tab และดูว่า:

**✅ Success:**
```
🚀 Server is running on port 10000
📍 Environment: production
🔒 SSL enabled for production database connection
✅ Connected to MySQL database: your-db-name
```

**❌ Error:**
```
❌ Error connecting to MySQL: [error message]
Database config: {
  host: 'your-db-host',
  port: 3306,
  user: 'your-user',
  database: 'your-db-name',
  ssl: 'enabled'
}
```

### 2. ทดสอบ API

```bash
curl https://snp68-spb.onrender.com/
# ควรได้: {"message":"Welcome to Test Native Backend API"}
```

---

## 🔧 แก้ไขเพิ่มเติม (ถ้ายังมีปัญหา)

### ปัญหา: Database SSL Error

**Error:**
```
Error: self signed certificate in certificate chain
```

**วิธีแก้:**

1. เพิ่ม environment variable:
   ```bash
   DB_SSL=false
   ```

2. แก้ไข `backend/config/db.js`:
   ```javascript
   if (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false') {
     dbConfig.ssl = {
       minVersion: 'TLSv1.2',
       rejectUnauthorized: false  // อนุญาต self-signed cert
     };
   }
   ```

### ปัญหา: Database Connection Timeout

**Error:**
```
Error: connect ETIMEDOUT
```

**วิธีแก้:**
- ตรวจสอบ database firewall
- ตรวจสอบว่า database online อยู่
- ลอง ping database host

### ปัญหา: Wrong Database Credentials

**Error:**
```
Error: Access denied for user
```

**วิธีแก้:**
- ตรวจสอบ `DB_USER` และ `DB_PASSWORD`
- ตรวจสอบว่า user มีสิทธิ์เข้าถึง database

---

## 📋 Checklist

### Environment Variables:
- [ ] `NODE_ENV=production`
- [ ] `DB_HOST` (ไม่ใช่ localhost)
- [ ] `DB_PORT=3306`
- [ ] `DB_USER`
- [ ] `DB_PASSWORD`
- [ ] `DB_NAME`
- [ ] `JWT_SECRET`
- [ ] ลบ `PORT` ออก

### Database:
- [ ] Database online และ accessible
- [ ] Whitelist Render IP (ถ้าใช้ external DB)
- [ ] SSL config ถูกต้อง
- [ ] Credentials ถูกต้อง

### Code:
- [ ] Push code ล่าสุด
- [ ] Render auto-deploy สำเร็จ
- [ ] ดู logs ไม่มี error

---

## 💡 Tips

### ดู Logs แบบ Real-time

ใน Render Dashboard:
1. ไปที่ **Logs** tab
2. เลือก **Live tail**
3. ดู logs แบบ real-time

### Restart Service

ถ้าแก้ไข environment variables:
1. ไปที่ **Manual Deploy**
2. คลิก **Clear build cache & deploy**

### ทดสอบ Database Connection

ใช้ tool เช่น:
- MySQL Workbench
- DBeaver
- TablePlus

ทดสอบเชื่อมต่อด้วย credentials เดียวกับที่ใส่ใน Render

---

## 🆘 ยังแก้ไม่ได้?

### ส่ง Logs ให้ดู

Copy logs จาก Render และส่งมาให้ดู โดยเฉพาะส่วน:
- Database connection error
- Environment variables
- Server startup

### ตรวจสอบ Database

ลอง connect database ด้วย MySQL client:
```bash
mysql -h your-db-host -u your-user -p your-database
```

---

**อัพเดทเมื่อ:** 2025-12-07  
**Backend URL:** https://snp68-spb.onrender.com  
**สถานะ:** รอแก้ไข environment variables และ database connection
