// backend/routes/repairs.js
const express = require('express');
const router = express.Router();
const repairController = require('../controllers/repairController');
const authMiddleware = require('../middleware/authMiddleware');
const checkJuristic = require('../middleware/juristicMiddleware');

// ใช้ middleware ตรวจสอบ token สำหรับทุก route
router.use(authMiddleware);

// ==================== All Issues for Juristic ====================

// ดึงข้อมูลทั้ง Personal Repairs และ Common Issues สำหรับนิติบุคคล
router.get('/all-issues', checkJuristic, repairController.getAllIssuesForJuristic);

// ==================== Personal Repairs Routes ====================

// สร้างรายการแจ้งซ่อมทรัพย์สินส่วนบุคคล
router.post('/personal', repairController.createPersonalRepair);

// ดึงรายการแจ้งซ่อมทรัพย์สินส่วนบุคคลทั้งหมด
router.get('/personal', repairController.getPersonalRepairs);

// ดึงรายการแจ้งซ่อมทรัพย์สินส่วนบุคคลสำหรับผู้พักอาศัย (ตาม reporter_id)
router.get('/personal/my-repairs', repairController.getPersonalRepairsForResident);


// ดึงรายการแจ้งซ่อมทรัพย์สินส่วนบุคคลตาม ID
router.get('/personal/:id', repairController.getPersonalRepairById);

// อัพเดทสถานะการแจ้งซ่อมทรัพย์สินส่วนบุคคล (รองรับทั้ง PATCH และ PUT)
router.patch('/personal/:id', repairController.updatePersonalRepairStatus);
router.put('/personal/:id', repairController.updatePersonalRepairStatus);

// ลบรายการแจ้งซ่อมทรัพย์สินส่วนบุคคล
router.delete('/personal/:id', repairController.deletePersonalRepair);

// ==================== Common Issues Routes ====================

// สร้างรายการแจ้งปัญหาส่วนกลาง
router.post('/common', repairController.createCommonIssue);

// ดึงรายการแจ้งปัญหาส่วนกลางทั้งหมด
router.get('/common', repairController.getCommonIssues);

// ดึงรายการแจ้งปัญหาส่วนกลางตาม ID
router.get('/common/:id', repairController.getCommonIssueById);

// อัพเดทสถานะการแจ้งปัญหาส่วนกลาง
router.patch('/common/:id', repairController.updateCommonIssueStatus);

// ลบรายการแจ้งปัญหาส่วนกลาง
router.delete('/common/:id', repairController.deleteCommonIssue);

module.exports = router;
