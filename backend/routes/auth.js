const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { login } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware"); // Import middleware

router.post("/login", login);

// Route สำหรับการลงทะเบียน
router.post("/register", authController.register);

// Route สำหรับดึงข้อมูล Profile ของผู้ใช้
router.get("/profile", authMiddleware, authController.getProfile);

module.exports = router;
