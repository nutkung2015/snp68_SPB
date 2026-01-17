const db = require('../config/db');

// ==========================================
// Dashboard & Stats
// ==========================================
exports.getDashboardStats = async (req, res) => {
    try {
        // 1. Count Projects
        const [projectCount] = await db.promise().query('SELECT COUNT(*) as total FROM projects');

        // 2. Count Users (Group by Role)
        const [userStats] = await db.promise().query(`
            SELECT role, COUNT(*) as count 
            FROM users 
            GROUP BY role
        `);

        // 3. Count Units (Total)
        const [unitCount] = await db.promise().query('SELECT COUNT(*) as total FROM units');

        // 4. Recent Errors (Last 24h) - Example from logs if exists, or simulate
        // Here we simulate or query your specific error log table if you have one.
        // For now, we return basic counts.

        res.json({
            status: 'success',
            data: {
                projects: projectCount[0].total,
                units: unitCount[0].total,
                users: userStats.reduce((acc, curr) => {
                    acc[curr.role] = curr.count;
                    return acc;
                }, {}),
                timestamp: new Date()
            }
        });

    } catch (error) {
        console.error('Get Dashboard Stats Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// ==========================================
// User Management
// ==========================================
exports.getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            role = '',
            sort_by = 'created_at',
            sort_order = 'DESC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build query
        let query = `
            SELECT 
                u.id, 
                u.email, 
                u.full_name, 
                u.phone, 
                u.role,
                u.created_at,
                u.updated_at
            FROM users u
            WHERE 1=1
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM users u WHERE 1=1';
        let params = [];
        let countParams = [];

        // Search filter
        if (search) {
            const searchFilter = ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
            query += searchFilter;
            countQuery += searchFilter;
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
            countParams.push(searchParam, searchParam, searchParam);
        }

        // Role filter
        if (role) {
            query += ' AND u.role = ?';
            countQuery += ' AND u.role = ?';
            params.push(role);
            countParams.push(role);
        }

        // Sorting (whitelist allowed columns)
        const allowedSortColumns = ['created_at', 'full_name', 'email', 'role'];
        const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
        const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY u.${sortColumn} ${sortDir}`;

        // Pagination
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        // Execute queries
        const [users] = await db.promise().query(query, params);
        const [countResult] = await db.promise().query(countQuery, countParams);

        res.json({
            status: 'success',
            data: users,
            pagination: {
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(countResult[0].total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get All Users Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// ==========================================
// Activity Logs
// ==========================================
exports.getActivityLogs = async (req, res) => {
    try {
        const { limit = 50, offset = 0, type } = req.query;
        let query = `
            SELECT l.*, u.full_name as admin_name, u.email as admin_email
            FROM admin_activity_logs l
            LEFT JOIN users u ON l.admin_user_id = u.id
        `;
        let params = [];

        if (type) {
            query += ' WHERE l.action_type = ?';
            params.push(type);
        }

        query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [logs] = await db.promise().query(query, params);

        res.json({
            status: 'success',
            data: logs
        });
    } catch (error) {
        console.error('Get Logs Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// ==========================================
// System Config
// ==========================================
exports.getSystemConfig = async (req, res) => {
    try {
        const [configs] = await db.promise().query('SELECT * FROM system_config');

        // Transform array to object for easier frontend usage
        const configObject = {};
        configs.forEach(cfg => {
            let value = cfg.config_value;
            // Parse based on type
            if (cfg.config_type === 'number') value = Number(value);
            else if (cfg.config_type === 'boolean') value = (value === 'true');
            else if (cfg.config_type === 'json') {
                try { value = JSON.parse(value); } catch (e) { value = null; }
            }

            configObject[cfg.config_key] = {
                value: value,
                description: cfg.description,
                updated_at: cfg.updated_at
            };
        });

        res.json({
            status: 'success',
            data: configObject
        });
    } catch (error) {
        console.error('Get Config Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

exports.updateSystemConfig = async (req, res) => {
    try {
        const { updates } = req.body; // Expect object like { "maintenance_mode": "true" }
        const userId = req.user.id;

        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ status: 'error', message: 'No updates provided' });
        }

        const keys = Object.keys(updates);

        // Log this action
        await logAdminAction(userId, 'UPDATE', 'system_config', 'multiple', { updates }, req);

        for (const key of keys) {
            let value = updates[key];
            if (typeof value !== 'string') value = String(value);

            await db.promise().query(
                `UPDATE system_config 
                 SET config_value = ?, updated_by = ?, updated_at = NOW() 
                 WHERE config_key = ?`,
                [value, userId, key]
            );
        }

        res.json({ status: 'success', message: 'Configuration updated successfully' });

    } catch (error) {
        console.error('Update Config Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// ==========================================
// Internal Helper: Log Action
// ==========================================
const logAdminAction = async (adminId, actionType, targetType, targetId, details, req) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        await db.promise().query(`
            INSERT INTO admin_activity_logs 
            (admin_user_id, action_type, target_type, target_id, details, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            adminId,
            actionType,
            targetType,
            targetId,
            JSON.stringify(details),
            ip,
            userAgent
        ]);
    } catch (e) {
        console.error('Failed to log admin action:', e);
    }
};

exports.logAdminAction = logAdminAction;
