const express = require('express');
const router = express.Router();
const { getProjectResidents } = require('../controllers/unitController');
const protect = require('../middleware/authMiddleware');

// @route   GET /api/residents
// @desc    Get all residents in a project
// @access  Private (Juristic or Project Admin)
router.get('/', protect, getProjectResidents);

module.exports = router;
