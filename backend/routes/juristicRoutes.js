const express = require('express');
const router = express.Router();
const juristicController = require('../controllers/juristicController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/juristic/members - ดึงข้อมูลสมาชิกนิติบุคคล (ต้อง login)
router.get('/members', authMiddleware, juristicController.getJuristicMembers);

// DELETE /api/juristic/members/:memberId - ลบสมาชิกนิติบุคคล (เฉพาะ juristicLeader)
router.delete('/members/:memberId', authMiddleware, juristicController.deleteJuristicMember);

module.exports = router;