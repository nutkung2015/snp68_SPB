/**
 * Firebase Phone Authentication Service
 * 
 * Auto-switch between:
 * - Development (Expo Go / Web): Firebase JS SDK
 * - Production (APK/IPA): @react-native-firebase/auth
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { EXTERNAL_SERVICES } from '../utils/config';

// ============================================
// Environment Detection
// ============================================

/**
 * ตรวจจับว่าเป็น Expo Go หรือไม่
 */
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * ตรวจจับว่าเป็น Web หรือไม่
 */
const isWeb = Platform.OS === 'web';

/**
 * ตรวจจับว่าเป็น Development mode หรือไม่
 */
const isDev = __DEV__;

/**
 * ตรวจจับว่าควรใช้ Firebase JS SDK หรือ Native Firebase
 * - Expo Go / Web / Dev → ใช้ JS SDK
 * - Production Build (APK/IPA) → ใช้ Native Firebase
 */
const shouldUseNativeFirebase = !isExpoGo && !isWeb && !isDev;

console.log('🔥 Firebase Auth Mode:', {
    isExpoGo,
    isWeb,
    isDev,
    useNative: shouldUseNativeFirebase,
    platform: Platform.OS,
});

// ============================================
// Firebase Initialization
// ============================================

let auth = null;
let confirmationResult = null;
let nativeAuth = null;
let nativeConfirmation = null;

// Firebase JS SDK imports
import { initializeApp, getApps } from 'firebase/app';
import {
    getAuth,
    signInWithPhoneNumber,
    RecaptchaVerifier
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
    apiKey: EXTERNAL_SERVICES.FIREBASE.API_KEY,
    authDomain: EXTERNAL_SERVICES.FIREBASE.AUTH_DOMAIN,
    projectId: EXTERNAL_SERVICES.FIREBASE.PROJECT_ID,
    storageBucket: EXTERNAL_SERVICES.FIREBASE.STORAGE_BUCKET,
    messagingSenderId: EXTERNAL_SERVICES.FIREBASE.MESSAGING_SENDER_ID,
    appId: EXTERNAL_SERVICES.FIREBASE.APP_ID,
};

// Initialize Firebase JS SDK (always needed for web/expo go)
try {
    let app;
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApps()[0];
    }
    auth = getAuth(app);
    console.log('✅ Firebase JS SDK initialized');
} catch (error) {
    console.warn('⚠️ Firebase JS SDK init error:', error.message);
}

// Try to load @react-native-firebase for production builds
if (shouldUseNativeFirebase) {
    try {
        // Dynamic import - จะไม่ crash ถ้าไม่มี module
        const rnFirebaseAuth = require('@react-native-firebase/auth');
        nativeAuth = rnFirebaseAuth.default;
        console.log('✅ @react-native-firebase/auth loaded');
    } catch (error) {
        console.log('ℹ️ @react-native-firebase not available, using JS SDK');
    }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format phone number to E.164 format (+66...)
 */
export const formatPhoneNumber = (phone) => {
    if (!phone) return '';

    let cleaned = phone.replace(/[\s-]/g, '');

    if (cleaned.startsWith('0')) {
        cleaned = '+66' + cleaned.slice(1);
    } else if (cleaned.startsWith('66') && !cleaned.startsWith('+66')) {
        cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+')) {
        cleaned = '+66' + cleaned;
    }

    return cleaned;
};

// ============================================
// Send OTP
// ============================================

/**
 * ส่ง OTP - Auto-switch ตาม environment
 */
export const sendOTP = async (phoneNumber) => {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    if (!formattedPhone) {
        return { success: false, message: 'กรุณาระบุเบอร์โทรศัพท์' };
    }

    console.log('📱 Sending OTP to:', formattedPhone);
    console.log('🔧 Using:', nativeAuth ? 'Native Firebase' : 'JS SDK');

    try {
        // ===== NATIVE FIREBASE (Production APK/IPA) =====
        if (nativeAuth && shouldUseNativeFirebase) {
            console.log('📲 Using @react-native-firebase/auth');

            nativeConfirmation = await nativeAuth().signInWithPhoneNumber(formattedPhone);

            return {
                success: true,
                message: 'ส่ง OTP สำเร็จ กรุณาตรวจสอบ SMS',
                isNative: true,
            };
        }

        // ===== JS SDK (Expo Go / Web / Dev) =====
        console.log('🌐 Using Firebase JS SDK');

        // สำหรับ Web ต้องมี reCAPTCHA
        if (isWeb) {
            // Clear existing reCAPTCHA container to prevent "already rendered" error
            let container = document.getElementById('recaptcha-container');
            if (container) {
                container.innerHTML = ''; // Clear the container
            } else {
                container = document.createElement('div');
                container.id = 'recaptcha-container';
                container.style.display = 'none';
                document.body.appendChild(container);
            }

            // Create new reCAPTCHA verifier
            const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible',
                callback: () => {
                    console.log('✅ reCAPTCHA verified');
                },
                'expired-callback': () => {
                    console.log('⚠️ reCAPTCHA expired, please try again');
                }
            });

            // Render the reCAPTCHA
            await recaptchaVerifier.render();

            confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
        } else {
            // สำหรับ Expo Go บน Mobile - ต้องให้ไปทดสอบบน Web
            return {
                success: false,
                message: 'กรุณาทดสอบ OTP บน Web browser หรือ build APK เพื่อใช้งานจริง',
            };
        }

        return {
            success: true,
            message: isDev
                ? 'ส่ง OTP สำเร็จ (Dev: ใช้ Test Phone Number จาก Firebase Console)'
                : 'ส่ง OTP สำเร็จ กรุณาตรวจสอบ SMS',
            isNative: false,
        };

    } catch (error) {
        console.error('❌ Error sending OTP:', error);

        let message = 'ไม่สามารถส่ง OTP ได้';

        if (error.code === 'auth/invalid-phone-number') {
            message = 'เบอร์โทรศัพท์ไม่ถูกต้อง';
        } else if (error.code === 'auth/too-many-requests') {
            message = 'ส่ง OTP บ่อยเกินไป กรุณารอสักครู่';
        } else if (error.code === 'auth/quota-exceeded') {
            message = 'เกินโควต้าการส่ง SMS';
        } else if (error.message?.includes('reCAPTCHA')) {
            message = 'กรุณาใช้ Test Phone Numbers สำหรับ Development';
        }

        return { success: false, message, error: error.code };
    }
};

// ============================================
// Verify OTP
// ============================================

/**
 * ยืนยัน OTP - Auto-switch ตาม environment
 */
export const verifyOTP = async (otpCode) => {
    if (!otpCode || otpCode.length !== 6) {
        return { success: false, message: 'กรุณากรอก OTP 6 หลัก' };
    }

    console.log('🔐 Verifying OTP:', otpCode);

    try {
        // ===== NATIVE FIREBASE (Production) =====
        if (nativeAuth && nativeConfirmation && shouldUseNativeFirebase) {
            console.log('📲 Verifying with @react-native-firebase');

            await nativeConfirmation.confirm(otpCode);
            const currentUser = nativeAuth().currentUser;
            const idToken = await currentUser.getIdToken();

            return {
                success: true,
                message: 'ยืนยัน OTP สำเร็จ',
                token: idToken,
                user: {
                    uid: currentUser.uid,
                    phoneNumber: currentUser.phoneNumber,
                },
            };
        }

        // ===== JS SDK (Dev) =====
        if (!confirmationResult) {
            return { success: false, message: 'กรุณาขอ OTP ก่อน' };
        }

        console.log('🌐 Verifying with JS SDK');

        const userCredential = await confirmationResult.confirm(otpCode);
        const idToken = await userCredential.user.getIdToken();

        return {
            success: true,
            message: 'ยืนยัน OTP สำเร็จ',
            token: idToken,
            user: {
                uid: userCredential.user.uid,
                phoneNumber: userCredential.user.phoneNumber,
            },
        };

    } catch (error) {
        console.error('❌ Error verifying OTP:', error);

        let message = 'รหัส OTP ไม่ถูกต้อง';
        if (error.code === 'auth/invalid-verification-code') {
            message = 'รหัส OTP ไม่ถูกต้อง';
        } else if (error.code === 'auth/code-expired') {
            message = 'รหัส OTP หมดอายุ กรุณาขอใหม่';
        }

        return { success: false, message, error: error.code };
    }
};

// ============================================
// Other Functions
// ============================================

/**
 * Get Firebase ID Token
 */
export const getFirebaseToken = async () => {
    try {
        // Native Firebase
        if (nativeAuth && shouldUseNativeFirebase) {
            const currentUser = nativeAuth().currentUser;
            return currentUser ? await currentUser.getIdToken() : null;
        }

        // JS SDK
        if (auth?.currentUser) {
            return await auth.currentUser.getIdToken();
        }

        return null;
    } catch (error) {
        console.error('Error getting Firebase token:', error);
        return null;
    }
};

/**
 * Sign out
 */
export const signOutFirebase = async () => {
    try {
        if (nativeAuth && shouldUseNativeFirebase) {
            await nativeAuth().signOut();
        }
        if (auth) {
            await auth.signOut();
        }
        confirmationResult = null;
        nativeConfirmation = null;
    } catch (error) {
        console.error('Error signing out:', error);
    }
};

/**
 * Reset OTP state
 */
export const resetOTPState = () => {
    confirmationResult = null;
    nativeConfirmation = null;
};

/**
 * Get current auth mode info
 */
export const getAuthModeInfo = () => ({
    isExpoGo,
    isWeb,
    isDev,
    useNativeFirebase: shouldUseNativeFirebase,
    nativeAvailable: !!nativeAuth,
    platform: Platform.OS,
});

export { auth };
