const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

exports.createInvitation = async (req, res) => {
  try {
    console.log('Request Body:', req.body);
    const { project_id, role } = req.body; // Get role from req.body
    const sender_id = req.user.id; // Get sender_id from authenticated user
    const invitation_code = generateInviteCode(); // Generate a 6-character invitation code
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expires in 24 hours

    // Validate the role for the invitation
    const allowedRoles = ['juristicLeader', 'juristicMember', 'security'];
    let invitationRole = 'juristicMember'; // Default role for invitation

    if (role && allowedRoles.includes(role)) {
      invitationRole = role;
    } else if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role specified for invitation. Allowed roles are 'juristicLeader', 'juristicMember', or 'security'." });
    }

    const [result] = await db.promise().execute(
      "INSERT INTO project_invitations (id, project_id, sender_id, invitation_code, expires_at, role) VALUES (?, ?, ?, ?, ?, ?)", // Add role column
      [uuidv4(), project_id, sender_id, invitation_code, expires_at, invitationRole] // Add invitationRole
    );
    res.status(201).json({ message: "Invitation created successfully", invitation_code: invitation_code, role: invitationRole });
  } catch (error) {
    console.error("Error in createInvitation:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getInvitations = async (req, res) => {
  try {
    const user_id = req.user.id;
    const user_role = req.user.role; // Role from users table (JWT token)
    const { project_id } = req.query; // Get project_id from query params

    console.log('=== DEBUG getInvitations ===');
    console.log('user_id:', user_id);
    console.log('user_role:', user_role);
    console.log('project_id:', project_id);
    console.log('projectMemberships:', JSON.stringify(req.user.projectMemberships, null, 2));

    let invitations = [];

    // Permission 1: super-admin - check role in users table only
    if (user_role === 'super-admin') {
      console.log('Accessing as super-admin');
      const [allInvitations] = await db.promise().execute(
        `SELECT
          pi.id,
          pi.project_id,
          pi.sender_id,
          pi.invitation_code,
          pi.role,
          pi.status,
          pi.expires_at,
          pi.created_at,
          p.name AS project_name,
          u.full_name AS sender_name,
          u.email AS sender_email
        FROM project_invitations pi
        LEFT JOIN projects p ON pi.project_id = p.id
        LEFT JOIN users u ON pi.sender_id = u.id
        ORDER BY pi.created_at DESC`
      );
      invitations = allInvitations;
    }
    // Permission 2: juristicLeader, juristicMember - check project_members table only (ignore JWT role)
    else {
      console.log('Accessing as juristic role (ignoring JWT role check)');

      // Check if project_id is provided
      if (!project_id) {
        console.log('ERROR: project_id is required');
        return res.status(400).json({
          message: "project_id is required"
        });
      }

      // Check if user has membership in this project from projectMemberships
      console.log('Looking for project membership for project_id:', project_id);
      const projectMembership = req.user.projectMemberships.find(
        membership => membership.project_id === project_id &&
          (membership.role === 'juristicLeader' || membership.role === 'juristicMember')
      );

      console.log('Found project membership:', projectMembership);

      if (!projectMembership) {
        console.log('ERROR: No valid project membership found');
        return res.status(403).json({
          message: "You don't have permission to view invitations for this project"
        });
      }

      console.log('Fetching invitations for project:', project_id);
      // Fetch invitations for the specific project
      const [projectInvitations] = await db.promise().execute(
        `SELECT
          pi.id,
          pi.project_id,
          pi.sender_id,
          pi.invitation_code,
          pi.role,
          pi.status,
          pi.expires_at,
          pi.created_at,
          p.name AS project_name,
          u.full_name AS sender_name,
          u.email AS sender_email
        FROM project_invitations pi
        LEFT JOIN projects p ON pi.project_id = p.id
        LEFT JOIN users u ON pi.sender_id = u.id
        WHERE pi.project_id = ?
        ORDER BY pi.created_at DESC`,
        [project_id]
      );
      invitations = projectInvitations;
      console.log('Found invitations:', invitations.length);
    }

    console.log('Returning invitations:', invitations.length);
    res.status(200).json({
      status: "success",
      message: "Invitations fetched successfully",
      data: invitations,
      count: invitations.length
    });
  } catch (error) {
    console.error("Error in getInvitations:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.joinProject = async (req, res) => {
  try {
    const { invitation_code } = req.body; // No need for role in req.body anymore
    const user_id = req.user.id;

    // 1. Find the invitation
    const [invitations] = await db.promise().execute(
      `SELECT pi.*, p.name AS project_name
       FROM project_invitations pi
       LEFT JOIN projects p ON pi.project_id = p.id
       WHERE pi.invitation_code = ? AND pi.expires_at > NOW() AND pi.status = 'pending'`,
      [invitation_code]
    );

    if (invitations.length === 0) {
      return res.status(404).json({ message: "Invalid or expired invitation code." });
    }

    const invitation = invitations[0];
    const project_id = invitation.project_id;

    // Get role from invitation, or fallback to user's role from users table
    let memberRole = invitation.role;
    if (!memberRole || memberRole === '') {
      // Get user's role from users table as fallback
      const [userRows] = await db.promise().execute(
        "SELECT role FROM users WHERE id = ?",
        [user_id]
      );
      if (userRows.length > 0 && userRows[0].role) {
        memberRole = userRows[0].role;
        console.log("Using user's role from users table:", memberRole);
      } else {
        memberRole = 'member'; // Default fallback
      }
    }

    // 2. Check if user is already a member of the project
    const [existingMembers] = await db.promise().execute(
      "SELECT * FROM project_members WHERE user_id = ? AND project_id = ?",
      [user_id, project_id]
    );

    if (existingMembers.length > 0) {
      return res.status(409).json({ message: "You are already a member of this project." });
    }

    // 3. Add user to project_members
    const newMemberId = uuidv4();
    await db.promise().execute(
      "INSERT INTO project_members (id, user_id, project_id, role) VALUES (?, ?, ?, ?)",
      [newMemberId, user_id, project_id, memberRole] // Use the role from the invitation
    );

    // 4. Update invitation status (optional, or delete it)
    await db.promise().execute(
      "UPDATE project_invitations SET status = 'used' WHERE id = ?",
      [invitation.id]
    );

    const project_name = invitation.project_name || 'Unknown Project';

    res.status(200).json({ message: "Successfully joined the project!", project_id: project_id, project_name: project_name, role: memberRole });
  } catch (error) {
    console.error("Error in joinProject:", error);
    res.status(500).json({ message: "Server error" });
  }
};