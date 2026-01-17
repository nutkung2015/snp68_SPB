const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.getProjectDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Query project with unit, member counts, and logo_url
    const query = `
      SELECT 
        p.*,
        (SELECT logo_url FROM projectcustomizations WHERE project_id = p.id LIMIT 1) as logo_url,
        (SELECT COUNT(*) FROM units WHERE project_id = p.id) as unit_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      WHERE p.id = ? AND p.deleted_at IS NULL
    `;

    const [projects] = await db.promise().query(query, [id]);

    if (projects.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Project not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: projects[0],
    });
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

exports.getAllProjects = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Check for super-admin
    if (userRole !== 'super-admin') {
      return res.status(403).json({ message: "Access denied. Super Admin only." });
    }

    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Base query with subqueries for counts
    // Only show active projects (deleted_at IS NULL)
    // Use subquery for logo_url to prevent duplicates when projectcustomizations has multiple rows
    let query = `
      SELECT 
        p.*,
        (SELECT logo_url FROM projectcustomizations WHERE project_id = p.id LIMIT 1) as logo_url,
        (SELECT COUNT(*) FROM units WHERE project_id = p.id) as unit_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      WHERE p.deleted_at IS NULL
    `;

    let params = [];

    if (search) {
      query += " AND p.name LIKE ?";
      params.push(`%${search}%`);
    }

    query += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [projects] = await db.promise().query(query, params);

    // Count total (only active projects)
    let countQuery = "SELECT COUNT(*) as total FROM projects WHERE deleted_at IS NULL";
    let countParams = [];
    if (search) {
      countQuery += " AND name LIKE ?";
      countParams.push(`%${search}%`);
    }
    const [countRows] = await db.promise().query(countQuery, countParams);
    const total = countRows[0].total;

    res.status(200).json({
      status: "success",
      data: projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / limit),
        total_items: total
      }
    });

  } catch (error) {
    console.error("Error in getAllProjects:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==========================================
// Update Project (Super Admin Only)
// ==========================================
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, rules, common_fee_info } = req.body;

    // Build dynamic update query
    let updateFields = [];
    let params = [];

    if (name !== undefined) {
      updateFields.push("name = ?");
      params.push(name);
    }
    if (address !== undefined) {
      updateFields.push("address = ?");
      params.push(address);
    }
    if (rules !== undefined) {
      updateFields.push("rules = ?");
      params.push(rules);
    }
    if (common_fee_info !== undefined) {
      updateFields.push("common_fee_info = ?");
      params.push(common_fee_info);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No fields to update",
      });
    }

    updateFields.push("updated_at = NOW()");
    params.push(id);

    const query = `UPDATE projects SET ${updateFields.join(", ")} WHERE id = ?`;
    const [result] = await db.promise().query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Project not found",
      });
    }

    // Fetch updated project
    const [updatedProject] = await db
      .promise()
      .query("SELECT * FROM projects WHERE id = ?", [id]);

    res.json({
      status: "success",
      message: "Project updated successfully",
      data: updatedProject[0],
    });
  } catch (error) {
    console.error("Error in updateProject:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==========================================
// Delete Project (Super Admin Only) - Soft Delete
// ==========================================
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists and not already deleted
    const [existing] = await db
      .promise()
      .query("SELECT id, name, deleted_at FROM projects WHERE id = ?", [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Project not found",
      });
    }

    if (existing[0].deleted_at !== null) {
      return res.status(400).json({
        status: "error",
        message: "Project has already been deleted",
      });
    }

    const projectName = existing[0].name;

    // Soft Delete: ตั้ง deleted_at เป็นเวลาปัจจุบัน
    await db.promise().query(
      "UPDATE projects SET deleted_at = NOW() WHERE id = ?",
      [id]
    );

    res.json({
      status: "success",
      message: `Project "${projectName}" has been deleted (soft delete)`,
    });
  } catch (error) {
    console.error("Error in deleteProject:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==========================================
// Restore Project (Super Admin Only) - Optional
// ==========================================
exports.restoreProject = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists and is deleted
    const [existing] = await db
      .promise()
      .query("SELECT id, name, deleted_at FROM projects WHERE id = ?", [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Project not found",
      });
    }

    if (existing[0].deleted_at === null) {
      return res.status(400).json({
        status: "error",
        message: "Project is not deleted",
      });
    }

    const projectName = existing[0].name;

    // Restore: ตั้ง deleted_at เป็น NULL
    await db.promise().query(
      "UPDATE projects SET deleted_at = NULL WHERE id = ?",
      [id]
    );

    res.json({
      status: "success",
      message: `Project "${projectName}" has been restored`,
    });
  } catch (error) {
    console.error("Error in restoreProject:", error);
    res.status(500).json({ message: "Server error" });
  }
};