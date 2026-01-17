const db = require("../config/db");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const { verifyIdToken } = require("../config/firebase");

// Helper function to generate user response with memberships
const generateUserResponse = async (existingUser, token) => {
  // ดึงข้อมูลการเป็นสมาชิกโครงการ
  const [projectMembershipsRaw] = await db
    .promise()
    .query(
      "SELECT pm.project_id, pm.role, p.name AS project_name FROM project_members pm JOIN projects p ON pm.project_id = p.id WHERE pm.user_id = ?",
      [existingUser.id]
    );

  const projectMemberships = projectMembershipsRaw.map(pm => ({
    ...pm,
    role: pm.role || existingUser.role
  }));

  // ดึงข้อมูลการเป็นสมาชิกยูนิต
  const [unitMemberships] = await db
    .promise()
    .query(
      "SELECT um.unit_id, um.role, u.unit_number FROM unit_members um JOIN units u ON um.unit_id = u.id WHERE um.user_id = ?",
      [existingUser.id]
    );

  // ดึงข้อมูล projectCustomizations
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

  return {
    id: existingUser.id,
    full_name: existingUser.full_name,
    email: existingUser.email,
    phone: existingUser.phone,
    role: existingUser.role,
    token,
    projectMemberships,
    unitMemberships,
    projectCustomizations,
  };
};

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
      { expiresIn: "7d" }
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
    const { email, phone, password } = req.body;

    // ตรวจสอบว่ามี email หรือ phone อย่างใดอย่างหนึ่ง
    if (!email && !phone) {
      return res.status(400).json({
        status: "error",
        message: "กรุณาระบุอีเมลหรือเบอร์โทรศัพท์",
      });
    }

    // ค้นหาผู้ใช้งานด้วย email หรือ phone
    let user;
    if (email) {
      [user] = await db
        .promise()
        .query("SELECT * FROM users WHERE email = ?", [email]);
    } else {
      // Normalize phone number (รองรับทั้งแบบมี +66 และไม่มี)
      let normalizedPhone = phone.replace(/\s/g, ''); // ลบ space
      if (normalizedPhone.startsWith('+66')) {
        normalizedPhone = '0' + normalizedPhone.slice(3);
      } else if (normalizedPhone.startsWith('66')) {
        normalizedPhone = '0' + normalizedPhone.slice(2);
      }

      [user] = await db
        .promise()
        .query("SELECT * FROM users WHERE phone = ? OR phone = ?", [phone, normalizedPhone]);
    }

    if (user.length === 0) {
      return res.status(404).json({
        status: "error",
        message: email ? "ไม่พบผู้ใช้งาน" : "ไม่พบเบอร์โทรศัพท์นี้ในระบบ",
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

    // ใช้ helper function เพื่อสร้าง response
    const responseData = await generateUserResponse(existingUser, token);

    res.status(200).json({
      status: "success",
      message: "เข้าสู่ระบบสำเร็จ",
      data: responseData,
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

// @desc    Update User Push Token
// @route   PUT /api/auth/push-token
// @access  Private
exports.updatePushToken = async (req, res) => {
  try {
    const { push_token } = req.body;
    const user_id = req.user.id;

    if (!push_token) {
      return res.status(400).json({ message: "Push token is required" });
    }

    await db.promise().execute(
      "UPDATE users SET push_token = ? WHERE id = ?",
      [push_token, user_id]
    );

    res.status(200).json({
      status: "success",
      message: "Push token updated successfully"
    });
  } catch (error) {
    console.error("Error in updatePushToken:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Check if phone number exists in system
// @route   POST /api/auth/check-phone
// @access  Public
exports.checkPhoneExists = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        status: "error",
        message: "กรุณาระบุเบอร์โทรศัพท์",
      });
    }

    // Normalize phone number
    let normalizedPhone = phone.replace(/\s/g, '');
    if (normalizedPhone.startsWith('+66')) {
      normalizedPhone = '0' + normalizedPhone.slice(3);
    } else if (normalizedPhone.startsWith('66')) {
      normalizedPhone = '0' + normalizedPhone.slice(2);
    }

    const [user] = await db
      .promise()
      .query("SELECT id, full_name, email FROM users WHERE phone = ? OR phone = ?", [phone, normalizedPhone]);

    if (user.length === 0) {
      return res.status(404).json({
        status: "error",
        exists: false,
        message: "ไม่พบเบอร์โทรศัพท์นี้ในระบบ",
      });
    }

    res.status(200).json({
      status: "success",
      exists: true,
      message: "พบเบอร์โทรศัพท์ในระบบ",
      data: {
        full_name: user[0].full_name,
        // ไม่ส่ง email เต็ม เพื่อความปลอดภัย
        email_hint: user[0].email ? user[0].email.replace(/(.{2})(.*)(@.*)/, "$1***$3") : null
      }
    });
  } catch (error) {
    console.error("Error in checkPhoneExists:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการตรวจสอบเบอร์โทรศัพท์",
    });
  }
};

// @desc    Reset password with Firebase Phone Auth
// @route   POST /api/auth/reset-password-firebase
// @access  Public (with Firebase token)
exports.resetPasswordWithFirebase = async (req, res) => {
  try {
    const { firebase_token, new_password } = req.body;

    if (!firebase_token || !new_password) {
      return res.status(400).json({
        status: "error",
        message: "กรุณาระบุ Firebase token และรหัสผ่านใหม่",
      });
    }

    // ตรวจสอบความยาวรหัสผ่าน
    if (new_password.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
      });
    }

    // Verify Firebase token
    const verifyResult = await verifyIdToken(firebase_token);

    if (!verifyResult.success) {
      return res.status(401).json({
        status: "error",
        message: "Firebase token ไม่ถูกต้องหรือหมดอายุ",
      });
    }

    const phoneNumber = verifyResult.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({
        status: "error",
        message: "ไม่พบเบอร์โทรศัพท์ใน token",
      });
    }

    // Normalize phone number
    let normalizedPhone = phoneNumber.replace(/\s/g, '');
    if (normalizedPhone.startsWith('+66')) {
      normalizedPhone = '0' + normalizedPhone.slice(3);
    } else if (normalizedPhone.startsWith('66')) {
      normalizedPhone = '0' + normalizedPhone.slice(2);
    }

    // ค้นหา user ด้วยเบอร์โทร
    const [user] = await db
      .promise()
      .query("SELECT id FROM users WHERE phone = ? OR phone = ?", [phoneNumber, normalizedPhone]);

    if (user.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "ไม่พบเบอร์โทรศัพท์นี้ในระบบ",
      });
    }

    // Hash password ใหม่
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await db
      .promise()
      .execute("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?", [
        hashedPassword,
        user[0].id,
      ]);

    res.status(200).json({
      status: "success",
      message: "เปลี่ยนรหัสผ่านสำเร็จ",
    });
  } catch (error) {
    console.error("Error in resetPasswordWithFirebase:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน",
    });
  }
};

// @desc    Login with Firebase Phone Auth (OTP verified)
// @route   POST /api/auth/login-firebase-phone
// @access  Public
exports.loginWithFirebasePhone = async (req, res) => {
  try {
    const { firebase_token } = req.body;

    if (!firebase_token) {
      return res.status(400).json({
        status: "error",
        message: "กรุณาระบุ Firebase token",
      });
    }

    // Verify Firebase token
    const verifyResult = await verifyIdToken(firebase_token);

    if (!verifyResult.success) {
      return res.status(401).json({
        status: "error",
        message: "Firebase token ไม่ถูกต้องหรือหมดอายุ",
      });
    }

    const phoneNumber = verifyResult.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({
        status: "error",
        message: "ไม่พบเบอร์โทรศัพท์ใน token",
      });
    }

    // Normalize phone number
    let normalizedPhone = phoneNumber.replace(/\s/g, '');
    if (normalizedPhone.startsWith('+66')) {
      normalizedPhone = '0' + normalizedPhone.slice(3);
    } else if (normalizedPhone.startsWith('66')) {
      normalizedPhone = '0' + normalizedPhone.slice(2);
    }

    // ค้นหา user ด้วยเบอร์โทร
    const [user] = await db
      .promise()
      .query("SELECT * FROM users WHERE phone = ? OR phone = ?", [phoneNumber, normalizedPhone]);

    if (user.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "ไม่พบเบอร์โทรศัพท์นี้ในระบบ กรุณาลงทะเบียนก่อน",
      });
    }

    const existingUser = user[0];

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

    // ใช้ helper function เพื่อสร้าง response
    const responseData = await generateUserResponse(existingUser, token);

    res.status(200).json({
      status: "success",
      message: "เข้าสู่ระบบด้วย OTP สำเร็จ",
      data: responseData,
    });
  } catch (error) {
    console.error("Error in loginWithFirebasePhone:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
    });
  }
};

// @desc    Verify Firebase ID Token
// @route   POST /api/auth/verify-firebase-token
// @access  Public
exports.verifyFirebaseToken = async (req, res) => {
  try {
    const { firebase_token } = req.body;

    if (!firebase_token) {
      return res.status(400).json({
        status: "error",
        message: "กรุณาระบุ Firebase token",
      });
    }

    // Verify Firebase token
    const verifyResult = await verifyIdToken(firebase_token);

    if (!verifyResult.success) {
      return res.status(401).json({
        status: "error",
        valid: false,
        message: "Firebase token ไม่ถูกต้องหรือหมดอายุ",
      });
    }

    res.status(200).json({
      status: "success",
      valid: true,
      message: "Token ถูกต้อง",
      data: {
        uid: verifyResult.uid,
        phone_number: verifyResult.phone_number,
        email: verifyResult.email,
      }
    });
  } catch (error) {
    console.error("Error in verifyFirebaseToken:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการตรวจสอบ token",
    });
  }
};
