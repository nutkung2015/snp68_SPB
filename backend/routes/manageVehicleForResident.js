const express = require("express");
const router = express.Router();
const {
    getUnitVehicles,
    addVehicle,
    updateVehicle,
    removeVehicle,
    getVehicleById,
} = require("../controllers/manageVehicleForResidentController");
const protect = require("../middleware/authMiddleware");

// Protect all routes
router.use(protect);

// @route   GET /api/vehicle-management/units/:unitId/vehicles
// @desc    Get all vehicles of a unit
router.get("/units/:unitId/vehicles", getUnitVehicles);

// @route   POST /api/vehicle-management/units/:unitId/vehicles
// @desc    Add a vehicle to a unit
router.post("/units/:unitId/vehicles", addVehicle);

// @route   GET /api/vehicle-management/units/:unitId/vehicles/:vehicleId
// @desc    Get a single vehicle by ID
router.get("/units/:unitId/vehicles/:vehicleId", getVehicleById);

// @route   PUT /api/vehicle-management/units/:unitId/vehicles/:vehicleId
// @desc    Update a vehicle
router.put("/units/:unitId/vehicles/:vehicleId", updateVehicle);

// @route   DELETE /api/vehicle-management/units/:unitId/vehicles/:vehicleId
// @desc    Remove a vehicle from a unit
router.delete("/units/:unitId/vehicles/:vehicleId", removeVehicle);

module.exports = router;
