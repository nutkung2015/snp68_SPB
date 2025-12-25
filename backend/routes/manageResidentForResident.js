const express = require("express");
const router = express.Router();
const {
    getUnitMembers,
    removeUnitMember,
    generateUnitInvitation,
    getUnitInvitations,
    cancelInvitation,
} = require("../controllers/manageResidentForResidentController");
const protect = require("../middleware/authMiddleware");

// Protect all routes
router.use(protect);

// @route   GET /api/resident-management/units/:unitId/members
// @desc    Get all residents (members) of a unit
router.get("/units/:unitId/members", getUnitMembers);

// @route   DELETE /api/resident-management/units/:unitId/members/:userId
// @desc    Remove a resident (member) from a unit
router.delete("/units/:unitId/members/:userId", removeUnitMember);

// @route   POST /api/resident-management/units/:unitId/invitations
// @desc    Generate QR Code invitation for a unit
router.post("/units/:unitId/invitations", generateUnitInvitation);

// @route   GET /api/resident-management/units/:unitId/invitations
// @desc    Get active invitations for a unit
router.get("/units/:unitId/invitations", getUnitInvitations);

// @route   DELETE /api/resident-management/units/:unitId/invitations/:invitationId
// @desc    Cancel/Delete an invitation
router.delete("/units/:unitId/invitations/:invitationId", cancelInvitation);

module.exports = router;
