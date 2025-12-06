# 🔧 Database Configuration - สรุปการแก้ไข

## ปัญหาที่พบในโค้ดเดิม

### ❌ ปัญหาหลัก: SSL Configuration
```javascript
// โค้ดเดิม - มีปัญหา
const db = mysql.createPool({
  // ... config ...
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
});
```

**ปัญหา:**
- SSL ถูกเปิดใช้งานตลอดเวลา (ทั้ง local และ production)
- Local MySQL มักไม่ได้ตั้งค่า SSL → จะเชื่อมต่อไม่ได้
- Error ที่อาจเกิด: `Error: self signed certificate in certificate chain`

---

## ✅ การแก้ไข

### 1. แยก Database Config ออกมาเป็น Object
```javascript
const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sieng_puen_ban_1",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};
```

### 2. เปิด SSL เฉพาะ Production
```javascript
if (process.env.NODE_ENV === 'production') {
  dbConfig.ssl = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  };
  console.log('🔒 SSL enabled for production database connection');
}
```

### 3. ปรับปรุง Error Handling
```javascript
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ Error connecting to MySQL:", err.message);
    console.error("Database config:", {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      ssl: dbConfig.ssl ? 'enabled' : 'disabled'
    });
  } else {
    console.log(`✅ Connected to MySQL database: ${dbConfig.database}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Host: ${dbConfig.host}:${dbConfig.port}`);
    conn.release();
  }
});
```

---

## 🎯 ผลลัพธ์

### Local Development (npm run dev / npm run local)
```
✅ Connected to MySQL database: sieng_puen_ban_1
📍 Environment: development
🔌 Host: 127.0.0.1:3306
```
- SSL: **ปิด** (disabled)
- เชื่อมต่อ local MySQL ได้ปกติ

### Production (npm run prod)
```
🔒 SSL enabled for production database connection
✅ Connected to MySQL database: sieng_puen_ban_prod
📍 Environment: production
🔌 Host: your-production-db-host.com:3306
```
- SSL: **เปิด** (enabled)
- ปลอดภัยสำหรับการเชื่อมต่อ production database

---

## 📋 Checklist การตั้งค่า

### Local Development
- [x] ใช้ `NODE_ENV=development` (หรือไม่ต้องตั้งค่า)
- [x] SSL จะถูกปิดอัตโนมัติ
- [x] เชื่อมต่อ local MySQL ได้ทันที

### Production
- [ ] ตั้งค่า `NODE_ENV=production` ในไฟล์ `.env.production`
- [ ] ตรวจสอบว่า production database รองรับ SSL
- [ ] ถ้า database ไม่รองรับ SSL ให้แก้ไขเป็น:
  ```javascript
  if (process.env.NODE_ENV === 'production' && process.env.DB_SSL === 'true') {
    dbConfig.ssl = { ... };
  }
  ```

---

## 🔍 การ Debug

### ถ้าเชื่อมต่อไม่ได้

1. **ตรวจสอบ Environment:**
   ```bash
   # ดู environment ที่กำลังใช้
   echo $NODE_ENV  # Linux/Mac
   echo %NODE_ENV% # Windows
   ```

2. **ตรวจสอบ Console Log:**
   - ดูว่า SSL enabled หรือ disabled
   - ดู host, port, database name ว่าถูกต้อง

3. **ทดสอบการเชื่อมต่อ:**
   ```bash
   # ทดสอบเชื่อมต่อ MySQL ด้วย command line
   mysql -h 127.0.0.1 -u root -p sieng_puen_ban_1
   ```

---

## 💡 Tips

### ถ้าต้องการปิด SSL แม้ใน Production
เพิ่ม environment variable:
```env
# .env.production
DB_SSL=false
```

แก้ไขโค้ด:
```javascript
if (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false') {
  dbConfig.ssl = { ... };
}
```

### ถ้าใช้ Self-Signed Certificate
```javascript
if (process.env.NODE_ENV === 'production') {
  dbConfig.ssl = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false  // อนุญาต self-signed cert
  };
}
```

---

**แก้ไขเมื่อ:** 2025-12-07  
**Version:** 1.0
