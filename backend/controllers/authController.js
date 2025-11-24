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
        full_name: existingUser.full_name,
        phone: existingUser.phone,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // ดึงข้อมูลการเป็นสมาชิกโครงการสำหรับบทบาท Backoffice
    const [projectMemberships] = await db
      .promise()
      .query(
        "SELECT pm.project_id, pm.role, p.name AS project_name FROM project_members pm JOIN projects p ON pm.project_id = p.id WHERE pm.user_id = ? AND pm.role IN (?, ?, ?, ?)",
        [
          existingUser.id,
          "juristicLeader",
          "juristicMember",
          "member",
          "security",
        ]
      );

    // ดึงข้อมูลการเป็นสมาชิกยูนิต
    const [unitMemberships] = await db
      .promise()
      .query(
        "SELECT um.unit_id, um.role, u.unit_number FROM unit_members um JOIN units u ON um.unit_id = u.id WHERE um.user_id = ?",
        [existingUser.id]
      );

    // ดึงข้อมูล projectCustomizations ตาม project_id (ถ้ามี)
    let projectCustomizations = null;
    if (projectMemberships.length > 0) {
      const projectId = projectMemberships[0].project_id;
      const [customRows] = await db
        .promise()
        .query(
          "SELECT * FROM projectcustomizations WHERE project_id = ? LIMIT 1",
          [projectId]
        );
      if (customRows.length > 0) {
        projectCustomizations = customRows[0];
      }
    }

    res.status(200).json({
      status: "success",
      message: "เข้าสู่ระบบสำเร็จ",
      data: {
        id: existingUser.id,
        full_name: existingUser.full_name,
        email: existingUser.email,
        phone: existingUser.phone,
        role: existingUser.role,
        token,
        projectMemberships: req.user?.projectMemberships || [], // ใช้ข้อมูลจาก authMiddleware
        projectMemberships: projectMemberships, // เพิ่มข้อมูล projectMemberships
        unitMemberships: unitMemberships, // เพิ่มข้อมูล unitMemberships
        projectCustomizations: projectCustomizations, // เพิ่มข้อมูล projectCustomizations
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

exports.getProfile = async (req, res) => {
  try {
    // req.user มาจาก authMiddleware ซึ่งมีข้อมูลผู้ใช้ที่ถอดรหัสจาก token
    const user = req.user;

    // ส่งข้อมูลผู้ใช้กลับไป
    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};
