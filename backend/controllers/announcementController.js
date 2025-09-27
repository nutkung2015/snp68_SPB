const db = require('../config/db');

// Get all announcements
exports.getAllAnnouncements = (req, res) => {
    const { type, audience, status, page = 1, limit = 10 } = req.query;
    
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
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
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

// Create new announcement
exports.createAnnouncement = (req, res) => {
    const { 
        id, 
        title, 
        content, 
        type, 
        attachment_urls, 
        posted_by, 
        audience = 'all', 
        status = 'draft' 
    } = req.body;
    
    // Validate required fields
    if (!id || !title || !content || !type || !posted_by) {
        return res.status(400).json({
            status: 'error',
            message: 'Missing required fields: id, title, content, type, posted_by'
        });
    }
    
    // Validate type enum
    const validTypes = ['announcement', 'event', 'maintenance', 'emergency'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid type. Must be one of: ' + validTypes.join(', ')
        });
    }
    
    // Validate audience enum
    const validAudiences = ['all', 'residents', 'owners', 'committee'];
    if (!validAudiences.includes(audience)) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid audience. Must be one of: ' + validAudiences.join(', ')
        });
    }
    
    // Validate status enum
    const validStatuses = ['draft', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
    }
    
    const query = `INSERT INTO announcements 
        (id, title, content, type, attachment_urls, posted_by, audience, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const attachmentUrlsJson = attachment_urls ? JSON.stringify(attachment_urls) : null;
    
    db.query(query, [
        id, title, content, type, attachmentUrlsJson, posted_by, audience, status
    ], (err, results) => {
        if (err) {
            console.error('Error creating announcement:', err);
            return res.status(400).json({ 
                status: 'error',
                message: 'Error creating announcement',
                details: err.message
            });
        }
        
        // Fetch the newly created announcement
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
};

// Update announcement
exports.updateAnnouncement = (req, res) => {
    const { 
        title, 
        content, 
        type, 
        attachment_urls, 
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
    
    if (attachment_urls !== undefined) {
        updateFields.push('attachment_urls = ?');
        updateValues.push(attachment_urls ? JSON.stringify(attachment_urls) : null);
    }
    
    if (audience !== undefined) {
        updateFields.push('audience = ?');
        updateValues.push(audience);
    }
    
    if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
    }
    
    if (updateFields.length === 0) {
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
};

// Delete announcement
exports.deleteAnnouncement = (req, res) => {
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
            message: 'Announcement deleted successfully'
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
