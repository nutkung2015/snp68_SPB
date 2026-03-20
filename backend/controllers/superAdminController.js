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
// Create Juristic Account + Assign to Project
// ==========================================
exports.createJuristicAccount = async (req, res) => {
    try {
        const {
            full_name,
            email,
            phone,
            password,
            role = 'juristic',      // 'juristic' หรือ 'juristicLeader'
            project_id              // ID ของโครงการที่ต้องการเพิ่มเข้า
        } = req.body;

        // --- Validation ---
        if (!full_name || !email || !password || !project_id) {
            return res.status(400).json({
                status: 'error',
                message: 'กรุณากรอก full_name, email, password และ project_id'
            });
        }

        // จำกัดให้สร้างได้เฉพาะ role นิติบุคคลเท่านั้น
        const allowedRoles = ['juristic', 'juristicLeader'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                status: 'error',
                message: `role ต้องเป็น ${allowedRoles.join(' หรือ ')} เท่านั้น`
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                status: 'error',
                message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
            });
        }

        // --- เช็คอีเมลซ้ำ ---
        const [existingEmail] = await db.promise().query(
            'SELECT id FROM users WHERE email = ?', [email]
        );
        if (existingEmail.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'อีเมลนี้ถูกใช้งานแล้ว'
            });
        }

        // --- เช็คเบอร์โทรซ้ำ (ถ้ามี) ---
        if (phone) {
            const [existingPhone] = await db.promise().query(
                'SELECT id FROM users WHERE phone = ?', [phone]
            );
            if (existingPhone.length > 0) {
                return res.status(409).json({
                    status: 'error',
                    message: 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว'
                });
            }
        }

        // --- เช็คว่าโครงการมีอยู่จริง ---
        const [projectExists] = await db.promise().query(
            'SELECT id, name FROM projects WHERE id = ?', [project_id]
        );
        if (projectExists.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'ไม่พบโครงการที่ระบุ'
            });
        }

        // --- สร้าง User ---
        const bcrypt = require('bcrypt');
        const { v4: uuidv4 } = require('uuid');

        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 10);

        // ตาราง users ใช้ ENUM('resident','juristic','super-admin','security')
        // ดังนั้นต้องใส่เป็น 'juristic' เสมอ ส่วน role ย่อย (juristicLeader/juristicMember) ใช้ใน project_members
        const userRole = 'juristic';

        await db.promise().execute(
            `INSERT INTO users (id, full_name, phone, email, password, role, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [userId, full_name, phone || null, email, hashedPassword, userRole]
        );

        // --- เพิ่มเข้า project_members ---
        const membershipId = uuidv4();
        await db.promise().execute(
            `INSERT INTO project_members (id, user_id, project_id, role, joined_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [membershipId, userId, project_id, role]
        );

        // --- Log Action ---
        await logAdminAction(
            req.user.id,
            'CREATE',
            'juristic_account',
            userId,
            {
                full_name,
                email,
                phone,
                role,
                project_id,
                project_name: projectExists[0].name
            },
            req
        );

        res.status(201).json({
            status: 'success',
            message: `สร้างบัญชีนิติบุคคลสำเร็จ และเพิ่มเข้าโครงการ "${projectExists[0].name}" แล้ว`,
            data: {
                user: {
                    id: userId,
                    full_name,
                    email,
                    phone: phone || null,
                    role: userRole
                },
                project_membership: {
                    id: membershipId,
                    project_id,
                    project_name: projectExists[0].name,
                    role
                }
            }
        });

    } catch (error) {
        console.error('Error in createJuristicAccount:', error);
        res.status(500).json({
            status: 'error',
            message: 'เกิดข้อผิดพลาดในการสร้างบัญชีนิติบุคคล'
        });
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
