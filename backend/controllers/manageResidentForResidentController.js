const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Helper function to generate 6-character invite code
function generateInviteCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// @desc    Get all residents (members) of a unit
// @route   GET /api/units/:unitId/members
// @access  Private (Unit members or Project juristic)
exports.getUnitMembers = async (req, res) => {
    try {
        const { unitId } = req.params;
        const user_id = req.user.id;

        // Check if user has access to this unit
        const [unitMembership] = await db.promise().execute(
            "SELECT * FROM unit_members WHERE user_id = ? AND unit_id = ?",
            [user_id, unitId]
        );

        // If not a unit member, check if user is juristic of the project
        if (unitMembership.length === 0) {
            const [unitInfo] = await db.promise().execute(
                "SELECT project_id FROM units WHERE id = ?",
                [unitId]
            );

            if (unitInfo.length === 0) {
                return res.status(404).json({ message: "Unit not found" });
            }

            const [projectMembership] = await db.promise().execute(
                "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
                [user_id, unitInfo[0].project_id]
            );

            const juristicRoles = ["juristicLeader", "juristicMember", "admin"];
            if (
                projectMembership.length === 0 ||
                !juristicRoles.includes(projectMembership[0].role)
            ) {
                return res.status(403).json({
                    message: "You don't have permission to view members of this unit",
                });
            }
        }

        // Get all members of the unit with user details
        const [members] = await db.promise().execute(
            `SELECT 
        um.id as membership_id,
        um.unit_id,
        um.user_id,
        um.role as unit_role,
        um.joined_at,
        u.id,
        u.full_name,
        u.email,
        u.phone
      FROM unit_members um
      JOIN users u ON um.user_id = u.id
      WHERE um.unit_id = ?
      ORDER BY um.joined_at ASC`,
            [unitId]
        );

        res.status(200).json({
            status: "success",
            message: "Unit members fetched successfully",
            data: members,
            count: members.length,
        });
    } catch (error) {
        console.error("Error in getUnitMembers:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Remove a resident (member) from a unit
// @route   DELETE /api/units/:unitId/members/:userId
// @access  Private (Unit owner or Project juristic)
exports.removeUnitMember = async (req, res) => {
    try {
        const { unitId, userId } = req.params;
        const requester_id = req.user.id;

        // Check if the user to be removed exists in the unit
        const [memberToRemove] = await db.promise().execute(
            "SELECT * FROM unit_members WHERE user_id = ? AND unit_id = ?",
            [userId, unitId]
        );

        if (memberToRemove.length === 0) {
            return res.status(404).json({ message: "Member not found in this unit" });
        }

        // Get unit info
        const [unitInfo] = await db.promise().execute(
            "SELECT project_id FROM units WHERE id = ?",
            [unitId]
        );

        if (unitInfo.length === 0) {
            return res.status(404).json({ message: "Unit not found" });
        }

        // Check requester's permission
        const [requesterUnitMembership] = await db.promise().execute(
            "SELECT role FROM unit_members WHERE user_id = ? AND unit_id = ?",
            [requester_id, unitId]
        );

        const [requesterProjectMembership] = await db.promise().execute(
            "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
            [requester_id, unitInfo[0].project_id]
        );

        const isUnitOwner =
            requesterUnitMembership.length > 0 &&
            requesterUnitMembership[0].role === "owner";

        const juristicRoles = ["juristicLeader", "juristicMember", "admin"];
        const isJuristic =
            requesterProjectMembership.length > 0 &&
            juristicRoles.includes(requesterProjectMembership[0].role);

        // Prevent self-removal if not admin
        if (requester_id === userId && !isJuristic) {
            return res.status(400).json({
                message: "You cannot remove yourself. Please contact juristic.",
            });
        }

        // Only owner or juristic can remove members
        if (!isUnitOwner && !isJuristic) {
            return res.status(403).json({
                message: "You don't have permission to remove members from this unit",
            });
        }

        // Prevent removing the owner unless by juristic
        if (memberToRemove[0].role === "owner" && !isJuristic) {
            return res.status(403).json({
                message: "Only juristic can remove the unit owner",
            });
        }

        // Remove the member
        await db.promise().execute(
            "DELETE FROM unit_members WHERE user_id = ? AND unit_id = ?",
            [userId, unitId]
        );

        // Also remove from project_members if they have no other units in this project
        const [otherUnitsInProject] = await db.promise().execute(
            `SELECT um.id FROM unit_members um
       JOIN units u ON um.unit_id = u.id
       WHERE um.user_id = ? AND u.project_id = ?`,
            [userId, unitInfo[0].project_id]
        );

        if (otherUnitsInProject.length === 0) {
            await db.promise().execute(
                "DELETE FROM project_members WHERE user_id = ? AND project_id = ? AND role = 'member'",
                [userId, unitInfo[0].project_id]
            );
        }

        res.status(200).json({
            status: "success",
            message: "Member removed from unit successfully",
        });
    } catch (error) {
        console.error("Error in removeUnitMember:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Generate QR Code invitation for a unit
// @route   POST /api/units/:unitId/invitations
// @access  Private (Unit members)
exports.generateUnitInvitation = async (req, res) => {
    try {
        const { unitId } = req.params;
        const { role = "family" } = req.body; // Default role is family
        const invited_by = req.user.id;

        // Check if user is a member of the unit
        const [unitMembership] = await db.promise().execute(
            "SELECT role FROM unit_members WHERE user_id = ? AND unit_id = ?",
            [invited_by, unitId]
        );

        if (unitMembership.length === 0) {
            return res.status(403).json({
                message: "You must be a member of this unit to create invitations",
            });
        }

        // Validate role
        const validRoles = ["owner", "tenant", "family"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                message: "Invalid role. Must be 'owner', 'tenant', or 'family'",
            });
        }

        // Generate invitation code
        const invitationCode = generateInviteCode();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

        // Insert invitation
        const invitationId = uuidv4();
        await db.promise().execute(
            `INSERT INTO unit_invitations 
        (id, unit_id, invited_by, code, status, role, expires_at, created_at) 
       VALUES (?, ?, ?, ?, 'pending', ?, ?, NOW())`,
            [invitationId, unitId, invited_by, invitationCode, role, expiresAt]
        );

        // Get unit info for response
        const [unitInfo] = await db.promise().execute(
            `SELECT u.unit_number, p.name as project_name 
       FROM units u 
       JOIN projects p ON u.project_id = p.id 
       WHERE u.id = ?`,
            [unitId]
        );

        res.status(201).json({
            status: "success",
            message: "Invitation created successfully",
            invitation_code: invitationCode,
            qr_data: JSON.stringify({
                type: "unit_invitation",
                code: invitationCode,
                unit_id: unitId,
                unit_number: unitInfo[0]?.unit_number,
                project_name: unitInfo[0]?.project_name,
                expires_at: expiresAt.toISOString(),
            }),
            expires_at: expiresAt.toISOString(),
            role: role,
        });
    } catch (error) {
        console.error("Error in generateUnitInvitation:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Get active invitations for a unit
// @route   GET /api/units/:unitId/invitations
// @access  Private (Unit members)
exports.getUnitInvitations = async (req, res) => {
    try {
        const { unitId } = req.params;
        const user_id = req.user.id;

        // Check if user is a member of the unit
        const [unitMembership] = await db.promise().execute(
            "SELECT role FROM unit_members WHERE user_id = ? AND unit_id = ?",
            [user_id, unitId]
        );

        if (unitMembership.length === 0) {
            return res.status(403).json({
                message: "You must be a member of this unit to view invitations",
            });
        }

        // Get active invitations
        const [invitations] = await db.promise().execute(
            `SELECT 
        ui.id,
        ui.code,
        ui.role,
        ui.status,
        ui.expires_at,
        ui.created_at,
        u.full_name as invited_by_name
       FROM unit_invitations ui
       JOIN users u ON ui.invited_by = u.id
       WHERE ui.unit_id = ? AND ui.status = 'pending' AND ui.expires_at > NOW()
       ORDER BY ui.created_at DESC`,
            [unitId]
        );

        res.status(200).json({
            status: "success",
            message: "Invitations fetched successfully",
            data: invitations,
            count: invitations.length,
        });
    } catch (error) {
        console.error("Error in getUnitInvitations:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Cancel/Delete an invitation
// @route   DELETE /api/units/:unitId/invitations/:invitationId
// @access  Private (Unit members who created it or owners)
exports.cancelInvitation = async (req, res) => {
    try {
        const { unitId, invitationId } = req.params;
        const user_id = req.user.id;

        // Get invitation
        const [invitation] = await db.promise().execute(
            "SELECT * FROM unit_invitations WHERE id = ? AND unit_id = ?",
            [invitationId, unitId]
        );

        if (invitation.length === 0) {
            return res.status(404).json({ message: "Invitation not found" });
        }

        // Check permission (creator or unit owner)
        const [unitMembership] = await db.promise().execute(
            "SELECT role FROM unit_members WHERE user_id = ? AND unit_id = ?",
            [user_id, unitId]
        );

        const isCreator = invitation[0].invited_by === user_id;
        const isOwner =
            unitMembership.length > 0 && unitMembership[0].role === "owner";

        if (!isCreator && !isOwner) {
            return res.status(403).json({
                message: "You don't have permission to cancel this invitation",
            });
        }

        // Update invitation status to cancelled
        await db.promise().execute(
            "UPDATE unit_invitations SET status = 'cancelled' WHERE id = ?",
            [invitationId]
        );

        res.status(200).json({
            status: "success",
            message: "Invitation cancelled successfully",
        });
    } catch (error) {
        console.error("Error in cancelInvitation:", error);
        res.status(500).json({ message: "Server error" });
    }
};
