const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const xlsx = require('xlsx');

// Helper function to generate 6-character invite code (e.g., TCS2GSF)
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// @desc    Create a new unit
// @route   POST /api/units
// @access  Private (Juristic Leader/Member)
exports.createUnit = async (req, res) => {
  try {
    const { project_id, unit_number, zone, building, floor } = req.body;

    // Basic validation
    if (!project_id || !unit_number) {
      return res.status(400).json({ message: "Project ID and Unit Number are required." });
    }

    const newUnitId = uuidv4();
    await db.promise().execute(
      "INSERT INTO units (id, project_id, unit_number, zone, building, floor) VALUES (?, ?, ?, ?, ?, ?)",
      [newUnitId, project_id, unit_number, zone || null, building || null, floor || null]
    );

    res.status(201).json({ message: "Unit created successfully! รหัสหน่วย: " + newUnitId, unit_id: newUnitId });
  } catch (error) {
    console.error("Error in createUnit:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create an invitation for a unit
// @route   POST /api/unit_invitations
// @access  Private (Juristic Leader/Member, or Owner of the unit)
exports.createUnitInvitations = async (req, res) => {
  try {
    const { unit_id, role, invited_email, invited_phone } = req.body;
    const invited_by = req.user.id; // User creating the invitation

    // Basic validation
    if (!unit_id || !role || (!invited_email && !invited_phone)) {
      return res.status(400).json({ message: "Unit ID, role, and either invited_email or invited_phone are required." });
    }

    // Validate role against ENUM values
    const validRoles = ['owner', 'tenant', 'family'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be 'owner', 'tenant', or 'family'.'" });
    }

    // Get project_id from unit_id
    const [unitRows] = await db.promise().query(
      "SELECT project_id FROM units WHERE id = ?",
      [unit_id]
    );

    if (unitRows.length === 0) {
      return res.status(404).json({ message: "Unit not found." });
    }
    const project_id = unitRows[0].project_id;

    // Check if the invited_by user is already a member of the project
    const [existingProjectMember] = await db.promise().query(
      "SELECT id FROM project_members WHERE user_id = ? AND project_id = ?",
      [invited_by, project_id]
    );

    // If not a member, add them to project_members with a default role (e.g., 'member')
    if (existingProjectMember.length === 0) {
      await db.promise().execute(
        "INSERT INTO project_members (id, user_id, project_id, role, joined_at) VALUES (?, ?, ?, ?, NOW())",
        [uuidv4(), invited_by, project_id, 'member'] // Assign a default role like 'member'
      );
    }

    const invitationCode = generateInviteCode(); // Generate a 6-character invitation code
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Invitation valid for 7 days

    await db.promise().execute(
      "INSERT INTO unit_invitations (id, unit_id, invited_by, code, status, role, invited_email, invited_phone, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [uuidv4(), unit_id, invited_by, invitationCode, 'pending', role, invited_email || null, invited_phone || null, expiresAt]
    );

    res.status(201).json({ message: "Unit invitation created successfully! รหัสเชิญ: " + invitationCode, invitation_code: invitationCode });
  } catch (error) {
    console.error("Error in createUnitInvitations:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Join a unit using an invitation code
// @route   POST /api/unit_invitations/join
// @access  Private
exports.joinUnit = async (req, res) => {
  try {
    const { invitation_code } = req.body;
    const user_id = req.user.id;

    // 1. Find the invitation
    const [invitations] = await db.promise().execute(
      "SELECT * FROM unit_invitations WHERE code = ? AND expires_at > NOW() AND status = 'pending'",
      [invitation_code]
    );

    if (invitations.length === 0) {
      return res.status(404).json({ message: "Invalid or expired unit invitation code." });
    }

    const invitation = invitations[0];
    const unit_id = invitation.unit_id;
    const memberRole = invitation.role;

    // 2. Check if user is already a member of the unit
    const [existingMembers] = await db.promise().execute(
      "SELECT * FROM unit_members WHERE user_id = ? AND unit_id = ?",
      [user_id, unit_id]
    );

    if (existingMembers.length > 0) {
      return res.status(409).json({ message: "You are already a member of this unit." });
    }

    // 3. Add user to unit_members
    await db.promise().execute(
      "INSERT INTO unit_members (id, unit_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, NOW())",
      [uuidv4(), unit_id, user_id, memberRole]
    );

    // Get project_id from unit_id
    const [unitResult] = await db.promise().execute(
      "SELECT project_id FROM units WHERE id = ?",
      [unit_id]
    );

    if (unitResult.length === 0) {
      console.warn(`Project ID not found for unit_id: ${unit_id}`);
      return res.status(500).json({ message: "Associated project not found for the unit." });
    }
    const project_id = unitResult[0].project_id;

    // Check if user is already a member of the project
    const [existingProjectMembers] = await db.promise().execute(
      "SELECT * FROM project_members WHERE user_id = ? AND project_id = ?",
      [user_id, project_id]
    );

    // If not a member, add them to project_members with a default role (e.g., 'member')
    if (existingProjectMembers.length === 0) {
      await db.promise().execute(
        "INSERT INTO project_members (id, user_id, project_id, role, joined_at) VALUES (?, ?, ?, ?, NOW())",
        [uuidv4(), user_id, project_id, 'member'] // Assign a default role like 'member'
      );
    }

    // 4. Update invitation status
    await db.promise().execute(
      "UPDATE unit_invitations SET status = 'accepted' WHERE id = ?",
      [invitation.id]
    );

    res.status(200).json({ message: "Successfully joined the unit!", unit_id: unit_id, role: memberRole });
  } catch (error) {
    console.error("Error in joinUnit:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get units by project ID
// @route   GET /api/units?project_id=xxx
// @access  Private (Project Members)
exports.getUnits = async (req, res) => {
  try {
    const { project_id } = req.query;

    // Basic validation
    if (!project_id) {
      return res.status(400).json({ message: "Project ID is required." });
    }

    // Check if user has access to this project
    const user_id = req.user.id;
    const [projectMembership] = await db.promise().execute(
      "SELECT * FROM project_members WHERE user_id = ? AND project_id = ?",
      [user_id, project_id]
    );

    if (projectMembership.length === 0) {
      return res.status(403).json({
        message: "You don't have permission to view units for this project"
      });
    }

    // Get units for the project
    const [units] = await db.promise().execute(
      "SELECT * FROM units WHERE project_id = ? ORDER BY unit_number",
      [project_id]
    );

    res.status(200).json({
      status: "success",
      message: "Units fetched successfully",
      data: units,
      count: units.length
    });
  } catch (error) {
    console.error("Error in getUnits:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get unit invitations (filter by project/unit/status)
// @route   GET /api/unit_invitations?project_id=xxx[&unit_id=xxx&status=pending]
// @access  Private (Project members / unit owners)
exports.getUnitInvitations = async (req, res) => {
  try {
    let { project_id, unit_id, status } = req.query;
    const user_id = req.user.id;

    if (!project_id && !unit_id) {
      return res.status(400).json({
        message: "project_id or unit_id is required.",
      });
    }

    // ถ้าไม่ได้ส่ง project_id แต่มี unit_id ให้ดึงจาก units ก่อน
    if (!project_id && unit_id) {
      const [unitRows] = await db
        .promise()
        .execute("SELECT project_id FROM units WHERE id = ?", [unit_id]);
      if (unitRows.length === 0) {
        return res.status(404).json({ message: "Unit not found." });
      }
      project_id = unitRows[0].project_id;
    }

    // ตรวจสิทธิ์จาก project หรือ unit
    let hasPermission = false;
    const [projectMembership] = await db
      .promise()
      .execute(
        "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
        [user_id, project_id]
      );

    if (projectMembership.length > 0) {
      hasPermission = true;
    }

    if (!hasPermission && unit_id) {
      const [unitMembership] = await db
        .promise()
        .execute(
          "SELECT id FROM unit_members WHERE user_id = ? AND unit_id = ?",
          [user_id, unit_id]
        );
      if (unitMembership.length > 0) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return res.status(403).json({
        message: "You don't have permission to view these invitations",
      });
    }

    // สร้าง utility สำหรับ query
    const buildWhereClause = (includeUnitFilter) => {
      let clause = "u.project_id = ?";
      const params = [project_id];

      if (includeUnitFilter && unit_id) {
        clause += " AND ui.unit_id = ?";
        params.push(unit_id);
      }

      if (status) {
        clause += " AND ui.status = ?";
        params.push(status);
      }

      return { clause, params };
    };

    const selectSql = `
      SELECT
        ui.id,
        ui.unit_id,
        u.unit_number,
        u.project_id,
        ui.invited_by,
        inviter.full_name AS invited_by_name,
        ui.code,
        ui.qr_code_url,
        ui.status,
        ui.role,
        ui.invited_email,
        ui.invited_phone,
        ui.expires_at,
        ui.created_at,
        ui.updated_at
      FROM unit_invitations ui
      JOIN units u ON ui.unit_id = u.id
      LEFT JOIN users inviter ON ui.invited_by = inviter.id
      WHERE {{WHERE}}
      ORDER BY ui.created_at DESC
    `;

    // 1) คำเชิญทั้งหมดใน project
    const { clause: projectClause, params: projectParams } =
      buildWhereClause(false);
    const [AllUnitsInvite] = await db
      .promise()
      .execute(selectSql.replace("{{WHERE}}", projectClause), projectParams);

    // 2) คำเชิญเฉพาะ unit (ถ้ามี unit_id)
    let UnitsInvite = [];
    if (unit_id) {
      const { clause: unitClause, params: unitParams } =
        buildWhereClause(true);
      const [rows] = await db
        .promise()
        .execute(selectSql.replace("{{WHERE}}", unitClause), unitParams);
      UnitsInvite = rows;
    }

    res.status(200).json({
      status: "success",
      message: "Unit invitations fetched successfully",
      data: {
        all_units_invite: AllUnitsInvite,
        unit_invitations: UnitsInvite,
      },
      count: {
        project: AllUnitsInvite.length,
        unit: UnitsInvite.length,
      },
    });
  } catch (error) {
    console.error("Error in getUnitInvitations:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Import units from Excel file
// @route   POST /api/units/import
// @access  Private (Project Admin/Leader)
exports.importUnits = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { project_id } = req.body;
    if (!project_id) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    // Check authentication (req.user should be set by protect middleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: No valid token" });
    }

    const user_id = req.user.id;

    // Check if user has permission to import units for this project
    const [projectMembership] = await db.promise().execute(
      "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
      [user_id, project_id]
    );

    if (projectMembership.length === 0) {
      return res.status(403).json({
        message: "You don't have permission to import units for this project"
      });
    }

    // Optional: Check if user has admin/leader role
    const userRole = projectMembership[0].role;
    const allowedRoles = ['admin', 'juristicMember', 'juristicLeader'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "Only project admins or leaders can import units"
      });
    }

    // 1. Read Excel File
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet);

    if (rawData.length === 0) {
      return res.status(400).json({ message: "Excel file is empty" });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    const processedHouseNumbers = new Set();

    // 2. Process Each Row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNumber = i + 2; // Excel row number (1-based, +1 for header)

      // Debug: Log first row to see column names
      if (i === 0) {
        console.log('Excel columns:', Object.keys(row));
        console.log('First row data:', row);
      }

      // Validate Required Fields
      if (!row.house_number) {
        errors.push({ row: rowNumber, field: 'house_number', message: 'Missing house_number' });
        failedCount++;
        continue;
      }

      const houseNumberStr = String(row.house_number).trim();

      // Check Duplicates in File
      if (processedHouseNumbers.has(houseNumberStr)) {
        errors.push({ row: rowNumber, field: 'house_number', message: `Duplicate house_number in file: ${houseNumberStr}` });
        failedCount++;
        continue;
      }
      processedHouseNumbers.add(houseNumberStr);

      // Validate Data Types
      if (row.area_sqm && isNaN(row.area_sqm)) {
        errors.push({ row: rowNumber, field: 'area_sqm', message: 'Must be a number' });
        failedCount++;
        continue;
      }

      // Check DB for Duplicates
      const [existing] = await db.promise().query(
        "SELECT id FROM units WHERE project_id = ? AND unit_number = ?",
        [project_id, houseNumberStr]
      );

      if (existing.length > 0) {
        // Option: Skip or Update. Here we skip as per default requirement.
        errors.push({ row: rowNumber, field: 'house_number', message: `Already exists in database: ${houseNumberStr}` });
        failedCount++;
        continue;
      }

      // Insert (with building column)
      const newUnitId = uuidv4();
      await db.promise().execute(
        "INSERT INTO units (id, project_id, unit_number, zone, building, area_sqm, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          newUnitId,
          project_id,
          houseNumberStr,
          row.zone || null,
          row.building || null,
          row.area_sqm || null,
          row.status || 'vacant'
        ]
      );
      successCount++;
    }

    res.json({
      message: "Import completed",
      total_rows: rawData.length,
      success_count: successCount,
      failed_count: failedCount,
      errors: errors
    });

  } catch (error) {
    console.error("Import Error:", error);
    res.status(500).json({ message: "Server error during import", error: error.message });
  }
};