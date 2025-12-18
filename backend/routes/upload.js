const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');
const protect = require('../middleware/authMiddleware'); // Default export

// OWASP A08: File Size Limit to prevent DoS
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max per file
    }
});

// Helper: Delete temp file after upload (OWASP A02: Prevent data leakage)
const deleteTempFile = (filePath) => {
    if (filePath) {
        fs.unlink(filePath, (err) => {
            if (err) console.error('Failed to delete temp file:', err);
        });
    }
};

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload single file for announcements
// OWASP A01: Protected route - requires authentication (Juristic/Admin only)
router.post('/announcements/single', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded'
            });
        }

        // Upload to cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'announcements', // store in announcements folder
            resource_type: 'auto' // auto-detect file type
        });

        // OWASP A02: Delete temp file after successful upload
        deleteTempFile(req.file.path);

        res.json({
            status: 'success',
            data: {
                url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type
            }
        });

    } catch (error) {
        // Clean up temp file on error
        if (req.file) deleteTempFile(req.file.path);

        console.error('Upload error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error uploading file',
            details: error.message
        });
    }
});

// Upload house model plan/detail (PDF Only)
// Requires project_id in request body
// OWASP A01: Protected route - requires authentication (Juristic/Admin only)
router.post('/house-models/single', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded'
            });
        }

        // Check if project_id is provided
        const { project_id } = req.body;
        if (!project_id) {
            return res.status(400).json({
                status: 'error',
                message: 'project_id is required'
            });
        }

        // Check if file is PDF
        if (req.file.mimetype !== 'application/pdf') {
            deleteTempFile(req.file.path); // Clean up invalid file
            return res.status(400).json({
                status: 'error',
                message: 'Invalid file type. Only PDF files are allowed.'
            });
        }

        // Upload to cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: `house_models/${project_id}`,
            resource_type: 'auto'
        });

        // OWASP A02: Delete temp file after successful upload
        deleteTempFile(req.file.path);

        res.json({
            status: 'success',
            data: {
                url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type
            }
        });

    } catch (error) {
        // Clean up temp file on error
        if (req.file) deleteTempFile(req.file.path);

        console.error('Upload error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error uploading file',
            details: error.message
        });
    }
});

// Upload multiple files for announcements
// OWASP A01: Protected route - requires authentication (Juristic/Admin only)
router.post('/announcements/multiple', protect, upload.array('files', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No files uploaded'
            });
        }

        // Upload all files to cloudinary
        const uploadPromises = req.files.map(file =>
            cloudinary.uploader.upload(file.path, {
                folder: 'announcements',
                resource_type: 'auto'
            })
        );

        const results = await Promise.all(uploadPromises);

        // OWASP A02: Delete all temp files after successful upload
        req.files.forEach(file => deleteTempFile(file.path));

        res.json({
            status: 'success',
            data: results.map(result => ({
                url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type
            }))
        });

    } catch (error) {
        // Clean up all temp files on error
        if (req.files) req.files.forEach(file => deleteTempFile(file.path));

        console.error('Upload error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error uploading files',
            details: error.message
        });
    }
});

// Delete file from cloudinary
// OWASP A01: Protected route - requires authentication (Juristic/Admin only)
router.delete('/announcements/:public_id', protect, async (req, res) => {
    try {
        const result = await cloudinary.uploader.destroy(req.params.public_id);

        res.json({
            status: 'success',
            data: result
        });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error deleting file',
            details: error.message
        });
    }
});


// Upload visitor image (Driver/Car)
// Folder: visitor_images/{project_id}
// OWASP A01: Protected route - requires authentication
router.post('/visitor-images', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded'
            });
        }

        const { project_id } = req.body;
        if (!project_id) {
            deleteTempFile(req.file.path); // Clean up on validation error
            return res.status(400).json({
                status: 'error',
                message: 'project_id is required'
            });
        }

        // OWASP A04: File type validation - only allow images
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            deleteTempFile(req.file.path); // Clean up invalid file
            return res.status(400).json({
                status: 'error',
                message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
            });
        }

        // Upload to cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: `visitor_images/${project_id}`,
            resource_type: 'image'
        });

        // OWASP A02: Delete temp file after successful upload
        deleteTempFile(req.file.path);

        res.json({
            status: 'success',
            data: {
                url: result.secure_url,
                public_id: result.public_id
            }
        });

    } catch (error) {
        // Clean up temp file on error
        if (req.file) deleteTempFile(req.file.path);

        console.error('Visitor upload error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error uploading file',
            details: error.message
        });
    }
});

module.exports = router;