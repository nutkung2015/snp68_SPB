const db = require("../config/db");

// ดึงข้อมูลการปรับแต่งทั้งหมด
async function getProjectCustomizations(req, res) {
  try {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM projectcustomizations");
    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// ดึงข้อมูลการปรับแต่งเฉพาะโปรเจกต์
async function getProjectCustomizationById(req, res) {
  try {
    const { projectId } = req.params; // รับ projectId จาก URL
    const [rows] = await db
      .promise()
      .query("SELECT * FROM projectcustomizations WHERE project_id = ?", [
        projectId,
      ]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Project customization not found" }); // กรณีไม่พบข้อมูล
    }

    res.json(rows[0]); // ส่งข้อมูลกลับไปยัง Client
  } catch (error) {
    console.error("Error fetching project customization:", error); // Log ข้อผิดพลาด
    res.status(500).json({ message: error.message }); // ส่งข้อผิดพลาดกลับไปยัง Client
  }
}

// สร้างการปรับแต่งใหม่
async function createProjectCustomization(req, res) {
  try {
    const {
      project_id,
      primary_color,
      secondary_color,
      logo_url,
      favicon_url,
    } = req.body;
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO projectcustomizations (project_id, primary_color, secondary_color, logo_url, favicon_url) VALUES (?, ?, ?, ?, ?)",
        [project_id, primary_color, secondary_color, logo_url, favicon_url]
      );

    res.status(201).json({
      success: true,
      message: "Project customization created successfully",
      id: result.insertId,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

// อัปเดตการปรับแต่ง
async function updateProjectCustomization(req, res) {
  try {
    const { projectId } = req.params;
    const { primary_color, secondary_color, logo_url, favicon_url } = req.body;

    const [result] = await db
      .promise()
      .query(
        "UPDATE projectcustomizations SET primary_color = ?, secondary_color = ?, logo_url = ?, favicon_url = ? WHERE project_id = ?",
        [primary_color, secondary_color, logo_url, favicon_url, projectId]
      );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Project customization not found" });
    }

    res.json({ message: "Project customization updated successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

// ลบการปรับแต่ง
async function deleteProjectCustomization(req, res) {
  try {
    const { projectId } = req.params;

    const [result] = await db
      .promise()
      .query("DELETE FROM projectcustomizations WHERE project_id = ?", [
        projectId,
      ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Project customization not found" });
    }

    res.json({ message: "Project customization deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  getProjectCustomizations,
  getProjectCustomizationById,
  createProjectCustomization,
  updateProjectCustomization,
  deleteProjectCustomization,
};
