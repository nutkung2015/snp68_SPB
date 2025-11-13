const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

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
      return res.status(400).json({ message: "Invalid role. Must be 'owner', 'tenant', or 'family'." });
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

    const invitationCode = uuidv4(); // Generate a unique invitation code
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