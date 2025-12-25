const express = require("express");
const router = express.Router();
const guardController = require("../controllers/guardController");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * Guard Routes
 * Base URL: /api/guards
 */

// GET /api/guards/my-guard-phone - ดึงเบอร์ป้อมยามตามโซนของบ้านผู้ใช้
router.get("/my-guard-phone", authMiddleware, guardController.getMyGuardPhone);

// GET /api/guards/project/:projectId - ดึงเบอร์ป้อมยามทั้งหมดของโครงการ
router.get("/project/:projectId", authMiddleware, guardController.getGuardPhonesByProject);

// PUT /api/guards/zone/:zoneId - อัพเดตเบอร์ป้อมยามของโซน
router.put("/zone/:zoneId", authMiddleware, guardController.updateGuardPhone);

// GET /api/guards/unit/:unitId - ดึงเบอร์ป้อมยามตาม unit ID
router.get("/unit/:unitId", authMiddleware, guardController.getGuardPhoneByUnit);

module.exports = router;
