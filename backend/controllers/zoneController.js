const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

/**
 * Zone Controller - CRUD Operations
 * จัดการข้อมูลโซนของโครงการ
 */

// =============================================
// GET /api/zones?project_id=xxx
// ดึงรายการโซนทั้งหมด (filter by project_id)
// =============================================
exports.getZones = async (req, res) => {
    try {
        const { project_id, status } = req.query;

        let query = `
      SELECT 
        z.*,
        (SELECT COUNT(*) FROM units u WHERE u.zone_id = z.id) as unit_count
      FROM zones z
      WHERE 1=1
    `;
        const params = [];

        if (project_id) {
            query += ` AND z.project_id = ?`;
            params.push(project_id);
        }

        if (status) {
            query += ` AND z.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY z.sort_order ASC, z.name ASC`;

        const [rows] = await db.promise().query(query, params);

        res.json({
            status: "success",
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error("Error fetching zones:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลโซน"
        });
    }
};

// =============================================
// GET /api/zones/:id
// ดึงข้อมูลโซนตาม ID
// =============================================
exports.getZoneById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.promise().query(
            `SELECT 
        z.*,
        p.name as project_name,
        (SELECT COUNT(*) FROM units u WHERE u.zone_id = z.id) as unit_count
      FROM zones z
      LEFT JOIN projects p ON z.project_id = p.id
      WHERE z.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลโซน"
            });
        }

        res.json({
            status: "success",
            data: rows[0]
        });
    } catch (error) {
        console.error("Error fetching zone:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลโซน"
        });
    }
};

// =============================================
// POST /api/zones
// สร้างโซนใหม่
// =============================================
exports.createZone = async (req, res) => {
    try {
        const {
            project_id,
            name,
            code,
            description,
            color,
            sort_order,
            guard_post_id,
            status = "active"
        } = req.body;

        // Validation
        if (!project_id || !name) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ project_id และ name"
            });
        }

        // Check duplicate name in same project
        const [existing] = await db.promise().query(
            "SELECT id FROM zones WHERE project_id = ? AND name = ?",
            [project_id, name]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                status: "error",
                message: "ชื่อโซนนี้มีอยู่แล้วในโครงการ"
            });
        }

        const id = uuidv4();

        await db.promise().execute(
            `INSERT INTO zones 
        (id, project_id, name, code, description, color, sort_order, guard_post_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, project_id, name, code || null, description || null, color || null, sort_order || 0, guard_post_id || null, status]
        );

        res.status(201).json({
            status: "success",
            message: "สร้างโซนสำเร็จ",
            data: { id, name, project_id }
        });
    } catch (error) {
        console.error("Error creating zone:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการสร้างโซน"
        });
    }
};

// =============================================
// PUT /api/zones/:id
// อัพเดตโซน
// =============================================
exports.updateZone = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            code,
            description,
            color,
            sort_order,
            guard_post_id,
            status
        } = req.body;

        // Check if zone exists
        const [existing] = await db.promise().query(
            "SELECT * FROM zones WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลโซน"
            });
        }

        const zone = existing[0];

        // Check duplicate name if name changed
        if (name && name !== zone.name) {
            const [duplicate] = await db.promise().query(
                "SELECT id FROM zones WHERE project_id = ? AND name = ? AND id != ?",
                [zone.project_id, name, id]
            );

            if (duplicate.length > 0) {
                return res.status(409).json({
                    status: "error",
                    message: "ชื่อโซนนี้มีอยู่แล้วในโครงการ"
                });
            }
        }

        await db.promise().execute(
            `UPDATE zones SET
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        description = COALESCE(?, description),
        color = COALESCE(?, color),
        sort_order = COALESCE(?, sort_order),
        guard_post_id = COALESCE(?, guard_post_id),
        status = COALESCE(?, status),
        updated_at = NOW()
      WHERE id = ?`,
            [name, code, description, color, sort_order, guard_post_id, status, id]
        );

        res.json({
            status: "success",
            message: "อัพเดตโซนสำเร็จ"
        });
    } catch (error) {
        console.error("Error updating zone:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการอัพเดตโซน"
        });
    }
};

// =============================================
// DELETE /api/zones/:id
// ลบโซน
// =============================================
exports.deleteZone = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if zone exists
        const [existing] = await db.promise().query(
            "SELECT * FROM zones WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลโซน"
            });
        }

        // Check if zone has units
        const [units] = await db.promise().query(
            "SELECT COUNT(*) as count FROM units WHERE zone_id = ?",
            [id]
        );

        if (units[0].count > 0) {
            return res.status(400).json({
                status: "error",
                message: `ไม่สามารถลบโซนได้ เนื่องจากมีบ้าน ${units[0].count} หลังอยู่ในโซนนี้`
            });
        }

        await db.promise().execute("DELETE FROM zones WHERE id = ?", [id]);

        res.json({
            status: "success",
            message: "ลบโซนสำเร็จ"
        });
    } catch (error) {
        console.error("Error deleting zone:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการลบโซน"
        });
    }
};

// =============================================
// PUT /api/zones/:id/units
// ผูกบ้านเข้ากับโซน (bulk update)
// =============================================
exports.assignUnitsToZone = async (req, res) => {
    try {
        const { id } = req.params;
        const { unit_ids } = req.body; // Array of unit IDs

        if (!Array.isArray(unit_ids) || unit_ids.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ unit_ids เป็น array"
            });
        }

        // Check if zone exists and get zone name
        const [zone] = await db.promise().query(
            "SELECT * FROM zones WHERE id = ?",
            [id]
        );

        if (zone.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลโซน"
            });
        }

        const zoneName = zone[0].name; // ดึงชื่อโซนมาด้วย

        // Update units - อัพเดตทั้ง zone_id และ zone (legacy column)
        const placeholders = unit_ids.map(() => "?").join(",");
        await db.promise().execute(
            `UPDATE units SET zone_id = ?, zone = ? WHERE id IN (${placeholders})`,
            [id, zoneName, ...unit_ids]
        );

        res.json({
            status: "success",
            message: `ผูกบ้าน ${unit_ids.length} หลังเข้ากับโซน "${zoneName}" สำเร็จ`
        });
    } catch (error) {
        console.error("Error assigning units to zone:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการผูกบ้านเข้ากับโซน"
        });
    }
};

// =============================================
// GET /api/zones/:id/units
// ดึงรายการบ้านในโซน
// =============================================
exports.getUnitsInZone = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.promise().query(
            `SELECT 
        u.id,
        u.unit_number,
        u.building,
        u.floor,
        u.area_sqm,
        u.status
      FROM units u
      WHERE u.zone_id = ?
      ORDER BY u.unit_number ASC`,
            [id]
        );

        res.json({
            status: "success",
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error("Error fetching units in zone:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลบ้านในโซน"
        });
    }
};

// =============================================
// POST /api/zones/match-by-name
// Auto-match units to zones by fuzzy name matching
// =============================================
exports.matchByName = async (req, res) => {
    try {
        const { project_id, dry_run = false } = req.body;

        // Validation
        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ project_id"
            });
        }

        // =============================================
        // Step 1: Get all active zones for this project
        // =============================================
        const [zones] = await db.promise().query(
            `SELECT id, name, code, sort_order 
             FROM zones 
             WHERE project_id = ? AND status = 'active'
             ORDER BY sort_order ASC, name ASC`,
            [project_id]
        );

        if (zones.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบโซนในโครงการนี้"
            });
        }

        // =============================================
        // Step 2: Get unlinked units (zone_id is NULL but zone has value)
        // =============================================
        const [unlinkedUnits] = await db.promise().query(
            `SELECT id, unit_number, zone 
             FROM units 
             WHERE project_id = ? 
               AND zone IS NOT NULL 
               AND zone != ''
               AND zone_id IS NULL`,
            [project_id]
        );

        // Get count of already linked units
        const [alreadyLinkedResult] = await db.promise().query(
            `SELECT COUNT(*) as count 
             FROM units 
             WHERE project_id = ? AND zone_id IS NOT NULL`,
            [project_id]
        );
        const alreadyLinked = alreadyLinkedResult[0].count;

        if (unlinkedUnits.length === 0) {
            return res.json({
                status: "success",
                message: "ไม่มี unit ที่ต้อง match",
                data: {
                    matched: 0,
                    unmatched: 0,
                    already_linked: alreadyLinked,
                    details: [],
                    unmatched_values: []
                }
            });
        }

        // =============================================
        // Step 3: Build zone matching patterns
        // =============================================

        /**
         * Normalize function: ลบ spaces, hyphens, underscores และ prefix "zone"
         * @param {string} str - input string
         * @returns {string} - normalized lowercase string
         */
        const normalize = (str) => {
            if (!str) return '';
            return str
                .toLowerCase()
                .replace(/[\s\-_\.]/g, '')  // Remove spaces, hyphens, underscores, dots
                .replace(/^zone/i, '');      // Remove "zone" prefix
        };

        /**
         * Extract suffix: ดึงตัวอักษร/ตัวเลขท้ายสุด
         * @param {string} str - input string  
         * @returns {string} - last alphanumeric character
         */
        const extractSuffix = (str) => {
            if (!str) return '';
            const normalized = normalize(str);
            return normalized.slice(-1); // ตัวสุดท้าย
        };

        // Create zone lookup map with multiple matching patterns
        const zonePatterns = zones.map(zone => ({
            zone_id: zone.id,
            zone_name: zone.name,
            zone_code: zone.code,
            sort_order: zone.sort_order,
            // Generate all possible matching patterns
            patterns: {
                exact: zone.name.toLowerCase(),
                normalized: normalize(zone.name),
                code: zone.code ? zone.code.toLowerCase() : null,
                suffix: extractSuffix(zone.name)
            },
            matched_units: [],
            matched_patterns: new Set()
        }));

        // =============================================
        // Step 4: Match each unit to a zone
        // =============================================
        const matchedUnits = [];
        const unmatchedUnits = [];
        const unmatchedValues = new Set();

        for (const unit of unlinkedUnits) {
            const unitZone = unit.zone;
            const unitZoneLower = unitZone.toLowerCase();
            const unitZoneNormalized = normalize(unitZone);
            const unitZoneSuffix = extractSuffix(unitZone);

            let matchedZone = null;
            let matchType = null;

            // Priority 1: Exact match (case-insensitive)
            matchedZone = zonePatterns.find(z => z.patterns.exact === unitZoneLower);
            if (matchedZone) {
                matchType = 'exact';
            }

            // Priority 2: Normalized match
            if (!matchedZone) {
                matchedZone = zonePatterns.find(z => z.patterns.normalized === unitZoneNormalized);
                if (matchedZone) {
                    matchType = 'normalized';
                }
            }

            // Priority 3: Code match
            if (!matchedZone) {
                matchedZone = zonePatterns.find(z =>
                    z.patterns.code && z.patterns.code === unitZoneLower
                );
                if (matchedZone) {
                    matchType = 'code';
                }
            }

            // Priority 4: Suffix match (single character)
            if (!matchedZone && unitZoneNormalized.length === 1) {
                matchedZone = zonePatterns.find(z => z.patterns.suffix === unitZoneNormalized);
                if (matchedZone) {
                    matchType = 'suffix';
                }
            }

            // Priority 5: Contains match (zone name contains unit zone or vice versa)
            if (!matchedZone) {
                matchedZone = zonePatterns.find(z =>
                    z.patterns.normalized.includes(unitZoneNormalized) ||
                    unitZoneNormalized.includes(z.patterns.normalized)
                );
                if (matchedZone) {
                    matchType = 'contains';
                }
            }

            if (matchedZone) {
                matchedZone.matched_units.push({
                    unit_id: unit.id,
                    unit_number: unit.unit_number,
                    original_zone: unitZone,
                    match_type: matchType
                });
                matchedZone.matched_patterns.add(unitZone);
                matchedUnits.push({
                    unit_id: unit.id,
                    zone_id: matchedZone.zone_id,
                    zone_name: matchedZone.zone_name
                });
            } else {
                unmatchedUnits.push(unit);
                unmatchedValues.add(unitZone);
            }
        }

        // =============================================
        // Step 5: Update database (if not dry_run)
        // =============================================
        if (!dry_run && matchedUnits.length > 0) {
            // Use transaction for safety
            const connection = await db.promise().getConnection();
            try {
                await connection.beginTransaction();

                for (const match of matchedUnits) {
                    await connection.execute(
                        `UPDATE units SET zone_id = ?, zone = ? WHERE id = ?`,
                        [match.zone_id, match.zone_name, match.unit_id]
                    );
                }

                await connection.commit();
            } catch (updateError) {
                await connection.rollback();
                throw updateError;
            } finally {
                connection.release();
            }
        }

        // =============================================
        // Step 6: Prepare response
        // =============================================
        const details = zonePatterns
            .filter(z => z.matched_units.length > 0)
            .map(z => ({
                zone_id: z.zone_id,
                zone_name: z.zone_name,
                zone_code: z.zone_code,
                unit_count: z.matched_units.length,
                matched_patterns: Array.from(z.matched_patterns),
                units: z.matched_units.slice(0, 10) // Limit to first 10 for response size
            }));

        const response = {
            status: "success",
            message: dry_run
                ? `[DRY RUN] จะ match ${matchedUnits.length} units เข้ากับ zones`
                : `Match ${matchedUnits.length} units เข้ากับ zones สำเร็จ`,
            data: {
                matched: matchedUnits.length,
                unmatched: unmatchedUnits.length,
                already_linked: alreadyLinked,
                dry_run: dry_run,
                details: details,
                unmatched_values: Array.from(unmatchedValues)
            }
        };

        // Log for audit
        console.log(`[Zone Match] Project: ${project_id}, Matched: ${matchedUnits.length}, Unmatched: ${unmatchedUnits.length}, Dry Run: ${dry_run}`);

        res.json(response);

    } catch (error) {
        console.error("Error in matchByName:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการ match zones",
            error: error.message
        });
    }
};
