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
// Get Single User
// ==========================================
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const [users] = await db.promise().query(
            `SELECT 
                u.id, u.email, u.full_name, u.phone, u.role,
                u.profile_image_url, u.is_verified,
                u.created_at, u.updated_at
             FROM users u
             WHERE u.id = ?`,
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'ไม่พบผู้ใช้ที่ระบุ'
            });
        }

        // ดึง project memberships ของ user
        const [memberships] = await db.promise().query(
            `SELECT pm.id, pm.project_id, pm.role, pm.joined_at, p.name as project_name
             FROM project_members pm
             LEFT JOIN projects p ON pm.project_id = p.id
             WHERE pm.user_id = ?`,
            [id]
        );

        res.json({
            status: 'success',
            data: {
                ...users[0],
                project_memberships: memberships
            }
        });

    } catch (error) {
        console.error('Get User By ID Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// ==========================================
// Update User
// ==========================================
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        // --- ตรวจสอบว่า user มีอยู่จริง ---
        const [existingUser] = await db.promise().query(
            'SELECT id, email, phone, full_name, role FROM users WHERE id = ?', [id]
        );
        if (existingUser.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'ไม่พบผู้ใช้ที่ระบุ'
            });
        }

        const currentUser = existingUser[0];

        // --- Whitelist เฉพาะ fields ที่อนุญาตให้แก้ ---
        const allowedFields = ['full_name', 'phone', 'email', 'role'];
        const updates = {};
        const changedFields = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined && req.body[field] !== currentUser[field]) {
                updates[field] = req.body[field];
                changedFields[field] = { from: currentUser[field], to: req.body[field] };
            }
        }

        // ถ้าไม่มีอะไรเปลี่ยน
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'ไม่มีข้อมูลที่เปลี่ยนแปลง'
            });
        }

        // --- Validate role (ถ้ามีการเปลี่ยน) ---
        if (updates.role) {
            const allowedRoles = ['resident', 'juristic', 'super-admin', 'security'];
            if (!allowedRoles.includes(updates.role)) {
                return res.status(400).json({
                    status: 'error',
                    message: `role ต้องเป็น ${allowedRoles.join(', ')} เท่านั้น`
                });
            }
        }

        // --- เช็คอีเมลซ้ำ (ถ้ามีการเปลี่ยน) ---
        if (updates.email) {
            const [emailExists] = await db.promise().query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [updates.email, id]
            );
            if (emailExists.length > 0) {
                return res.status(409).json({
                    status: 'error',
                    message: 'อีเมลนี้ถูกใช้งานแล้ว'
                });
            }
        }

        // --- เช็คเบอร์โทรซ้ำ (ถ้ามีการเปลี่ยน) ---
        if (updates.phone) {
            const [phoneExists] = await db.promise().query(
                'SELECT id FROM users WHERE phone = ? AND id != ?',
                [updates.phone, id]
            );
            if (phoneExists.length > 0) {
                return res.status(409).json({
                    status: 'error',
                    message: 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว'
                });
            }
        }

        // --- Build dynamic UPDATE query ---
        const setClauses = Object.keys(updates).map(key => `${key} = ?`);
        setClauses.push('updated_at = NOW()');
        const values = Object.values(updates);
        values.push(id);

        await db.promise().execute(
            `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
            values
        );

        // --- Log Action ---
        await logAdminAction(adminId, 'UPDATE', 'user', id, changedFields, req);

        // --- ดึงข้อมูลใหม่ ---
        const [updatedUser] = await db.promise().query(
            'SELECT id, email, full_name, phone, role, created_at, updated_at FROM users WHERE id = ?',
            [id]
        );

        res.json({
            status: 'success',
            message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ',
            data: updatedUser[0]
        });

    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้'
        });
    }
};

// ==========================================
// Send Reset Password Link (via Email)
// ==========================================
exports.sendResetLink = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;
        const crypto = require('crypto');
        const { v4: uuidv4 } = require('uuid');
        const { sendResetPasswordEmail } = require('../services/emailService');

        // --- ตรวจสอบว่า user มีอยู่จริง + มี email ---
        const [existingUser] = await db.promise().query(
            'SELECT id, email, full_name FROM users WHERE id = ?', [id]
        );
        if (existingUser.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'ไม่พบผู้ใช้ที่ระบุ'
            });
        }

        const targetUser = existingUser[0];

        if (!targetUser.email) {
            return res.status(400).json({
                status: 'error',
                message: 'ผู้ใช้ไม่มีอีเมล ไม่สามารถส่งลิงก์รีเซ็ตได้'
            });
        }

        // --- ยกเลิก token เก่าที่ยังไม่ได้ใช้ ---
        await db.promise().execute(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
            [id]
        );

        // --- สร้าง token ใหม่ ---
        const tokenId = uuidv4();
        const token = crypto.randomBytes(32).toString('hex'); // 64 chars
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 นาที

        await db.promise().execute(
            `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_by)
             VALUES (?, ?, ?, ?, ?)`,
            [tokenId, id, token, expiresAt, adminId]
        );

        // --- สร้าง reset link ---
        const baseUrl = process.env.RESET_PASSWORD_BASE_URL || `http://localhost:${process.env.PORT || 5000}/reset-password`;
        const resetLink = `${baseUrl}?token=${token}`;

        // --- ส่ง email ---
        await sendResetPasswordEmail(targetUser.email, targetUser.full_name, resetLink);

        // --- Log Action (ไม่เก็บ token ใน log) ---
        await logAdminAction(
            adminId, 'SEND_RESET_LINK', 'user', id,
            { target_email: targetUser.email, target_name: targetUser.full_name },
            req
        );

        res.json({
            status: 'success',
            message: `ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง "${targetUser.email}" สำเร็จ`,
            data: {
                email_sent_to: targetUser.email,
                expires_in_minutes: 15
            }
        });

    } catch (error) {
        console.error('Send Reset Link Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'เกิดข้อผิดพลาดในการส่งลิงก์รีเซ็ตรหัสผ่าน'
        });
    }
};

// ==========================================
// Delete User
// ==========================================
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        // --- ป้องกันลบตัวเอง ---
        if (id === adminId) {
            return res.status(400).json({
                status: 'error',
                message: 'ไม่สามารถลบบัญชีของตัวเองได้'
            });
        }

        // --- ตรวจสอบว่า user มีอยู่จริง ---
        const [existingUser] = await db.promise().query(
            'SELECT id, email, full_name, role FROM users WHERE id = ?', [id]
        );
        if (existingUser.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'ไม่พบผู้ใช้ที่ระบุ'
            });
        }

        const targetUser = existingUser[0];

        // --- ป้องกันลบ super-admin คนอื่น (optional safety) ---
        if (targetUser.role === 'super-admin') {
            return res.status(403).json({
                status: 'error',
                message: 'ไม่สามารถลบบัญชี Super Admin ได้'
            });
        }

        // --- ลบข้อมูลที่เกี่ยวข้อง (cascade) ---
        // 1. ลบ project_members
        await db.promise().execute(
            'DELETE FROM project_members WHERE user_id = ?', [id]
        );

        // 2. ลบ unit_members
        await db.promise().execute(
            'DELETE FROM unit_members WHERE user_id = ?', [id]
        );

        // 3. ลบ user
        await db.promise().execute(
            'DELETE FROM users WHERE id = ?', [id]
        );

        // --- Log Action ---
        await logAdminAction(
            adminId, 'DELETE', 'user', id,
            {
                deleted_email: targetUser.email,
                deleted_name: targetUser.full_name,
                deleted_role: targetUser.role
            },
            req
        );

        res.json({
            status: 'success',
            message: `ลบผู้ใช้ "${targetUser.full_name}" (${targetUser.email}) สำเร็จ`
        });

    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'เกิดข้อผิดพลาดในการลบผู้ใช้'
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
