const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.getProjectDetails = async (req, res) => {
  try {
    // Logic to fetch project details
    res.status(200).json({ message: "Project details placeholder" });
  } catch (error) {
    console.error("Error in getProjectDetails:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { name, address, rules, common_fee_info } = req.body;

    const projectId = uuidv4();

    const [result] = await db
      .promise()
      .query(
        "INSERT INTO projects (id, name, address, rules, common_fee_info, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [projectId, name, address, rules, common_fee_info]
      );

    res.status(201).json({
      status: "success",
      message: "Project created successfully",
      data: {
        id: projectId,
        name,
        address,
        rules,
        common_fee_info,
      },
    });
  } catch (error) {
    console.error("Error in createProject:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/project-memberships
 * Query params: limit (default 50), offset (default 0)
 * Requires authenticated user (req.user.id)
 *
 * Response shape:
 * {
 *   status: 'success',
 *   data: {
 *     memberships: [{ project_id, project_name, role, joined_date, metadata }],
 *     count: <number>
 *   },
 *   pagination: { limit, offset }
 * }
 */
exports.getProjectMemberships = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Adjust table/column names to match your schema:
    // - project_members (user_id, project_id, role, joined_at, created_at, updated_at)
    // - projects (id, name, description, created_at)
    const query = `
			SELECT pm.project_id, p.name AS project_name, pm.role, pm.joined_at, pm.created_at
			FROM project_members pm
			LEFT JOIN projects p ON p.id = pm.project_id
			WHERE pm.user_id = ?
			ORDER BY pm.joined_at DESC
			LIMIT ? OFFSET ?
		`;

    const [rows] = await db.promise().query(query, [userId, limit, offset]);

    const memberships = rows.map((r) => ({
      project_id: r.project_id,
      project_name: r.project_name,
      role: r.role,
      joined_at: r.joined_at,
      created_at: r.created_at,
    }));

    // Optionally get total count for pagination
    const countQuery =
      "SELECT COUNT(*) as total FROM project_members WHERE user_id = ?";
    const [countRows] = await db.promise().query(countQuery, [userId]);
    const total = countRows && countRows[0] ? countRows[0].total : memberships.length;

    res.json({
      status: "success",
      data: {
        memberships,
        count: total,
      },
      pagination: {
        limit,
        offset,
      },
    });
  } catch (err) {
    console.error("Error fetching project memberships:", err);
    res.status(500).json({
      status: "error",
      message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
    });
  }
};