const db = require("../config/db");

/**
 * Guard Controller
 * จัดการข้อมูลเบอร์ป้อมยามและดึงเบอร์ตามโซนของผู้ใช้
 * 
 * Updated: 5 Jan 2025
 * - ดึงเบอร์ป้อมยามจากตาราง post ผ่าน zones.guard_post_id
 */

// =============================================
// GET /api/guards/my-guard-phone
// ดึงเบอร์ป้อมยามตามโซนของบ้านผู้ใช้ปัจจุบัน
// =============================================
exports.getMyGuardPhone = async (req, res) => {
    try {
        const userId = req.user.id;

        // ดึงข้อมูล unit ของผู้ใช้พร้อมเบอร์ป้อมยามจากตาราง post
        const [rows] = await db.promise().query(
            `SELECT 
                u.id as unit_id,
                u.unit_number,
                u.zone as zone_name_legacy,
                z.id as zone_id,
                z.name as zone_name,
                z.guard_post_id,
                z.description as guard_booth_info,
                gp.id as guard_post_id,
                gp.post_name as guard_post_name,
                gp.phone_1 as guard_phone,
                gp.phone_2 as guard_phone_2,
                gp.status as guard_post_status,
                p.name as project_name
            FROM unit_members um
            INNER JOIN units u ON um.unit_id = u.id
            LEFT JOIN zones z ON u.zone_id = z.id
            LEFT JOIN post gp ON z.guard_post_id = gp.id
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

        // ถ้าไม่มี guard_post_id ให้ลองหาจาก zone name (legacy)
        if (!data.guard_post_id && data.zone_name_legacy) {
            const [zoneFromLegacy] = await db.promise().query(
                `SELECT 
                    z.id as zone_id,
                    z.name as zone_name,
                    z.guard_post_id,
                    z.description as guard_booth_info,
                    gp.id as guard_post_id,
                    gp.post_name as guard_post_name,
                    gp.phone_1 as guard_phone,
                    gp.phone_2 as guard_phone_2,
                    gp.status as guard_post_status
                FROM zones z
                LEFT JOIN post gp ON z.guard_post_id = gp.id
                INNER JOIN units u ON u.project_id = z.project_id
                WHERE u.id = ? AND z.name = ?
                LIMIT 1`,
                [data.unit_id, data.zone_name_legacy]
            );

            if (zoneFromLegacy.length > 0) {
                const legacy = zoneFromLegacy[0];
                data.zone_id = legacy.zone_id;
                data.zone_name = legacy.zone_name;
                data.guard_post_id = legacy.guard_post_id;
                data.guard_post_name = legacy.guard_post_name;
                data.guard_phone = legacy.guard_phone;
                data.guard_phone_2 = legacy.guard_phone_2;
                data.guard_post_status = legacy.guard_post_status;
                data.guard_booth_info = legacy.guard_booth_info;
            }
        }

        res.json({
            status: "success",
            data: {
                unit_number: data.unit_number,
                zone_name: data.zone_name || data.zone_name_legacy,
                project_name: data.project_name,
                guard_booth_info: data.guard_booth_info,
                // ข้อมูลป้อมยาม (ถ้ามี)
                guard_post: data.guard_post_id ? {
                    id: data.guard_post_id,
                    name: data.guard_post_name,
                    phone_1: data.guard_phone,
                    phone_2: data.guard_phone_2,
                    status: data.guard_post_status
                } : null,
                // เบอร์โทร
                guard_phone: data.guard_phone || null,
                guard_phone_2: data.guard_phone_2 || null
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
// ดึงรายการป้อมยามทั้งหมดของโครงการ (พร้อมโซนที่ผูก)
// =============================================
exports.getGuardPhonesByProject = async (req, res) => {
    try {
        const { projectId } = req.params;

        // ดึงป้อมยามทั้งหมดพร้อมโซนที่ผูก
        const [guardPosts] = await db.promise().query(
            `SELECT 
                gp.id as guard_post_id,
                gp.post_name,
                gp.phone_1,
                gp.phone_2,
                gp.status,
                gp.created_at,
                (SELECT COUNT(*) FROM zones z WHERE z.guard_post_id = gp.id) as zone_count
            FROM post gp
            WHERE gp.project_id = ? AND gp.status = 'active'
            ORDER BY gp.post_name ASC`,
            [projectId]
        );

        // ดึงโซนของแต่ละป้อมยาม
        for (const post of guardPosts) {
            const [zones] = await db.promise().query(
                `SELECT 
                    z.id as zone_id,
                    z.name as zone_name,
                    z.code,
                    z.color,
                    (SELECT COUNT(*) FROM units u WHERE u.zone_id = z.id) as unit_count
                FROM zones z
                WHERE z.guard_post_id = ? AND z.status = 'active'
                ORDER BY z.sort_order ASC, z.name ASC`,
                [post.guard_post_id]
            );
            post.zones = zones;
        }

        // ดึงโซนที่ยังไม่ได้ผูกกับป้อมยาม (orphan zones)
        const [unlinkedZones] = await db.promise().query(
            `SELECT 
                z.id as zone_id,
                z.name as zone_name,
                z.code,
                z.color,
                z.description as guard_booth_info,
                (SELECT COUNT(*) FROM units u WHERE u.zone_id = z.id) as unit_count
            FROM zones z
            WHERE z.project_id = ? 
                AND z.status = 'active'
                AND (z.guard_post_id IS NULL OR z.guard_post_id = '')
            ORDER BY z.sort_order ASC, z.name ASC`,
            [projectId]
        );

        res.json({
            status: "success",
            data: {
                guard_posts: guardPosts,
                unlinked_zones: unlinkedZones
            },
            summary: {
                total_guard_posts: guardPosts.length,
                total_unlinked_zones: unlinkedZones.length
            }
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
// อัพเดต description ของโซน
// =============================================
exports.updateGuardPhone = async (req, res) => {
    try {
        const { zoneId } = req.params;
        const { description } = req.body;

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
                description = COALESCE(?, description),
                updated_at = NOW()
            WHERE id = ?`,
            [description, zoneId]
        );

        res.json({
            status: "success",
            message: "อัพเดตข้อมูลโซนสำเร็จ"
        });
    } catch (error) {
        console.error("Error updating zone:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการอัพเดตข้อมูลโซน"
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
                z.description as guard_booth_info,
                gp.id as guard_post_id,
                gp.post_name as guard_post_name,
                gp.phone_1 as guard_phone,
                gp.phone_2 as guard_phone_2,
                gp.status as guard_post_status,
                p.name as project_name
            FROM units u
            LEFT JOIN zones z ON u.zone_id = z.id
            LEFT JOIN post gp ON z.guard_post_id = gp.id
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
                guard_booth_info: data.guard_booth_info,
                // ข้อมูลป้อมยาม (ถ้ามี)
                guard_post: data.guard_post_id ? {
                    id: data.guard_post_id,
                    name: data.guard_post_name,
                    phone_1: data.guard_phone,
                    phone_2: data.guard_phone_2,
                    status: data.guard_post_status
                } : null,
                // เบอร์โทร
                guard_phone: data.guard_phone || null,
                guard_phone_2: data.guard_phone_2 || null
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

// =============================================
// GET /api/guards/post/:guardPostId
// ดึงข้อมูลป้อมยามตาม ID พร้อมรายการโซน
// =============================================
exports.getGuardPostDetail = async (req, res) => {
    try {
        const { guardPostId } = req.params;

        const [rows] = await db.promise().query(
            `SELECT 
                gp.id as guard_post_id,
                gp.post_name,
                gp.phone_1,
                gp.phone_2,
                gp.status,
                gp.created_at,
                p.name as project_name
            FROM post gp
            LEFT JOIN projects p ON gp.project_id = p.id
            WHERE gp.id = ?`,
            [guardPostId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลป้อมยาม"
            });
        }

        const guardPost = rows[0];

        // ดึงโซนที่ผูกกับป้อมยามนี้
        const [zones] = await db.promise().query(
            `SELECT 
                z.id as zone_id,
                z.name as zone_name,
                z.code,
                z.color,
                (SELECT COUNT(*) FROM units u WHERE u.zone_id = z.id) as unit_count
            FROM zones z
            WHERE z.guard_post_id = ?
            ORDER BY z.sort_order ASC, z.name ASC`,
            [guardPostId]
        );

        res.json({
            status: "success",
            data: {
                ...guardPost,
                zones: zones,
                zone_count: zones.length
            }
        });
    } catch (error) {
        console.error("Error fetching guard post detail:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลป้อมยาม"
        });
    }
};
