# 🚀 Quick Reference - Frontend Environment Setup

## ตอนนี้ตั้งค่าเป็น: Development Mode

### 📍 URLs ที่ใช้งาน:

| Environment | URL | สถานะ |
|-------------|-----|-------|
| **Development** | `http://127.0.0.1:5000` | ✅ กำลังใช้ |
| **Production** | `https://snp68-spb.onrender.com` | ⚪ พร้อมใช้งาน |

---

## 🔄 วิธีสลับ Environment

### เปลี่ยนเป็น Production:

1. **แก้ไข `app.json` (บรรทัด 16):**
   ```json
   "APP_ENV": "production",
   ```

2. **Restart Expo:**
   ```bash
   npx expo start --clear
   ```

### เปลี่ยนกลับเป็น Development:

1. **แก้ไข `app.json` (บรรทัด 16):**
   ```json
   "APP_ENV": "development",
   ```

2. **Restart Expo:**
   ```bash
   npx expo start --clear
   ```

---

## ✅ สิ่งที่แก้ไขแล้ว:

- [x] `.env` - เพิ่ม Production URL
- [x] `app.json` - เพิ่ม API URLs ใน extra config
- [x] `utils/config.js` - อัพเดท API_CONFIG
- [x] `utils/config.js` - ปรับปรุง getApiBaseUrl()

---

## 🧪 ทดสอบการเชื่อมต่อ:

```javascript
import { API_CONFIG, APP_CONFIG } from './utils/config';

console.log('Environment:', APP_CONFIG.ENV);
console.log('API URL:', API_CONFIG.BASE_URL);
```

---

## 📚 อ่านเพิ่มเติม:
- **ENVIRONMENT_SWITCH.md** - คู่มือฉบับเต็ม
