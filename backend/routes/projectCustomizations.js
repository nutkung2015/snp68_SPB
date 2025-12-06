const express = require("express");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
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

// Route to create a new project customization (with logo upload support)
router.post("/", upload.fields([
  { name: 'logo', maxCount: 1 }
]), createProjectCustomization);

// Route to update a project customization by project ID (with logo upload support)
router.put("/:projectId", upload.fields([
  { name: 'logo', maxCount: 1 }
]), updateProjectCustomization);

// Route to delete a project customization by project ID
router.delete("/:projectId", deleteProjectCustomization);

module.exports = router;