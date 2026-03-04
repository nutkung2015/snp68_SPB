const express = require('express');
const router = express.Router();
const projectInvitationsController = require('../controllers/project_invitationsController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to create an invitation code
// URL: POST /api/project_invitations/create
router.post('/create', authMiddleware, projectInvitationsController.createInvitation);

// Route to get invitations (with permission-based filtering)
// URL: GET /api/project_invitations?project_id=xxx (project_id required for juristicLeader/juristicMember)
router.get('/', authMiddleware, projectInvitationsController.getInvitations);

// Route to join a project using an invitation code
// URL: POST /api/project_invitations/join
router.post('/join', authMiddleware, projectInvitationsController.joinProject);

// Route to get a specific project invitation by ID
// URL: GET /api/project_invitations/:id
router.get('/:id', authMiddleware, projectInvitationsController.getProjectInvitationById);

module.exports = router;