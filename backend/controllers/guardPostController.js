const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const Joi = require("joi");

/**
 * Guard Post Controller - CRUD Operations
 * จัดการข้อมูลป้อมยามของโครงการ
 * 
 * Security Features:
 * - Authorization: ตรวจสอบสิทธิ์ผู้ใช้ใน project
 * - Input Validation: ใช้ Joi
 * - SQL Injection Prevention: ใช้ Parameterized queries
 * - Error Handling: Try-Catch with proper HTTP status codes
 */

// =============================================
// Validation Schemas (Joi)
// =============================================

const createGuardPostSchema = Joi.object({
    project_id: Joi.string().uuid().required().messages({
        'string.guid': 'project_id ต้องเป็น UUID ที่ถูกต้อง',
        'any.required': 'กรุณาระบุ project_id'
    }),
    post_name: Joi.string().min(1).max(255).required().messages({
        'string.min': 'ชื่อป้อมยามต้องมีอย่างน้อย 1 ตัวอักษร',
        'string.max': 'ชื่อป้อมยามต้องไม่เกิน 255 ตัวอักษร',
        'any.required': 'กรุณาระบุชื่อป้อมยาม'
    }),
    phone_1: Joi.string().pattern(/^[0-9]{9,15}$/).allow(null, '').messages({
        'string.pattern.base': 'เบอร์โทรหลักต้องเป็นตัวเลข 9-15 หลัก'
    }),
    phone_2: Joi.string().pattern(/^[0-9]{9,15}$/).allow(null, '').messages({
        'string.pattern.base': 'เบอร์โทรสำรองต้องเป็นตัวเลข 9-15 หลัก'
    }),
    status: Joi.string().valid('active', 'inactive').default('active').messages({
        'any.only': 'status ต้องเป็น active หรือ inactive เท่านั้น'
    })
});

const updateGuardPostSchema = Joi.object({
    post_name: Joi.string().min(1).max(255).messages({
        'string.min': 'ชื่อป้อมยามต้องมีอย่างน้อย 1 ตัวอักษร',
        'string.max': 'ชื่อป้อมยามต้องไม่เกิน 255 ตัวอักษร'
    }),
    phone_1: Joi.string().pattern(/^[0-9]{9,15}$/).allow(null, '').messages({
        'string.pattern.base': 'เบอร์โทรหลักต้องเป็นตัวเลข 9-15 หลัก'
    }),
    phone_2: Joi.string().pattern(/^[0-9]{9,15}$/).allow(null, '').messages({
        'string.pattern.base': 'เบอร์โทรสำรองต้องเป็นตัวเลข 9-15 หลัก'
    }),
    status: Joi.string().valid('active', 'inactive').messages({
        'any.only': 'status ต้องเป็น active หรือ inactive เท่านั้น'
    })
});

const assignZonesSchema = Joi.object({
    zone_ids: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
        'array.min': 'กรุณาระบุอย่างน้อย 1 zone_id',
        'any.required': 'กรุณาระบุ zone_ids'
    })
});

// =============================================
// Helper: Check User Authorization for Project
// =============================================

/**
 * ตรวจสอบว่าผู้ใช้มีสิทธิ์ในโปรเจกต์หรือไม่ (ป้องกัน IDOR)
 * @param {string} userId - ID ของผู้ใช้
 * @param {string} projectId - ID ของโปรเจกต์
 * @returns {Promise<{authorized: boolean, role: string|null}>}
 */
const checkProjectAuthorization = async (userId, projectId) => {
    const query = `
        SELECT role 
        FROM project_members 
        WHERE user_id = ? AND project_id = ?
    `;
    const [rows] = await db.promise().query(query, [userId, projectId]);

    if (rows.length === 0) {
        return { authorized: false, role: null };
    }

    return { authorized: true, role: rows[0].role };
};

/**
 * ตรวจสอบว่าผู้ใช้มีสิทธิ์เป็น Juristic (juristicMember หรือ juristicLeader)
 */
const isJuristicRole = (role) => {
    return ['juristicMember', 'juristicLeader'].includes(role);
};

// =============================================
// GET /api/guard-posts?project_id=xxx
// ดึงรายการป้อมยามทั้งหมด (filter by project_id)
// =============================================
exports.getGuardPosts = async (req, res) => {
    try {
        const { project_id, status } = req.query;
        const userId = req.user?.id;

        // Validation: project_id required
        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ project_id"
            });
        }

        // Authorization check (IDOR Prevention)
        const authResult = await checkProjectAuthorization(userId, project_id);
        if (!authResult.authorized) {
            return res.status(403).json({
                status: "error",
                message: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลโปรเจกต์นี้"
            });
        }

        // Build query with parameterized queries (SQL Injection Prevention)
        let query = `
            SELECT 
                gp.*,
                (SELECT COUNT(*) FROM zones z WHERE z.guard_post_id = gp.id) as zone_count
            FROM post gp
            WHERE gp.project_id = ?
        `;
        const params = [project_id];

        if (status) {
            query += ` AND gp.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY gp.created_at DESC`;

        const [rows] = await db.promise().query(query, params);

        res.json({
            status: "success",
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error("Error fetching guard posts:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลป้อมยาม"
        });
    }
};

// =============================================
// GET /api/guard-posts/:id
// ดึงข้อมูลป้อมยามตาม ID
// =============================================
exports.getGuardPostById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        // Get guard post with project_id
        const [rows] = await db.promise().query(
            `SELECT 
                gp.*,
                p.name as project_name,
                (SELECT COUNT(*) FROM zones z WHERE z.guard_post_id = gp.id) as zone_count
            FROM post gp
            LEFT JOIN projects p ON gp.project_id = p.id
            WHERE gp.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลป้อมยาม"
            });
        }

        const guardPost = rows[0];

        // Authorization check (IDOR Prevention)
        const authResult = await checkProjectAuthorization(userId, guardPost.project_id);
        if (!authResult.authorized) {
            return res.status(403).json({
                status: "error",
                message: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลป้อมยามนี้"
            });
        }

        // Get zones linked to this guard post
        const [zones] = await db.promise().query(
            `SELECT id, name, code FROM zones WHERE guard_post_id = ?`,
            [id]
        );

        res.json({
            status: "success",
            data: {
                ...guardPost,
                zones: zones
            }
        });
    } catch (error) {
        console.error("Error fetching guard post:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลป้อมยาม"
        });
    }
};

// =============================================
// POST /api/guard-posts
// สร้างป้อมยามใหม่
// =============================================
exports.createGuardPost = async (req, res) => {
    try {
        const userId = req.user?.id;

        // Input Validation (Joi)
        const { error, value } = createGuardPostSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                status: "error",
                message: "ข้อมูลไม่ถูกต้อง",
                errors: error.details.map(detail => detail.message)
            });
        }

        const { project_id, post_name, phone_1, phone_2, status } = value;

        // Authorization check (IDOR Prevention)
        const authResult = await checkProjectAuthorization(userId, project_id);
        if (!authResult.authorized) {
            return res.status(403).json({
                status: "error",
                message: "คุณไม่มีสิทธิ์เข้าถึงโปรเจกต์นี้"
            });
        }

        // Check if user has juristic role
        if (!isJuristicRole(authResult.role)) {
            return res.status(403).json({
                status: "error",
                message: "เฉพาะนิติบุคคลเท่านั้นที่สามารถสร้างป้อมยามได้"
            });
        }

        // Check duplicate name in same project
        const [existing] = await db.promise().query(
            "SELECT id FROM post WHERE project_id = ? AND post_name = ?",
            [project_id, post_name]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                status: "error",
                message: "ชื่อป้อมยามนี้มีอยู่แล้วในโครงการ"
            });
        }

        const id = uuidv4();

        // Insert with parameterized query (SQL Injection Prevention)
        await db.promise().execute(
            `INSERT INTO post 
                (id, project_id, post_name, phone_1, phone_2, status)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [id, project_id, post_name, phone_1 || null, phone_2 || null, status]
        );

        res.status(201).json({
            status: "success",
            message: "สร้างป้อมยามสำเร็จ",
            data: { id, post_name, project_id }
        });
    } catch (error) {
        console.error("Error creating guard post:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการสร้างป้อมยาม"
        });
    }
};

// =============================================
// PUT /api/guard-posts/:id
// อัพเดตป้อมยาม
// =============================================
exports.updateGuardPost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        // Input Validation (Joi)
        const { error, value } = updateGuardPostSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                status: "error",
                message: "ข้อมูลไม่ถูกต้อง",
                errors: error.details.map(detail => detail.message)
            });
        }

        // Check if guard post exists
        const [existing] = await db.promise().query(
            "SELECT * FROM post WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลป้อมยาม"
            });
        }

        const guardPost = existing[0];

        // Authorization check (IDOR Prevention)
        const authResult = await checkProjectAuthorization(userId, guardPost.project_id);
        if (!authResult.authorized) {
            return res.status(403).json({
                status: "error",
                message: "คุณไม่มีสิทธิ์แก้ไขป้อมยามนี้"
            });
        }

        // Check if user has juristic role
        if (!isJuristicRole(authResult.role)) {
            return res.status(403).json({
                status: "error",
                message: "เฉพาะนิติบุคคลเท่านั้นที่สามารถแก้ไขป้อมยามได้"
            });
        }

        const { post_name, phone_1, phone_2, status } = value;

        // Check duplicate name if name changed
        if (post_name && post_name !== guardPost.post_name) {
            const [duplicate] = await db.promise().query(
                "SELECT id FROM post WHERE project_id = ? AND post_name = ? AND id != ?",
                [guardPost.project_id, post_name, id]
            );

            if (duplicate.length > 0) {
                return res.status(409).json({
                    status: "error",
                    message: "ชื่อป้อมยามนี้มีอยู่แล้วในโครงการ"
                });
            }
        }

        // Update with COALESCE to handle partial updates
        await db.promise().execute(
            `UPDATE post SET
                post_name = COALESCE(?, post_name),
                phone_1 = COALESCE(?, phone_1),
                phone_2 = COALESCE(?, phone_2),
                status = COALESCE(?, status)
            WHERE id = ?`,
            [post_name, phone_1, phone_2, status, id]
        );

        res.json({
            status: "success",
            message: "อัพเดตป้อมยามสำเร็จ"
        });
    } catch (error) {
        console.error("Error updating guard post:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการอัพเดตป้อมยาม"
        });
    }
};

// =============================================
// DELETE /api/guard-posts/:id
// ลบป้อมยาม
// =============================================
exports.deleteGuardPost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        // Check if guard post exists
        const [existing] = await db.promise().query(
            "SELECT * FROM post WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลป้อมยาม"
            });
        }

        const guardPost = existing[0];

        // Authorization check (IDOR Prevention)
        const authResult = await checkProjectAuthorization(userId, guardPost.project_id);
        if (!authResult.authorized) {
            return res.status(403).json({
                status: "error",
                message: "คุณไม่มีสิทธิ์ลบป้อมยามนี้"
            });
        }

        // Check if user has juristic role
        if (!isJuristicRole(authResult.role)) {
            return res.status(403).json({
                status: "error",
                message: "เฉพาะนิติบุคคลเท่านั้นที่สามารถลบป้อมยามได้"
            });
        }

        // Check if guard post has linked zones
        const [zones] = await db.promise().query(
            "SELECT COUNT(*) as count FROM zones WHERE guard_post_id = ?",
            [id]
        );

        if (zones[0].count > 0) {
            return res.status(400).json({
                status: "error",
                message: `ไม่สามารถลบป้อมยามได้ เนื่องจากมีโซน ${zones[0].count} โซนที่ผูกอยู่`
            });
        }

        await db.promise().execute("DELETE FROM post WHERE id = ?", [id]);

        res.json({
            status: "success",
            message: "ลบป้อมยามสำเร็จ"
        });
    } catch (error) {
        console.error("Error deleting guard post:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการลบป้อมยาม"
        });
    }
};

// =============================================
// PUT /api/guard-posts/:id/zones
// ผูกโซนเข้ากับป้อมยาม (bulk update)
// =============================================
exports.assignZonesToGuardPost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        // Input Validation (Joi)
        const { error, value } = assignZonesSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                status: "error",
                message: "ข้อมูลไม่ถูกต้อง",
                errors: error.details.map(detail => detail.message)
            });
        }

        const { zone_ids } = value;

        // Check if guard post exists
        const [guardPost] = await db.promise().query(
            "SELECT * FROM post WHERE id = ?",
            [id]
        );

        if (guardPost.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลป้อมยาม"
            });
        }

        // Authorization check (IDOR Prevention)
        const authResult = await checkProjectAuthorization(userId, guardPost[0].project_id);
        if (!authResult.authorized) {
            return res.status(403).json({
                status: "error",
                message: "คุณไม่มีสิทธิ์แก้ไขป้อมยามนี้"
            });
        }

        // Check if user has juristic role
        if (!isJuristicRole(authResult.role)) {
            return res.status(403).json({
                status: "error",
                message: "เฉพาะนิติบุคคลเท่านั้นที่สามารถผูกโซนได้"
            });
        }

        // Verify all zones belong to the same project
        const placeholders = zone_ids.map(() => "?").join(",");
        const [zones] = await db.promise().query(
            `SELECT id, name, project_id FROM zones WHERE id IN (${placeholders})`,
            zone_ids
        );

        // Check if all zones found
        if (zones.length !== zone_ids.length) {
            return res.status(404).json({
                status: "error",
                message: "บางโซนไม่พบในระบบ"
            });
        }

        // Check if all zones belong to the same project
        const invalidZones = zones.filter(z => z.project_id !== guardPost[0].project_id);
        if (invalidZones.length > 0) {
            return res.status(400).json({
                status: "error",
                message: "บางโซนไม่ได้อยู่ในโครงการเดียวกับป้อมยาม"
            });
        }

        // Update zones to link with this guard post
        await db.promise().execute(
            `UPDATE zones SET guard_post_id = ? WHERE id IN (${placeholders})`,
            [id, ...zone_ids]
        );

        res.json({
            status: "success",
            message: `ผูกโซน ${zone_ids.length} โซนเข้ากับป้อม "${guardPost[0].post_name}" สำเร็จ`,
            data: {
                guard_post_id: id,
                zone_count: zone_ids.length,
                zones: zones.map(z => ({ id: z.id, name: z.name }))
            }
        });
    } catch (error) {
        console.error("Error assigning zones to guard post:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการผูกโซนเข้ากับป้อมยาม"
        });
    }
};

// =============================================
// DELETE /api/guard-posts/:id/zones
// ยกเลิกการผูกโซนทั้งหมดจากป้อมยาม
// =============================================
exports.unassignAllZones = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        // Check if guard post exists
        const [guardPost] = await db.promise().query(
            "SELECT * FROM post WHERE id = ?",
            [id]
        );

        if (guardPost.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลป้อมยาม"
            });
        }

        // Authorization check (IDOR Prevention)
        const authResult = await checkProjectAuthorization(userId, guardPost[0].project_id);
        if (!authResult.authorized) {
            return res.status(403).json({
                status: "error",
                message: "คุณไม่มีสิทธิ์แก้ไขป้อมยามนี้"
            });
        }

        // Check if user has juristic role
        if (!isJuristicRole(authResult.role)) {
            return res.status(403).json({
                status: "error",
                message: "เฉพาะนิติบุคคลเท่านั้นที่สามารถยกเลิกการผูกโซนได้"
            });
        }

        // Remove guard_post_id from all linked zones
        const result = await db.promise().execute(
            `UPDATE zones SET guard_post_id = NULL WHERE guard_post_id = ?`,
            [id]
        );

        res.json({
            status: "success",
            message: `ยกเลิกการผูกโซนจากป้อม "${guardPost[0].post_name}" สำเร็จ`,
            data: {
                unlinked_count: result[0].affectedRows
            }
        });
    } catch (error) {
        console.error("Error unassigning zones from guard post:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการยกเลิกการผูกโซน"
        });
    }
};

// =============================================
// GET /api/guard-posts/:id/zones
// ดึงรายการโซนที่ผูกกับป้อมยาม
// =============================================
exports.getZonesInGuardPost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        // Check if guard post exists
        const [guardPost] = await db.promise().query(
            "SELECT * FROM post WHERE id = ?",
            [id]
        );

        if (guardPost.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลป้อมยาม"
            });
        }

        // Authorization check (IDOR Prevention)
        const authResult = await checkProjectAuthorization(userId, guardPost[0].project_id);
        if (!authResult.authorized) {
            return res.status(403).json({
                status: "error",
                message: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลป้อมยามนี้"
            });
        }

        const [rows] = await db.promise().query(
            `SELECT 
                z.id,
                z.name,
                z.code,
                z.color,
                z.status,
                (SELECT COUNT(*) FROM units u WHERE u.zone_id = z.id) as unit_count
            FROM zones z
            WHERE z.guard_post_id = ?
            ORDER BY z.sort_order ASC, z.name ASC`,
            [id]
        );

        res.json({
            status: "success",
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error("Error fetching zones in guard post:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลโซนในป้อมยาม"
        });
    }
};

// =============================================
// PUT /api/zones/:zoneId/guard-post
// ผูกป้อมยามเข้ากับโซน (Update guard_post_id ในตาราง zones)
// =============================================
exports.assignGuardPostToZone = async (req, res) => {
    try {
        const { zoneId } = req.params;
        const { guard_post_id } = req.body;
        const userId = req.user?.id;

        // Check if zone exists
        const [zone] = await db.promise().query(
            "SELECT * FROM zones WHERE id = ?",
            [zoneId]
        );

        if (zone.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบข้อมูลโซน"
            });
        }

        // Authorization check (IDOR Prevention)
        const authResult = await checkProjectAuthorization(userId, zone[0].project_id);
        if (!authResult.authorized) {
            return res.status(403).json({
                status: "error",
                message: "คุณไม่มีสิทธิ์แก้ไขโซนนี้"
            });
        }

        // Check if user has juristic role
        if (!isJuristicRole(authResult.role)) {
            return res.status(403).json({
                status: "error",
                message: "เฉพาะนิติบุคคลเท่านั้นที่สามารถผูกป้อมยามได้"
            });
        }

        // If guard_post_id is provided, verify it exists and belongs to same project
        if (guard_post_id) {
            const [guardPost] = await db.promise().query(
                "SELECT * FROM post WHERE id = ? AND project_id = ?",
                [guard_post_id, zone[0].project_id]
            );

            if (guardPost.length === 0) {
                return res.status(404).json({
                    status: "error",
                    message: "ไม่พบข้อมูลป้อมยามในโครงการนี้"
                });
            }
        }

        // Update zone's guard_post_id
        await db.promise().execute(
            `UPDATE zones SET guard_post_id = ? WHERE id = ?`,
            [guard_post_id || null, zoneId]
        );

        res.json({
            status: "success",
            message: guard_post_id
                ? `ผูกป้อมยามเข้ากับโซน "${zone[0].name}" สำเร็จ`
                : `ยกเลิกการผูกป้อมยามจากโซน "${zone[0].name}" สำเร็จ`
        });
    } catch (error) {
        console.error("Error assigning guard post to zone:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการผูกป้อมยามเข้ากับโซน"
        });
    }
};
