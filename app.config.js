// Load environment variables from .env file
require('dotenv').config();

module.exports = ({ config }) => {
    // Debug: Log to verify config is loaded
    // console.log('🔥 Firebase Config Loading...');
    // console.log('   API Key:', process.env.FIREBASE_API_KEY ? '✅ Found' : '❌ Missing');
    // console.log('   Project ID:', process.env.FIREBASE_PROJECT_ID || 'Missing');

    return {
        ...config,
        extra: {
            ...config.extra,
            // Firebase Configuration - อ่านจาก .env
            FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
            FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
            FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
            FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
            FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
            FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
            FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
        },
    };
};
