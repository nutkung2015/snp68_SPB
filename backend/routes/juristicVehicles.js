const express = require("express");
const router = express.Router();
const {
    getAllProjectVehicles,
    getUnitVehicles,
    getVehicleById,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    searchVehicles,
    getVehicleStats,
    bulkUpdateVehicles,
} = require("../controllers/manageVehicleForJuristicController");
const protect = require("../middleware/authMiddleware");

// Protect all routes
router.use(protect);

// ==================== Juristic Vehicle Routes ====================
// Base Path: /api/juristic/vehicles

// @route   GET /api/juristic/vehicles/search
// @desc    Search vehicles across the project (must be before /:vehicleId)
router.get("/search", searchVehicles);

// @route   GET /api/juristic/vehicles/stats
// @desc    Get vehicle statistics for the project
router.get("/stats", getVehicleStats);

// @route   GET /api/juristic/vehicles
// @desc    Get all vehicles in a project (with pagination, search, filters)
router.get("/", getAllProjectVehicles);

// @route   GET /api/juristic/vehicles/unit/:unitId
// @desc    Get all vehicles of a specific unit
router.get("/unit/:unitId", getUnitVehicles);

// @route   GET /api/juristic/vehicles/:vehicleId
// @desc    Get a single vehicle by ID
router.get("/:vehicleId", getVehicleById);

// @route   POST /api/juristic/vehicles
// @desc    Add a vehicle to a unit
router.post("/", addVehicle);

// @route   PUT /api/juristic/vehicles/:vehicleId
// @desc    Update a vehicle
router.put("/:vehicleId", updateVehicle);

// @route   PATCH /api/juristic/vehicles/bulk-update
// @desc    Bulk update vehicles (set active status)
router.patch("/bulk-update", bulkUpdateVehicles);

// @route   DELETE /api/juristic/vehicles/:vehicleId
// @desc    Delete a vehicle
router.delete("/:vehicleId", deleteVehicle);

module.exports = router;
