const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const protect = require('../middleware/authMiddleware');

// Base URL: /api/security

router.post('/entry/check-in', protect, securityController.checkIn);
router.post('/entry/check-out', protect, securityController.checkOut);
router.get('/vehicles/search', protect, securityController.searchVehicles);
router.get('/entry/logs', protect, securityController.getEntryLogs);
router.get('/entry/logs/:id', protect, securityController.getEntryLogById);
router.get('/entry/history', protect, securityController.getEntryHistory);
router.get('/visitors/scheduled', protect, securityController.getScheduledVisitors);
router.post('/visitors/confirm-entry', protect, securityController.confirmVisitorEntry);
router.get('/stats', protect, securityController.getStats);

module.exports = router;
