const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireSuperAdmin = require('../middleware/superAdminMiddleware');

const superAdminController = require('../controllers/superAdminController');
const globalAnnouncementController = require('../controllers/globalAnnouncementController');
const featureFlagController = require('../controllers/featureFlagController');

// Apply protection to all routes
router.use(authMiddleware);
router.use(requireSuperAdmin);

// Dashboard
router.get('/dashboard', superAdminController.getDashboardStats);

// Activity Logs
router.get('/logs', superAdminController.getActivityLogs);

// Users Management
router.get('/users', superAdminController.getAllUsers);

// System Config
router.get('/config', superAdminController.getSystemConfig);
router.put('/config', superAdminController.updateSystemConfig);

// Global Announcements
router.get('/announcements', globalAnnouncementController.getAllAnnouncements);
router.post('/announcements', globalAnnouncementController.createAnnouncement);
router.put('/announcements/:id', globalAnnouncementController.updateAnnouncement);
router.delete('/announcements/:id', globalAnnouncementController.deleteAnnouncement);

// Feature Flags
router.get('/features/:projectId', featureFlagController.getProjectFlags);
router.post('/features', featureFlagController.upsertProjectFlag);

module.exports = router;
