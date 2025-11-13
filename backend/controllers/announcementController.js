const db = require('../config/db');
const cloudinary = require('cloudinary').v2;  // เพิ่มบรรทัดนี้


// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


// Get all announcements
exports.getAllAnnouncements = (req, res) => {
    const { type, audience, status, days, latest, page = 1, limit = 10 } = req.query;
    
    let query = 'SELECT * FROM announcements WHERE 1=1';
    const queryParams = [];
    
    // Add filters
    if (type) {
        query += ' AND type = ?';
        queryParams.push(type);
    }
    
    if (audience) {
        query += ' AND audience = ?';
        queryParams.push(audience);
    }
    
    if (status) {
        query += ' AND status = ?';
        queryParams.push(status);
    }
    
    // Add time-based filter
    if (days) {
        query += ' AND updated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
        queryParams.push(parseInt(days));
    }
    
    // Add pagination
    const offset = (page - 1) * limit;
    
    // Sort by updated_at for time-based filtering, otherwise by created_at
    if (latest || days) {
        query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    } else {
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    }
    queryParams.push(parseInt(limit), parseInt(offset));
    
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching announcements:', err);
            return res.status(500).json({ 
                status: 'error',
                message: 'Error fetching announcements' 
            });
        }
        
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM announcements WHERE 1=1';
        const countParams = [];
        
        if (type) {
            countQuery += ' AND type = ?';
            countParams.push(type);
        }
        
        if (audience) {
            countQuery += ' AND audience = ?';
            countParams.push(audience);
        }
        
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        
        if (days) {
            countQuery += ' AND updated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
            countParams.push(parseInt(days));
        }
        
        db.query(countQuery, countParams, (err, countResult) => {
            if (err) {
                console.error('Error counting announcements:', err);
                return res.status(500).json({ 
                    status: 'error',
                    message: 'Error counting announcements' 
                });
            }
            
            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);
            
            res.json({
                status: 'success',
                data: results,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            });
        });
    });
};

// Get single announcement
exports.getAnnouncement = (req, res) => {
    const query = 'SELECT * FROM announcements WHERE id = ?';
    
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching announcement:', err);
            return res.status(500).json({ 
                status: 'error',
                message: 'Error fetching announcement' 
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ 
                status: 'error',
                message: 'Announcement not found' 
            });
        }
        
        res.json({
            status: 'success',
            data: results[0]
        });
    });
};

// Get announcements by type
exports.getAnnouncementsByType = (req, res) => {
    const { type } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    const query = `SELECT * FROM announcements 
        WHERE type = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?`;
    
    db.query(query, [type, parseInt(limit), parseInt(offset)], (err, results) => {
        if (err) {
            console.error('Error fetching announcements by type:', err);
            return res.status(500).json({ 
                status: 'error',
                message: 'Error fetching announcements by type' 
            });
        }
        
        res.json({
            status: 'success',
            data: results
        });
    });
};

// Get announcements by audience
exports.getAnnouncementsByAudience = (req, res) => {
    const { audience } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    const query = `SELECT * FROM announcements 
        WHERE audience = ? OR audience = 'all'
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?`;
    
    db.query(query, [audience, parseInt(limit), parseInt(offset)], (err, results) => {
        if (err) {
            console.error('Error fetching announcements by audience:', err);
            return res.status(500).json({ 
                status: 'error',
                message: 'Error fetching announcements by audience' 
            });
        }
        
        res.json({
            status: 'success',
            data: results
        });
    });
};

// announcementController.js
exports.createAnnouncement = async (req, res) => {
    try {
        const { 
            id, 
            title, 
            content, 
            type, 
            posted_by, 
            audience = 'all', 
            status = 'draft' 
        } = req.body;
        
        let attachment_urls = [];
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => 
                cloudinary.uploader.upload(file.path, {
                    folder: 'announcements',
                    resource_type: 'auto'
                })
            );
            
            const uploadResults = await Promise.all(uploadPromises);
            attachment_urls = uploadResults.map(result => ({
                url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type
            }));
        }
        
        // ใช้ NOW() ของ MySQL แทนการรับค่าจาก frontend
        const query = `
            INSERT INTO announcements 
            (id, title, content, type, attachment_urls, posted_by, audience, status, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const attachmentUrlsJson = attachment_urls.length > 0 ? JSON.stringify(attachment_urls) : null;
        
        db.query(query, [
            id, 
            title, 
            content, 
            type, 
            attachmentUrlsJson, 
            posted_by, 
            audience, 
            status
        ], (err, results) => {
            if (err) {
                console.error('Error creating announcement:', err);
                return res.status(400).json({ 
                    status: 'error',
                    message: 'Error creating announcement',
                    details: err.message
                });
            }
            
            // Fetch the newly created announcement with timestamps
            const newAnnouncementQuery = 'SELECT * FROM announcements WHERE id = ?';
            db.query(newAnnouncementQuery, [id], (err, announcementResults) => {
                if (err) {
                    console.error('Error fetching new announcement:', err);
                    return res.status(500).json({ 
                        status: 'error',
                        message: 'Announcement created but error fetching details' 
                    });
                }
                
                res.status(201).json({
                    status: 'success',
                    data: announcementResults[0]
                });
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            details: error.message
        });
    }
};

// แก้ไข updateAnnouncement
exports.updateAnnouncement = async (req, res) => {
    try {
        const { 
            title, 
            content, 
            type, 
            audience, 
            status 
        } = req.body;
        
        // Validate type enum if provided
        if (type) {
            const validTypes = ['announcement', 'event', 'maintenance', 'emergency'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid type. Must be one of: ' + validTypes.join(', ')
                });
            }
        }
        
        // Validate audience enum if provided
        if (audience) {
            const validAudiences = ['all', 'residents', 'owners', 'committee'];
            if (!validAudiences.includes(audience)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid audience. Must be one of: ' + validAudiences.join(', ')
                });
            }
        }
        
        // Validate status enum if provided
        if (status) {
            const validStatuses = ['draft', 'published', 'archived'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
                });
            }
        }

        // Handle file uploads
        let new_attachment_urls = [];
        if (req.files && req.files.length > 0) {
            // Get existing files first
            const getExistingQuery = 'SELECT attachment_urls FROM announcements WHERE id = ?';
            const existingResult = await new Promise((resolve, reject) => {
                db.query(getExistingQuery, [req.params.id], (err, results) => {
                    if (err) reject(err);
                    else resolve(results[0]);
                });
            });

            // Delete existing files from Cloudinary if they exist
            if (existingResult && existingResult.attachment_urls) {
                const existingFiles = JSON.parse(existingResult.attachment_urls);
                for (const file of existingFiles) {
                    if (file.public_id) {
                        await cloudinary.uploader.destroy(file.public_id);
                    }
                }
            }

            // Upload new files
            const uploadPromises = req.files.map(file => 
                cloudinary.uploader.upload(file.path, {
                    folder: 'announcements',
                    resource_type: 'auto'
                })
            );
            
            const uploadResults = await Promise.all(uploadPromises);
            new_attachment_urls = uploadResults.map(result => ({
                url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type
            }));
        }
        
        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];
        
        if (title !== undefined) {
            updateFields.push('title = ?');
            updateValues.push(title);
        }
        
        if (content !== undefined) {
            updateFields.push('content = ?');
            updateValues.push(content);
        }
        
        if (type !== undefined) {
            updateFields.push('type = ?');
            updateValues.push(type);
        }
        
        if (new_attachment_urls.length > 0) {
            updateFields.push('attachment_urls = ?');
            updateValues.push(JSON.stringify(new_attachment_urls));
        }
        
        if (audience !== undefined) {
            updateFields.push('audience = ?');
            updateValues.push(audience);
        }
        
        if (status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }
        
        if (updateFields.length === 0 && new_attachment_urls.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No fields to update'
            });
        }
        
        updateFields.push('updated_at = NOW()');
        updateValues.push(req.params.id);
        
        const query = `UPDATE announcements SET ${updateFields.join(', ')} WHERE id = ?`;
        
        db.query(query, updateValues, (err, results) => {
            if (err) {
                console.error('Error updating announcement:', err);
                return res.status(400).json({ 
                    status: 'error',
                    message: 'Error updating announcement',
                    details: err.message
                });
            }
            
            if (results.affectedRows === 0) {
                return res.status(404).json({ 
                    status: 'error',
                    message: 'Announcement not found' 
                });
            }
            
            // Fetch the updated announcement
            const updatedAnnouncementQuery = 'SELECT * FROM announcements WHERE id = ?';
            db.query(updatedAnnouncementQuery, [req.params.id], (err, announcementResults) => {
                if (err) {
                    console.error('Error fetching updated announcement:', err);
                    return res.status(500).json({ 
                        status: 'error',
                        message: 'Announcement updated but error fetching details' 
                    });
                }
                
                res.json({
                    status: 'success',
                    data: announcementResults[0]
                });
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            details: error.message
        });
    }
};

// แก้ไข deleteAnnouncement
exports.deleteAnnouncement = async (req, res) => {
    try {
        // Get attachment_urls before deleting
        const getQuery = 'SELECT attachment_urls FROM announcements WHERE id = ?';
        const announcement = await new Promise((resolve, reject) => {
            db.query(getQuery, [req.params.id], (err, results) => {
                if (err) reject(err);
                else resolve(results[0]);
            });
        });

        // Delete files from Cloudinary if they exist
        if (announcement && announcement.attachment_urls) {
            const files = JSON.parse(announcement.attachment_urls);
            for (const file of files) {
                if (file.public_id) {
                    await cloudinary.uploader.destroy(file.public_id);
                }
            }
        }

        // Delete from database
        const query = 'DELETE FROM announcements WHERE id = ?';
        db.query(query, [req.params.id], (err, results) => {
            if (err) {
                console.error('Error deleting announcement:', err);
                return res.status(500).json({ 
                    status: 'error',
                    message: 'Error deleting announcement' 
                });
            }
            
            if (results.affectedRows === 0) {
                return res.status(404).json({ 
                    status: 'error',
                    message: 'Announcement not found' 
                });
            }
            
            res.json({
                status: 'success',
                message: 'Announcement and associated files deleted successfully'
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            details: error.message
        });
    }
};

