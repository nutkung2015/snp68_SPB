const express = require('express');
const router = express.Router();
const { createUnit, createUnitInvitations, joinUnit, getUnits, getUnitInvitations, importUnits } = require('../controllers/unitController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // Use memory storage for processing
const protect = require('../middleware/authMiddleware'); // Assuming you have an auth middleware

// Protect all unit routes
router.use(protect);

// Unit management routes
router.post('/', createUnit); // Create a new unit
router.get('/', getUnits); // Get units by project_id
router.post('/invitations', createUnitInvitations); // Create a unit invitation
router.post('/invitations/join', joinUnit); // Join a unit using an invitation code
router.get("/unit-invitations", getUnitInvitations);
router.post('/import', upload.single('file'), importUnits); // Import units from Excel

module.exports = router;