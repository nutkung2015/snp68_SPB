const express = require("express");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const authMiddleware = require("../middleware/authMiddleware");
const { requireJuristicRoleFromParams, requireJuristicRole } = require("../middleware/roleMiddleware");
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
// Public route: client app usually needs this before login to load project theme/logo
router.get("/:projectId", getProjectCustomizationById);

// Route to create a new project customization (with logo upload support)
// Protected: requires authentication and juristic role in the project
router.post("/", authMiddleware, upload.fields([
  { name: 'logo', maxCount: 1 }
]), requireJuristicRole, createProjectCustomization);

// Route to update a project customization by project ID (with logo upload support)
// Protected: requires authentication and juristic role in the project
router.put("/:projectId", authMiddleware, requireJuristicRoleFromParams, upload.fields([
  { name: 'logo', maxCount: 1 }
]), updateProjectCustomization);

// Route to delete a project customization by project ID
// Protected: requires authentication and juristic role in the project
router.delete("/:projectId", authMiddleware, requireJuristicRoleFromParams, deleteProjectCustomization);

module.exports = router;