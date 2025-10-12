const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.createInvitation = async (req, res) => {
  try {
    console.log('Request Body:', req.body);
    const { project_id, role } = req.body; // Get role from req.body
    const sender_id = req.user.id; // Get sender_id from authenticated user
    const invitation_code = uuidv4(); // Generate a unique invitation code
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expires in 24 hours

    // Validate the role for the invitation
    const allowedRoles = ['juristicLeader', 'juristicMember'];
    let invitationRole = 'juristicMember'; // Default role for invitation

    if (role && allowedRoles.includes(role)) {
      invitationRole = role;
    } else if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role specified for invitation. Allowed roles are 'juristicLeader' or 'juristicMember'." });
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

exports.joinProject = async (req, res) => {
  try {
    const { invitation_code } = req.body; // No need for role in req.body anymore
    const user_id = req.user.id;

    // 1. Find the invitation
    const [invitations] = await db.promise().execute(
      "SELECT * FROM project_invitations WHERE invitation_code = ? AND expires_at > NOW() AND status = 'pending'",
      [invitation_code]
    );

    if (invitations.length === 0) {
      return res.status(404).json({ message: "Invalid or expired invitation code." });
    }

    const invitation = invitations[0];
    const project_id = invitation.project_id;
    const memberRole = invitation.role; // Get role from the invitation

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

    res.status(200).json({ message: "Successfully joined the project!", project_id: project_id, role: memberRole });
  } catch (error) {
    console.error("Error in joinProject:", error);
    res.status(500).json({ message: "Server error" });
  }
};