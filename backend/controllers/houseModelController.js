const db = require("../config/db");
const {
    uploadFileToStorage,
    deleteFileFromStorage
} = require('../config/firebaseStorage');

// 2.1 GET /api/projects/:id/house-models
exports.getHouseModelsByProject = async (req, res) => {
    try {
        const { id: projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ status: 'error', message: 'Project ID is required' });
        }

        const query = `
      SELECT id, project_id, model_name, plan_file_url, detail_file_url, updated_at
      FROM house_models
      WHERE project_id = ?
    `;

        const [rows] = await db.promise().query(query, [projectId]);

        res.json({
            status: 'success',
            data: rows
        });

    } catch (error) {
        console.error("Error in getHouseModelsByProject:", error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// 2.2 POST /api/house-models
exports.upsertHouseModel = async (req, res) => {
    try {
        const { project_id, model_name } = req.body;
        let { plan_file_url, detail_file_url } = req.body;

        // Validate required fields
        if (!project_id || !model_name) {
            return res.status(400).json({
                status: 'error',
                message: 'project_id and model_name are required'
            });
        }

        // อัพโหลดไฟล์ PDF ไปยัง Firebase Storage เท่านั้น
        if (req.files) {
            if (req.files['plan_file'] && req.files['plan_file'][0]) {
                const file = req.files['plan_file'][0];
                const timestamp = Date.now();
                const safeModelName = model_name.replace(/[^a-zA-Z0-9ก-๙]/g, '_');
                const destinationPath = `house_models/${project_id}/${safeModelName}_plan_${timestamp}.pdf`;

                plan_file_url = await uploadFileToStorage(file.path, destinationPath, 'application/pdf');
            }

            if (req.files['detail_file'] && req.files['detail_file'][0]) {
                const file = req.files['detail_file'][0];
                const timestamp = Date.now();
                const safeModelName = model_name.replace(/[^a-zA-Z0-9ก-๙]/g, '_');
                const destinationPath = `house_models/${project_id}/${safeModelName}_detail_${timestamp}.pdf`;

                detail_file_url = await uploadFileToStorage(file.path, destinationPath, 'application/pdf');
            }
        }

        // Check availability
        const checkQuery = "SELECT id FROM house_models WHERE project_id = ? AND model_name = ?";
        const [existing] = await db.promise().query(checkQuery, [project_id, model_name]);

        if (existing.length > 0) {
            // Update
            let updateFields = [];
            let updateParams = [];

            if (plan_file_url !== undefined) {
                updateFields.push("plan_file_url = ?");
                updateParams.push(plan_file_url);
            }

            if (detail_file_url !== undefined) {
                updateFields.push("detail_file_url = ?");
                updateParams.push(detail_file_url);
            }

            if (updateFields.length === 0) {
                return res.json({ status: 'success', message: 'No changes provided' });
            }

            const updateQuery = `UPDATE house_models SET ${updateFields.join(', ')} WHERE id = ?`;
            updateParams.push(existing[0].id);

            await db.promise().query(updateQuery, updateParams);

            res.json({ status: 'success', message: 'House model updated successfully' });

        } else {
            // Insert
            const insertQuery = `
        INSERT INTO house_models (project_id, model_name, plan_file_url, detail_file_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `;
            // Handle nulls if url not provided
            await db.promise().query(insertQuery, [
                project_id,
                model_name,
                plan_file_url || null,
                detail_file_url || null
            ]);

            res.status(201).json({ status: 'success', message: 'House model created successfully' });
        }

    } catch (error) {
        console.error("Error in upsertHouseModel:", error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// 2.3 DELETE /api/house-models/:id
exports.deleteHouseModel = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ status: 'error', message: 'ID is required' });
        }

        // Get file URLs before deleting
        const [rows] = await db.promise().query("SELECT plan_file_url, detail_file_url FROM house_models WHERE id = ?", [id]);

        if (rows.length > 0) {
            const { plan_file_url, detail_file_url } = rows[0];

            // Delete files from Firebase Storage
            if (plan_file_url) await deleteFileFromStorage(plan_file_url);
            if (detail_file_url) await deleteFileFromStorage(detail_file_url);
        }

        const deleteQuery = "DELETE FROM house_models WHERE id = ?";
        const [result] = await db.promise().query(deleteQuery, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'House model not found' });
        }

        res.json({ status: 'success', message: 'House model deleted successfully' });

    } catch (error) {
        console.error("Error in deleteHouseModel:", error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

/**
 * GET /api/projects/:project_id/member/my-house-model
 * Get house model for the current user based on their unit's building type
 */
exports.getMyHouseModel = async (req, res) => {
    try {
        const { project_id } = req.params;
        const userId = req.user?.id;

        if (!project_id) {
            return res.status(400).json({ status: 'error', message: 'project_id is required' });
        }

        if (!userId) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized: User not authenticated' });
        }

        // Step 1: Check if user is a member of this project
        const [memberCheck] = await db.promise().query(
            "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
            [userId, project_id]
        );

        if (memberCheck.length === 0) {
            return res.status(403).json({ status: 'error', message: 'You are not a member of this project' });
        }

        // Step 2: Find user's unit from unit_members and get building from units
        const [unitResult] = await db.promise().query(
            `SELECT u.id as unit_id, u.unit_number, u.building, u.zone
             FROM unit_members um
             JOIN units u ON um.unit_id = u.id
             WHERE um.user_id = ? AND u.project_id = ?
             LIMIT 1`,
            [userId, project_id]
        );

        if (unitResult.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'You are not assigned to any unit in this project',
                data: null
            });
        }

        const userUnit = unitResult[0];
        const building = userUnit.building;

        if (!building) {
            return res.status(404).json({
                status: 'error',
                message: 'Your unit does not have a building type assigned',
                data: {
                    unit_id: userUnit.unit_id,
                    unit_number: userUnit.unit_number,
                    building: null,
                    house_model: null
                }
            });
        }

        // Step 3: Find house_model where model_name matches building
        const [houseModelResult] = await db.promise().query(
            `SELECT id, project_id, model_name, plan_file_url, detail_file_url, updated_at
             FROM house_models
             WHERE project_id = ? AND model_name = ?`,
            [project_id, building]
        );

        if (houseModelResult.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: `No house model found for building type: ${building}`,
                data: {
                    unit_id: userUnit.unit_id,
                    unit_number: userUnit.unit_number,
                    building: building,
                    house_model: null
                }
            });
        }

        const houseModel = houseModelResult[0];

        // Return direct URLs (Firebase Storage URLs are public)
        res.json({
            status: 'success',
            data: {
                unit_id: userUnit.unit_id,
                unit_number: userUnit.unit_number,
                zone: userUnit.zone,
                building: building,
                house_model: {
                    id: houseModel.id,
                    model_name: houseModel.model_name,

                    // Direct URLs
                    plan_view_url: houseModel.plan_file_url,
                    detail_view_url: houseModel.detail_file_url,
                    plan_download_url: houseModel.plan_file_url,
                    detail_download_url: houseModel.detail_file_url,

                    plan_file_url: houseModel.plan_file_url, // For API V2 compatibility
                    detail_file_url: houseModel.detail_file_url, // For API V2 compatibility

                    updated_at: houseModel.updated_at
                }
            }
        });

    } catch (error) {
        console.error("Error in getMyHouseModel:", error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

/**
 * GET /api/projects/:project_id/member/my-house-model-v2
 * Identical to getMyHouseModel now since we use direct URLs
 */
exports.getMyHouseModelV2 = exports.getMyHouseModel;
