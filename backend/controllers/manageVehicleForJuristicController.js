const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Table name constant
const VEHICLES_TABLE = "project_vehicles";

// Juristic roles that have access
const JURISTIC_ROLES = ["juristicLeader", "juristicMember", "admin"];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if user has juristic access to the project
 * @param {string} user_id - User ID
 * @param {string} project_id - Project ID
 * @returns {Object} { allowed: boolean, role?: string, status?: number, message?: string }
 */
async function checkJuristicAccess(user_id, project_id) {
    const [projectMembership] = await db.promise().execute(
        "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
        [user_id, project_id]
    );

    if (projectMembership.length === 0) {
        return {
            allowed: false,
            status: 403,
            message: "คุณไม่ได้เป็นสมาชิกของโครงการนี้",
        };
    }

    const role = projectMembership[0].role;
    if (!JURISTIC_ROLES.includes(role)) {
        return {
            allowed: false,
            status: 403,
            message: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลยานพาหนะในโครงการนี้",
        };
    }

    return { allowed: true, role };
}

/**
 * Build WHERE clause for vehicle search
 * @param {Object} filters - Filter options
 * @returns {Object} { whereClause: string, params: array }
 */
function buildVehicleSearchQuery(filters) {
    const conditions = [];
    const params = [];

    // Project ID (required)
    conditions.push("v.project_id = ?");
    params.push(filters.project_id);

    // Unit ID filter
    if (filters.unit_id) {
        conditions.push("v.unit_id = ?");
        params.push(filters.unit_id);
    }

    // Zone ID filter (through unit)
    if (filters.zone_id) {
        conditions.push("u.zone_id = ?");
        params.push(filters.zone_id);
    }

    // Search term (plate number, brand, color)
    if (filters.search) {
        const searchTerm = `%${filters.search.trim()}%`;
        conditions.push(`(
            v.plate_number LIKE ? OR 
            v.brand LIKE ? OR 
            v.color LIKE ? OR
            v.province LIKE ? OR
            u.unit_number LIKE ?
        )`);
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Active status filter
    if (filters.is_active !== undefined && filters.is_active !== null && filters.is_active !== '') {
        conditions.push("v.is_active = ?");
        params.push(filters.is_active === 'true' || filters.is_active === true ? 1 : 0);
    }

    return {
        whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
        params,
    };
}

// =============================================================================
// Controller Functions
// =============================================================================

/**
 * @desc    Get all vehicles in a project (with pagination, search, filters)
 * @route   GET /api/juristic/vehicles
 * @access  Private (Juristic members only)
 * 
 * Query Params:
 * - project_id (required): Project ID
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 20, max: 100)
 * - search (optional): Search term (plate number, brand, color, unit number)
 * - unit_id (optional): Filter by unit
 * - zone_id (optional): Filter by zone
 * - is_active (optional): Filter by active status (true/false)
 * - sort_by (optional): Sort field (plate_number, created_at, unit_number) (default: created_at)
 * - sort_order (optional): Sort order (asc, desc) (default: desc)
 */
exports.getAllProjectVehicles = async (req, res) => {
    try {
        const user_id = req.user.id;
        const {
            project_id,
            page = 1,
            limit = 20,
            search,
            unit_id,
            zone_id,
            is_active,
            sort_by = "created_at",
            sort_order = "desc",
        } = req.query;

        // Validate project_id
        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ project_id",
            });
        }

        // Check juristic access
        const access = await checkJuristicAccess(user_id, project_id);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        // Validate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Validate sort options
        const allowedSortFields = ["plate_number", "created_at", "unit_number", "brand", "color", "is_active"];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : "created_at";
        const sortDirection = sort_order.toLowerCase() === "asc" ? "ASC" : "DESC";

        // Build search query
        const { whereClause, params } = buildVehicleSearchQuery({
            project_id,
            unit_id,
            zone_id,
            search,
            is_active,
        });

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM ${VEHICLES_TABLE} v
            LEFT JOIN units u ON v.unit_id = u.id
            ${whereClause}
        `;
        const [countResult] = await db.promise().execute(countQuery, params);
        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limitNum);

        // Get vehicles with unit info
        const sortColumn = sortField === "unit_number" ? "u.unit_number" : `v.${sortField}`;
        const dataQuery = `
            SELECT 
                v.id,
                v.project_id,
                v.unit_id,
                v.plate_number,
                v.type,
                v.province,
                v.brand,
                v.color,
                v.is_active,
                v.created_at,
                u.unit_number,
                u.zone_id,
                z.name as zone_name
            FROM ${VEHICLES_TABLE} v
            LEFT JOIN units u ON v.unit_id = u.id
            LEFT JOIN zones z ON u.zone_id = z.id
            ${whereClause}
            ORDER BY ${sortColumn} ${sortDirection}
            LIMIT ? OFFSET ?
        `;

        const [vehicles] = await db.promise().execute(dataQuery, [...params, String(limitNum), String(offset)]);

        res.status(200).json({
            status: "success",
            message: "ดึงข้อมูลยานพาหนะสำเร็จ",
            data: vehicles,
            pagination: {
                current_page: pageNum,
                total_pages: totalPages,
                total_items: totalItems,
                items_per_page: limitNum,
                has_next: pageNum < totalPages,
                has_prev: pageNum > 1,
            },
        });
    } catch (error) {
        console.error("Error in getAllProjectVehicles:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลยานพาหนะ",
        });
    }
};

/**
 * @desc    Get vehicles of a specific unit (for juristic)
 * @route   GET /api/juristic/vehicles/unit/:unitId
 * @access  Private (Juristic members only)
 */
exports.getUnitVehicles = async (req, res) => {
    try {
        const { unitId } = req.params;
        const { project_id } = req.query;
        const user_id = req.user.id;

        // Validate project_id
        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ project_id",
            });
        }

        // Check juristic access
        const access = await checkJuristicAccess(user_id, project_id);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        // Verify unit belongs to project
        const [unitInfo] = await db.promise().execute(
            "SELECT id, unit_number FROM units WHERE id = ? AND project_id = ?",
            [unitId, project_id]
        );

        if (unitInfo.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบยูนิตในโครงการนี้",
            });
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
            message: "ดึงข้อมูลยานพาหนะสำเร็จ",
            data: vehicles,
            unit: unitInfo[0],
            count: vehicles.length,
        });
    } catch (error) {
        console.error("Error in getUnitVehicles (juristic):", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลยานพาหนะ",
        });
    }
};

/**
 * @desc    Get a single vehicle by ID
 * @route   GET /api/juristic/vehicles/:vehicleId
 * @access  Private (Juristic members only)
 */
exports.getVehicleById = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { project_id } = req.query;
        const user_id = req.user.id;

        // Validate project_id
        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ project_id",
            });
        }

        // Check juristic access
        const access = await checkJuristicAccess(user_id, project_id);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        // Get vehicle with unit info
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
                v.created_at,
                u.unit_number,
                u.zone_id,
                z.name as zone_name
            FROM ${VEHICLES_TABLE} v
            LEFT JOIN units u ON v.unit_id = u.id
            LEFT JOIN zones z ON u.zone_id = z.id
            WHERE v.id = ? AND v.project_id = ?`,
            [vehicleId, project_id]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบยานพาหนะ",
            });
        }

        res.status(200).json({
            status: "success",
            message: "ดึงข้อมูลยานพาหนะสำเร็จ",
            data: vehicles[0],
        });
    } catch (error) {
        console.error("Error in getVehicleById (juristic):", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลยานพาหนะ",
        });
    }
};

/**
 * @desc    Add a vehicle to a unit (for juristic)
 * @route   POST /api/juristic/vehicles
 * @access  Private (Juristic members only)
 * 
 * Body:
 * - project_id (required): Project ID
 * - unit_id (required): Unit ID
 * - plate_number (required): Vehicle plate number
 * - province (optional): Province of registration
 * - brand (optional): Vehicle brand
 * - color (optional): Vehicle color
 * - is_active (optional): Whether this is the primary vehicle (default: false)
 */
exports.addVehicle = async (req, res) => {
    try {
        const { project_id, unit_id, plate_number, type, province, brand, color, is_active } = req.body;
        const user_id = req.user.id;

        // Validate required fields
        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ project_id",
            });
        }

        if (!unit_id) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ unit_id",
            });
        }

        if (!plate_number) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุหมายเลขทะเบียนรถ",
            });
        }

        // Check juristic access
        const access = await checkJuristicAccess(user_id, project_id);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        // Verify unit belongs to project
        const [unitInfo] = await db.promise().execute(
            "SELECT id FROM units WHERE id = ? AND project_id = ?",
            [unit_id, project_id]
        );

        if (unitInfo.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบยูนิตในโครงการนี้",
            });
        }

        // Check if plate number already exists in this unit
        const normalizedPlate = plate_number.trim().toUpperCase();
        const [existingVehicle] = await db.promise().execute(
            `SELECT id FROM ${VEHICLES_TABLE} WHERE unit_id = ? AND plate_number = ?`,
            [unit_id, normalizedPlate]
        );

        if (existingVehicle.length > 0) {
            return res.status(409).json({
                status: "error",
                message: "หมายเลขทะเบียนนี้ได้ถูกลงทะเบียนในยูนิตนี้แล้ว",
            });
        }

        // If this is active, set other vehicles to inactive
        if (is_active) {
            await db.promise().execute(
                `UPDATE ${VEHICLES_TABLE} SET is_active = FALSE WHERE unit_id = ?`,
                [unit_id]
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
                unit_id,
                normalizedPlate,
                vehicleType,
                province || null,
                brand || null,
                color || null,
                is_active || false,
            ]
        );

        console.log(`Vehicle added by juristic: ${normalizedPlate} to unit ${unit_id} by user ${user_id}`);

        res.status(201).json({
            status: "success",
            message: "เพิ่มยานพาหนะสำเร็จ",
            data: {
                vehicle_id: vehicleId,
                plate_number: normalizedPlate,
            },
        });
    } catch (error) {
        console.error("Error in addVehicle (juristic):", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการเพิ่มยานพาหนะ",
        });
    }
};

/**
 * @desc    Update a vehicle (for juristic)
 * @route   PUT /api/juristic/vehicles/:vehicleId
 * @access  Private (Juristic members only)
 * 
 * Body:
 * - project_id (required): Project ID
 * - plate_number (optional): Vehicle plate number
 * - province (optional): Province of registration
 * - brand (optional): Vehicle brand
 * - color (optional): Vehicle color
 * - is_active (optional): Whether this is the primary vehicle
 */
exports.updateVehicle = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { project_id, plate_number, type, province, brand, color, is_active } = req.body;
        const user_id = req.user.id;

        // Validate project_id
        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ project_id",
            });
        }

        // Check juristic access
        const access = await checkJuristicAccess(user_id, project_id);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        // Check if vehicle exists in this project
        const [existingVehicle] = await db.promise().execute(
            `SELECT id, unit_id FROM ${VEHICLES_TABLE} WHERE id = ? AND project_id = ?`,
            [vehicleId, project_id]
        );

        if (existingVehicle.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบยานพาหนะในโครงการนี้",
            });
        }

        const unitId = existingVehicle[0].unit_id;

        // If changing plate number, check for duplicates
        if (plate_number) {
            const normalizedPlate = plate_number.trim().toUpperCase();
            const [duplicatePlate] = await db.promise().execute(
                `SELECT id FROM ${VEHICLES_TABLE} WHERE unit_id = ? AND plate_number = ? AND id != ?`,
                [unitId, normalizedPlate, vehicleId]
            );

            if (duplicatePlate.length > 0) {
                return res.status(409).json({
                    status: "error",
                    message: "หมายเลขทะเบียนนี้ได้ถูกลงทะเบียนในยูนิตนี้แล้ว",
                });
            }
        }

        // If setting as active, set other vehicles in the unit to inactive
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
            return res.status(400).json({
                status: "error",
                message: "ไม่มีข้อมูลที่ต้องการอัปเดต",
            });
        }

        // Add updated_at if column exists
        updates.push("updated_at = NOW()");

        values.push(vehicleId);

        await db.promise().execute(
            `UPDATE ${VEHICLES_TABLE} SET ${updates.join(", ")} WHERE id = ?`,
            values
        );

        console.log(`Vehicle updated by juristic: ${vehicleId} by user ${user_id}`);

        res.status(200).json({
            status: "success",
            message: "อัปเดตยานพาหนะสำเร็จ",
        });
    } catch (error) {
        console.error("Error in updateVehicle (juristic):", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการอัปเดตยานพาหนะ",
        });
    }
};

/**
 * @desc    Delete a vehicle (for juristic)
 * @route   DELETE /api/juristic/vehicles/:vehicleId
 * @access  Private (Juristic Leader only)
 */
exports.deleteVehicle = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { project_id } = req.query;
        const user_id = req.user.id;

        // Validate project_id
        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ project_id",
            });
        }

        // Check juristic access
        const access = await checkJuristicAccess(user_id, project_id);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        // Check if vehicle exists in this project
        const [existingVehicle] = await db.promise().execute(
            `SELECT v.id, v.plate_number, u.unit_number 
             FROM ${VEHICLES_TABLE} v
             LEFT JOIN units u ON v.unit_id = u.id
             WHERE v.id = ? AND v.project_id = ?`,
            [vehicleId, project_id]
        );

        if (existingVehicle.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบยานพาหนะในโครงการนี้",
            });
        }

        const vehicleInfo = existingVehicle[0];

        // Delete the vehicle
        await db.promise().execute(`DELETE FROM ${VEHICLES_TABLE} WHERE id = ?`, [vehicleId]);

        console.log(`Vehicle deleted by juristic: ${vehicleInfo.plate_number} (Unit: ${vehicleInfo.unit_number}) by user ${user_id}`);

        res.status(200).json({
            status: "success",
            message: `ลบยานพาหนะ ${vehicleInfo.plate_number} สำเร็จ`,
        });
    } catch (error) {
        console.error("Error in deleteVehicle (juristic):", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการลบยานพาหนะ",
        });
    }
};

/**
 * @desc    Search vehicles across the project
 * @route   GET /api/juristic/vehicles/search
 * @access  Private (Juristic members only)
 * 
 * Query Params:
 * - project_id (required): Project ID
 * - q (required): Search query (plate number)
 * - limit (optional): Max results (default: 10, max: 50)
 */
exports.searchVehicles = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { project_id, q, limit = 10 } = req.query;

        // Validate required params
        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ project_id",
            });
        }

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุคำค้นหาอย่างน้อย 2 ตัวอักษร",
            });
        }

        // Check juristic access
        const access = await checkJuristicAccess(user_id, project_id);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const searchTerm = `%${q.trim()}%`;

        const [vehicles] = await db.promise().execute(
            `SELECT 
                v.id,
                v.unit_id,
                v.plate_number,
                v.type,
                v.province,
                v.brand,
                v.color,
                v.is_active,
                u.unit_number,
                z.name as zone_name
            FROM ${VEHICLES_TABLE} v
            LEFT JOIN units u ON v.unit_id = u.id
            LEFT JOIN zones z ON u.zone_id = z.id
            WHERE v.project_id = ? AND (
                v.plate_number LIKE ? OR
                v.brand LIKE ? OR
                u.unit_number LIKE ?
            )
            ORDER BY 
                CASE WHEN v.plate_number LIKE ? THEN 0 ELSE 1 END,
                v.plate_number ASC
            LIMIT ?`,
            [project_id, searchTerm, searchTerm, searchTerm, searchTerm, String(limitNum)]
        );

        res.status(200).json({
            status: "success",
            message: "ค้นหายานพาหนะสำเร็จ",
            data: vehicles,
            count: vehicles.length,
        });
    } catch (error) {
        console.error("Error in searchVehicles:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการค้นหายานพาหนะ",
        });
    }
};

/**
 * @desc    Get vehicle statistics for the project
 * @route   GET /api/juristic/vehicles/stats
 * @access  Private (Juristic members only)
 * 
 * Query Params:
 * - project_id (required): Project ID
 */
exports.getVehicleStats = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { project_id } = req.query;

        // Validate project_id
        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ project_id",
            });
        }

        // Check juristic access
        const access = await checkJuristicAccess(user_id, project_id);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        // Get total vehicles
        const [totalResult] = await db.promise().execute(
            `SELECT COUNT(*) as total FROM ${VEHICLES_TABLE} WHERE project_id = ?`,
            [project_id]
        );

        // Get active vehicles count
        const [activeResult] = await db.promise().execute(
            `SELECT COUNT(*) as total FROM ${VEHICLES_TABLE} WHERE project_id = ? AND is_active = TRUE`,
            [project_id]
        );

        // Get units with vehicles count
        const [unitsWithVehicles] = await db.promise().execute(
            `SELECT COUNT(DISTINCT unit_id) as total FROM ${VEHICLES_TABLE} WHERE project_id = ?`,
            [project_id]
        );

        // Get total units in project
        const [totalUnits] = await db.promise().execute(
            `SELECT COUNT(*) as total FROM units WHERE project_id = ?`,
            [project_id]
        );

        // Get vehicles by zone
        const [vehiclesByZone] = await db.promise().execute(
            `SELECT 
                z.id as zone_id,
                z.name as zone_name,
                COUNT(v.id) as vehicle_count
            FROM zones z
            LEFT JOIN units u ON z.id = u.zone_id
            LEFT JOIN ${VEHICLES_TABLE} v ON u.id = v.unit_id
            WHERE z.project_id = ?
            GROUP BY z.id, z.name
            ORDER BY vehicle_count DESC`,
            [project_id]
        );

        // Get recent vehicles (last 7 days)
        const [recentVehicles] = await db.promise().execute(
            `SELECT COUNT(*) as total 
             FROM ${VEHICLES_TABLE} 
             WHERE project_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
            [project_id]
        );

        res.status(200).json({
            status: "success",
            message: "ดึงข้อมูลสถิติยานพาหนะสำเร็จ",
            data: {
                total_vehicles: totalResult[0].total,
                active_vehicles: activeResult[0].total,
                inactive_vehicles: totalResult[0].total - activeResult[0].total,
                units_with_vehicles: unitsWithVehicles[0].total,
                total_units: totalUnits[0].total,
                units_without_vehicles: totalUnits[0].total - unitsWithVehicles[0].total,
                vehicles_by_zone: vehiclesByZone,
                recent_vehicles_7_days: recentVehicles[0].total,
            },
        });
    } catch (error) {
        console.error("Error in getVehicleStats:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลสถิติยานพาหนะ",
        });
    }
};

/**
 * @desc    Bulk update vehicles (set active status)
 * @route   PATCH /api/juristic/vehicles/bulk-update
 * @access  Private (Juristic Leader only)
 * 
 * Body:
 * - project_id (required): Project ID
 * - vehicle_ids (required): Array of vehicle IDs
 * - is_active (required): New active status
 */
exports.bulkUpdateVehicles = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { project_id, vehicle_ids, is_active } = req.body;

        // Validate required fields
        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ project_id",
            });
        }

        if (!vehicle_ids || !Array.isArray(vehicle_ids) || vehicle_ids.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ vehicle_ids เป็น array",
            });
        }

        if (is_active === undefined) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ is_active",
            });
        }

        // Check juristic access (Leader only for bulk operations)
        const access = await checkJuristicAccess(user_id, project_id);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        if (access.role !== "juristicLeader" && access.role !== "admin") {
            return res.status(403).json({
                status: "error",
                message: "เฉพาะหัวหน้านิติบุคคลเท่านั้นที่สามารถอัปเดตหลายรายการได้",
            });
        }

        // Update vehicles
        const placeholders = vehicle_ids.map(() => "?").join(", ");
        const [result] = await db.promise().execute(
            `UPDATE ${VEHICLES_TABLE} SET is_active = ?, updated_at = NOW() 
             WHERE id IN (${placeholders}) AND project_id = ?`,
            [is_active, ...vehicle_ids, project_id]
        );

        console.log(`Bulk update vehicles by juristic: ${vehicle_ids.length} vehicles by user ${user_id}`);

        res.status(200).json({
            status: "success",
            message: `อัปเดตยานพาหนะ ${result.affectedRows} รายการสำเร็จ`,
            data: {
                updated_count: result.affectedRows,
            },
        });
    } catch (error) {
        console.error("Error in bulkUpdateVehicles:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการอัปเดตยานพาหนะ",
        });
    }
};
