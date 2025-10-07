const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // temporary storage

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload single file for announcements
router.post('/announcements/single', upload.single('file'), async (req, res) => {
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

        res.json({
            status: 'success',
            data: {
                url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error uploading file',
            details: error.message
        });
    }
});

// Upload multiple files for announcements
router.post('/announcements/multiple', upload.array('files', 5), async (req, res) => {
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

        res.json({
            status: 'success',
            data: results.map(result => ({
                url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type
            }))
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error uploading files',
            details: error.message
        });
    }
});

// Delete file from cloudinary
router.delete('/announcements/:public_id', async (req, res) => {
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

module.exports = router;