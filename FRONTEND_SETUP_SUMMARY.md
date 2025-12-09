# ✅ สรุปการตั้งค่า Frontend สำหรับ Production

## 🎯 สิ่งที่ทำเสร็จแล้ว

### 1. ✅ อัพเดท Environment Variables
- **`.env`** - เพิ่ม Production URL: `https://snp68-spb.onrender.com`
- **`app.json`** - เพิ่ม API URLs ใน extra config

### 2. ✅ แก้ไข Configuration Files
- **`utils/config.js`** - อัพเดท `API_CONFIG.BASE_URL`
- **`utils/config.js`** - ปรับปรุง `getApiBaseUrl()` function

### 3. ✅ ตรวจสอบ API Service
- **`services/apiService.js`** - ใช้ `getApiBaseUrl()` อยู่แล้ว ✓

---

## 📍 URLs ที่ตั้งค่า

| Environment | URL | ใช้เมื่อ |
|-------------|-----|---------|
| **Development** | `http://127.0.0.1:5000` | `APP_ENV: "development"` |
| **Production** | `https://snp68-spb.onrender.com` | `APP_ENV: "production"` |

---

## 🚀 วิธีใช้งาน

### Development Mode (ค่าเริ่มต้น)
```bash
# app.json
"APP_ENV": "development"

# รัน Expo
npx expo start
```
→ จะเชื่อมต่อกับ `http://127.0.0.1:5000`

### Production Mode
```bash
# 1. แก้ไข app.json
"APP_ENV": "production"

# 2. Restart Expo
npx expo start --clear
```
→ จะเชื่อมต่อกับ `https://snp68-spb.onrender.com`

---

## 🧪 ทดสอบการเชื่อมต่อ

### 1. ตรวจสอบ Environment
เพิ่มโค้ดนี้ในหน้าแรก (เช่น `App.js` หรือ `screens/HomeScreen.js`):

```javascript
import { API_CONFIG, APP_CONFIG } from './utils/config';

// ใน component
useEffect(() => {
  console.log('=== Environment Info ===');
  console.log('Environment:', APP_CONFIG.ENV);
  console.log('API URL:', API_CONFIG.BASE_URL);
  console.log('Debug Mode:', APP_CONFIG.DEBUG);
  console.log('=====================');
}, []);
```

### 2. ทดสอบ API Call
```javascript
import { getApiBaseUrl } from './utils/config';

// ทดสอบเรียก API
const testAPI = async () => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/`);
    const data = await response.json();
    console.log('API Test Success:', data);
  } catch (error) {
    console.error('API Test Failed:', error);
  }
};

// เรียกใช้
testAPI();
```

### 3. ตรวจสอบ Console
ควรเห็น:
```
=== Environment Info ===
Environment: development (หรือ production)
API URL: http://127.0.0.1:5000 (หรือ https://snp68-spb.onrender.com)
Debug Mode: true (หรือ false)
=====================
```

---

## 📋 Checklist ก่อนใช้งาน Production

### Backend (Render)
- [x] Deploy backend บน Render สำเร็จ
- [x] Backend URL: `https://snp68-spb.onrender.com`
- [x] ทดสอบ API endpoint:
  ```bash
  curl https://snp68-spb.onrender.com/
  # ควรได้: {"message":"Welcome to Test Native Backend API"}
  ```

### Frontend (React Native/Expo)
- [x] อัพเดท `.env` ด้วย Production URL
- [x] อัพเดท `app.json` ด้วย API URLs
- [x] แก้ไข `utils/config.js`
- [x] ตรวจสอบ `services/apiService.js`

### ทดสอบ
- [ ] เปลี่ยน `APP_ENV` เป็น `"production"` ใน `app.json`
- [ ] Restart Expo: `npx expo start --clear`
- [ ] ตรวจสอบ console log ว่าใช้ Production URL
- [ ] ทดสอบ Login/Register
- [ ] ทดสอบดึงข้อมูลจาก API

---

## 🔧 Troubleshooting

### ปัญหา: App ยังใช้ Local URL แม้เปลี่ยนเป็น Production

**วิธีแก้:**
1. ตรวจสอบ `app.json` ว่า `APP_ENV: "production"`
2. Clear cache และ restart:
   ```bash
   npx expo start --clear
   ```
3. ตรวจสอบ console log ว่า `API_CONFIG.BASE_URL` เป็นอะไร

### ปัญหา: Network Request Failed

**ตรวจสอบ:**
1. Backend บน Render รันอยู่หรือไม่
2. ทดสอบ URL ด้วย browser: `https://snp68-spb.onrender.com/`
3. ตรวจสอบ internet connection

**วิธีแก้:**
- รอ Render backend start (ครั้งแรกอาจใช้เวลา 1-2 นาที)
- ตรวจสอบ CORS settings บน backend

### ปัญหา: CORS Error

**วิธีแก้:**
ตรวจสอบ `backend/server.js` ว่ามี:
```javascript
app.use(cors());
```

หรือระบุ origin ชัดเจน:
```javascript
app.use(cors({
  origin: '*', // หรือระบุ URL ของ app
  credentials: true
}));
```

### ปัญหา: 401 Unauthorized

**วิธีแก้:**
- ตรวจสอบ JWT token ใน AsyncStorage
- ลอง Login ใหม่
- ตรวจสอบว่า JWT_SECRET ตรงกันระหว่าง frontend และ backend

---

## 💡 Tips

### 1. ใช้ Environment Variable Switcher
สร้าง script สำหรับสลับ environment:

**package.json:**
```json
"scripts": {
  "start": "expo start",
  "dev": "expo start",
  "prod": "APP_ENV=production expo start"
}
```

### 2. ตรวจสอบ API Response
เพิ่ม logging ใน `apiService.js`:
```javascript
console.log('API Request:', {
  url: `${API_BASE_URL}${endpoint}`,
  method: 'GET/POST/PUT/DELETE',
  headers: getApiHeaders(token)
});
```

### 3. Handle Offline Mode
เพิ่ม error handling สำหรับกรณีไม่มี internet:
```javascript
import NetInfo from '@react-native-community/netinfo';

NetInfo.addEventListener(state => {
  console.log('Connection type:', state.type);
  console.log('Is connected?', state.isConnected);
});
```

---

## 📱 Build สำหรับ Production

### Android APK
```bash
# Development build
eas build --platform android --profile development

# Production build
eas build --platform android --profile production
```

### iOS
```bash
# Development build
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production
```

**หมายเหตุ:** ต้องตั้งค่า `APP_ENV: "production"` ใน `app.json` ก่อน build

---

## 📚 ไฟล์เอกสารที่สร้าง

1. **ENV_QUICK_REF.md** - Quick reference สำหรับสลับ environment
2. **ENVIRONMENT_SWITCH.md** - คู่มือฉบับเต็ม
3. **FRONTEND_SETUP_SUMMARY.md** - ไฟล์นี้

---

## ✅ สรุป

ตอนนี้ frontend พร้อมใช้งานแล้วครับ!

**Development:**
- `app.json` → `APP_ENV: "development"`
- เชื่อมต่อ: `http://127.0.0.1:5000`

**Production:**
- `app.json` → `APP_ENV: "production"`
- เชื่อมต่อ: `https://snp68-spb.onrender.com`

---

**อัพเดทเมื่อ:** 2025-12-07  
**Backend URL:** https://snp68-spb.onrender.com  
**Version:** 1.0
