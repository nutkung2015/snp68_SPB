# 🚀 Environment Configuration Guide

## ภาพรวม

โปรเจคนี้แบ่ง environment เป็น 2 แบบ:
- **Local** - สำหรับพัฒนาบนเครื่อง local
- **Production** - สำหรับ deploy ขึ้น server จริง

---

## 📁 ไฟล์ Environment

| ไฟล์ | วัตถุประสงค์ | สถานะ |
|------|-------------|--------|
| `.env` | ไฟล์เดิม (ใช้กับ `npm start` และ `npm run dev`) | ✅ พร้อมใช้งาน |
| `.env.local` | สำหรับ local development | ✅ พร้อมใช้งาน |
| `.env.production` | สำหรับ production deployment | ⚠️ ต้องแก้ไขก่อนใช้งาน |

---

## 🎯 วิธีใช้งาน

### 1️⃣ Development ปกติ (ใช้ไฟล์ .env เดิม)
```bash
npm run dev
```
- ใช้ไฟล์ `.env` เดิม
- รัน server ด้วย nodemon (auto-reload)

### 2️⃣ Local Development (ใช้ไฟล์ .env.local)
```bash
npm run local
```
- ใช้ไฟล์ `.env.local`
- รัน server ด้วย nodemon (auto-reload)
- เหมาะสำหรับทดสอบ config แยกจากไฟล์ .env หลัก

### 3️⃣ Production (ใช้ไฟล์ .env.production)
```bash
npm run prod
```
- ใช้ไฟล์ `.env.production`
- รัน server แบบ production mode
- **ต้องแก้ไขค่าใน .env.production ก่อนใช้งาน!**

---

## ⚙️ การตั้งค่า Production

### ขั้นตอนที่ 1: แก้ไขไฟล์ `.env.production`

เปิดไฟล์ `.env.production` และแก้ไขค่าต่อไปนี้:

#### 1. Database Configuration
```env
DB_HOST=your-production-db-host.com    # เช่น: db.example.com หรือ IP address
DB_USER=prod_user                       # username สำหรับ production database
DB_PASSWORD=your_secure_password        # รหัสผ่านที่แข็งแรง
DB_NAME=sieng_puen_ban_prod            # ชื่อ database สำหรับ production
```

#### 2. JWT Secret (สำคัญมาก! 🔐)
สร้าง JWT secret ที่ปลอดภัยด้วยคำสั่ง:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

จากนั้นนำค่าที่ได้ไปใส่ใน:
```env
JWT_SECRET=<ค่าที่ได้จากคำสั่งด้านบน>
```

#### 3. Cloudinary Configuration
```env
CLOUDINARY_CLOUD_NAME=your_prod_cloud_name
CLOUDINARY_API_KEY=your_prod_api_key
CLOUDINARY_API_SECRET=your_prod_api_secret
```

### ขั้นตอนที่ 2: ทดสอบ Production Config
```bash
npm run prod
```

ตรวจสอบว่า server รันได้และเชื่อมต่อ database สำเร็จ

---

## 🔒 ความปลอดภัย

### ⚠️ สิ่งที่ต้องระวัง

1. **อย่า commit ไฟล์ .env ลง Git**
   - ไฟล์ `.env`, `.env.local`, `.env.production` ถูกเพิ่มใน `.gitignore` แล้ว
   - ตรวจสอบก่อน commit ทุกครั้ง

2. **ใช้ JWT_SECRET ที่แตกต่างกัน**
   - Local: ใช้ค่าง่ายๆ สำหรับพัฒนา
   - Production: ใช้ค่าที่สุ่มและปลอดภัยสูง

3. **แยก Database**
   - ควรใช้ database คนละตัวระหว่าง local และ production
   - อย่าใช้ production database สำหรับทดสอบ

4. **แยก Cloudinary Account (แนะนำ)**
   - ใช้ account แยกกันระหว่าง development และ production
   - ป้องกันไฟล์ทดสอบปนกับไฟล์จริง

---

## 📊 สรุป Scripts

| คำสั่ง | Environment | Auto-reload | ไฟล์ที่ใช้ |
|--------|-------------|-------------|-----------|
| `npm start` | Default | ❌ | `.env` |
| `npm run dev` | Development | ✅ | `.env` |
| `npm run local` | Local | ✅ | `.env.local` |
| `npm run prod` | Production | ❌ | `.env.production` |

---

## 🎓 Tips

### สร้าง JWT Secret ที่ปลอดภัย
```bash
# วิธีที่ 1: ใช้ Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# วิธีที่ 2: ใช้ OpenSSL (ถ้ามี)
openssl rand -hex 64
```

### ตรวจสอบว่า Environment ไหนกำลังรัน
เพิ่มใน `server.js`:
```javascript
console.log('Environment:', process.env.NODE_ENV);
console.log('Database:', process.env.DB_NAME);
```

### Backup ไฟล์ .env
```bash
# สำรองไฟล์ .env ไว้ที่อื่น (นอก Git)
cp .env .env.backup
cp .env.production .env.production.backup
```

---

## 🆘 Troubleshooting

### ปัญหา: Server ไม่โหลดค่าจาก .env.production
**วิธีแก้:**
- ตรวจสอบว่าไฟล์ `.env.production` อยู่ในโฟลเดอร์ `backend`
- ตรวจสอบชื่อไฟล์ว่าถูกต้อง (ไม่มี space หรือตัวอักษรพิเศษ)

### ปัญหา: Database connection failed
**วิธีแก้:**
- ตรวจสอบ `DB_HOST`, `DB_USER`, `DB_PASSWORD` ว่าถูกต้อง
- ตรวจสอบว่า database server เปิดอยู่
- ตรวจสอบ firewall และ network access

### ปัญหา: JWT token invalid
**วิธีแก้:**
- ตรวจสอบว่า `JWT_SECRET` ใน production ตรงกับที่ใช้สร้าง token
- ลบ token เก่าและสร้างใหม่

---

## 📝 Checklist ก่อน Deploy Production

- [ ] แก้ไขค่าทั้งหมดใน `.env.production`
- [ ] สร้าง JWT_SECRET ใหม่ที่ปลอดภัย
- [ ] ทดสอบการเชื่อมต่อ database
- [ ] ทดสอบ Cloudinary upload
- [ ] ตรวจสอบว่าไฟล์ `.env.*` ไม่ถูก commit
- [ ] Backup ไฟล์ `.env.production` ไว้ที่ปลอดภัย
- [ ] ทดสอบรัน `npm run prod` ก่อน deploy

---

**สร้างเมื่อ:** 2025-12-06  
**Version:** 1.0
