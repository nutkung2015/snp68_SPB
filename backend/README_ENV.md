# 🎯 Quick Start - Environment Setup

## การใช้งานแบบง่าย

### Local Development (พัฒนาบนเครื่อง)
```bash
npm run dev
# หรือ
npm run local
```

### Production (Deploy ขึ้น Server)
```bash
npm run prod
```

---

## ไฟล์ Environment ที่มี

| ไฟล์ | ใช้กับคำสั่ง | สถานะ |
|------|-------------|--------|
| `.env` | `npm start`, `npm run dev` | ✅ พร้อมใช้ |
| `.env.local` | `npm run local` | ✅ พร้อมใช้ |
| `.env.production` | `npm run prod` | ⚠️ **ต้องแก้ไขก่อนใช้** |

---

## ⚠️ สิ่งที่ต้องทำก่อน Deploy Production

1. **เปิดไฟล์ `.env.production`**
2. **แก้ไขค่าต่อไปนี้:**
   - `DB_HOST` - Database host ของ production
   - `DB_USER` - Database username
   - `DB_PASSWORD` - Database password (ใช้รหัสที่แข็งแรง)
   - `DB_NAME` - ชื่อ database
   - `JWT_SECRET` - สร้างใหม่ด้วยคำสั่ง:
     ```bash
     node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
     ```
   - `CLOUDINARY_*` - Cloudinary credentials สำหรับ production

3. **ทดสอบก่อน deploy:**
   ```bash
   npm run prod
   ```

---

## 📚 อ่านเพิ่มเติม

ดูคู่มือฉบับเต็มได้ที่: **`ENVIRONMENT_GUIDE.md`**

---

## 🔒 ความปลอดภัย

✅ ไฟล์ `.env*` ทั้งหมดถูกป้องกันโดย `.gitignore` แล้ว  
✅ อย่า commit ไฟล์ที่มีข้อมูลสำคัญลง Git  
✅ ใช้ JWT_SECRET ที่แตกต่างกันระหว่าง local และ production
