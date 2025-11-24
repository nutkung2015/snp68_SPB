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
      WHERE pm.role IN ('juristicMember', 'juristicLeader')
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