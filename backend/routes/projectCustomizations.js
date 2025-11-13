const express = require("express");
const {
  getProjectCustomizations,
  getProjectCustomizationById,
  createProjectCustomization,
  updateProjectCustomization,
  deleteProjectCustomization,
} = require("../controllers/projectCustomizations");

const router = express.Router();

// Route to get all project customizations
router.get("/", getProjectCustomizations);

// Route to get a specific project customization by project ID
router.get("/:projectId", getProjectCustomizationById);

// Route to create a new project customization
router.post("/", createProjectCustomization);

// Route to update a project customization by project ID
router.put("/:projectId", updateProjectCustomization);

// Route to delete a project customization by project ID
router.delete("/:projectId", deleteProjectCustomization);

module.exports = router;