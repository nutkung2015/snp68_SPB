/**
 * Firebase Storage Helper Functions
 * Used for uploading/deleting PDF files
 */

const admin = require('firebase-admin');
const path = require('path');

// Get initialized Firebase app (from firebase.js) or initialize if needed
const getStorageBucket = () => {
    // Check if Firebase Admin is already initialized
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
                // ตัด gs:// ออกถ้ามี (เพราะ Firebase SDK ต้องการแค่ชื่อ bucket)
                let bucketName = process.env.FIREBASE_STORAGE_BUCKET;
                if (bucketName && bucketName.startsWith('gs://')) {
                    bucketName = bucketName.replace('gs://', '');
                }

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    storageBucket: bucketName,
                    projectId: serviceAccount.project_id
                });
                console.log('✅ Firebase Admin SDK initialized for Storage');
            } else {
                throw new Error('No service account credentials found (ENV or File)');
            }
        } catch (error) {
            console.error('❌ Error initializing Firebase for Storage:', error.message);
            throw error;
        }
    }

    // ตัด gs:// ออกที่นี่ด้วยเพื่อให้แน่ใจว่า bucket() ได้ชื่อที่ถูกต้อง
    let bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (bucketName && bucketName.startsWith('gs://')) {
        bucketName = bucketName.replace('gs://', '');
    }

    return admin.storage().bucket(bucketName);
};

/**
 * Upload a file from multer (local path) to Firebase Storage
 * @param {string} localFilePath - Local file path from multer
 * @param {string} destinationPath - Path in storage (e.g., 'house_models/project_id/filename.pdf')
 * @param {string} mimeType - MIME type (default: 'application/pdf')
 * @returns {Promise<string>} - Public URL of uploaded file
 */
const uploadFileToStorage = async (localFilePath, destinationPath, mimeType = 'application/pdf') => {
    const bucket = getStorageBucket();

    // Upload the file
    await bucket.upload(localFilePath, {
        destination: destinationPath,
        metadata: {
            contentType: mimeType,
            cacheControl: 'public, max-age=31536000', // Cache for 1 year
        },
    });

    // Make the file publicly accessible
    const file = bucket.file(destinationPath);
    await file.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;

    console.log(`✅ File uploaded to Firebase Storage: ${destinationPath}`);
    return publicUrl;
};

/**
 * Upload a buffer to Firebase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} destinationPath - Path in storage
 * @param {string} mimeType - MIME type
 * @returns {Promise<string>} - Public URL
 */
const uploadBufferToStorage = async (fileBuffer, destinationPath, mimeType = 'application/pdf') => {
    const bucket = getStorageBucket();
    const file = bucket.file(destinationPath);

    // Upload options
    const options = {
        metadata: {
            contentType: mimeType,
            cacheControl: 'public, max-age=31536000',
        },
        resumable: false,
    };

    // Upload the file
    await file.save(fileBuffer, options);

    // Make the file publicly accessible
    await file.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;

    console.log(`✅ Buffer uploaded to Firebase Storage: ${destinationPath}`);
    return publicUrl;
};

/**
 * Delete a file from Firebase Storage
 * @param {string} fileUrl - Public URL or storage path of the file
 * @returns {Promise<boolean>} - Success status
 */
const deleteFileFromStorage = async (fileUrl) => {
    try {
        const bucket = getStorageBucket();

        // Extract file path from URL
        let filePath = fileUrl;

        // If it's a full URL, extract the path
        if (fileUrl && fileUrl.includes('storage.googleapis.com')) {
            // URL format: https://storage.googleapis.com/bucket-name/path/to/file.pdf
            const urlParts = fileUrl.split(`${bucket.name}/`);
            if (urlParts.length > 1) {
                filePath = decodeURIComponent(urlParts[1]);
            }
        }

        if (!filePath) {
            console.log('No file path to delete');
            return false;
        }

        const file = bucket.file(filePath);

        // Check if file exists before deleting
        const [exists] = await file.exists();
        if (!exists) {
            console.log(`File not found in storage: ${filePath}`);
            return false;
        }

        await file.delete();

        console.log(`✅ File deleted from Firebase Storage: ${filePath}`);
        return true;
    } catch (error) {
        console.error('❌ Error deleting file from storage:', error.message);
        return false;
    }
};

/**
 * Generate a signed URL for temporary access (for private files)
 * @param {string} fileUrl - Public URL or storage path
 * @param {number} expiresInMinutes - URL expiration time in minutes (default: 60)
 * @returns {Promise<string>} - Signed URL
 */
const getSignedUrl = async (fileUrl, expiresInMinutes = 60) => {
    try {
        const bucket = getStorageBucket();

        // Extract file path from URL
        let filePath = fileUrl;

        if (fileUrl && fileUrl.includes('storage.googleapis.com')) {
            const urlParts = fileUrl.split(`${bucket.name}/`);
            if (urlParts.length > 1) {
                filePath = decodeURIComponent(urlParts[1]);
            }
        }

        const file = bucket.file(filePath);

        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + expiresInMinutes * 60 * 1000,
        });

        return signedUrl;
    } catch (error) {
        console.error('❌ Error generating signed URL:', error.message);
        return fileUrl; // Return original URL as fallback
    }
};

/**
 * Check if a URL is from Firebase Storage
 * @param {string} url - URL to check
 * @returns {boolean}
 */
const isFirebaseStorageUrl = (url) => {
    if (!url) return false;
    return url.includes('storage.googleapis.com') || url.includes('firebasestorage.googleapis.com');
};

/**
 * Check if a URL is from Cloudinary
 * @param {string} url - URL to check
 * @returns {boolean}
 */
const isCloudinaryUrl = (url) => {
    if (!url) return false;
    return url.includes('cloudinary.com');
};

module.exports = {
    getStorageBucket,
    uploadFileToStorage,
    uploadBufferToStorage,
    deleteFileFromStorage,
    getSignedUrl,
    isFirebaseStorageUrl,
    isCloudinaryUrl,
};
