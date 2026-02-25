const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Table name constant
const VEHICLES_TABLE = "project_vehicles";

// @desc    Get all vehicles of a unit
// @route   GET /api/resident-vehicles/:unitId
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
                id,
                project_id,
                unit_id,
                plate_number,
                type,
                province,
                brand,
                color,
                is_active,
                created_at
            FROM ${VEHICLES_TABLE}
            WHERE unit_id = ?
            ORDER BY is_active DESC, created_at ASC`,
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
// @route   POST /api/resident-vehicles/:unitId
// @access  Private (Unit members)
exports.addVehicle = async (req, res) => {
    try {
        const { unitId } = req.params;
        const { plate_number, type, province, brand, color, is_active } = req.body;
        const user_id = req.user.id;

        // Validate required fields
        if (!plate_number) {
            return res.status(400).json({ message: "Plate number is required" });
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

        // Get project_id from unit
        const [unitInfo] = await db.promise().execute(
            "SELECT project_id FROM units WHERE id = ?",
            [unitId]
        );

        if (unitInfo.length === 0) {
            return res.status(404).json({ message: "Unit not found" });
        }

        const project_id = unitInfo[0].project_id;

        // Check if plate number already exists in this unit
        const [existingVehicle] = await db.promise().execute(
            `SELECT id FROM ${VEHICLES_TABLE} WHERE unit_id = ? AND plate_number = ?`,
            [unitId, plate_number.trim().toUpperCase()]
        );

        if (existingVehicle.length > 0) {
            return res.status(409).json({
                message: "This plate number is already registered in this unit",
            });
        }

        // If this is active, set other vehicles to inactive
        if (is_active) {
            await db.promise().execute(
                `UPDATE ${VEHICLES_TABLE} SET is_active = FALSE WHERE unit_id = ?`,
                [unitId]
            );
        }

        // Validate vehicle type
        const validTypes = ['car', 'motorcycle'];
        const vehicleType = validTypes.includes(type) ? type : 'car';

        // Insert new vehicle
        const vehicleId = uuidv4();
        await db.promise().execute(
            `INSERT INTO ${VEHICLES_TABLE} 
                (id, project_id, unit_id, plate_number, type, province, brand, color, is_active, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                vehicleId,
                project_id,
                unitId,
                plate_number.trim().toUpperCase(),
                vehicleType,
                province || null,
                brand || null,
                color || null,
                is_active || false,
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
// @route   PUT /api/resident-vehicles/:unitId/:vehicleId
// @access  Private (Unit members)
exports.updateVehicle = async (req, res) => {
    try {
        const { unitId, vehicleId } = req.params;
        const { plate_number, type, province, brand, color, is_active } = req.body;
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
            `SELECT id FROM ${VEHICLES_TABLE} WHERE id = ? AND unit_id = ?`,
            [vehicleId, unitId]
        );

        if (vehicle.length === 0) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        // If changing plate number, check for duplicates
        if (plate_number) {
            const [existingVehicle] = await db.promise().execute(
                `SELECT id FROM ${VEHICLES_TABLE} WHERE unit_id = ? AND plate_number = ? AND id != ?`,
                [unitId, plate_number.trim().toUpperCase(), vehicleId]
            );

            if (existingVehicle.length > 0) {
                return res.status(409).json({
                    message: "This plate number is already registered in this unit",
                });
            }
        }

        // If setting as active, set other vehicles to inactive
        if (is_active) {
            await db.promise().execute(
                `UPDATE ${VEHICLES_TABLE} SET is_active = FALSE WHERE unit_id = ? AND id != ?`,
                [unitId, vehicleId]
            );
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (plate_number !== undefined) {
            updates.push("plate_number = ?");
            values.push(plate_number.trim().toUpperCase());
        }
        if (province !== undefined) {
            updates.push("province = ?");
            values.push(province);
        }
        if (brand !== undefined) {
            updates.push("brand = ?");
            values.push(brand);
        }
        if (color !== undefined) {
            updates.push("color = ?");
            values.push(color);
        }
        if (is_active !== undefined) {
            updates.push("is_active = ?");
            values.push(is_active);
        }
        if (type !== undefined) {
            const validTypes = ['car', 'motorcycle'];
            if (validTypes.includes(type)) {
                updates.push("type = ?");
                values.push(type);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        values.push(vehicleId);

        await db.promise().execute(
            `UPDATE ${VEHICLES_TABLE} SET ${updates.join(", ")} WHERE id = ?`,
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
// @route   DELETE /api/resident-vehicles/:unitId/:vehicleId
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
            `SELECT id FROM ${VEHICLES_TABLE} WHERE id = ? AND unit_id = ?`,
            [vehicleId, unitId]
        );

        if (vehicle.length === 0) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        // Delete the vehicle
        await db.promise().execute(`DELETE FROM ${VEHICLES_TABLE} WHERE id = ?`, [vehicleId]);

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
// @route   GET /api/resident-vehicles/:unitId/:vehicleId
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
                id,
                project_id,
                unit_id,
                plate_number,
                type,
                province,
                brand,
                color,
                is_active,
                created_at
            FROM ${VEHICLES_TABLE}
            WHERE id = ? AND unit_id = ?`,
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

// @desc    Get vehicle history of a unit (all vehicles sorted by created_at DESC)
// @route   GET /api/resident-vehicles/:unitId/history
// @access  Private (Unit members or Project juristic)
exports.getVehicleHistory = async (req, res) => {
    try {
        const { unitId } = req.params;
        const user_id = req.user.id;

        // Check if user has access to this unit
        const hasAccess = await checkUnitAccess(user_id, unitId);
        if (!hasAccess.allowed) {
            return res.status(hasAccess.status).json({ message: hasAccess.message });
        }

        // Get all vehicles history of the unit, ordered by newest first
        const [vehicles] = await db.promise().execute(
            `SELECT 
                v.id,
                v.project_id,
                v.unit_id,
                v.plate_number,
                v.type,
                v.province,
                v.brand,
                v.color,
                v.is_active,
                v.created_at
            FROM ${VEHICLES_TABLE} v
            WHERE v.unit_id = ?
            ORDER BY v.created_at DESC`,
            [unitId]
        );

        res.status(200).json({
            status: "success",
            message: "Vehicle history fetched successfully",
            data: vehicles,
            count: vehicles.length,
        });
    } catch (error) {
        console.error("Error in getVehicleHistory:", error);
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
