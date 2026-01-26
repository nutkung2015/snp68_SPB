/**
 * Firebase Admin SDK Initialization
 * ใช้สำหรับ verify Firebase ID Token จาก client
 */

const admin = require('firebase-admin');
const path = require('path');

// ตรวจสอบว่า Firebase Admin ถูก initialize แล้วหรือยัง
if (!admin.apps.length) {
    try {
        let serviceAccount;

        // ตรวจสอบว่ามีข้อมูลใน Environment Variable หรือไม่ (สำหรับ Production)
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            } catch (parseError) {
                console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT env:', parseError.message);
            }
        }

        // ถ้าไม่มีข้อมูลใน Env ให้ลองโหลดจากไฟล์ (สำหรับ Local Development)
        if (!serviceAccount) {
            try {
                serviceAccount = require('./serviceAccountKey.json');
            } catch (fileError) {
                console.error('❌ Service account key file not found at ./serviceAccountKey.json');
            }
        }

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });
            console.log('✅ Firebase Admin SDK initialized successfully');
        } else {
            throw new Error('No service account credentials found (ENV or File)');
        }
    } catch (error) {
        console.error('❌ Error initializing Firebase Admin SDK:', error.message);
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
