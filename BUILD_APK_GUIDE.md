# 📱 Build APK สำหรับ Android

## 🎯 ภาพรวม

มี 3 วิธีในการ build APK:
1. **EAS Build** (แนะนำ - ไม่ต้องติดตั้ง Android Studio)
2. **Local Build** (ต้องมี Android Studio)
3. **Expo Go** (สำหรับทดสอบเท่านั้น)

---

## 🚀 วิธีที่ 1: EAS Build (แนะนำ)

### ข้อดี:
- ✅ ไม่ต้องติดตั้ง Android Studio
- ✅ Build บน cloud (ไม่กิน resource เครื่อง)
- ✅ รองรับ CI/CD
- ✅ จัดการ signing keys อัตโนมัติ

### ขั้นตอน:

#### 1. ติดตั้ง EAS CLI

```bash
npm install -g eas-cli
```

#### 2. Login เข้า Expo Account

```bash
eas login
```

ถ้ายังไม่มี account:
```bash
eas register
```

#### 3. Build APK สำหรับ Production

```bash
# Build APK (สำหรับแจกจ่าย/ทดสอบ)
eas build --platform android --profile preview

# หรือ Build AAB (สำหรับ Google Play Store)
eas build --platform android --profile production
```

#### 4. รอ Build เสร็จ

Build จะใช้เวลา **5-15 นาที** ขึ้นอยู่กับ queue

#### 5. Download APK

หลัง build เสร็จ:
- ได้ link download APK
- หรือดาวน์โหลดจาก: https://expo.dev/accounts/[your-account]/projects/sieng-puen-ban/builds

---

## 🏠 วิธีที่ 2: Local Build

### ข้อดี:
- ✅ Build ได้ทันที (ไม่ต้องรอ queue)
- ✅ ไม่ต้องใช้ internet
- ✅ ควบคุมได้เต็มที่

### ข้อเสีย:
- ❌ ต้องติดตั้ง Android Studio
- ❌ ต้องตั้งค่า environment
- ❌ กิน resource เครื่องมาก

### ขั้นตอน:

#### 1. ติดตั้ง Android Studio

Download จาก: https://developer.android.com/studio

#### 2. ตั้งค่า Environment Variables

**Windows:**
```bash
ANDROID_HOME=C:\Users\[YourUsername]\AppData\Local\Android\Sdk
```

เพิ่มใน PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
```

#### 3. Prebuild

```bash
npx expo prebuild --platform android
```

#### 4. Build APK

```bash
cd android
.\gradlew assembleRelease
```

#### 5. หา APK

APK จะอยู่ที่:
```
android\app\build\outputs\apk\release\app-release.apk
```

---

## 📋 Build Profiles

### Development
```bash
eas build --platform android --profile development
```
- สำหรับพัฒนา
- มี dev tools
- ใช้ local backend

### Preview (APK)
```bash
eas build --platform android --profile preview
```
- สำหรับแจกจ่าย/ทดสอบ
- ไฟล์ APK
- ใช้ production backend (Render)
- **แนะนำสำหรับการทดสอบ**

### Production (AAB)
```bash
eas build --platform android --profile production
```
- สำหรับ Google Play Store
- ไฟล์ AAB (Android App Bundle)
- ใช้ production backend (Render)
- Auto-increment version

---

## 🔧 ตรวจสอบ Configuration

### ตรวจสอบ `app.json`

```json
{
  "expo": {
    "extra": {
      "APP_ENV": "production",  // ✅ ต้องเป็น production
      "PROD_API_BASE_URL": "https://snp68-spb.onrender.com"
    }
  }
}
```

### ตรวจสอบ `eas.json`

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"  // ✅ APK
      },
      "env": {
        "APP_ENV": "production"  // ✅ Production
      }
    }
  }
}
```

---

## 🧪 ทดสอบ APK

### ติดตั้งบนมือถือ

1. **Transfer APK:**
   - ส่งผ่าน USB
   - Upload ไป Google Drive/Dropbox
   - ส่งผ่าน ADB

2. **เปิด Unknown Sources:**
   - Settings → Security
   - เปิด "Install from Unknown Sources"

3. **ติดตั้ง APK:**
   - เปิดไฟล์ APK
   - คลิก Install

### ทดสอบ API Connection

เปิด app และตรวจสอบว่า:
- ✅ เชื่อมต่อกับ `https://snp68-spb.onrender.com`
- ✅ Login/Register ทำงาน
- ✅ ดึงข้อมูลจาก API ได้

---

## 📝 คำสั่งทั้งหมดรวมกัน

### Build APK ด้วย EAS (แนะนำ):

```bash
# 1. ติดตั้ง EAS CLI (ครั้งเดียว)
npm install -g eas-cli

# 2. Login
eas login

# 3. Build APK
eas build --platform android --profile preview

# 4. รอ build เสร็จ (~5-15 นาที)
# 5. Download APK จาก link ที่ได้
```

### Build Local:

```bash
# 1. Prebuild
npx expo prebuild --platform android

# 2. Build
cd android
.\gradlew assembleRelease

# 3. หา APK ที่
# android\app\build\outputs\apk\release\app-release.apk
```

---

## 🔐 Code Signing (สำหรับ Production)

### Generate Keystore

```bash
# EAS จะทำให้อัตโนมัติ
eas build --platform android --profile production

# หรือสร้างเอง
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### ตั้งค่า Credentials

```bash
# ดู credentials
eas credentials

# Configure credentials
eas credentials --platform android
```

---

## 📤 Upload ไป Google Play Store

### ขั้นตอน:

1. **Build AAB:**
   ```bash
   eas build --platform android --profile production
   ```

2. **ไปที่ Google Play Console:**
   https://play.google.com/console

3. **สร้าง App:**
   - Create app
   - กรอกข้อมูล app

4. **Upload AAB:**
   - Production → Create new release
   - Upload AAB file
   - กรอก release notes

5. **Submit for Review**

---

## 🆘 Troubleshooting

### ปัญหา: Build Failed

**ตรวจสอบ:**
- `app.json` ถูกต้อง
- `package.json` dependencies ครบ
- ไม่มี syntax error

**วิธีแก้:**
```bash
# Clear cache
npx expo start --clear

# ลองอีกครั้ง
eas build --platform android --profile preview
```

### ปัญหา: APK ไม่ติดตั้งได้

**วิธีแก้:**
- เปิด "Install from Unknown Sources"
- ตรวจสอบว่า APK ไม่ corrupt
- ลองติดตั้งบนมือถือเครื่องอื่น

### ปัญหา: App Crash หลังติดตั้ง

**ตรวจสอบ:**
- Backend URL ถูกต้อง
- API accessible
- Permissions ครบ

**ดู Logs:**
```bash
# Connect มือถือผ่าน USB
adb logcat
```

---

## 💡 Tips

### 1. ทดสอบก่อน Build

```bash
# ทดสอบบน Expo Go ก่อน
npx expo start

# ตรวจสอบว่า production mode ทำงาน
# ดู console log: API URL ต้องเป็น https://snp68-spb.onrender.com
```

### 2. Version Management

แก้ไข `app.json`:
```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    }
  }
}
```

เพิ่ม version ทุกครั้งที่ build ใหม่

### 3. Build Faster

```bash
# ใช้ --local flag (ถ้ามี Android Studio)
eas build --platform android --profile preview --local
```

---

## 📚 Resources

- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **Android Studio:** https://developer.android.com/studio
- **Google Play Console:** https://play.google.com/console

---

**สร้างเมื่อ:** 2025-12-07  
**Backend URL:** https://snp68-spb.onrender.com  
**Expo Project:** sieng-puen-ban
