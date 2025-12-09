# 🔄 Environment Switcher for React Native/Expo

## วิธีสลับระหว่าง Development และ Production

### 📱 สำหรับ Development (Local Backend)

1. **แก้ไขไฟล์ `app.json`:**
   ```json
   "extra": {
     "APP_ENV": "development",
     "DEBUG": true,
     ...
   }
   ```

2. **Restart Expo:**
   ```bash
   # กด Ctrl+C เพื่อหยุด Expo
   # จากนั้นรันใหม่
   npx expo start --clear
   ```

3. **ตรวจสอบ URL:**
   - จะใช้: `http://127.0.0.1:5000`
   - Backend ต้องรันอยู่บน local

---

### 🚀 สำหรับ Production (Render Backend)

1. **แก้ไขไฟล์ `app.json`:**
   ```json
   "extra": {
     "APP_ENV": "production",
     "DEBUG": false,
     ...
   }
   ```

2. **Restart Expo:**
   ```bash
   # กด Ctrl+C เพื่อหยุด Expo
   # จากนั้นรันใหม่
   npx expo start --clear
   ```

3. **ตรวจสอบ URL:**
   - จะใช้: `https://snp68-spb.onrender.com`
   - เชื่อมต่อกับ backend บน Render

---

## 🎯 URLs ที่ตั้งค่าไว้

### Development
```
http://127.0.0.1:5000
```

### Production
```
https://snp68-spb.onrender.com
```

---

## 🧪 ทดสอบการเชื่อมต่อ

### ตรวจสอบว่าใช้ URL ไหน

เพิ่มโค้ดนี้ในหน้าแรกของ app:

```javascript
import { API_CONFIG } from './utils/config';

console.log('Current API URL:', API_CONFIG.BASE_URL);
console.log('Environment:', APP_CONFIG.ENV);
```

### ทดสอบ API

```javascript
import { getApiBaseUrl } from './utils/config';

// ทดสอบเรียก API
fetch(`${getApiBaseUrl()}/`)
  .then(res => res.json())
  .then(data => console.log('API Response:', data))
  .catch(err => console.error('API Error:', err));
```

---

## 📝 Checklist

### Development Mode
- [ ] `app.json` → `APP_ENV: "development"`
- [ ] Backend รันอยู่บน local (`npm run dev`)
- [ ] Expo restart (`npx expo start --clear`)
- [ ] ตรวจสอบ console log ว่าใช้ `http://127.0.0.1:5000`

### Production Mode
- [ ] `app.json` → `APP_ENV: "production"`
- [ ] Backend deploy บน Render แล้ว
- [ ] Expo restart (`npx expo start --clear`)
- [ ] ตรวจสอบ console log ว่าใช้ `https://snp68-spb.onrender.com`

---

## 🔧 Troubleshooting

### ปัญหา: App ยังใช้ URL เก่า

**วิธีแก้:**
```bash
# Clear cache และ restart
npx expo start --clear
```

### ปัญหา: ไม่สามารถเชื่อมต่อ Production

**ตรวจสอบ:**
1. Backend บน Render รันอยู่หรือไม่
2. URL ถูกต้องหรือไม่: `https://snp68-spb.onrender.com`
3. CORS ตั้งค่าถูกต้องบน backend หรือไม่

### ปัญหา: Network Request Failed

**วิธีแก้:**
- ตรวจสอบ internet connection
- ตรวจสอบว่า backend ตอบกลับหรือไม่:
  ```bash
  curl https://snp68-spb.onrender.com/
  ```

---

## 💡 Tips

### 1. ใช้ Environment Variable แทนการแก้ไข app.json

สร้างไฟล์ `.env.development` และ `.env.production`:

**.env.development:**
```bash
APP_ENV=development
PROD_API_BASE_URL=https://snp68-spb.onrender.com
DEV_API_BASE_URL=http://127.0.0.1:5000
```

**.env.production:**
```bash
APP_ENV=production
PROD_API_BASE_URL=https://snp68-spb.onrender.com
DEV_API_BASE_URL=http://127.0.0.1:5000
```

### 2. สร้าง Scripts สำหรับสลับ Environment

เพิ่มใน `package.json`:
```json
"scripts": {
  "start": "expo start",
  "start:dev": "APP_ENV=development expo start",
  "start:prod": "APP_ENV=production expo start"
}
```

### 3. ใช้ EAS Build สำหรับ Production

```bash
# Build สำหรับ production
eas build --platform android --profile production
eas build --platform ios --profile production
```

---

**สร้างเมื่อ:** 2025-12-07  
**Backend URL:** https://snp68-spb.onrender.com
