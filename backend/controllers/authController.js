const db = require("../config/db");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { full_name, phone, email, password, role = "resident" } = req.body;

    // ตรวจสอบว่ามีอีเมลนี้ในระบบแล้วหรือไม่
    const [existingUser] = await db
      .promise()
      .query("SELECT id FROM users WHERE email = ?", [email]);

    if (existingUser.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "อีเมลนี้ถูกใช้งานแล้ว",
      });
    }

    // เข้ารหัสพาสเวิร์ด
    const hashedPassword = await bcrypt.hash(password, 10);

    // สร้าง ID ใหม่
    const userId = uuidv4();

    // เพิ่มผู้ใช้ใหม่ลงในฐานข้อมูล
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO users (id, full_name, phone, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [userId, full_name, phone, email, hashedPassword, role]
      );

    // สร้าง JWT Token
    const token = jwt.sign(
      { id: userId, email, role },
      process.env.JWT_SECRET,
      { expiresIn: "1m" }
    );

    res.status(201).json({
      status: "success",
      message: "ลงทะเบียนสำเร็จ",
      data: {
        id: userId,
        full_name,
        email,
        role,
        token,
      },
    });
  } catch (error) {
    console.error("Error in register:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการลงทะเบียน",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ตรวจสอบว่าผู้ใช้งานมีอยู่ในระบบหรือไม่
    const [user] = await db
      .promise()
      .query("SELECT * FROM users WHERE email = ?", [email]);

    if (user.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "ไม่พบผู้ใช้งาน",
      });
    }

    const existingUser = user[0];

    // ตรวจสอบรหัสผ่าน
    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "รหัสผ่านไม่ถูกต้อง",
      });
    }

    // สร้าง JWT Token
    const token = jwt.sign(
      {
        id: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      status: "success",
      message: "เข้าสู่ระบบสำเร็จ",
      data: {
        id: existingUser.id,
        full_name: existingUser.full_name,
        email: existingUser.email,
        role: existingUser.role,
        token,
      },
    });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
    });
  }
};
