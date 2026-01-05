const express = require("express");
const router = express.Router();
const guardPostController = require("../controllers/guardPostController");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * Guard Post Routes (ป้อมยาม)
 * Base URL: /api/guard-posts
 * 
 * All routes require authentication via authMiddleware
 * Authorization is handled within the controller (project membership check)
 */

// =============================================
// Guard Post CRUD Operations
// =============================================

// GET /api/guard-posts - ดึงรายการป้อมยามทั้งหมด (filter by project_id)
router.get("/", authMiddleware, guardPostController.getGuardPosts);

// GET /api/guard-posts/:id - ดึงข้อมูลป้อมยามตาม ID
router.get("/:id", authMiddleware, guardPostController.getGuardPostById);

// POST /api/guard-posts - สร้างป้อมยามใหม่
router.post("/", authMiddleware, guardPostController.createGuardPost);

// PUT /api/guard-posts/:id - อัพเดตป้อมยาม
router.put("/:id", authMiddleware, guardPostController.updateGuardPost);

// DELETE /api/guard-posts/:id - ลบป้อมยาม
router.delete("/:id", authMiddleware, guardPostController.deleteGuardPost);

// =============================================
// Zone Linking Operations
// =============================================

// PUT /api/guard-posts/:id/zones - ผูกโซนเข้ากับป้อมยาม (bulk)
router.put("/:id/zones", authMiddleware, guardPostController.assignZonesToGuardPost);

// DELETE /api/guard-posts/:id/zones - ยกเลิกการผูกโซนทั้งหมดจากป้อมยาม
router.delete("/:id/zones", authMiddleware, guardPostController.unassignAllZones);

// GET /api/guard-posts/:id/zones - ดึงรายการโซนที่ผูกกับป้อมยาม
router.get("/:id/zones", authMiddleware, guardPostController.getZonesInGuardPost);

module.exports = router;
