const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

/**
 * Notification Controller
 * จัดการ notifications API สำหรับ mobile app
 */

// =============================================
// POST /api/notifications/register-token
// ลงทะเบียน Push Token
// =============================================
exports.registerPushToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const { push_token, device_type = 'android', device_name = null } = req.body;

        if (!push_token) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ push_token"
            });
        }

        // Check if token already exists
        const [existing] = await db.promise().query(
            "SELECT id FROM device_tokens WHERE user_id = ? AND push_token = ?",
            [userId, push_token]
        );

        if (existing.length > 0) {
            // Update existing token
            await db.promise().execute(
                `UPDATE device_tokens 
                 SET is_active = TRUE, last_used_at = NOW(), device_name = COALESCE(?, device_name)
                 WHERE id = ?`,
                [device_name, existing[0].id]
            );

            return res.json({
                status: "success",
                message: "อัพเดต push token สำเร็จ"
            });
        }

        // Insert new token
        const id = uuidv4();
        await db.promise().execute(
            `INSERT INTO device_tokens (id, user_id, push_token, device_type, device_name)
             VALUES (?, ?, ?, ?, ?)`,
            [id, userId, push_token, device_type, device_name]
        );

        res.status(201).json({
            status: "success",
            message: "ลงทะเบียน push token สำเร็จ",
            data: { id }
        });
    } catch (error) {
        console.error("Error registering push token:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการลงทะเบียน push token"
        });
    }
};

// =============================================
// DELETE /api/notifications/unregister-token
// ยกเลิกการลงทะเบียน Push Token (เมื่อ logout)
// =============================================
exports.unregisterPushToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const { push_token } = req.body;

        if (!push_token) {
            return res.status(400).json({
                status: "error",
                message: "กรุณาระบุ push_token"
            });
        }

        await db.promise().execute(
            `UPDATE device_tokens SET is_active = FALSE WHERE user_id = ? AND push_token = ?`,
            [userId, push_token]
        );

        res.json({
            status: "success",
            message: "ยกเลิกการลงทะเบียน push token สำเร็จ"
        });
    } catch (error) {
        console.error("Error unregistering push token:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการยกเลิก push token"
        });
    }
};

// =============================================
// GET /api/notifications
// ดึงรายการ notifications ทั้งหมดของ user
// =============================================
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, is_read } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT 
                id,
                type,
                title,
                body,
                reference_type,
                reference_id,
                data,
                is_read,
                read_at,
                created_at
            FROM notifications
            WHERE user_id = ?
        `;
        const params = [userId];

        // Filter by read status
        if (is_read !== undefined) {
            query += ` AND is_read = ?`;
            params.push(is_read === 'true' || is_read === '1');
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const [rows] = await db.promise().query(query, params);

        // Get total count
        const [countResult] = await db.promise().query(
            `SELECT COUNT(*) as total FROM notifications WHERE user_id = ?`,
            [userId]
        );

        // Get unread count
        const [unreadResult] = await db.promise().query(
            `SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = FALSE`,
            [userId]
        );

        // Parse JSON data
        const notifications = rows.map(row => ({
            ...row,
            data: row.data ? (typeof row.data === 'string' ? JSON.parse(row.data) : row.data) : null
        }));

        res.json({
            status: "success",
            data: notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                total_pages: Math.ceil(countResult[0].total / parseInt(limit))
            },
            summary: {
                unread_count: unreadResult[0].unread
            }
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาดในการดึงรายการแจ้งเตือน"
        });
    }
};

// =============================================
// GET /api/notifications/unread-count
// ดึงจำนวน notifications ที่ยังไม่อ่าน
// =============================================
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const [result] = await db.promise().query(
            `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
            [userId]
        );

        res.json({
            status: "success",
            data: {
                unread_count: result[0].count
            }
        });
    } catch (error) {
        console.error("Error fetching unread count:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาด"
        });
    }
};

// =============================================
// PUT /api/notifications/:id/read
// Mark notification as read
// =============================================
exports.markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [result] = await db.promise().execute(
            `UPDATE notifications 
             SET is_read = TRUE, read_at = NOW() 
             WHERE id = ? AND user_id = ?`,
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบการแจ้งเตือน"
            });
        }

        res.json({
            status: "success",
            message: "อ่านแล้ว"
        });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาด"
        });
    }
};

// =============================================
// PUT /api/notifications/read-all
// Mark all notifications as read
// =============================================
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        const [result] = await db.promise().execute(
            `UPDATE notifications 
             SET is_read = TRUE, read_at = NOW() 
             WHERE user_id = ? AND is_read = FALSE`,
            [userId]
        );

        res.json({
            status: "success",
            message: `อ่านแล้ว ${result.affectedRows} รายการ`,
            data: {
                updated_count: result.affectedRows
            }
        });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาด"
        });
    }
};

// =============================================
// DELETE /api/notifications/:id
// Delete a notification
// =============================================
exports.deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [result] = await db.promise().execute(
            `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: "error",
                message: "ไม่พบการแจ้งเตือน"
            });
        }

        res.json({
            status: "success",
            message: "ลบการแจ้งเตือนสำเร็จ"
        });
    } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาด"
        });
    }
};

// =============================================
// DELETE /api/notifications/clear-all
// Clear all notifications
// =============================================
exports.clearAllNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const [result] = await db.promise().execute(
            `DELETE FROM notifications WHERE user_id = ?`,
            [userId]
        );

        res.json({
            status: "success",
            message: `ลบ ${result.affectedRows} รายการ`,
            data: {
                deleted_count: result.affectedRows
            }
        });
    } catch (error) {
        console.error("Error clearing notifications:", error);
        res.status(500).json({
            status: "error",
            message: "เกิดข้อผิดพลาด"
        });
    }
};
