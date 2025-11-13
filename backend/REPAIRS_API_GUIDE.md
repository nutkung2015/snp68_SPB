# คู่มือการใช้งาน Repairs API

## ภาพรวม
API สำหรับจัดการระบบแจ้งซ่อมและแจ้งปัญหา แบ่งเป็น 2 ส่วนหลัก:
1. **Personal Repairs** - แจ้งซ่อมทรัพย์สินส่วนบุคคล (ของตัวบ้าน)
2. **Common Issues** - แจ้งปัญหาส่วนกลาง

---

## 1. Personal Repairs API (แจ้งซ่อมทรัพย์สินส่วนบุคคล)

### 1.1 สร้างรายการแจ้งซ่อม
**POST** `/api/repairs/personal`

**Request Body:**
```json
{
  "unit_id": "unit-uuid-here",
  "zone": "A",
  "reporter_name": "สมชาย ใจดี",
  "reporter_id": "USER001",
  "repair_category": "plumbing",
  "repair_area": "ห้องน้ำชั้น 2",
  "description": "ท่อน้ำรั่ว ต้องการซ่อมด่วน",
  "image_urls": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "priority": "high"
}
```

**ประเภทงานซ่อม (repair_category):**
- `plumbing` - ประปา/ท่อน้ำ
- `electrical` - ไฟฟ้า
- `door_window` - ประตู/หน้าต่าง
- `wall_ceiling` - ผนัง/เพดาน
- `floor` - พื้น
- `roof` - หลังคา
- `air_conditioning` - เครื่องปรับอากาศ
- `other` - อื่นๆ

**ระดับความสำคัญ (priority):**
- `low` - ต่ำ
- `medium` - ปานกลาง (default)
- `high` - สูง
- `urgent` - เร่งด่วน

**Response:**
```json
{
  "status": "success",
  "message": "บันทึกการแจ้งซ่อมเรียบร้อยแล้ว",
  "data": {
    "id": "PR-uuid-here"
  }
}
```

---

### 1.2 ดึงรายการแจ้งซ่อมทั้งหมด
**GET** `/api/repairs/personal`

**Query Parameters:**
- `unit_id` (optional) - กรองตาม unit ID
- `status` (optional) - กรองตามสถานะ
- `repair_category` (optional) - กรองตามประเภทงานซ่อม
- `limit` (optional, default: 50) - จำนวนรายการต่อหน้า
- `offset` (optional, default: 0) - เริ่มต้นที่รายการที่

**ตัวอย่าง:**
```
GET /api/repairs/personal?unit_id=unit-uuid-here&status=pending&limit=10
```

**สถานะ (status):**
- `pending` - รอดำเนินการ
- `in_progress` - กำลังดำเนินการ
- `completed` - เสร็จสิ้น
- `rejected` - ปฏิเสธ

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "PR-uuid",
      "unit_id": "unit-uuid-here",
      "zone": "A",
      "reporter_name": "สมชาย ใจดี",
      "submitted_date": "2024-10-31T00:00:00.000Z",
      "repair_category": "plumbing",
      "repair_area": "ห้องน้ำชั้น 2",
      "description": "ท่อน้ำรั่ว",
      "image_urls": ["url1", "url2"],
      "status": "pending",
      "priority": "high",
      "created_at": "2024-10-31T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 1.3 ดึงรายการแจ้งซ่อมตาม ID
**GET** `/api/repairs/personal/:id`

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "PR-uuid",
    "unit_id": "unit-uuid-here",
    "zone": "A",
    "reporter_name": "สมชาย ใจดี",
    "submitted_date": "2024-10-31T00:00:00.000Z",
    "repair_category": "plumbing",
    "repair_area": "ห้องน้ำชั้น 2",
    "description": "ท่อน้ำรั่ว",
    "image_urls": ["url1", "url2"],
    "status": "pending",
    "assigned_to": null,
    "priority": "high",
    "estimated_cost": null,
    "actual_cost": null,
    "notes": null,
    "completed_date": null,
    "created_at": "2024-10-31T00:00:00.000Z",
    "updated_at": "2024-10-31T00:00:00.000Z"
  }
}
```

---

### 1.4 อัพเดทสถานะการแจ้งซ่อม
**PATCH** `/api/repairs/personal/:id`

**Request Body:**
```json
{
  "status": "in_progress",
  "assigned_to": "ช่างสมศักดิ์",
  "notes": "กำลังดำเนินการซ่อม คาดว่าจะเสร็จภายใน 2 วัน",
  "estimated_cost": 1500.00,
  "actual_cost": 1200.00
}
```

**Response:**
```json
{
  "status": "success",
  "message": "อัพเดทสถานะเรียบร้อยแล้ว"
}
```

---

### 1.5 ลบรายการแจ้งซ่อม
**DELETE** `/api/repairs/personal/:id`

**Response:**
```json
{
  "status": "success",
  "message": "ลบข้อมูลเรียบร้อยแล้ว"
}
```

---

## 2. Common Issues API (แจ้งปัญหาส่วนกลาง)

### 2.1 สร้างรายการแจ้งปัญหา
**POST** `/api/repairs/common`

**Request Body:**
```json
{
  "unit_id": "unit-uuid-here",
  "zone": "A",
  "reporter_name": "สมหญิง รักสะอาด",
  "reporter_id": "USER002",
  "issue_type": "lighting",
  "location": "ถนนหน้าโครงการ",
  "description": "ไฟส่องสว่างดับ ทำให้มืดมาก",
  "image_urls": ["https://example.com/image1.jpg"],
  "priority": "high"
}
```

**ประเภทปัญหา (issue_type):**
- `lighting` - ไฟฟ้าส่วนกลาง
- `road` - ถนน/ทางเดิน
- `garden` - สวน/ต้นไม้
- `parking` - ที่จอดรถ
- `elevator` - ลิฟต์
- `pool` - สระว่ายน้ำ
- `fitness` - ฟิตเนส
- `security` - ความปลอดภัย
- `cleanliness` - ความสะอาด
- `noise` - เสียงรบกวน
- `water_supply` - น้ำประปาส่วนกลาง
- `garbage` - ขยะ
- `other` - อื่นๆ

**Response:**
```json
{
  "status": "success",
  "message": "บันทึกการแจ้งปัญหาเรียบร้อยแล้ว",
  "data": {
    "id": "CI-uuid-here"
  }
}
```

---

### 2.2 ดึงรายการแจ้งปัญหาทั้งหมด
**GET** `/api/repairs/common`

**Query Parameters:**
- `unit_id` (optional) - กรองตาม unit ID
- `status` (optional) - กรองตามสถานะ
- `issue_type` (optional) - กรองตามประเภทปัญหา
- `limit` (optional, default: 50) - จำนวนรายการต่อหน้า
- `offset` (optional, default: 0) - เริ่มต้นที่รายการที่

**สถานะ (status):**
- `pending` - รอดำเนินการ
- `in_progress` - กำลังดำเนินการ
- `resolved` - แก้ไขแล้ว
- `rejected` - ปฏิเสธ

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "CI-uuid",
      "unit_id": "unit-uuid-here",
      "zone": "A",
      "reporter_name": "สมหญิง รักสะอาด",
      "reported_date": "2024-10-31T00:00:00.000Z",
      "issue_type": "lighting",
      "location": "ถนนหน้าโครงการ",
      "description": "ไฟส่องสว่างดับ",
      "image_urls": ["url1"],
      "status": "pending",
      "priority": "high",
      "created_at": "2024-10-31T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 2.3 ดึงรายการแจ้งปัญหาตาม ID
**GET** `/api/repairs/common/:id`

---

### 2.4 อัพเดทสถานะการแจ้งปัญหา
**PATCH** `/api/repairs/common/:id`

**Request Body:**
```json
{
  "status": "resolved",
  "assigned_to": "ทีมซ่อมบำรุง",
  "notes": "เปลี่ยนหลอดไฟใหม่เรียบร้อยแล้ว"
}
```

---

### 2.5 ลบรายการแจ้งปัญหา
**DELETE** `/api/repairs/common/:id`

---

## การติดตั้งและใช้งาน

### 1. ติดตั้ง Dependencies
```bash
cd backend
npm install
```

### 2. สร้าง Database Tables
รัน SQL files ใน `backend/database/`:
- `personal_repairs.sql`
- `common_issues.sql`

### 3. เริ่มต้น Server
```bash
npm run dev
```

### 4. ทดสอบ API
ใช้ Postman หรือ curl เพื่อทดสอบ endpoints:

```bash
# สร้างรายการแจ้งซ่อม
curl -X POST http://localhost:5000/api/repairs/personal \
  -H "Content-Type: application/json" \
  -d '{
    "unit_id": "unit-uuid-here",
    "zone": "A",
    "reporter_name": "สมชาย ใจดี",
    "repair_category": "plumbing",
    "description": "ท่อน้ำรั่ว"
  }'

# ดึงรายการแจ้งซ่อมทั้งหมด
curl http://localhost:5000/api/repairs/personal
```

---

## หมายเหตุ

1. **UUID Package**: ต้องติดตั้ง `uuid` package ก่อนใช้งาน
   ```bash
   npm install uuid
   ```

2. **Image URLs**: ควรใช้ร่วมกับ Cloudinary หรือ service อื่นๆ สำหรับจัดเก็บรูปภาพ

3. **Authentication**: ควรเพิ่ม middleware สำหรับตรวจสอบสิทธิ์ผู้ใช้งานในอนาคต

4. **Validation**: ควรเพิ่ม validation middleware เพื่อตรวจสอบข้อมูลที่รับเข้ามา
