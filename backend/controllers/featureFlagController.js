const db = require('../config/db');
const { logAdminAction } = require('./superAdminController');

// GET /api/super-admin/feature-flags/:projectId
exports.getProjectFlags = async (req, res) => {
    try {
        const { projectId } = req.params;
        const [rows] = await db.promise().query(
            'SELECT feature_name, is_enabled FROM project_feature_flags WHERE project_id = ?',
            [projectId]
        );
        res.json({ status: 'success', data: rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// POST /api/super-admin/feature-flags
// Update or Create a flag
exports.upsertProjectFlag = async (req, res) => {
    try {
        const { project_id, feature_name, is_enabled } = req.body;

        if (!project_id || !feature_name) {
            return res.status(400).json({ status: 'error', message: 'Missing fields' });
        }

        const query = `
            INSERT INTO project_feature_flags (project_id, feature_name, is_enabled)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled), updated_at = NOW()
        `;

        await db.promise().query(query, [project_id, feature_name, is_enabled]);

        await logAdminAction(req.user.id, 'UPDATE', 'feature_flag', `${project_id}:${feature_name}`, { is_enabled }, req);

        res.json({ status: 'success', message: 'Feature flag updated' });
    } catch (error) {
        console.error('Upsert Flag Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};
