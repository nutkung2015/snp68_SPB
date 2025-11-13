const ProjectCustomization = require("../models/ProjectCustomization");

// ดึงข้อมูลการปรับแต่งทั้งหมด
async function getProjectCustomizations(req, res) {
  try {
    const projectCustomizations = await ProjectCustomization.find();
    res.json(projectCustomizations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// ดึงข้อมูลการปรับแต่งเฉพาะโปรเจกต์
async function getProjectCustomizationById(req, res) {
  try {
    const { projectId } = req.params;
    const projectCustomization = await ProjectCustomization.findOne({
      project_id: projectId,
    });

    if (!projectCustomization) {
      return res
        .status(404)
        .json({ message: "Project customization not found" });
    }

    res.json(projectCustomization);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// สร้างการปรับแต่งใหม่
async function createProjectCustomization(req, res) {
  try {
    const newCustomization = new ProjectCustomization(req.body);
    const savedCustomization = await newCustomization.save();
    res.status(201).json(savedCustomization);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

// อัปเดตการปรับแต่ง
async function updateProjectCustomization(req, res) {
  try {
    const { projectId } = req.params;
    const updatedCustomization = await ProjectCustomization.findOneAndUpdate(
      { project_id: projectId },
      req.body,
      { new: true }
    );

    if (!updatedCustomization) {
      return res
        .status(404)
        .json({ message: "Project customization not found" });
    }

    res.json(updatedCustomization);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

// ลบการปรับแต่ง
async function deleteProjectCustomization(req, res) {
  try {
    const { projectId } = req.params;
    const deletedCustomization = await ProjectCustomization.findOneAndDelete({
      project_id: projectId,
    });

    if (!deletedCustomization) {
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
