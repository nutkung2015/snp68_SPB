const express = require("express");
const router = express.Router();
const zoneController = require("../controllers/zoneController");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * Zone Routes
 * Base URL: /api/zones
 */

// GET /api/zones - ดึงรายการโซนทั้งหมด (filter by project_id)
router.get("/", authMiddleware, zoneController.getZones);

// GET /api/zones/:id - ดึงข้อมูลโซนตาม ID
router.get("/:id", authMiddleware, zoneController.getZoneById);

// POST /api/zones/match-by-name - Auto-match units to zones by name
router.post("/match-by-name", authMiddleware, zoneController.matchByName);

// POST /api/zones - สร้างโซนใหม่
router.post("/", authMiddleware, zoneController.createZone);

// PUT /api/zones/:id - อัพเดตโซน
router.put("/:id", authMiddleware, zoneController.updateZone);

// DELETE /api/zones/:id - ลบโซน
router.delete("/:id", authMiddleware, zoneController.deleteZone);

// PUT /api/zones/:id/units - ผูกบ้านเข้ากับโซน (bulk)
router.put("/:id/units", authMiddleware, zoneController.assignUnitsToZone);

// GET /api/zones/:id/units - ดึงรายการบ้านในโซน
router.get("/:id/units", authMiddleware, zoneController.getUnitsInZone);

module.exports = router;
