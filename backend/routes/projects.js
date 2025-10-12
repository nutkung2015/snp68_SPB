const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware'); // หากคุณต้องการการยืนยันตัวตน

// Route สำหรับสร้างโปรเจกต์ใหม่
router.post('/', authMiddleware, projectController.createProject); // เพิ่ม authMiddleware หากต้องการให้ต้อง login ก่อน

// Route สำหรับดึงรายละเอียดโปรเจกต์ (ตัวอย่าง)
router.get('/:id', authMiddleware, projectController.getProjectDetails);

module.exports = router;
