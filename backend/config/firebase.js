/**
 * Firebase Admin SDK Initialization
 * ใช้สำหรับ verify Firebase ID Token จาก client
 */

const admin = require('firebase-admin');
const path = require('path');

// ตรวจสอบว่า Firebase Admin ถูก initialize แล้วหรือยัง
if (!admin.apps.length) {
    try {
        // โหลด service account key
        const serviceAccount = require('./serviceAccountKey.json');

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });

        console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing Firebase Admin SDK:', error.message);
        console.error('Please ensure serviceAccountKey.json exists in backend/config/');
    }
}

/**
 * Verify Firebase ID Token
 * @param {string} idToken - Firebase ID Token จาก client
 * @returns {Object} decoded token พร้อมข้อมูล user
 */
const verifyIdToken = async (idToken) => {
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return {
            success: true,
            uid: decodedToken.uid,
            phone_number: decodedToken.phone_number,
            email: decodedToken.email,
            decodedToken
        };
    } catch (error) {
        console.error('Error verifying Firebase token:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get user info from Firebase by UID
 * @param {string} uid - Firebase User UID
 * @returns {Object} user record from Firebase
 */
const getFirebaseUser = async (uid) => {
    try {
        const userRecord = await admin.auth().getUser(uid);
        return {
            success: true,
            user: userRecord
        };
    } catch (error) {
        console.error('Error getting Firebase user:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    admin,
    verifyIdToken,
    getFirebaseUser
};
