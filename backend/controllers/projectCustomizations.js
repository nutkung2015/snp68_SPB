const db = require("../config/db");
const cloudinary = require('cloudinary').v2;

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
    } = req.body;

    let logo_url = null;

    // Handle file upload for logo
    if (req.files && req.files.logo && req.files.logo[0]) {
      const logoFile = req.files.logo[0];
      const logoUploadResult = await cloudinary.uploader.upload(logoFile.path, {
        folder: 'LogoForProjectCustomization',
        resource_type: 'auto'
      });
      logo_url = logoUploadResult.secure_url;
    }

    const [result] = await db
      .promise()
      .query(
        "INSERT INTO projectcustomizations (project_id, primary_color, secondary_color, logo_url) VALUES (?, ?, ?, ?)",
        [project_id, primary_color, secondary_color, logo_url]
      );

    // Fetch the newly created customization
    const [newCustomization] = await db
      .promise()
      .query("SELECT * FROM projectcustomizations WHERE customization_id = ?", [result.insertId]);

    res.status(201).json({
      success: true,
      message: "Project customization created successfully",
      data: newCustomization[0],
    });
  } catch (error) {
    console.error('Error creating project customization:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

// อัปเดตการปรับแต่ง
async function updateProjectCustomization(req, res) {
  try {
    const { projectId } = req.params;
    const { primary_color, secondary_color } = req.body;

    // Get existing customization to check for old logo
    const [existingRows] = await db
      .promise()
      .query("SELECT logo_url FROM projectcustomizations WHERE project_id = ?", [projectId]);

    if (existingRows.length === 0) {
      return res
        .status(404)
        .json({ message: "Project customization not found" });
    }

    const existingCustomization = existingRows[0];
    let logo_url = existingCustomization.logo_url;

    // Handle file upload for logo
    if (req.files && req.files.logo && req.files.logo[0]) {
      const logoFile = req.files.logo[0];

      // Delete old logo from Cloudinary if exists
      if (existingCustomization.logo_url) {
        const publicId = extractPublicIdFromUrl(existingCustomization.logo_url);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }

      // Upload new logo
      const logoUploadResult = await cloudinary.uploader.upload(logoFile.path, {
        folder: 'LogoForProjectCustomization',
        resource_type: 'auto'
      });
      logo_url = logoUploadResult.secure_url;
    }

    const [result] = await db
      .promise()
      .query(
        "UPDATE projectcustomizations SET primary_color = ?, secondary_color = ?, logo_url = ? WHERE project_id = ?",
        [primary_color, secondary_color, logo_url, projectId]
      );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Project customization not found" });
    }

    // Fetch the updated customization
    const [updatedCustomization] = await db
      .promise()
      .query("SELECT * FROM projectcustomizations WHERE project_id = ?", [projectId]);

    res.json({
      success: true,
      message: "Project customization updated successfully",
      data: updatedCustomization[0]
    });
  } catch (error) {
    console.error('Error updating project customization:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

// Helper function to extract public_id from Cloudinary URL
function extractPublicIdFromUrl(url) {
  try {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    const folderIndex = parts.indexOf('LogoForProjectCustomization');
    if (folderIndex !== -1) {
      const pathParts = parts.slice(folderIndex);
      const publicId = pathParts.join('/').replace(/\.[^/.]+$/, ''); // Remove file extension
      return publicId;
    }
    return null;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    return null;
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
