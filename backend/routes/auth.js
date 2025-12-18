const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { login } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware"); // Import middleware

const { validateRegister, validateLogin } = require("../middleware/validationMiddleware");

router.post("/login", validateLogin, login);

// Route สำหรับการลงทะเบียน
router.post("/register", validateRegister, authController.register);

// Route สำหรับดึงข้อมูล Profile ของผู้ใช้
router.get("/profile", authMiddleware, authController.getProfile);

// Route สำหรับ update push token
router.put("/push-token", authMiddleware, authController.updatePushToken);

module.exports = router;
