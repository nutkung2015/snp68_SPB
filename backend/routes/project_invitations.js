const express = require('express');
const router = express.Router();
const projectInvitationsController = require('../controllers/project_invitationsController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to create an invitation code
// URL: POST /api/project_invitations/create
router.post('/create', authMiddleware, projectInvitationsController.createInvitation);

// Route to join a project using an invitation code
// URL: POST /api/project_invitations/join
router.post('/join', authMiddleware, projectInvitationsController.joinProject);

module.exports = router;