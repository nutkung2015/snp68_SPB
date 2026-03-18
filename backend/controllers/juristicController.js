const db = require("../config/db");

/**
 * GET /api/juristic/members
 * Query params: project_id (optional)
 * 
 * ดึงข้อมูล user ที่มี role = juristicMember หรือ juristicLeader
 * จาก project_members โดย join กับ users table
 * 
 * Response shape:
 * {
 *   status: 'success',
 *   data: {
 *     members: [{ id, name, phone, role, project_id }],
 *     count: <number>
 *   }
 * }
 */
exports.getJuristicMembers = async (req, res) => {
    try {
        const { project_id } = req.query;

        let query = `
      SELECT 
        u.id,
        u.full_name AS name,
        u.phone,
        pm.role,
        pm.project_id
      FROM project_members pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.role IN ('juristicMember', 'juristicLeader', 'security')
    `;

        const params = [];

        // ถ้ามีการส่ง project_id เข้ามา ให้ filter ตาม project_id
        if (project_id) {
            query += ` AND pm.project_id = ?`;
            params.push(project_id);
        }

        query += ` ORDER BY pm.role DESC, u.full_name ASC`;

        const [rows] = await db.promise().query(query, params);

        const members = rows.map((r) => ({
            id: r.id,
            name: r.name,
            phone: r.phone,
            role: r.role,
            project_id: r.project_id,
        }));

        res.json({
            status: "success",
            data: {
                members,
                count: members.length,
            },
        });
    } catch (error) {
        console.error("Error fetching juristic members:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลสมาชิกนิติบุคคล",
        });
    }
};

/**
 * DELETE /api/juristic/members/:memberId
 * Query params: project_id (required)
 * 
 * ลบสมาชิกนิติบุคคลออกจาก project_members
 * เฉพาะ juristicLeader เท่านั้นที่สามารถลบได้
 * 
 * Response shape:
 * {
 *   status: 'success',
 *   message: 'ลบสมาชิกเรียบร้อยแล้ว'
 * }
 */
exports.deleteJuristicMember = async (req, res) => {
    try {
        const { memberId } = req.params;
        const { project_id } = req.query;
        const requesterId = req.user?.id;

        // ตรวจสอบว่ามี project_id หรือไม่
        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ project_id",
            });
        }

        // ตรวจสอบว่ามี memberId หรือไม่
        if (!memberId) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ memberId",
            });
        }

        // ตรวจสอบว่า requester เป็น juristicLeader ของ project นี้หรือไม่
        const [requesterRoles] = await db.promise().query(
            `SELECT role FROM project_members 
             WHERE user_id = ? AND project_id = ?`,
            [requesterId, project_id]
        );

        if (requesterRoles.length === 0) {
            return res.status(403).json({
                status: "error",
                message: "คุณไม่ได้เป็นสมาชิกของโครงการนี้",
            });
        }

        const requesterRole = requesterRoles[0].role;

        if (requesterRole !== "juristicLeader") {
            return res.status(403).json({
                status: "error",
                message: "เฉพาะหัวหน้านิติบุคคลเท่านั้นที่สามารถลบสมาชิกได้",
            });
        }

        // ตรวจสอบว่า member ที่จะลบมีอยู่จริงหรือไม่
        const [memberExists] = await db.promise().query(
            `SELECT pm.id, pm.role, u.full_name 
             FROM project_members pm
             INNER JOIN users u ON u.id = pm.user_id
             WHERE pm.user_id = ? AND pm.project_id = ?`,
            [memberId, project_id]
        );

        if (memberExists.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบสมาชิกที่ต้องการลบ",
            });
        }

        const memberToDelete = memberExists[0];

        // ป้องกันการลบ juristicLeader ตัวเอง
        if (memberId === requesterId) {
            return res.status(400).json({
                status: "error",
                message: "ไม่สามารถลบตัวเองออกจากโครงการได้",
            });
        }

        // ป้องกันการลบ juristicLeader คนอื่น (ถ้ามีหลายคน)
        if (memberToDelete.role === "juristicLeader") {
            return res.status(400).json({
                status: "error",
                message: "ไม่สามารถลบหัวหน้านิติบุคคลได้",
            });
        }

        // ลบ member ออกจาก project_members
        await db.promise().query(
            `DELETE FROM project_members WHERE user_id = ? AND project_id = ?`,
            [memberId, project_id]
        );

        console.log(`Juristic member deleted: ${memberToDelete.full_name} (ID: ${memberId}) from project ${project_id} by user ${requesterId}`);

        res.json({
            status: "success",
            message: `ลบ ${memberToDelete.full_name} ออกจากโครงการเรียบร้อยแล้ว`,
        });
    } catch (error) {
        console.error("Error deleting juristic member:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการลบสมาชิกนิติบุคคล",
        });
    }
};