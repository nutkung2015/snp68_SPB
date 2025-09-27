const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');

// GET /api/announcements - Get all announcements with filters and pagination
router.get('/', announcementController.getAllAnnouncements);

// GET /api/announcements/:id - Get single announcement by ID
router.get('/:id', announcementController.getAnnouncement);

// POST /api/announcements - Create new announcement
router.post('/', announcementController.createAnnouncement);

// PUT /api/announcements/:id - Update announcement
router.put('/:id', announcementController.updateAnnouncement);

// DELETE /api/announcements/:id - Delete announcement
router.delete('/:id', announcementController.deleteAnnouncement);

// GET /api/announcements/type/:type - Get announcements by type
router.get('/type/:type', announcementController.getAnnouncementsByType);

// GET /api/announcements/audience/:audience - Get announcements by audience
router.get('/audience/:audience', announcementController.getAnnouncementsByAudience);

module.exports = router;
