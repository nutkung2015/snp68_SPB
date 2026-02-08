const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { login } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware"); // Import middleware

const { validateRegister, validateLogin, validateCheckPhone, validateResetPassword, validateFirebaseToken } = require("../middleware/validationMiddleware");

// Login route (รองรับทั้ง email และ phone)
router.post("/login", validateLogin, login);

// Route สำหรับการลงทะเบียน
router.post("/register", validateRegister, authController.register);

// Route สำหรับดึงข้อมูล Profile ของผู้ใช้
router.get("/profile", authMiddleware, authController.getProfile);

// Route สำหรับ update push token
router.put("/push-token", authMiddleware, authController.updatePushToken);

// ================== Firebase Phone Auth Routes ==================

// Route สำหรับเช็คว่าเบอร์โทรมีในระบบหรือไม่ (ก่อน reset password)
router.post("/check-phone", validateCheckPhone, authController.checkPhoneExists);

// Route สำหรับตรวจสอบความเป็นเจ้าของเบอร์โทรศัพท์ (ต้อง Login แล้ว)
router.post("/verify-phone-ownership", authMiddleware, authController.verifyUserPhone);

// Route สำหรับ reset password ด้วย Firebase OTP
router.post("/reset-password-firebase", validateResetPassword, authController.resetPasswordWithFirebase);

// Route สำหรับ login ด้วย Firebase Phone OTP (ไม่ต้องใช้ password)
router.post("/login-firebase-phone", validateFirebaseToken, authController.loginWithFirebasePhone);

// Route สำหรับ verify Firebase token
router.post("/verify-firebase-token", validateFirebaseToken, authController.verifyFirebaseToken);

// Route สำหรับ refresh Access Token (ด้วย HttpOnly Cookie)
router.post("/refresh", authController.refreshToken);

// Route สำหรับ logout (ลบ Token จาก DB และ Clear Cookie)
router.post("/logout", authController.logout);

module.exports = router;

