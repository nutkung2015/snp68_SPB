const { Expo } = require('expo-server-sdk');
const db = require('../config/db');

// Create a new Expo SDK client
let expo = new Expo();

/**
 * Send push notifications to specific users
 * @param {Array<string>} userIds - List of User IDs to notify
 * @param {string} title - Notification Title
 * @param {string} body - Notification Body
 * @param {Object} data - Extra data payload (e.g., { screen: 'EstampRequest', log_id: '...' })
 */
exports.sendNotificationToUsers = async (userIds, title, body, data = {}) => {
    try {
        if (!userIds || userIds.length === 0) return;

        // 1. Get Push Tokens for these users from DB
        // Assuming table `user_tokens` or column in `users` table
        const placeholders = userIds.map(() => '?').join(',');
        const query = `
      SELECT push_token FROM users 
      WHERE id IN (${placeholders}) 
      AND push_token IS NOT NULL 
      AND push_token != ''
    `;

        const [rows] = await db.promise().query(query, userIds);
        const pushTokens = rows.map(r => r.push_token);

        if (pushTokens.length === 0) {
            console.log('No push tokens found for users:', userIds);
            return;
        }

        // 2. Construct messages
        let messages = [];
        for (let pushToken of pushTokens) {
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`Push token ${pushToken} is not a valid Expo push token`);
                continue;
            }

            messages.push({
                to: pushToken,
                sound: 'default',
                title: title,
                body: body,
                data: data,
                priority: 'high',
            });
        }

        // 3. Send notifications in chunks
        let chunks = expo.chunkPushNotifications(messages);
        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log('Notification sent tickets:', ticketChunk);
            } catch (error) {
                console.error('Error sending notification chunk:', error);
            }
        }
    } catch (error) {
        console.error('Error in sendNotificationToUsers:', error);
    }
};
