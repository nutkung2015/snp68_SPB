const express = require("express");
const router = express.Router();
const unitController = require("../controllers/unitController");
console.log('🔍 unitController exports:', Object.keys(unitController)); // DEBUG
const protect = require("../middleware/authMiddleware"); // Fixed: default export, not named
const multer = require("multer");
const vehicleController = require("../controllers/manageVehicleForResidentController");

// Configure multer for memory storage (for Excel import)
const upload = multer({ storage: multer.memoryStorage() });

// POST routes
router.post("/import", protect, upload.single("file"), unitController.importUnits);
router.post("/", protect, unitController.createUnit);
router.post("/invitations", protect, unitController.createUnitInvitations);
router.post("/invitations/join", protect, unitController.joinUnit);

// GET routes - IMPORTANT: Specific paths BEFORE parameterized paths
router.get("/unit-invitations", protect, unitController.getUnitInvitations);
router.get("/residents", protect, unitController.getProjectResidents);
router.get("/project-residents", protect, unitController.getProjectResidents);
router.get("/", protect, unitController.getUnits);

router.get("/:id", protect, unitController.getUnitById); // Must be LAST among GET routes

// DELETE routes
router.delete("/:id", protect, unitController.deleteUnit);

module.exports = router;