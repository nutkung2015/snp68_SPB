const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// @desc    Get all vehicles of a unit
// @route   GET /api/units/:unitId/vehicles
// @access  Private (Unit members or Project juristic)
exports.getUnitVehicles = async (req, res) => {
    try {
        const { unitId } = req.params;
        const user_id = req.user.id;

        // Check if user has access to this unit
        const hasAccess = await checkUnitAccess(user_id, unitId);
        if (!hasAccess.allowed) {
            return res.status(hasAccess.status).json({ message: hasAccess.message });
        }

        // Get all vehicles of the unit
        const [vehicles] = await db.promise().execute(
            `SELECT 
        v.id,
        v.unit_id,
        v.license_plate,
        v.vehicle_type,
        v.brand,
        v.model,
        v.color,
        v.is_primary,
        v.created_at,
        v.updated_at,
        u.full_name as registered_by_name
       FROM vehicles v
       LEFT JOIN users u ON v.registered_by = u.id
       WHERE v.unit_id = ?
       ORDER BY v.is_primary DESC, v.created_at ASC`,
            [unitId]
        );

        res.status(200).json({
            status: "success",
            message: "Vehicles fetched successfully",
            data: vehicles,
            count: vehicles.length,
        });
    } catch (error) {
        console.error("Error in getUnitVehicles:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Add a vehicle to a unit
// @route   POST /api/units/:unitId/vehicles
// @access  Private (Unit members)
exports.addVehicle = async (req, res) => {
    try {
        const { unitId } = req.params;
        const { license_plate, vehicle_type, brand, model, color, is_primary } =
            req.body;
        const user_id = req.user.id;

        // Validate required fields
        if (!license_plate) {
            return res.status(400).json({ message: "License plate is required" });
        }

        // Check if user is a member of the unit
        const [unitMembership] = await db.promise().execute(
            "SELECT role FROM unit_members WHERE user_id = ? AND unit_id = ?",
            [user_id, unitId]
        );

        if (unitMembership.length === 0) {
            return res.status(403).json({
                message: "You must be a member of this unit to add vehicles",
            });
        }

        // Check if license plate already exists in this unit
        const [existingVehicle] = await db.promise().execute(
            "SELECT id FROM vehicles WHERE unit_id = ? AND license_plate = ?",
            [unitId, license_plate.trim().toUpperCase()]
        );

        if (existingVehicle.length > 0) {
            return res.status(409).json({
                message: "This license plate is already registered in this unit",
            });
        }

        // If this is primary, remove primary from other vehicles
        if (is_primary) {
            await db.promise().execute(
                "UPDATE vehicles SET is_primary = FALSE WHERE unit_id = ?",
                [unitId]
            );
        }

        // Insert new vehicle
        const vehicleId = uuidv4();
        await db.promise().execute(
            `INSERT INTO vehicles 
        (id, unit_id, license_plate, vehicle_type, brand, model, color, is_primary, registered_by, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                vehicleId,
                unitId,
                license_plate.trim().toUpperCase(),
                vehicle_type || "car",
                brand || null,
                model || null,
                color || null,
                is_primary || false,
                user_id,
            ]
        );

        res.status(201).json({
            status: "success",
            message: "Vehicle added successfully",
            vehicle_id: vehicleId,
        });
    } catch (error) {
        console.error("Error in addVehicle:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Update a vehicle
// @route   PUT /api/units/:unitId/vehicles/:vehicleId
// @access  Private (Unit members)
exports.updateVehicle = async (req, res) => {
    try {
        const { unitId, vehicleId } = req.params;
        const { license_plate, vehicle_type, brand, model, color, is_primary } =
            req.body;
        const user_id = req.user.id;

        // Check if user is a member of the unit
        const [unitMembership] = await db.promise().execute(
            "SELECT role FROM unit_members WHERE user_id = ? AND unit_id = ?",
            [user_id, unitId]
        );

        if (unitMembership.length === 0) {
            return res.status(403).json({
                message: "You must be a member of this unit to update vehicles",
            });
        }

        // Check if vehicle exists
        const [vehicle] = await db.promise().execute(
            "SELECT id FROM vehicles WHERE id = ? AND unit_id = ?",
            [vehicleId, unitId]
        );

        if (vehicle.length === 0) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        // If changing license plate, check for duplicates
        if (license_plate) {
            const [existingVehicle] = await db.promise().execute(
                "SELECT id FROM vehicles WHERE unit_id = ? AND license_plate = ? AND id != ?",
                [unitId, license_plate.trim().toUpperCase(), vehicleId]
            );

            if (existingVehicle.length > 0) {
                return res.status(409).json({
                    message: "This license plate is already registered in this unit",
                });
            }
        }

        // If setting as primary, remove primary from other vehicles
        if (is_primary) {
            await db.promise().execute(
                "UPDATE vehicles SET is_primary = FALSE WHERE unit_id = ? AND id != ?",
                [unitId, vehicleId]
            );
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (license_plate !== undefined) {
            updates.push("license_plate = ?");
            values.push(license_plate.trim().toUpperCase());
        }
        if (vehicle_type !== undefined) {
            updates.push("vehicle_type = ?");
            values.push(vehicle_type);
        }
        if (brand !== undefined) {
            updates.push("brand = ?");
            values.push(brand);
        }
        if (model !== undefined) {
            updates.push("model = ?");
            values.push(model);
        }
        if (color !== undefined) {
            updates.push("color = ?");
            values.push(color);
        }
        if (is_primary !== undefined) {
            updates.push("is_primary = ?");
            values.push(is_primary);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        updates.push("updated_at = NOW()");
        values.push(vehicleId);

        await db.promise().execute(
            `UPDATE vehicles SET ${updates.join(", ")} WHERE id = ?`,
            values
        );

        res.status(200).json({
            status: "success",
            message: "Vehicle updated successfully",
        });
    } catch (error) {
        console.error("Error in updateVehicle:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Remove a vehicle from a unit
// @route   DELETE /api/units/:unitId/vehicles/:vehicleId
// @access  Private (Unit members)
exports.removeVehicle = async (req, res) => {
    try {
        const { unitId, vehicleId } = req.params;
        const user_id = req.user.id;

        // Check if user is a member of the unit
        const [unitMembership] = await db.promise().execute(
            "SELECT role FROM unit_members WHERE user_id = ? AND unit_id = ?",
            [user_id, unitId]
        );

        if (unitMembership.length === 0) {
            // Check if user is juristic
            const [unitInfo] = await db.promise().execute(
                "SELECT project_id FROM units WHERE id = ?",
                [unitId]
            );

            if (unitInfo.length > 0) {
                const [projectMembership] = await db.promise().execute(
                    "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
                    [user_id, unitInfo[0].project_id]
                );

                const juristicRoles = ["juristicLeader", "juristicMember", "admin"];
                if (
                    projectMembership.length === 0 ||
                    !juristicRoles.includes(projectMembership[0].role)
                ) {
                    return res.status(403).json({
                        message: "You don't have permission to remove vehicles from this unit",
                    });
                }
            } else {
                return res.status(403).json({
                    message: "You don't have permission to remove vehicles from this unit",
                });
            }
        }

        // Check if vehicle exists
        const [vehicle] = await db.promise().execute(
            "SELECT id FROM vehicles WHERE id = ? AND unit_id = ?",
            [vehicleId, unitId]
        );

        if (vehicle.length === 0) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        // Delete the vehicle
        await db.promise().execute("DELETE FROM vehicles WHERE id = ?", [vehicleId]);

        res.status(200).json({
            status: "success",
            message: "Vehicle removed successfully",
        });
    } catch (error) {
        console.error("Error in removeVehicle:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Get a single vehicle by ID
// @route   GET /api/units/:unitId/vehicles/:vehicleId
// @access  Private (Unit members or Project juristic)
exports.getVehicleById = async (req, res) => {
    try {
        const { unitId, vehicleId } = req.params;
        const user_id = req.user.id;

        // Check if user has access to this unit
        const hasAccess = await checkUnitAccess(user_id, unitId);
        if (!hasAccess.allowed) {
            return res.status(hasAccess.status).json({ message: hasAccess.message });
        }

        // Get vehicle
        const [vehicles] = await db.promise().execute(
            `SELECT 
        v.id,
        v.unit_id,
        v.license_plate,
        v.vehicle_type,
        v.brand,
        v.model,
        v.color,
        v.is_primary,
        v.created_at,
        v.updated_at,
        u.full_name as registered_by_name
       FROM vehicles v
       LEFT JOIN users u ON v.registered_by = u.id
       WHERE v.id = ? AND v.unit_id = ?`,
            [vehicleId, unitId]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        res.status(200).json({
            status: "success",
            message: "Vehicle fetched successfully",
            data: vehicles[0],
        });
    } catch (error) {
        console.error("Error in getVehicleById:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Helper function to check unit access
async function checkUnitAccess(user_id, unitId) {
    // Check if user is a member of the unit
    const [unitMembership] = await db.promise().execute(
        "SELECT * FROM unit_members WHERE user_id = ? AND unit_id = ?",
        [user_id, unitId]
    );

    if (unitMembership.length > 0) {
        return { allowed: true };
    }

    // Check if user is juristic of the project
    const [unitInfo] = await db.promise().execute(
        "SELECT project_id FROM units WHERE id = ?",
        [unitId]
    );

    if (unitInfo.length === 0) {
        return { allowed: false, status: 404, message: "Unit not found" };
    }

    const [projectMembership] = await db.promise().execute(
        "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
        [user_id, unitInfo[0].project_id]
    );

    const juristicRoles = ["juristicLeader", "juristicMember", "admin"];
    if (
        projectMembership.length > 0 &&
        juristicRoles.includes(projectMembership[0].role)
    ) {
        return { allowed: true };
    }

    return {
        allowed: false,
        status: 403,
        message: "You don't have permission to access this unit",
    };
}
