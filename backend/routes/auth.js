const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { login } = require("../controllers/authController");

router.post("/login", login);
// Route สำหรับการลงทะเบียน
router.post("/register", authController.register);

module.exports = router;
