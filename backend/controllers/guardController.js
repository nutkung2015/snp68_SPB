const db = require("../config/db");

/**
 * Guard Controller
 * จัดการข้อมูลเบอร์ป้อมยามและดึงเบอร์ตามโซนของผู้ใช้
 */

// =============================================
// GET /api/guards/my-guard-phone
// ดึงเบอร์ป้อมยามตามโซนของบ้านผู้ใช้ปัจจุบัน
// =============================================
exports.getMyGuardPhone = async (req, res) => {
    try {
        const userId = req.user.id;

        // ดึงข้อมูล unit ของผู้ใช้พร้อมเบอร์ป้อมยาม
        const [rows] = await db.promise().query(
            `SELECT 
        u.id as unit_id,
        u.unit_number,
        u.zone as zone_name_legacy,
        z.id as zone_id,
        z.name as zone_name,
        z.guard_phone,
        z.guard_phone_2,
        z.description as guard_booth_info,
        p.name as project_name
      FROM unit_members um
      INNER JOIN units u ON um.unit_id = u.id
      LEFT JOIN zones z ON u.zone_id = z.id
      LEFT JOIN projects p ON u.project_id = p.id
      WHERE um.user_id = ?
      LIMIT 1`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลบ้านของคุณ"
            });
        }

        const data = rows[0];

        // ถ้าไม่มี zone_id แต่มี zone (legacy) ให้ลองหาจาก zone name
        if (!data.zone_id && data.zone_name_legacy) {
            const [zoneFromLegacy] = await db.promise().query(
                `SELECT z.guard_phone, z.guard_phone_2, z.description as guard_booth_info, z.name as zone_name
        FROM zones z
        INNER JOIN units u ON u.project_id = z.project_id
        WHERE u.id = ? AND z.name = ?
        LIMIT 1`,
                [data.unit_id, data.zone_name_legacy]
            );

            if (zoneFromLegacy.length > 0) {
                data.guard_phone = zoneFromLegacy[0].guard_phone;
                data.guard_phone_2 = zoneFromLegacy[0].guard_phone_2;
                data.guard_booth_info = zoneFromLegacy[0].guard_booth_info;
                data.zone_name = zoneFromLegacy[0].zone_name;
            }
        }

        res.json({
            status: "success",
            data: {
                unit_number: data.unit_number,
                zone_name: data.zone_name || data.zone_name_legacy,
                project_name: data.project_name,
                guard_phone: data.guard_phone,
                guard_phone_2: data.guard_phone_2,
                guard_booth_info: data.guard_booth_info
            }
        });
    } catch (error) {
        console.error("Error fetching guard phone:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงเบอร์ป้อมยาม"
        });
    }
};

// =============================================
// GET /api/guards/project/:projectId
// ดึงเบอร์ป้อมยามทั้งหมดของโครงการ
// =============================================
exports.getGuardPhonesByProject = async (req, res) => {
    try {
        const { projectId } = req.params;

        const [rows] = await db.promise().query(
            `SELECT 
        z.id as zone_id,
        z.name as zone_name,
        z.guard_phone,
        z.guard_phone_2,
        z.description as guard_booth_info,
        z.color,
        (SELECT COUNT(*) FROM units u WHERE u.zone_id = z.id) as unit_count
      FROM zones z
      WHERE z.project_id = ? AND z.status = 'active'
      ORDER BY z.sort_order ASC, z.name ASC`,
            [projectId]
        );

        res.json({
            status: "success",
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error("Error fetching guard phones:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลเบอร์ป้อมยาม"
        });
    }
};

// =============================================
// PUT /api/guards/zone/:zoneId
// อัพเดตเบอร์ป้อมยามของโซน
// =============================================
exports.updateGuardPhone = async (req, res) => {
    try {
        const { zoneId } = req.params;
        const { guard_phone, guard_phone_2, description } = req.body;

        // Check if zone exists
        const [existing] = await db.promise().query(
            "SELECT * FROM zones WHERE id = ?",
            [zoneId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลโซน"
            });
        }

        await db.promise().execute(
            `UPDATE zones SET
        guard_phone = ?,
        guard_phone_2 = ?,
        description = COALESCE(?, description),
        updated_at = NOW()
      WHERE id = ?`,
            [guard_phone || null, guard_phone_2 || null, description, zoneId]
        );

        res.json({
            status: "success",
            message: "อัพเดตเบอร์ป้อมยามสำเร็จ"
        });
    } catch (error) {
        console.error("Error updating guard phone:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการอัพเดตเบอร์ป้อมยาม"
        });
    }
};

// =============================================
// GET /api/guards/unit/:unitId
// ดึงเบอร์ป้อมยามตาม unit ID
// =============================================
exports.getGuardPhoneByUnit = async (req, res) => {
    try {
        const { unitId } = req.params;

        const [rows] = await db.promise().query(
            `SELECT 
        u.id as unit_id,
        u.unit_number,
        z.id as zone_id,
        z.name as zone_name,
        z.guard_phone,
        z.guard_phone_2,
        z.description as guard_booth_info,
        p.name as project_name
      FROM units u
      LEFT JOIN zones z ON u.zone_id = z.id
      LEFT JOIN projects p ON u.project_id = p.id
      WHERE u.id = ?`,
            [unitId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลบ้าน"
            });
        }

        const data = rows[0];

        res.json({
            status: "success",
            data: {
                unit_id: data.unit_id,
                unit_number: data.unit_number,
                zone_name: data.zone_name,
                project_name: data.project_name,
                guard_phone: data.guard_phone,
                guard_phone_2: data.guard_phone_2,
                guard_booth_info: data.guard_booth_info
            }
        });
    } catch (error) {
        console.error("Error fetching guard phone by unit:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงเบอร์ป้อมยาม"
        });
    }
};
