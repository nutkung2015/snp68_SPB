const express = require("express");
const router = express.Router();
const {
    getUnitVehicles,
    addVehicle,
    updateVehicle,
    removeVehicle,
    getVehicleById,
    getVehicleHistory,
} = require("../controllers/manageVehicleForResidentController");
const protect = require("../middleware/authMiddleware");

// Protect all routes
router.use(protect);

// ==================== Resident Vehicle Routes ====================
// Base Path: /api/resident-vehicles

// @route   GET /api/resident-vehicles/:unitId
// @desc    Get all vehicles of a unit
router.get("/:unitId", getUnitVehicles);

// @route   POST /api/resident-vehicles/:unitId
// @desc    Add a vehicle to a unit
router.post("/:unitId", addVehicle);

// @route   GET /api/resident-vehicles/:unitId/history
// @desc    Get vehicle history of a unit
// ⚠️ Must be placed BEFORE /:unitId/:vehicleId to avoid "history" being matched as vehicleId
router.get("/:unitId/history", getVehicleHistory);

// @route   GET /api/resident-vehicles/:unitId/:vehicleId
// @desc    Get a single vehicle by ID
router.get("/:unitId/:vehicleId", getVehicleById);

// @route   PUT /api/resident-vehicles/:unitId/:vehicleId
// @desc    Update a vehicle
router.put("/:unitId/:vehicleId", updateVehicle);

// @route   DELETE /api/resident-vehicles/:unitId/:vehicleId
// @desc    Remove a vehicle from a unit
router.delete("/:unitId/:vehicleId", removeVehicle);

module.exports = router;
