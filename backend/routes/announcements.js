const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const announcementController = require('../controllers/announcementController');
const authMiddleware = require('../middleware/authMiddleware');

// Routes with file upload middleware
router.post('/', upload.array('files', 5), announcementController.createAnnouncement);
router.put('/:id', upload.array('files', 5), announcementController.updateAnnouncement);

// Get announcements for resident (requires authentication)
router.get('/resident', authMiddleware, announcementController.getAnnouncementsForResident);

// Other routes
router.get('/', authMiddleware, announcementController.getAllAnnouncements);
router.get('/:id', authMiddleware, announcementController.getAnnouncement);
router.delete('/:id', authMiddleware, announcementController.deleteAnnouncement);
router.get('/type/:type', authMiddleware, announcementController.getAnnouncementsByType);
router.get('/audience/:audience', authMiddleware, announcementController.getAnnouncementsByAudience);

module.exports = router;