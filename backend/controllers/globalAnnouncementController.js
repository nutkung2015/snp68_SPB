const db = require('../config/db');
const { logAdminAction } = require('./superAdminController');

// GET /api/super-admin/global-announcements
exports.getAllAnnouncements = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const [rows] = await db.promise().query(
            'SELECT * FROM global_announcements ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [parseInt(limit), parseInt(offset)]
        );

        const [countResult] = await db.promise().query('SELECT COUNT(*) as total FROM global_announcements');

        res.json({
            status: 'success',
            data: rows,
            pagination: {
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get Global Announcements Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// POST /api/super-admin/global-announcements
exports.createAnnouncement = async (req, res) => {
    try {
        const { title, content, type, target_projects, start_date, end_date, is_active } = req.body;
        const createdBy = req.user.id;

        const insertQuery = `
            INSERT INTO global_announcements 
            (title, content, type, target_projects, is_active, start_date, end_date, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        // target_projects logic:
        // - null, undefined, or empty array [] = NULL in DB (means ALL projects)
        // - array with values [1, 2] = JSON string in DB (means specific projects only)
        const targetProjectsJson = (target_projects && Array.isArray(target_projects) && target_projects.length > 0)
            ? JSON.stringify(target_projects)
            : null;

        const [result] = await db.promise().query(insertQuery, [
            title,
            content,
            type || 'info',
            targetProjectsJson,
            is_active !== undefined ? is_active : true,
            start_date || null,
            end_date || null,
            createdBy
        ]);

        // Log Action
        await logAdminAction(createdBy, 'CREATE', 'global_announcement', result.insertId, { title }, req);

        res.status(201).json({
            status: 'success',
            message: 'Announcement created successfully',
            data: { id: result.insertId }
        });

    } catch (error) {
        console.error('Create Global Announcement Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// PUT /api/super-admin/global-announcements/:id
exports.updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, type, target_projects, is_active, start_date, end_date } = req.body;

        // Build update query dynamically
        let updates = [];
        let params = [];

        if (title) { updates.push('title = ?'); params.push(title); }
        if (content) { updates.push('content = ?'); params.push(content); }
        if (type) { updates.push('type = ?'); params.push(type); }
        if (target_projects !== undefined) {
            updates.push('target_projects = ?');
            // Same logic as create: empty array = NULL (all projects)
            const targetProjectsValue = (target_projects && Array.isArray(target_projects) && target_projects.length > 0)
                ? JSON.stringify(target_projects)
                : null;
            params.push(targetProjectsValue);
        }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
        if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date); }
        if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date); }

        if (updates.length === 0) return res.status(400).json({ status: 'error', message: 'No changes' });

        params.push(id);

        await db.promise().query(
            `UPDATE global_announcements SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        // Log
        await logAdminAction(req.user.id, 'UPDATE', 'global_announcement', id, req.body, req);

        res.json({ status: 'success', message: 'Announcement updated' });

    } catch (error) {
        console.error('Update Global Announcement Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// DELETE /api/super-admin/global-announcements/:id
exports.deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        await db.promise().query('DELETE FROM global_announcements WHERE id = ?', [id]);

        await logAdminAction(req.user.id, 'DELETE', 'global_announcement', id, {}, req);

        res.json({ status: 'success', message: 'Announcement deleted' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// ==========================================
// Public/User Facing API (For Projects to fetch)
// ==========================================
// Helper function to be used by User Controllers, not necessarily an endpoint here
// But we can expose a route like /api/global-announcements (protected by normal auth)
exports.getAnnouncementsForProject = async (req, res) => {
    try {
        const { project_id } = req.query; // Or from req.user context

        // Query: Active AND (Valid Dates) AND (Target is NULL OR Target contains ProjectID)
        const query = `
            SELECT id, title, content, type, start_date, created_at
            FROM global_announcements
            WHERE is_active = TRUE
              AND (start_date IS NULL OR start_date <= NOW())
              AND (end_date IS NULL OR end_date >= NOW())
              AND (
                  target_projects IS NULL 
                  OR JSON_CONTAINS(target_projects, ?)
              )
            ORDER BY created_at DESC
        `;

        // Note: JSON_CONTAINS requires the target to be a JSON string like '"123"'
        const projectIdStr = JSON.stringify(String(project_id));

        const [rows] = await db.promise().query(query, [projectIdStr]);

        res.json({ status: 'success', data: rows });

    } catch (error) {
        console.error('Fetch Announcements For Project Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// GET /api/announcements/global/:id - Get single global announcement detail
exports.getGlobalAnnouncementById = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT id, title, content, type, start_date, end_date, created_at
            FROM global_announcements
            WHERE id = ? AND is_active = TRUE
        `;

        const [rows] = await db.promise().query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'ไม่พบประกาศที่ต้องการ'
            });
        }

        res.json({
            status: 'success',
            data: rows[0]
        });

    } catch (error) {
        console.error('Get Global Announcement By ID Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};
