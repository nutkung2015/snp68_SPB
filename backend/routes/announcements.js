const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const announcementController = require('../controllers/announcementController');

// Routes with file upload middleware
router.post('/', upload.array('files', 5), announcementController.createAnnouncement);
router.put('/:id', upload.array('files', 5), announcementController.updateAnnouncement);

// Get announcements for resident
router.get('/resident', announcementController.getAnnouncementsForResident);

// Other routes
router.get('/', announcementController.getAllAnnouncements);
router.get('/:id', announcementController.getAnnouncement);
router.delete('/:id', announcementController.deleteAnnouncement);
router.get('/type/:type', announcementController.getAnnouncementsByType);
router.get('/audience/:audience', announcementController.getAnnouncementsByAudience);

module.exports = router;