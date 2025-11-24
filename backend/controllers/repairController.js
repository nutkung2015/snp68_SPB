// backend/controllers/repairController.js
const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { uploadImages } = require("../utils/imageUpload");
const cloudinary = require("cloudinary").v2; // เพิ่มบรรทัดนี้

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ==================== Personal Repairs ====================

// สร้างรายการแจ้งซ่อมทรัพย์สินส่วนบุคคล
exports.createPersonalRepair = async (req, res) => {
  try {
    const userId = req.user.id;
    const userFullName = req.user.full_name;

    const {
      project_id, // เพิ่ม project_id
      unit_id,
      zone,
      repair_category,
      repair_area,
      description,
      image_urls, // This will now be base64 images or temp URLs
      priority = "medium",
    } = req.body;

    const reporter_name = userFullName;
    const reporter_id = userId;

    // Upload images to Cloudinary
    let cloudinaryUrls = [];
    if (image_urls && image_urls.length > 0) {
      try {
        const uploadPromises = image_urls.map((image) =>
          cloudinary.uploader.upload(image, {
            folder: "Personalssues",
            resource_type: "auto",
          })
        );

        const uploadResults = await Promise.all(uploadPromises);
        cloudinaryUrls = uploadResults.map((result) => ({
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
        }));
      } catch (uploadError) {
        console.error("Error uploading images:", uploadError);
        return res.status(500).json({
          status: "error",
          message: "เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ",
        });
      }
    }

    // เพิ่ม project_id ในการตรวจสอบ required fields
    if (
      !project_id ||
      !unit_id ||
      !zone ||
      !reporter_name ||
      !repair_category ||
      !description
    ) {
      return res.status(400).json({
        status: "error",
        message: "กรุณากรอกข้อมูลให้ครบถ้วน",
      });
    }

    const id = `PR-${uuidv4()}`;
    const imageUrlsJson =
      cloudinaryUrls.length > 0 ? JSON.stringify(cloudinaryUrls) : null;

    const query = `
            INSERT INTO personal_repairs 
            (id, project_id, unit_id, zone, reporter_name, reporter_id, submitted_date, 
             repair_category, repair_area, description, image_urls, priority, status)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, 'pending')
        `;

    const [result] = await db
      .promise()
      .query(query, [
        id,
        project_id,
        unit_id,
        zone,
        reporter_name,
        reporter_id,
        repair_category,
        repair_area,
        description,
        imageUrlsJson,
        priority,
      ]);

    res.status(201).json({
      status: "success",
      message: "บันทึกการแจ้งซ่อมเรียบร้อยแล้ว",
      data: { id },
    });
  } catch (error) {
    console.error("Error creating personal repair:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
    });
  }
};
// ดึงรายการแจ้งซ่อมทรัพย์สินส่วนบุคคลทั้งหมด
exports.getPersonalRepairs = async (req, res) => {
  try {
    const {
      project_id,
      unit_id,
      status,
      repair_category,
      priority,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = "SELECT * FROM personal_repairs WHERE 1=1";
    const params = [];

    // เพิ่มเงื่อนไข project_id (required)
    if (!project_id) {
      return res.status(400).json({
        status: "error",
        message: "กรุณาระบุ project_id",
      });
    }

    query += " AND project_id = ?";
    params.push(project_id);

    if (unit_id) {
      query += " AND unit_id = ?";
      params.push(unit_id);
    }

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    if (repair_category) {
      query += " AND repair_category = ?";
      params.push(repair_category);
    }

    if (priority) {
      query += " AND priority = ?";
      params.push(priority);
    }

    query += " ORDER BY submitted_date DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.promise().query(query, params);

    const repairs = rows.map((row) => ({
      ...row,
      image_urls: row.image_urls ? JSON.parse(row.image_urls) : [],
    }));

    res.json({
      status: "success",
      data: repairs,
      count: repairs.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Error fetching personal repairs:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
    });
  }
};

// ดึงรายการแจ้งซ่อมทรัพย์สินส่วนบุคคลสำหรับผู้พักอาศัย (ตาม reporter_id)
exports.getPersonalRepairsForResident = async (req, res) => {
  try {
    const {
      project_id,
      status,
      repair_category,
      priority,
      limit = 50,
      offset = 0,
    } = req.query;

    // ดึง reporter_id จาก req.user (ผู้ใช้ที่ login)
    const reporter_id = req.user.id;

    // Debug: Log ค่าที่ได้รับ
    console.log('=== Debug getPersonalRepairsForResident ===');
    console.log('req.user:', req.user);
    console.log('reporter_id:', reporter_id);
    console.log('project_id:', project_id);

    // ตรวจสอบ required fields
    if (!project_id) {
      return res.status(400).json({
        status: "error",
        message: "กรุณาระบุ project_id",
      });
    }

    let query = "SELECT * FROM personal_repairs WHERE reporter_id = ? AND project_id = ?";
    const params = [reporter_id, project_id];

    console.log('SQL Query:', query);
    console.log('Query Params:', params);

    // เพิ่มเงื่อนไขเพิ่มเติม
    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    if (repair_category) {
      query += " AND repair_category = ?";
      params.push(repair_category);
    }

    if (priority) {
      query += " AND priority = ?";
      params.push(priority);
    }

    query += " ORDER BY submitted_date DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.promise().query(query, params);

    const repairs = rows.map((row) => ({
      ...row,
      image_urls: row.image_urls ? JSON.parse(row.image_urls) : [],
    }));

    res.json({
      status: "success",
      data: repairs,
      count: repairs.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Error fetching personal repairs for resident:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
    });
  }
};


// ดึงรายการแจ้งซ่อมทรัพย์สินส่วนบุคคลตาม ID
exports.getPersonalRepairById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = "SELECT * FROM personal_repairs WHERE id = ?";
    const [rows] = await db.promise().query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "ไม่พบข้อมูลการแจ้งซ่อม",
      });
    }

    const repair = {
      ...rows[0],
      image_urls: rows[0].image_urls ? JSON.parse(rows[0].image_urls) : [],
    };

    res.json({
      status: "success",
      data: repair,
    });
  } catch (error) {
    console.error("Error fetching personal repair:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
    });
  }
};

// อัพเดทสถานะการแจ้งซ่อมทรัพย์สินส่วนบุคคล
exports.updatePersonalRepairStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, assigned_to_id, notes, estimated_cost, actual_cost, repair_category } =
      req.body;

    let query = "UPDATE personal_repairs SET status = ?, updated_at = NOW()";
    const params = [status];

    if (assigned_to !== undefined) {
      query += ", assigned_to = ?";
      params.push(assigned_to);
    }

    if (assigned_to_id !== undefined) {
      query += ", assigned_to_id = ?";
      params.push(assigned_to_id);
    }

    if (repair_category !== undefined) {
      query += ", repair_category = ?";
      params.push(repair_category);
    }

    if (notes !== undefined) {
      query += ", notes = ?";
      params.push(notes);
    }

    if (estimated_cost !== undefined) {
      query += ", estimated_cost = ?";
      params.push(estimated_cost);
    }

    if (actual_cost !== undefined) {
      query += ", actual_cost = ?";
      params.push(actual_cost);
    }

    if (status === "completed") {
      query += ", completed_date = NOW()";
    }

    query += " WHERE id = ?";
    params.push(id);

    const [result] = await db.promise().query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "ไม่พบข้อมูลการแจ้งซ่อม",
      });
    }

    res.json({
      status: "success",
      message: "อัพเดทสถานะเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("Error updating personal repair:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการอัพเดทข้อมูล",
    });
  }
};

// ลบรายการแจ้งซ่อมทรัพย์สินส่วนบุคคล
exports.deletePersonalRepair = async (req, res) => {
  try {
    const { id } = req.params;

    const query = "DELETE FROM personal_repairs WHERE id = ?";
    const [result] = await db.promise().query(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "ไม่พบข้อมูลการแจ้งซ่อม",
      });
    }

    res.json({
      status: "success",
      message: "ลบข้อมูลเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("Error deleting personal repair:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการลบข้อมูล",
    });
  }
};

// ==================== All Issues for Juristic ====================

// ดึงข้อมูลทั้ง Personal Repairs และ Common Issues สำหรับนิติบุคคล
exports.getAllIssuesForJuristic = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    // ตรวจสอบสิทธิ์การเข้าถึง (เฉพาะนิติบุคคล)
    if (req.user.role !== "juristic") {
      return res.status(403).json({
        status: "error",
        message: "ไม่มีสิทธิ์เข้าถึงข้อมูล",
      });
    }

    // ดึงข้อมูล Personal Repairs
    let personalQuery =
      'SELECT *, "personal" as issue_type FROM personal_repairs WHERE 1=1';
    let commonQuery =
      'SELECT *, "common" as issue_type FROM common_issues WHERE 1=1';
    const params = [];

    if (status) {
      personalQuery += " AND status = ?";
      commonQuery += " AND status = ?";
      params.push(status);
    }

    // ดึงข้อมูลทั้งสองตาราง
    const [personalRows] = await db
      .promise()
      .query(`${personalQuery} ORDER BY submitted_date DESC LIMIT ? OFFSET ?`, [
        ...params,
        parseInt(limit),
        parseInt(offset),
      ]);

    const [commonRows] = await db
      .promise()
      .query(`${commonQuery} ORDER BY reported_date DESC LIMIT ? OFFSET ?`, [
        ...params,
        parseInt(limit),
        parseInt(offset),
      ]);

    // รวมผลลัพธ์และเรียงลำดับตามวันที่ล่าสุด
    const allIssues = [
      ...personalRows.map((item) => ({
        ...item,
        image_urls: item.image_urls ? JSON.parse(item.image_urls) : [],
        date: item.submitted_date,
      })),
      ...commonRows.map((item) => ({
        ...item,
        image_urls: item.image_urls ? JSON.parse(item.image_urls) : [],
        date: item.reported_date,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      status: "success",
      data: allIssues,
      count: allIssues.length,
    });
  } catch (error) {
    console.error("Error fetching all issues:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
    });
  }
};

// ==================== All Issues for Juristic ====================

// ดึงข้อมูลทั้ง Personal Repairs และ Common Issues สำหรับนิติบุคคล
exports.getAllIssuesForJuristic = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    // ตรวจสอบสิทธิ์การเข้าถึง (เฉพาะนิติบุคคล)
    if (req.user.role !== "juristic") {
      return res.status(403).json({
        status: "error",
        message: "ไม่มีสิทธิ์เข้าถึงข้อมูล",
      });
    }

    // ดึงข้อมูล Personal Repairs
    let personalQuery =
      'SELECT *, "personal" as issue_type FROM personal_repairs WHERE 1=1';
    let commonQuery =
      'SELECT *, "common" as issue_type FROM common_issues WHERE 1=1';
    const params = [];
    const commonParams = [];

    if (status) {
      personalQuery += " AND status = ?";
      commonQuery += " AND status = ?";
      params.push(status);
      commonParams.push(status);
    }

    // ดึงข้อมูลทั้งสองตาราง
    const [personalRows] = await db
      .promise()
      .query(`${personalQuery} ORDER BY submitted_date DESC LIMIT ? OFFSET ?`, [
        ...params,
        parseInt(limit),
        parseInt(offset),
      ]);

    const [commonRows] = await db
      .promise()
      .query(`${commonQuery} ORDER BY reported_date DESC LIMIT ? OFFSET ?`, [
        ...commonParams,
        parseInt(limit),
        parseInt(offset),
      ]);

    // รวมผลลัพธ์และเรียงลำดับตามวันที่ล่าสุด
    const allIssues = [
      ...personalRows.map((item) => ({
        ...item,
        image_urls: item.image_urls ? JSON.parse(item.image_urls) : [],
        date: item.submitted_date,
        type: "personal_repair",
        title: `แจ้งซ่อม: ${item.repair_category}`,
        description: item.description,
      })),
      ...commonRows.map((item) => ({
        ...item,
        image_urls: item.image_urls ? JSON.parse(item.image_urls) : [],
        date: item.reported_date,
        type: "common_issue",
        title: `แจ้งปัญหา: ${item.issue_type}`,
        description: item.description,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      status: "success",
      data: allIssues,
      count: allIssues.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Error fetching all issues:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
    });
  }
};

// ==================== Common Issues ====================

// สร้างรายการแจ้งปัญหาส่วนกลาง
exports.createCommonIssue = async (req, res) => {
  try {
    const userId = req.user.id;
    const userFullName = req.user.full_name;

    const {
      project_id,
      unit_id,
      zone,
      issue_type,
      location,
      description,
      image_urls, // This will now be base64 images or temp URLs
      priority = "medium",
    } = req.body;

    const reporter_name = userFullName;
    const reporter_id = userId;

    // Upload images to Cloudinary
    // Upload images to Cloudinary
    let cloudinaryUrls = [];
    if (image_urls && image_urls.length > 0) {
      try {
        const uploadPromises = image_urls.map((image) =>
          cloudinary.uploader.upload(image, {
            folder: "CommonIssues",
            resource_type: "auto",
          })
        );

        const uploadResults = await Promise.all(uploadPromises);
        cloudinaryUrls = uploadResults.map((result) => ({
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
        }));
      } catch (uploadError) {
        console.error("Error uploading images:", uploadError);
        return res.status(500).json({
          status: "error",
          message: "เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ",
        });
      }
    }

    // เช็คข้อมูลที่จำเป็น
    if (
      !project_id ||
      !unit_id ||
      !zone ||
      !reporter_name ||
      !issue_type ||
      !description
    ) {
      return res.status(400).json({
        status: "error",
        message: "กรุณากรอกข้อมูลให้ครบถ้วน",
      });
    }

    const id = `CI-${uuidv4()}`;
    const imageUrlsJson =
      cloudinaryUrls.length > 0 ? JSON.stringify(cloudinaryUrls) : null;

    const query = `
            INSERT INTO common_issues 
            (id, project_id, unit_id, zone, reporter_name, reporter_id, reported_date,
             issue_type, location, description, image_urls, priority, status)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, 'pending')
        `;

    const [result] = await db
      .promise()
      .query(query, [
        id,
        project_id,
        unit_id,
        zone,
        reporter_name,
        reporter_id,
        issue_type,
        location,
        description,
        imageUrlsJson,
        priority,
      ]);

    res.status(201).json({
      status: "success",
      message: "บันทึกการแจ้งปัญหาเรียบร้อยแล้ว",
      data: { id },
    });
  } catch (error) {
    console.error("Error creating common issue:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
    });
  }
};

// ดึงรายการแจ้งปัญหาส่วนกลางทั้งหมด
exports.getCommonIssues = async (req, res) => {
  try {
    const {
      project_id,
      unit_id,
      status,
      issue_type,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = "SELECT * FROM common_issues WHERE 1=1";
    const params = [];

    // เพิ่มเงื่อนไข project_id (required)
    if (!project_id) {
      return res.status(400).json({
        status: "error",
        message: "กรุณาระบุ project_id",
      });
    }

    query += " AND project_id = ?";
    params.push(project_id);

    if (unit_id) {
      query += " AND unit_id = ?";
      params.push(unit_id);
    }

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    if (issue_type) {
      query += " AND issue_type = ?";
      params.push(issue_type);
    }

    query += " ORDER BY reported_date DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.promise().query(query, params);

    const issues = rows.map((row) => ({
      ...row,
      image_urls: row.image_urls ? JSON.parse(row.image_urls) : [],
    }));

    res.json({
      status: "success",
      data: issues,
      count: issues.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Error fetching common issues:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
    });
  }
};

// ดึงรายการแจ้งปัญหาส่วนกลางตาม ID
exports.getCommonIssueById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = "SELECT * FROM common_issues WHERE id = ?";
    const [rows] = await db.promise().query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "ไม่พบข้อมูลการแจ้งปัญหา",
      });
    }

    const issue = {
      ...rows[0],
      image_urls: rows[0].image_urls ? JSON.parse(rows[0].image_urls) : [],
    };

    res.json({
      status: "success",
      data: issue,
    });
  } catch (error) {
    console.error("Error fetching common issue:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
    });
  }
};

// อัพเดทสถานะการแจ้งปัญหาส่วนกลาง
exports.updateCommonIssueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, notes } = req.body;

    let query = "UPDATE common_issues SET status = ?, updated_at = NOW()";
    const params = [status];

    if (assigned_to !== undefined) {
      query += ", assigned_to = ?";
      params.push(assigned_to);
    }

    if (notes !== undefined) {
      query += ", notes = ?";
      params.push(notes);
    }

    if (status === "resolved") {
      query += ", resolved_date = NOW()";
    }

    query += " WHERE id = ?";
    params.push(id);

    const [result] = await db.promise().query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "ไม่พบข้อมูลการแจ้งปัญหา",
      });
    }

    res.json({
      status: "success",
      message: "อัพเดทสถานะเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("Error updating common issue:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการอัพเดทข้อมูล",
    });
  }
};

// ลบรายการแจ้งปัญหาส่วนกลาง
exports.deleteCommonIssue = async (req, res) => {
  try {
    const { id } = req.params;

    const query = "DELETE FROM common_issues WHERE id = ?";
    const [result] = await db.promise().query(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "ไม่พบข้อมูลการแจ้งปัญหา",
      });
    }

    res.json({
      status: "success",
      message: "ลบข้อมูลเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("Error deleting common issue:", error);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการลบข้อมูล",
    });
  }
};
