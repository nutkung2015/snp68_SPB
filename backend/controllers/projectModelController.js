const db = require("../config/db");
const cloudinary = require("../config/cloudinary");

/**
 * GET /api/projects/info-docs?project_id=xxx
 * Get project information documents (project_detail_file_url, rules_file_url)
 */
exports.getProjectInfoDocs = async (req, res) => {
    try {
        const { project_id } = req.query; // Get from query params

        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "project_id is required in query params"
            });
        }

        const query = `
      SELECT 
        project_detail_file_url,
        rules_file_url,
        updated_at
      FROM projects
      WHERE id = ?
    `;

        const [rows] = await db.promise().query(query, [project_id]);

        if (rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Project not found"
            });
        }

        const data = rows[0];

        // If no files uploaded yet, return null data
        if (!data.project_detail_file_url && !data.rules_file_url) {
            return res.json({
                status: "success",
                data: null
            });
        }

        res.json({
            status: "success",
            data: {
                project_detail_file_url: data.project_detail_file_url,
                rules_file_url: data.rules_file_url,
                updated_at: data.updated_at
            }
        });
    } catch (error) {
        console.error("Error in getProjectInfoDocs:", error);
        res.status(500).json({
            status: "error",
            message: "Server error"
        });
    }
};

/**
 * POST /api/projects/info-docs
 * Upload/Update project information documents
 * Accepts multipart/form-data with fields: project_id, project_detail_file, rules_file
 */
exports.upsertProjectInfoDocs = async (req, res) => {
    try {
        const { project_id } = req.body; // Get from body
        const files = req.files || {};

        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "project_id is required in request body"
            });
        }

        // Check if project exists
        const [projectRows] = await db.promise().query(
            "SELECT id FROM projects WHERE id = ?",
            [project_id]
        );

        if (projectRows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Project not found"
            });
        }

        let project_detail_file_url = null;
        let rules_file_url = null;

        // Upload project detail file if provided
        if (files.project_detail_file && files.project_detail_file[0]) {
            const file = files.project_detail_file[0];
            const uploadResult = await cloudinary.uploader.upload(file.path, {
                folder: `info_docs/${project_id}`,
                resource_type: "auto",
                // format: "pdf"
            });
            project_detail_file_url = uploadResult.secure_url;
        }

        // Upload rules file if provided
        if (files.rules_file && files.rules_file[0]) {
            const file = files.rules_file[0];
            const uploadResult = await cloudinary.uploader.upload(file.path, {
                folder: `info_docs/${project_id}`,
                resource_type: "auto",
                // format: "pdf"
            });
            rules_file_url = uploadResult.secure_url;
        }

        // Build update query dynamically based on which files were uploaded
        const updates = [];
        const values = [];

        if (project_detail_file_url) {
            updates.push("project_detail_file_url = ?");
            values.push(project_detail_file_url);
        }

        if (rules_file_url) {
            updates.push("rules_file_url = ?");
            values.push(rules_file_url);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "No files provided"
            });
        }

        updates.push("updated_at = NOW()");
        values.push(project_id);

        const updateQuery = `
      UPDATE projects 
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

        await db.promise().query(updateQuery, values);

        // Fetch updated data
        const [updatedRows] = await db.promise().query(
            `SELECT project_detail_file_url, rules_file_url, updated_at 
       FROM projects WHERE id = ?`,
            [project_id]
        );

        res.json({
            status: "success",
            message: "Project info documents updated successfully",
            data: updatedRows[0]
        });
    } catch (error) {
        console.error("Error in upsertProjectInfoDocs:", error);
        res.status(500).json({
            status: "error",
            message: "Server error"
        });
    }
};

// ==================== RESIDENT APIs ====================

/**
 * Helper function to generate proxy URL for PDF viewing/downloading
 * This bypasses Cloudinary's Untrusted Account restriction by routing through our backend
 * @param {string} originalUrl - The raw Cloudinary URL from database
 * @param {string} projectId - The project ID for constructing the proxy path
 * @param {string} filename - The filename for download
 * @param {string} disposition - 'inline' for viewing, 'attachment' for download
 * @returns {string|null} - Proxy URL or null if no originalUrl
 */
const generateProxyUrl = (originalUrl, projectId, filename, disposition = 'inline') => {
    if (!originalUrl) return null;

    return `/api/projects/${projectId}/member/download-pdf?url=${encodeURIComponent(originalUrl)}&filename=${encodeURIComponent(filename)}&disposition=${disposition}`;
};

/**
 * GET /api/resident/projects/:project_id/info-docs
 * Get project information documents for residents
 * Only members of the project can view this
 * 
 * Returns Proxy URLs instead of raw Cloudinary URLs to handle Untrusted Account
 */
exports.getProjectInfoDocsForResident = async (req, res) => {
    try {
        const { project_id } = req.params;
        const userId = req.user?.id;

        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "project_id is required"
            });
        }

        // Check if user is a member of this project
        const [memberCheck] = await db.promise().query(
            "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
            [userId, project_id]
        );

        if (memberCheck.length === 0) {
            return res.status(403).json({
                status: "error",
                message: "You are not a member of this project"
            });
        }

        const query = `
            SELECT 
                project_detail_file_url,
                rules_file_url,
                updated_at
            FROM projects
            WHERE id = ?
        `;

        const [rows] = await db.promise().query(query, [project_id]);

        if (rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Project not found"
            });
        }

        const data = rows[0];

        // If no files uploaded yet, return null data
        if (!data.project_detail_file_url && !data.rules_file_url) {
            return res.json({
                status: "success",
                data: null
            });
        }

        // Generate proxy URLs for viewing and downloading
        res.json({
            status: "success",
            data: {
                // Raw URLs (for reference/backup)
                project_detail_file_url: data.project_detail_file_url,
                rules_file_url: data.rules_file_url,

                // Proxy URLs for View (inline)
                project_detail_view_url: generateProxyUrl(
                    data.project_detail_file_url,
                    project_id,
                    'รายละเอียดโครงการ.pdf',
                    'inline'
                ),
                rules_view_url: generateProxyUrl(
                    data.rules_file_url,
                    project_id,
                    'กฎระเบียบและข้อบังคับ.pdf',
                    'inline'
                ),

                // Proxy URLs for Download (attachment)
                project_detail_download_url: generateProxyUrl(
                    data.project_detail_file_url,
                    project_id,
                    'รายละเอียดโครงการ.pdf',
                    'attachment'
                ),
                rules_download_url: generateProxyUrl(
                    data.rules_file_url,
                    project_id,
                    'กฎระเบียบและข้อบังคับ.pdf',
                    'attachment'
                ),

                updated_at: data.updated_at
            }
        });
    } catch (error) {
        console.error("Error in getProjectInfoDocsForResident:", error);
        res.status(500).json({
            status: "error",
            message: "Server error"
        });
    }
};

/**
 * GET /api/projects/:project_id/member/info-docs-v2
 * Version 2: Returns raw Cloudinary URLs for use with pdf-stream endpoint
 * 
 * Same as getProjectInfoDocsForResident but returns raw URLs instead of proxy URLs
 * Frontend can use these with getStreamPdfUrl() for better caching
 */
exports.getProjectInfoDocsForResidentV2 = async (req, res) => {
    try {
        const { project_id } = req.params;
        const userId = req.user?.id;

        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "project_id is required"
            });
        }

        // Check if user is a member of this project
        const [memberCheck] = await db.promise().query(
            "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
            [userId, project_id]
        );

        if (memberCheck.length === 0) {
            return res.status(403).json({
                status: "error",
                message: "You are not a member of this project"
            });
        }

        const query = `
            SELECT 
                project_detail_file_url,
                rules_file_url,
                updated_at
            FROM projects
            WHERE id = ?
        `;

        const [rows] = await db.promise().query(query, [project_id]);

        if (rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Project not found"
            });
        }

        const data = rows[0];

        // If no files uploaded yet, return null data
        if (!data.project_detail_file_url && !data.rules_file_url) {
            return res.json({
                status: "success",
                data: null
            });
        }

        // Return raw Cloudinary URLs (for use with getStreamPdfUrl)
        res.json({
            status: "success",
            data: {
                // Raw Cloudinary URLs (สำหรับใช้กับ getStreamPdfUrl)
                project_detail_file_url: data.project_detail_file_url,
                rules_file_url: data.rules_file_url,

                updated_at: data.updated_at
            }
        });
    } catch (error) {
        console.error("Error in getProjectInfoDocsForResidentV2:", error);
        res.status(500).json({
            status: "error",
            message: "Server error"
        });
    }
};


/**
 * GET /api/resident/projects/:project_id/house-models
 * Get house models for residents
 * Only members of the project can view this
 */
exports.getHouseModelsForResident = async (req, res) => {
    try {
        const { project_id } = req.params;
        const userId = req.user?.id;

        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "project_id is required"
            });
        }

        // Check if user is a member of this project
        const [memberCheck] = await db.promise().query(
            "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
            [userId, project_id]
        );

        if (memberCheck.length === 0) {
            return res.status(403).json({
                status: "error",
                message: "You are not a member of this project"
            });
        }

        const query = `
            SELECT id, project_id, model_name, plan_file_url, detail_file_url, updated_at
            FROM house_models
            WHERE project_id = ?
            ORDER BY model_name ASC
        `;

        const [rows] = await db.promise().query(query, [project_id]);

        res.json({
            status: "success",
            data: rows
        });
    } catch (error) {
        console.error("Error in getHouseModelsForResident:", error);
        res.status(500).json({
            status: "error",
            message: "Server error"
        });
    }
};

/**
 * GET /api/resident/projects/:project_id/all-docs
 * Get all project documents (info docs + house models) for residents in a single call
 * Only members of the project can view this
 */
exports.getAllProjectDocsForResident = async (req, res) => {
    try {
        const { project_id } = req.params;
        const userId = req.user?.id;

        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "project_id is required"
            });
        }

        // Check if user is a member of this project
        const [memberCheck] = await db.promise().query(
            "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
            [userId, project_id]
        );

        if (memberCheck.length === 0) {
            return res.status(403).json({
                status: "error",
                message: "You are not a member of this project"
            });
        }

        // Get project info docs
        const [projectRows] = await db.promise().query(
            `SELECT 
                name,
                project_detail_file_url,
                rules_file_url,
                updated_at
            FROM projects
            WHERE id = ?`,
            [project_id]
        );

        if (projectRows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Project not found"
            });
        }

        // Get house models
        const [houseModels] = await db.promise().query(
            `SELECT id, model_name, plan_file_url, detail_file_url, updated_at
            FROM house_models
            WHERE project_id = ?
            ORDER BY model_name ASC`,
            [project_id]
        );

        const project = projectRows[0];

        res.json({
            status: "success",
            data: {
                project_name: project.name,
                info_docs: {
                    project_detail_file_url: project.project_detail_file_url,
                    rules_file_url: project.rules_file_url,
                    updated_at: project.updated_at
                },
                house_models: houseModels
            }
        });
    } catch (error) {
        console.error("Error in getAllProjectDocsForResident:", error);
        res.status(500).json({
            status: "error",
            message: "Server error"
        });
    }
};

/**
 * DELETE /api/projects/info-docs
 * Delete a specific project info document (project_detail or rules)
 * Body: { project_id: string, file_type: 'project_detail' | 'rules' }
 */
exports.deleteProjectInfoDoc = async (req, res) => {
    try {
        const { project_id, file_type } = req.body;

        if (!project_id) {
            return res.status(400).json({
                status: "error",
                message: "project_id is required"
            });
        }

        if (!file_type || !['project_detail', 'rules'].includes(file_type)) {
            return res.status(400).json({
                status: "error",
                message: "file_type must be 'project_detail' or 'rules'"
            });
        }

        // Check if project exists and get current file URL
        const columnName = file_type === 'project_detail' ? 'project_detail_file_url' : 'rules_file_url';
        const [projectRows] = await db.promise().query(
            `SELECT id, ${columnName} FROM projects WHERE id = ?`,
            [project_id]
        );

        if (projectRows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Project not found"
            });
        }

        const currentFileUrl = projectRows[0][columnName];

        // If there's a file, try to delete it from Cloudinary
        if (currentFileUrl && currentFileUrl.includes('cloudinary.com')) {
            try {
                // Extract public_id from URL
                // URL pattern: https://res.cloudinary.com/{cloud}/{type}/upload/v{version}/{folder}/{public_id}.{ext}
                const urlParts = currentFileUrl.split('/upload/');
                if (urlParts.length === 2) {
                    let pathPart = urlParts[1].replace(/^v\d+\//, '');
                    // Remove file extension
                    const lastDotIndex = pathPart.lastIndexOf('.');
                    const publicId = lastDotIndex !== -1 ? pathPart.substring(0, lastDotIndex) : pathPart;

                    // Determine resource type
                    const isRaw = currentFileUrl.includes('/raw/upload/');
                    const resourceType = isRaw ? 'raw' : 'image';

                    console.log(`Deleting from Cloudinary: ${publicId} (${resourceType})`);

                    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
                }
            } catch (cloudinaryError) {
                console.error("Error deleting from Cloudinary:", cloudinaryError);
                // Continue even if Cloudinary delete fails
            }
        }

        // Update database to set the file URL to NULL
        const updateQuery = `UPDATE projects SET ${columnName} = NULL, updated_at = NOW() WHERE id = ?`;
        await db.promise().query(updateQuery, [project_id]);

        // Fetch updated data
        const [updatedRows] = await db.promise().query(
            `SELECT project_detail_file_url, rules_file_url, updated_at FROM projects WHERE id = ?`,
            [project_id]
        );

        res.json({
            status: "success",
            message: `${file_type === 'project_detail' ? 'Project detail' : 'Rules'} file deleted successfully`,
            data: updatedRows[0]
        });
    } catch (error) {
        console.error("Error in deleteProjectInfoDoc:", error);
        res.status(500).json({
            status: "error",
            message: "Server error"
        });
    }
};
