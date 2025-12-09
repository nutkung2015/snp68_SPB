# Security Role-Based Routing Guide

## Overview
ระบบได้ถูกแยก navigation flow สำหรับ Security และ Resident เพื่อป้องกันการเข้าถึงหน้าจอข้ามกัน

## Architecture

### 1. Separate Stack Navigators
แยก Stack Navigator เป็น 2 ชุด:

#### Security Stack (userRole === "security")
```javascript
- GuardHome (หน้าหลัก Security)
- Profile
- Login
- SecurityServices (ต้องสร้างเพิ่ม)
- SecurityChat (ต้องสร้างเพิ่ม)
```

#### Resident Stack (userRole !== "security")
```javascript
- Home (หน้าหลัก Resident)
- JoinUnitScreen
- Services
- NeighborhoodEmotions
- Profile
- News
- NewsDetail
- Login
- Register
- HomeOption
- VilageOption
```

### 2. Role Detection
ระบบตรวจสอบ role จาก:
```javascript
const role = userData.role || userData.roles?.[0];
```

### 3. Navigation Flow

#### Login Flow
1. User login ผ่าน `authService.login()`
2. ระบบเช็ค `userData.role`
3. ถ้า role === "security" → navigate ไปที่ `GuardHome`
4. ถ้า role อื่น → ตรวจสอบ membership แล้ว navigate ไปที่ `Home` หรือ `JoinUnitScreen`

#### App Initialization Flow
1. App โหลด userData จาก AsyncStorage
2. ตรวจสอบ role และ set `userRole` state
3. Render Stack Navigator ที่เหมาะสมตาม role
4. Security จะเห็นเฉพาะ Security Stack
5. Resident จะเห็นเฉพาะ Resident Stack

### 4. Bottom Navigation
แยก Bottom Navigation เป็น 2 แบบ:

#### SecurityBottomNavigation
- หน้าหลัก → GuardHome
- บริการ → SecurityServices
- แชท → SecurityChat
- โปรไฟล์ → Profile

#### BottomNavigation (Resident)
- หน้าหลัก → Home
- บริการ → Services
- แชท → Chat
- โปรไฟล์ → Profile

## Files Modified

### 1. App.js
- เพิ่ม `userRole` state
- แยก Stack Navigator ตาม role
- อัปเดต `recheckLoginStatus()` เพื่อ set role
- อัปเดต logout callback เพื่อ clear role

### 2. authService.js
- อัปเดต `login()` เพื่อตรวจสอบ role และ navigate ตามนั้น

### 3. GuardHomeScreen.js
- เปลี่ยนจาก `BottomNavigation` เป็น `SecurityBottomNavigation`

### 4. SecurityBottomNavigation.js (NEW)
- Bottom navigation สำหรับ Security เท่านั้น

## Security Features

### Permission Guard
- Security ไม่สามารถเข้าถึงหน้า Resident ได้
- Resident ไม่สามารถเข้าถึงหน้า Security ได้
- แต่ละ role มี Stack Navigator แยกกัน
- Navigation จะ fail ถ้าพยายามไปหน้าที่ไม่มีใน Stack

### Role Persistence
- Role ถูกเก็บใน AsyncStorage ผ่าน userData
- App จะจำ role แม้ปิดแอปแล้วเปิดใหม่
- Logout จะ clear role และ userData

## TODO: Screens to Create

สำหรับ Security Stack ยังต้องสร้างหน้าเหล่านี้:

1. **VehicleEntry** - รถเข้าโครงการ
2. **ReportIssue** - แจ้งปัญหา
3. **EmergencyContact** - เบอร์ฉุกเฉิน
4. **RequestHelp** - ขอความช่วยเหลือ
5. **DailyReport** - รายงานประจำวัน
6. **SecurityServices** - หน้าบริการสำหรับ Security
7. **SecurityChat** - หน้าแชทสำหรับ Security

## Testing

### Test Security Access
1. Login ด้วย user ที่มี role = "security"
2. ตรวจสอบว่าไปที่ GuardHome
3. ลอง navigate ไปหน้า Resident (ควรจะ fail)

### Test Resident Access
1. Login ด้วย user ที่มี role อื่น
2. ตรวจสอบว่าไปที่ Home
3. ลอง navigate ไปหน้า Security (ควรจะ fail)

### Test Logout
1. Logout จากทั้ง Security และ Resident
2. ตรวจสอบว่า role ถูก clear
3. Login ใหม่ด้วย role อื่น
4. ตรวจสอบว่าไปที่ Stack ที่ถูกต้อง
