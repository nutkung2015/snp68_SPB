const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const protect = require('../middleware/authMiddleware');

// Base URL: /api/visitors

router.get('/pending', protect, visitorController.getPendingVisitors);
router.get('/pending-by-unit', protect, visitorController.getPendingVisitorsByUnit);
router.post('/action', protect, visitorController.actionEstamp); // Changed from /estamp to /action to be generic
router.post('/invite', protect, visitorController.inviteVisitor);

module.exports = router;
