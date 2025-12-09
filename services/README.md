# API Services Documentation

## โครงสร้าง Services

โปรเจ็กต์นี้ใช้ระบบ API Services กลางเพื่อจัดการการเรียก API ทั้งหมด โดยแยกเป็น services ต่างๆ ตามหน้าที่การทำงาน

### ไฟล์ Services ที่มี:

```
services/
├── apiService.js           # Base API Service สำหรับ HTTP requests
├── announcementsService.js # จัดการข่าวสารและประกาศ
├── userService.js          # จัดการข้อมูลผู้ใช้และโปรไฟล์
├── unitsService.js         # จัดการหน่วยและการเข้าร่วม
└── index.js                # Export ทั้งหมด
```

## 1. ApiService (Base Service)

Service หลักสำหรับจัดการ HTTP requests ทั้งหมด

### Methods:

- `get(endpoint, token)` - GET request
- `post(endpoint, body, token)` - POST request
- `put(endpoint, body, token)` - PUT request
- `delete(endpoint, token)` - DELETE request
- `getToken()` - ดึง token จาก AsyncStorage
- `handleUnauthorized()` - จัดการเมื่อ unauthorized (401)
- `setLogoutCallback(callback)` - ตั้งค่า callback เมื่อ logout
- `setNavigation(nav)` - ตั้งค่า navigation object
- `navigateTo(routeName, params)` - Navigate ไปหน้าอื่น

### ตัวอย่างการใช้งาน:

```javascript
import ApiService from '../services/apiService';

// GET request
const data = await ApiService.get('/api/users/123', token);

// POST request
const result = await ApiService.post('/api/users', { name: 'John' }, token);
```

## 2. AnnouncementsService

จัดการข่าวสารและประกาศทั้งหมด

### Methods:

- `getAnnouncements(params)` - ดึงรายการประกาศ
  - params: `{ limit, status, category, timeFilter }`
- `getAnnouncementById(announcementId)` - ดึงรายละเอียดประกาศ
- `createAnnouncement(announcementData)` - สร้างประกาศใหม่
- `updateAnnouncement(announcementId, announcementData)` - แก้ไขประกาศ
- `deleteAnnouncement(announcementId)` - ลบประกาศ
- `acknowledgeAnnouncement(announcementId)` - รับทราบประกาศ

### ตัวอย่างการใช้งาน:

```javascript
import { AnnouncementsService } from '../services';

// ดึงประกาศทั้งหมด
const announcements = await AnnouncementsService.getAnnouncements({
  limit: 10,
  status: 'published',
  category: 'general'
});

// ดึงรายละเอียดประกาศ
const announcement = await AnnouncementsService.getAnnouncementById(announcementId);

// รับทราบประกาศ
await AnnouncementsService.acknowledgeAnnouncement(announcementId);
```

## 3. UserService

จัดการข้อมูลผู้ใช้และโปรไฟล์

### Methods:

- `getUserProfile()` - ดึงข้อมูลโปรไฟล์ผู้ใช้
- `updateUserProfile(userData)` - อัปเดตโปรไฟล์
- `changePassword(oldPassword, newPassword)` - เปลี่ยนรหัสผ่าน
- `uploadProfilePicture(imageUri)` - อัปโหลดรูปโปรไฟล์

### ตัวอย่างการใช้งาน:

```javascript
import { UserService } from '../services';

// ดึงข้อมูลโปรไฟล์
const profile = await UserService.getUserProfile();

// อัปเดตโปรไฟล์
await UserService.updateUserProfile({
  full_name: 'John Doe',
  phone: '0812345678'
});

// เปลี่ยนรหัสผ่าน
await UserService.changePassword('oldpass123', 'newpass456');

// อัปโหลดรูปโปรไฟล์
const result = await UserService.uploadProfilePicture(imageUri);
```

## 4. UnitsService

จัดการหน่วยและการเข้าร่วม

### Methods:

- `joinUnit(invitationCode)` - เข้าร่วมหน่วยด้วยรหัสเชิญ
- `getUserUnits()` - ดึงรายการหน่วยของผู้ใช้
- `getUnitDetails(unitId)` - ดึงรายละเอียดหน่วย
- `createInvitation(unitId)` - สร้างรหัสเชิญ
- `getUnitMembers(unitId)` - ดึงรายชื่อสมาชิกในหน่วย
- `leaveUnit(unitId)` - ออกจากหน่วย

### ตัวอย่างการใช้งาน:

```javascript
import { UnitsService } from '../services';

// เข้าร่วมหน่วย
const result = await UnitsService.joinUnit('ABC123');

// ดึงหน่วยของผู้ใช้
const units = await UnitsService.getUserUnits();

// ดึงรายละเอียดหน่วย
const unit = await UnitsService.getUnitDetails(unitId);

// สร้างรหัสเชิญ
const invitation = await UnitsService.createInvitation(unitId);
```

## การใช้งานใน Component

### ตัวอย่างที่ 1: ดึงข้อมูลประกาศใน HomeScreen

```javascript
import React, { useEffect, useState } from 'react';
import { AnnouncementsService } from '../services';

const HomeScreen = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await AnnouncementsService.getAnnouncements({
        limit: 5,
        status: 'published'
      });

      if (data.status === 'success') {
        setAnnouncements(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component
};
```

### ตัวอย่างที่ 2: เข้าร่วมหน่วยใน JoinUnitScreen

```javascript
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { UnitsService } from '../services';

const JoinUnitScreen = ({ navigation }) => {
  const [invitationCode, setInvitationCode] = useState('');

  const handleJoinUnit = async () => {
    if (!invitationCode) {
      Alert.alert('Error', 'Please enter an invitation code.');
      return;
    }

    try {
      const data = await UnitsService.joinUnit(invitationCode);
      Alert.alert('Success', data.message || 'Successfully joined!');
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to join unit.');
    }
  };

  // ... rest of component
};
```

### ตัวอย่างที่ 3: ดึงโปรไฟล์ใน ProfileScreen

```javascript
import React, { useEffect, useState } from 'react';
import { UserService } from '../services';

const ProfileScreen = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const data = await UserService.getUserProfile();
      setUserData(data.user);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component
};
```

## Error Handling

Services จะ throw error เมื่อเกิดปัญหา ควรใช้ try-catch ในการจัดการ:

```javascript
try {
  const data = await AnnouncementsService.getAnnouncements();
  // ทำงานกับ data
} catch (error) {
  console.error('Error:', error);
  // แสดง error message ให้ผู้ใช้
  Alert.alert('Error', error.message || 'Something went wrong');
}
```

## Authorization

Services จะจัดการ authorization token อัตโนมัติ:

1. Token จะถูกดึงจาก AsyncStorage โดยอัตโนมัติ
2. เมื่อได้รับ 401 Unauthorized จะทำการ logout อัตโนมัติ
3. ไม่ต้องส่ง token เองในแต่ละ request

## Configuration

API Base URL ถูกกำหนดใน `utils/config.js`:

```javascript
import { getApiBaseUrl } from '../utils/config';

const API_BASE_URL = getApiBaseUrl(); // http://127.0.0.1:5000
```

สามารถเปลี่ยน URL ได้ที่ไฟล์ `.env`:

```env
API_BASE_URL=http://127.0.0.1:5000
PROD_API_BASE_URL=https://your-production-api.com
```

## ข้อควรระวัง

1. **Token Management**: Services จะจัดการ token อัตโนมัติ ไม่ต้องส่งเอง
2. **Error Handling**: ใช้ try-catch เสมอเมื่อเรียก service methods
3. **Loading States**: ควรมี loading state เพื่อแสดงสถานะการโหลด
4. **Navigation**: ตั้งค่า navigation ใน App.js หรือ root component:

```javascript
import { setNavigation } from './screens/services/authService';

useEffect(() => {
  setNavigation(navigation);
}, [navigation]);
```

## สรุป

- ใช้ Services แทนการเรียก fetch โดยตรง
- Services จัดการ authorization และ error handling อัตโนมัติ
- แยก logic การเรียก API ออกจาก UI components
- ง่ายต่อการ maintain และ test
- สามารถเพิ่ม service methods ใหม่ได้ง่าย
