const db = require("../config/db");
const cloudinary = require('cloudinary').v2;

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

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

        // อัพโหลดไฟล์ PDF ไปยัง Cloudinary (ถ้ามี)
        // ใช้ resource_type: 'auto' เพื่อให้ Cloudinary จัดการประเภทไฟล์เอง (PDF จะถูกมองเป็น image)
        // ซึ่งช่วยแก้ปัญหา "Customer is marked as untrusted" ของบัญชีใหม่ได้ดีกว่า raw
        if (req.files) {
            if (req.files['plan_file'] && req.files['plan_file'][0]) {
                const result = await cloudinary.uploader.upload(req.files['plan_file'][0].path, {
                    folder: `house_models/${project_id}`,
                    resource_type: 'auto'
                });
                plan_file_url = result.secure_url;
            }

            if (req.files['detail_file'] && req.files['detail_file'][0]) {
                const result = await cloudinary.uploader.upload(req.files['detail_file'][0].path, {
                    folder: `house_models/${project_id}`,
                    resource_type: 'auto'
                });
                detail_file_url = result.secure_url;
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
 * 
 * Flow:
 * 1. Get user_id from token
 * 2. Find unit_id from unit_members where user_id matches
 * 3. Get building from units table
 * 4. Match house_models where model_name = building
 * 
 * Returns the matched house model with plan_file_url and detail_file_url
 */
exports.getMyHouseModel = async (req, res) => {
    try {
        const { project_id } = req.params;
        const userId = req.user?.id;

        if (!project_id) {
            return res.status(400).json({
                status: 'error',
                message: 'project_id is required'
            });
        }

        if (!userId) {
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized: User not authenticated'
            });
        }

        // Step 1: Check if user is a member of this project
        const [memberCheck] = await db.promise().query(
            "SELECT role FROM project_members WHERE user_id = ? AND project_id = ?",
            [userId, project_id]
        );

        if (memberCheck.length === 0) {
            return res.status(403).json({
                status: 'error',
                message: 'You are not a member of this project'
            });
        }

        // Step 2: Find user's unit from unit_members and get building from units
        // Join unit_members -> units to get building
        console.log("=== Debug getMyHouseModel ===");
        console.log("userId:", userId);
        console.log("project_id:", project_id);

        const [unitResult] = await db.promise().query(
            `SELECT u.id as unit_id, u.unit_number, u.building, u.zone
             FROM unit_members um
             JOIN units u ON um.unit_id = u.id
             WHERE um.user_id = ? AND u.project_id = ?
             LIMIT 1`,
            [userId, project_id]
        );

        console.log("unitResult:", unitResult);
        console.log("unitResult.length:", unitResult.length);

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

        // ฟังก์ชันสร้าง Signed URL แบบแยกวัตถุประสงค์
        const generateSmartUrl = (url, mode = 'original', filename = 'document.pdf') => {
            if (!url) return null;

            // ถ้าเป็นโหมด Download -> ใช้ Proxy ผ่าน Backend เราเอง (แก้ปัญหา Cloudinary 401 Untrusted 100%)
            if (mode === 'download') {
                // Return Proxy URL
                // Backend URL จะถูก construct ที่ frontend หรือส่งไปแบบ relative path
                // แต่เพื่อความง่าย เราส่งเป็น Path ไป แล้วให้ frontend เติม BASE_URL

                // เราต้องส่ง original Cloudinary URL ไปเป็น param
                return `/api/projects/${project_id}/member/download-pdf?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
            }

            try {
                // ส่วน View ยังคงใช้ Cloudinary JPG Transformation (เพราะเร็วและ work)
                const urlParts = url.split('/upload/');
                if (urlParts.length < 2) return url;

                const isRaw = url.includes('/raw/upload/');
                const resourceType = isRaw ? 'raw' : 'image';

                let pathPart = urlParts[1].replace(/^v\d+\//, '');

                // หา public_id และ format
                let publicId = pathPart;

                // แยก extension
                const lastDotIndex = pathPart.lastIndexOf('.');
                if (lastDotIndex !== -1) {
                    publicId = pathPart.substring(0, lastDotIndex);
                }

                // เช็คว่าเป็น PDF หรือไม่จากนามสกุลไฟล์
                const isPdf = url.toLowerCase().endsWith('.pdf');

                // Options สำหรับ View
                const options = {
                    resource_type: resourceType,
                    type: 'upload',
                    sign_url: true,
                    secure: true,
                    expires_at: Math.floor(Date.now() / 1000) + 3600
                };

                // Logic สำหรับโหมด View
                if (mode === 'view') {
                    // ถ้าเป็น PDF (ไม่ว่า Cloudinary จะมองเป็น raw หรือ image) ให้ใช้ Proxy Inline
                    // เพื่อให้ดูได้ครบทุกหน้า (แก้ปัญหา JPG หน้าเดียว)
                    if (isPdf || resourceType === 'raw') {
                        const viewFilename = filename === 'document.pdf' ? 'view.pdf' : filename;
                        return `/api/projects/${project_id}/member/download-pdf?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(viewFilename)}&disposition=inline`;
                    }

                    // ถ้าเป็นรูปภาพจริงๆ (ไม่ใช่ PDF) -> แปลงเป็น JPG (หรือใช้ตามเดิม)
                    if (resourceType === 'image') {
                        options.format = 'jpg';
                        return cloudinary.url(publicId, options);
                    }
                }

                if (resourceType === 'raw') {
                    return cloudinary.url(pathPart, { ...options, resource_type: 'raw' });
                }

                return cloudinary.url(publicId, options);
            } catch (error) {
                console.error('Error generating smart URL:', error);
                return url;
            }
        };

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
                    // URL สำหรับดู (JPG หรือ PDF Inline)
                    plan_view_url: generateSmartUrl(houseModel.plan_file_url, 'view', `${houseModel.model_name} - แปลนบ้าน.pdf`),
                    detail_view_url: generateSmartUrl(houseModel.detail_file_url, 'view', `${houseModel.model_name} - รายละเอียด.pdf`),

                    // URL สำหรับดาวน์โหลด (Proxy through Backend)
                    plan_download_url: generateSmartUrl(houseModel.plan_file_url, 'download', `${houseModel.model_name} - แปลนบ้าน.pdf`),
                    detail_download_url: generateSmartUrl(houseModel.detail_file_url, 'download', `${houseModel.model_name} - รายละเอียด.pdf`),

                    updated_at: houseModel.updated_at
                }
            }
        });

    } catch (error) {
        console.error("Error in getMyHouseModel:", error);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
};

// Proxy สำหรับดาวน์โหลดไฟล์ PDF ผ่าน Backend (แก้ปัญหา Untrusted Account ของ Cloudinary)
exports.proxyPdfDownload = async (req, res) => {
    try {
        const { url, filename, token } = req.query; // รับ token จาก query param
        const project_id = req.params.project_id;

        // Debug
        // console.log("Proxy Download Request:", { url, filename, project_id, hasToken: !!token });

        if (!url) {
            return res.status(400).json({ status: 'error', message: 'Missing URL parameter' });
        }

        if (!token) {
            return res.status(401).json({ status: 'error', message: 'Missing token' });
        }

        // Verify Token แบบ manual (เพราะถอด middleware ออกแล้ว)
        const jwt = require('jsonwebtoken');
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ status: 'error', message: 'Invalid token' });
        }

        const userId = decoded.id; // ดึง user id จาก token

        // ตรวจสอบสิทธิ์ (ต้องเป็น member ของ project) - ใช้ unit_members check ก็ได้ หรือ project_members
        // เพื่อความง่ายและเร็ว ใช้ unit_members (เพราะเป็น resident feature)
        const [memberCheck] = await db.promise().execute(
            `SELECT um.id FROM unit_members um
             JOIN units u ON um.unit_id = u.id
             WHERE u.project_id = ? AND um.user_id = ?`,
            [project_id, userId]
        );

        if (memberCheck.length === 0) {
            // Fallback check project_members (เผื่อเป็น juristic)
            const [staffCheck] = await db.promise().execute(
                'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
                [project_id, userId]
            );

            if (staffCheck.length === 0) {
                return res.status(403).json({ status: 'error', message: 'Unauthorized' });
            }
        }

        // ===================================================
        // ใช้ cloudinary.utils.private_download_url() 
        // ซึ่งเป็น Admin API - Cloudinary ต้อง accept แน่นอน
        // แก้ปัญหา Untrusted Account 100%
        // ===================================================
        let targetUrl = url;

        // Validate URL format
        if (!targetUrl.startsWith('http')) {
            console.error("Invalid URL format:", targetUrl);
            return res.status(400).json({ status: 'error', message: 'Invalid URL format' });
        }

        // ถ้าเป็น Cloudinary URL ให้สร้าง Private Download URL
        if (targetUrl.includes('cloudinary.com')) {
            try {
                // Extract public_id และ resource_type จาก URL
                // URL pattern: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{path}
                // หรือ: https://res.cloudinary.com/{cloud}/raw/upload/v{version}/{path}

                const urlParts = targetUrl.split('/upload/');
                if (urlParts.length === 2) {
                    // ลบ version (v1234567890/) ออก และ signature (s--xxx--/) ถ้ามี
                    let pathPart = urlParts[1]
                        .replace(/^v\d+\//, '')
                        .replace(/^s--[^\/]+--\//, '');

                    // ตรวจสอบ resource_type (raw หรือ image)
                    const isRaw = targetUrl.includes('/raw/upload/');
                    const resourceType = isRaw ? 'raw' : 'image';

                    // หา public_id (ไม่รวม extension)
                    const lastDotIndex = pathPart.lastIndexOf('.');
                    const publicId = lastDotIndex !== -1 ? pathPart.substring(0, lastDotIndex) : pathPart;
                    const format = lastDotIndex !== -1 ? pathPart.substring(lastDotIndex + 1) : 'pdf';

                    console.log("=== Cloudinary Private Download ===");
                    console.log("  Resource Type:", resourceType);
                    console.log("  Public ID:", publicId);
                    console.log("  Format:", format);

                    // ใช้ private_download_url ซึ่งเป็น Admin API
                    // สร้าง URL ที่มี timestamp และ signature ที่ Cloudinary ต้อง accept
                    targetUrl = cloudinary.utils.private_download_url(publicId, format, {
                        resource_type: resourceType,
                        type: 'upload',
                        expires_at: Math.floor(Date.now() / 1000) + 3600, // หมดอายุใน 1 ชั่วโมง
                        attachment: false // ไม่ force download
                    });

                    console.log("  Private Download URL:", targetUrl);
                }
            } catch (signError) {
                console.error("Error generating private download URL:", signError);
                // Fallback to original URL
            }
        }

        const axios = require('axios');

        // โหลดไฟล์จาก Cloudinary แบบ Stream
        console.log("=== PDF Proxy Fetch ===");
        console.log("Original URL:", url);
        console.log("Target URL:", targetUrl);
        console.log("Filename:", filename);
        console.log("Disposition:", req.query.disposition || 'attachment');

        const response = await axios({
            method: 'GET',
            url: targetUrl,
            responseType: 'stream',
            timeout: 60000, // เพิ่ม timeout เป็น 60 วินาที
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SPB-Backend/1.0)',
                'Accept': '*/*'
            },
            // ตรวจสอบ status code แบบ manual
            validateStatus: (status) => status < 500
        });

        // ตรวจสอบ response status
        if (response.status !== 200) {
            console.error("Cloudinary returned non-200 status:", response.status);
            return res.status(response.status).json({
                status: 'error',
                message: `File fetch failed with status ${response.status}`
            });
        }

        // ตรวจสอบ content-type (เผื่อ Cloudinary ส่ง error page มาแทน PDF)
        const contentType = response.headers['content-type'] || '';
        console.log("Response Content-Type:", contentType);

        // Set Headers
        res.setHeader('Content-Type', contentType.includes('pdf') ? 'application/pdf' : contentType);

        // Encode filename เพื่อรองรับภาษาไทย
        const encodedFilename = encodeURIComponent(filename || 'document.pdf');

        // รับค่า disposition จาก query (attachment = download, inline = view)
        const disposition = req.query.disposition || 'attachment';
        res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodedFilename}`);

        // Set CORS headers for PDF viewing
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

        // Pipe stream ไปที่ response
        response.data.pipe(res);

    } catch (error) {
        console.error("=== Error in proxyPdfDownload ===");
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);

        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response statusText:", error.response.statusText);
            console.error("Request URL:", error.config?.url);
        }

        if (error.request) {
            console.error("Request was made but no response received");
        }

        res.status(500).json({
            status: 'error',
            message: 'Download failed: ' + (error.message || 'Unknown error')
        });
    }
};
