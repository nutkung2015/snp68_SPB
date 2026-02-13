import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './apiService';

/**
 * Notification Service
 * จัดการ Push Notifications สำหรับ Mobile App
 * 
 * Features:
 * - ขอ Permission และ Register Push Token
 * - ส่ง Token ไป Backend
 * - จัดการ Notification History
 * - Handle Notification Events
 */

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Storage Keys
const PUSH_TOKEN_KEY = '@push_token';

class NotificationService {
    // =============================================
    // Push Token Registration
    // =============================================

    /**
     * ขอ Permission และ Register Push Token
     * ควรเรียกหลังจาก user login
     * @returns {Promise<string|null>} - Expo Push Token หรือ null
     */
    static async registerForPushNotifications() {
        try {
            console.log('[Notification] Step 1: Checking if physical device...');
            // ตรวจสอบว่าเป็นอุปกรณ์จริง (ไม่ใช่ Simulator)
            if (!Device.isDevice) {
                console.log('[Notification] STOP - Push notifications only work on physical devices');
                return null;
            }
            console.log('[Notification] Step 1: OK - Is physical device');

            // ขอ Permission
            console.log('[Notification] Step 2: Checking permissions...');
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            console.log('[Notification] Step 2: Existing permission status:', existingStatus);

            if (existingStatus !== 'granted') {
                console.log('[Notification] Step 2b: Requesting permissions...');
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
                console.log('[Notification] Step 2b: Requested permission status:', status);
            }

            if (finalStatus !== 'granted') {
                console.log('[Notification] STOP - Permission denied, finalStatus:', finalStatus);
                return null;
            }
            console.log('[Notification] Step 2: OK - Permission granted');

            // ดึง Expo Push Token
            console.log('[Notification] Step 3: Getting Expo Push Token...');
            const projectId = Constants.expoConfig?.extra?.eas?.projectId
                || Constants.easConfig?.projectId;
            console.log('[Notification] Step 3: projectId =', projectId);

            if (!projectId) {
                console.log('[Notification] STOP - No projectId found!');
                console.log('[Notification] expoConfig:', JSON.stringify(Constants.expoConfig?.extra));
                console.log('[Notification] easConfig:', JSON.stringify(Constants.easConfig));
                return null;
            }

            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: projectId,
            });

            const pushToken = tokenData.data;
            console.log('[Notification] Step 3: OK - Push Token:', pushToken);

            // บันทึก token ลง AsyncStorage
            await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);
            console.log('[Notification] Step 4: Token saved to AsyncStorage');

            // ส่ง token ไป Backend
            console.log('[Notification] Step 5: Saving token to backend...');
            await this.savePushTokenToBackend(pushToken);
            console.log('[Notification] Step 5: OK - Token saved to backend');

            // Setup notification channel for Android
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
                console.log('[Notification] Step 6: Android notification channel set');
            }

            return pushToken;
        } catch (error) {
            console.error('[Notification] ERROR registering push token:', error);
            console.error('[Notification] Error name:', error.name);
            console.error('[Notification] Error message:', error.message);
            return null;
        }
    }

    /**
     * ส่ง Push Token ไป Backend
     * @param {string} pushToken - Expo Push Token
     */
    static async savePushTokenToBackend(pushToken) {
        try {
            const token = await ApiService.getToken();
            if (!token) {
                console.log('[Notification] No auth token, skipping push token registration');
                return;
            }

            await ApiService.post('/api/notifications/register-token', {
                push_token: pushToken,
                device_type: Platform.OS,
                device_name: Device.deviceName || `${Device.brand} ${Device.modelName}`
            }, token);

            console.log('[Notification] Push token saved to backend');
        } catch (error) {
            console.error('[Notification] Error saving push token:', error);
        }
    }

    /**
     * ยกเลิก Push Token (เมื่อ Logout)
     */
    static async unregisterPushToken() {
        try {
            const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
            if (!pushToken) return;

            const token = await ApiService.getToken();
            if (token) {
                // Use POST instead of DELETE to send body with push_token
                await ApiService.post('/api/notifications/unregister-token', {
                    push_token: pushToken
                }, token);
            }

            await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
            console.log('[Notification] Push token unregistered');
        } catch (error) {
            console.error('[Notification] Error unregistering push token:', error);
        }
    }

    // =============================================
    // Notification History API
    // =============================================

    /**
     * ดึงรายการ Notifications
     * @param {Object} params - { page, limit, is_read }
     * @returns {Promise<Object>} - Notification list with pagination
     */
    static async getNotifications(params = {}) {
        const token = await ApiService.getToken();
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.is_read !== undefined) queryParams.append('is_read', params.is_read);

        const queryString = queryParams.toString();
        const url = `/api/notifications${queryString ? `?${queryString}` : ''}`;

        return ApiService.get(url, token);
    }

    /**
     * ดึงจำนวน Notifications ที่ยังไม่อ่าน
     * @returns {Promise<number>} - จำนวน unread
     */
    static async getUnreadCount() {
        try {
            const token = await ApiService.getToken();
            const response = await ApiService.get('/api/notifications/unread-count', token);
            return response?.data?.unread_count || 0;
        } catch (error) {
            console.error('[Notification] Error getting unread count:', error);
            return 0;
        }
    }

    /**
     * Mark notification as read
     * @param {string} notificationId - Notification ID
     */
    static async markAsRead(notificationId) {
        const token = await ApiService.getToken();
        return ApiService.put(`/api/notifications/${notificationId}/read`, {}, token);
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead() {
        const token = await ApiService.getToken();
        return ApiService.put('/api/notifications/read-all', {}, token);
    }

    /**
     * Delete a notification
     * @param {string} notificationId - Notification ID
     */
    static async deleteNotification(notificationId) {
        const token = await ApiService.getToken();
        return ApiService.delete(`/api/notifications/${notificationId}`, token);
    }

    /**
     * Clear all notifications
     */
    static async clearAllNotifications() {
        const token = await ApiService.getToken();
        return ApiService.delete('/api/notifications/clear-all', token);
    }

    // =============================================
    // Notification Event Handlers
    // =============================================

    /**
     * Add listener for received notifications (foreground)
     * @param {Function} callback - Callback function
     * @returns {Object} - Subscription to remove later
     */
    static addNotificationReceivedListener(callback) {
        return Notifications.addNotificationReceivedListener(callback);
    }

    /**
     * Add listener for notification response (user tapped)
     * @param {Function} callback - Callback function
     * @returns {Object} - Subscription to remove later
     */
    static addNotificationResponseReceivedListener(callback) {
        return Notifications.addNotificationResponseReceivedListener(callback);
    }

    /**
     * Get last notification response (if app was opened from notification)
     * @returns {Promise<Object|null>} - Notification response
     */
    static async getLastNotificationResponse() {
        return Notifications.getLastNotificationResponseAsync();
    }

    /**
     * Set badge count (iOS)
     * @param {number} count - Badge count
     */
    static async setBadgeCount(count) {
        await Notifications.setBadgeCountAsync(count);
    }

    /**
     * Get current badge count
     * @returns {Promise<number>} - Badge count
     */
    static async getBadgeCount() {
        return Notifications.getBadgeCountAsync();
    }
}

export default NotificationService;
