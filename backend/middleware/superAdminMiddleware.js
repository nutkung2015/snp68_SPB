const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Middleware to check if the user is a Super Admin
 * Must be placed AFTER authMiddleware which decodes the token into req.user
 */
const requireSuperAdmin = async (req, res, next) => {
    try {
        // 1. Check if user is authenticated (req.user should exist from authMiddleware)
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized: No user credentials found'
            });
        }

        // 2. Query the user directly from DB to get the most up-to-date role
        // (Do not rely solely on the token payload, as roles might change)
        const [users] = await db.promise().query(
            'SELECT role FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        const user = users[0];

        // 3. Check role
        if (user.role !== 'super-admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Forbidden: Super Admin access required'
            });
        }

        // Grant access
        next();

    } catch (error) {
        console.error('Super Admin Check Error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Server error during role verification'
        });
    }
};

module.exports = requireSuperAdmin;
