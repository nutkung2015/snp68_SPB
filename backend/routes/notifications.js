const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * Notification Routes
 * Base URL: /api/notifications
 */

// =============================================
// Push Token Management
// =============================================

// POST /api/notifications/register-token - ลงทะเบียน push token
router.post("/register-token", authMiddleware, notificationController.registerPushToken);

// DELETE /api/notifications/unregister-token - ยกเลิก push token (logout)
router.delete("/unregister-token", authMiddleware, notificationController.unregisterPushToken);

// =============================================
// Notification List & Actions
// =============================================

// GET /api/notifications - ดึงรายการ notifications
router.get("/", authMiddleware, notificationController.getNotifications);

// GET /api/notifications/unread-count - ดึงจำนวนที่ยังไม่อ่าน
router.get("/unread-count", authMiddleware, notificationController.getUnreadCount);

// PUT /api/notifications/read-all - อ่านทั้งหมด
router.put("/read-all", authMiddleware, notificationController.markAllAsRead);

// DELETE /api/notifications/clear-all - ลบทั้งหมด
router.delete("/clear-all", authMiddleware, notificationController.clearAllNotifications);

// PUT /api/notifications/:id/read - อ่าน 1 รายการ
router.put("/:id/read", authMiddleware, notificationController.markAsRead);

// DELETE /api/notifications/:id - ลบ 1 รายการ
router.delete("/:id", authMiddleware, notificationController.deleteNotification);

module.exports = router;
