const { Expo } = require('expo-server-sdk');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Push Notification Service
 * จัดการการส่ง push notifications และเก็บประวัติ
 */

// สร้าง Expo client
const expo = new Expo();

// Notification Types
const NOTIFICATION_TYPES = {
    REPAIR_STATUS_UPDATE: 'repair_status_update',
    ISSUE_STATUS_UPDATE: 'issue_status_update',
    VISITOR_EXIT_STAMP: 'visitor_exit_stamp',
    ANNOUNCEMENT: 'announcement',
    SYSTEM: 'system'
};

// Reference Types
const REFERENCE_TYPES = {
    REPAIR: 'repair',
    ISSUE: 'issue',
    VISITOR: 'visitor',
    ANNOUNCEMENT: 'announcement',
    NONE: 'none'
};

/**
 * ดึง Push Tokens ของ user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of push tokens
 */
async function getUserPushTokens(userId) {
    const [tokens] = await db.promise().query(
        `SELECT push_token, device_type 
         FROM device_tokens 
         WHERE user_id = ? AND is_active = TRUE`,
        [userId]
    );
    return tokens;
}

/**
 * ดึง Push Tokens ของหลาย users
 * @param {Array<string>} userIds - Array of User IDs
 * @returns {Promise<Array>} - Array of push tokens with user_id
 */
async function getMultipleUsersPushTokens(userIds) {
    if (!userIds || userIds.length === 0) return [];

    const placeholders = userIds.map(() => '?').join(',');
    const [tokens] = await db.promise().query(
        `SELECT user_id, push_token, device_type 
         FROM device_tokens 
         WHERE user_id IN (${placeholders}) AND is_active = TRUE`,
        userIds
    );
    return tokens;
}

/**
 * บันทึก Notification ลงฐานข้อมูล
 * @param {Object} notification - Notification data
 * @returns {Promise<string>} - Notification ID
 */
async function saveNotification(notification) {
    const id = uuidv4();
    const {
        user_id,
        project_id = null,
        type,
        title,
        body,
        reference_type = 'none',
        reference_id = null,
        data = null
    } = notification;

    await db.promise().execute(
        `INSERT INTO notifications 
            (id, user_id, project_id, type, title, body, reference_type, reference_id, data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            user_id,
            project_id,
            type,
            title,
            body,
            reference_type,
            reference_id,
            data ? JSON.stringify(data) : null
        ]
    );

    return id;
}

/**
 * ส่ง Push Notification
 * @param {Array<string>} pushTokens - Array of Expo push tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Extra data
 * @returns {Promise<Object>} - Result
 */
async function sendPushNotifications(pushTokens, title, body, data = {}) {
    if (!pushTokens || pushTokens.length === 0) {
        return { sent: 0, errors: [] };
    }

    // Filter valid Expo push tokens
    const validTokens = pushTokens.filter(token =>
        token && Expo.isExpoPushToken(token)
    );

    if (validTokens.length === 0) {
        console.log('No valid Expo push tokens found');
        return { sent: 0, errors: ['No valid tokens'] };
    }

    // สร้าง messages
    const messages = validTokens.map(token => ({
        to: token,
        sound: 'default',
        title: title,
        body: body,
        data: data,
        priority: 'high',
        channelId: 'default',
    }));

    // ส่งแบบ chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    const errors = [];

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error('Error sending push notification chunk:', error);
            errors.push(error.message);
        }
    }

    // Log results
    console.log(`[Push] Sent ${tickets.length} notifications`);

    return {
        sent: tickets.length,
        tickets: tickets,
        errors: errors
    };
}

/**
 * อัพเดต push_sent status
 * @param {string} notificationId - Notification ID
 * @param {boolean} success - Success or not
 * @param {string} error - Error message if failed
 */
async function updatePushStatus(notificationId, success, error = null) {
    await db.promise().execute(
        `UPDATE notifications 
         SET push_sent = ?, push_sent_at = NOW(), push_error = ?
         WHERE id = ?`,
        [success, error, notificationId]
    );
}

// =============================================
// High-Level Functions for Each Notification Type
// =============================================

/**
 * ส่ง Notification เมื่ออัพเดตสถานะซ่อมแซม
 * @param {string} repairId - Repair request ID
 * @param {string} userId - User (resident) ID
 * @param {string} projectId - Project ID
 * @param {string} newStatus - New status
 * @param {string} repairTitle - Repair title/description
 */
async function notifyRepairStatusUpdate(repairId, userId, projectId, newStatus, repairTitle) {
    const statusLabels = {
        'pending': 'รอดำเนินการ',
        'in_progress': 'กำลังดำเนินการ',
        'completed': 'ดำเนินการเสร็จสิ้น',
        'cancelled': 'ยกเลิก'
    };

    const title = '🔧 อัพเดตสถานะแจ้งซ่อม';
    const body = `"${repairTitle}" สถานะเป็น: ${statusLabels[newStatus] || newStatus}`;

    try {
        // บันทึก notification
        const notificationId = await saveNotification({
            user_id: userId,
            project_id: projectId,
            type: NOTIFICATION_TYPES.REPAIR_STATUS_UPDATE,
            title: title,
            body: body,
            reference_type: REFERENCE_TYPES.REPAIR,
            reference_id: repairId,
            data: { repair_id: repairId, status: newStatus }
        });

        // ดึง push tokens
        const tokens = await getUserPushTokens(userId);
        const pushTokens = tokens.map(t => t.push_token);

        // ส่ง push notification
        const result = await sendPushNotifications(pushTokens, title, body, {
            type: NOTIFICATION_TYPES.REPAIR_STATUS_UPDATE,
            reference_type: REFERENCE_TYPES.REPAIR,
            reference_id: repairId,
            notification_id: notificationId
        });

        // อัพเดต status
        await updatePushStatus(notificationId, result.sent > 0, result.errors.join(', ') || null);

        return { success: true, notificationId, pushResult: result };
    } catch (error) {
        console.error('Error in notifyRepairStatusUpdate:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ส่ง Notification เมื่ออัพเดตสถานะรายงานปัญหา
 * @param {string} issueId - Issue ID
 * @param {string} userId - User (resident) ID
 * @param {string} projectId - Project ID
 * @param {string} newStatus - New status
 * @param {string} issueTitle - Issue title/description
 */
async function notifyIssueStatusUpdate(issueId, userId, projectId, newStatus, issueTitle) {
    const statusLabels = {
        'pending': 'รอดำเนินการ',
        'in_progress': 'กำลังดำเนินการ',
        'resolved': 'แก้ไขแล้ว',
        'closed': 'ปิดเรื่อง'
    };

    const title = '📋 อัพเดตสถานะรายงานปัญหา';
    const body = `"${issueTitle}" สถานะเป็น: ${statusLabels[newStatus] || newStatus}`;

    try {
        const notificationId = await saveNotification({
            user_id: userId,
            project_id: projectId,
            type: NOTIFICATION_TYPES.ISSUE_STATUS_UPDATE,
            title: title,
            body: body,
            reference_type: REFERENCE_TYPES.ISSUE,
            reference_id: issueId,
            data: { issue_id: issueId, status: newStatus }
        });

        const tokens = await getUserPushTokens(userId);
        const pushTokens = tokens.map(t => t.push_token);

        const result = await sendPushNotifications(pushTokens, title, body, {
            type: NOTIFICATION_TYPES.ISSUE_STATUS_UPDATE,
            reference_type: REFERENCE_TYPES.ISSUE,
            reference_id: issueId,
            notification_id: notificationId
        });

        await updatePushStatus(notificationId, result.sent > 0, result.errors.join(', ') || null);

        return { success: true, notificationId, pushResult: result };
    } catch (error) {
        console.error('Error in notifyIssueStatusUpdate:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ส่ง Notification เมื่อ รปภ. ขอประทับตราขาออก
 * @param {string} visitorId - Visitor entry ID
 * @param {string} unitId - Unit ID
 * @param {string} projectId - Project ID
 * @param {string} visitorName - Visitor name
 * @param {string} licensePlate - Vehicle license plate
 */
async function notifyVisitorExitStamp(visitorId, unitId, projectId, visitorName, licensePlate) {
    const title = '🚗 มีผู้มาเยี่ยมรอประทับตราขาออก';
    const body = `${visitorName}${licensePlate ? ` (${licensePlate})` : ''} รอประทับตราขาออก`;

    try {
        // ดึง users ทั้งหมดของ unit นี้
        const [unitMembers] = await db.promise().query(
            `SELECT user_id FROM unit_members WHERE unit_id = ?`,
            [unitId]
        );

        if (unitMembers.length === 0) {
            console.log('No unit members found for unit:', unitId);
            return { success: false, error: 'No unit members found' };
        }

        const userIds = unitMembers.map(m => m.user_id);

        // สร้าง notification สำหรับแต่ละ user
        const notificationIds = [];
        for (const userId of userIds) {
            const notificationId = await saveNotification({
                user_id: userId,
                project_id: projectId,
                type: NOTIFICATION_TYPES.VISITOR_EXIT_STAMP,
                title: title,
                body: body,
                reference_type: REFERENCE_TYPES.VISITOR,
                reference_id: visitorId,
                data: {
                    visitor_id: visitorId,
                    visitor_name: visitorName,
                    license_plate: licensePlate,
                    unit_id: unitId
                }
            });
            notificationIds.push({ userId, notificationId });
        }

        // ดึง push tokens ทั้งหมด
        const tokens = await getMultipleUsersPushTokens(userIds);
        const pushTokens = tokens.map(t => t.push_token);

        // ส่ง push notification
        const result = await sendPushNotifications(pushTokens, title, body, {
            type: NOTIFICATION_TYPES.VISITOR_EXIT_STAMP,
            reference_type: REFERENCE_TYPES.VISITOR,
            reference_id: visitorId
        });

        // อัพเดต status ทั้งหมด
        for (const { notificationId } of notificationIds) {
            await updatePushStatus(notificationId, result.sent > 0, result.errors.join(', ') || null);
        }

        return { success: true, notificationIds, pushResult: result };
    } catch (error) {
        console.error('Error in notifyVisitorExitStamp:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ส่ง Notification ประกาศ (Broadcast to all project members)
 * @param {string} projectId - Project ID
 * @param {string} title - Announcement title
 * @param {string} body - Announcement body
 * @param {string} announcementId - Announcement ID (optional)
 */
async function notifyAnnouncement(projectId, title, body, announcementId = null) {
    try {
        // ดึง users ทั้งหมดของโปรเจกต์
        const [projectMembers] = await db.promise().query(
            `SELECT user_id FROM project_members WHERE project_id = ?`,
            [projectId]
        );

        if (projectMembers.length === 0) {
            return { success: false, error: 'No project members found' };
        }

        const userIds = projectMembers.map(m => m.user_id);

        // สร้าง notification สำหรับแต่ละ user
        for (const userId of userIds) {
            await saveNotification({
                user_id: userId,
                project_id: projectId,
                type: NOTIFICATION_TYPES.ANNOUNCEMENT,
                title: `📢 ${title}`,
                body: body,
                reference_type: REFERENCE_TYPES.ANNOUNCEMENT,
                reference_id: announcementId,
                data: { announcement_id: announcementId }
            });
        }

        // ส่ง push notification
        const tokens = await getMultipleUsersPushTokens(userIds);
        const pushTokens = tokens.map(t => t.push_token);

        const result = await sendPushNotifications(pushTokens, `📢 ${title}`, body, {
            type: NOTIFICATION_TYPES.ANNOUNCEMENT,
            reference_type: REFERENCE_TYPES.ANNOUNCEMENT,
            reference_id: announcementId
        });

        return { success: true, pushResult: result };
    } catch (error) {
        console.error('Error in notifyAnnouncement:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    // Types
    NOTIFICATION_TYPES,
    REFERENCE_TYPES,

    // Low-level functions
    getUserPushTokens,
    getMultipleUsersPushTokens,
    saveNotification,
    sendPushNotifications,
    updatePushStatus,

    // High-level functions
    notifyRepairStatusUpdate,
    notifyIssueStatusUpdate,
    notifyVisitorExitStamp,
    notifyAnnouncement
};
