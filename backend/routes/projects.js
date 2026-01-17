const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware'); // หากคุณต้องการการยืนยันตัวตน
const { requireJuristicRole } = require('../middleware/roleMiddleware');

const houseModelController = require('../controllers/houseModelController');
const projectModelController = require('../controllers/projectModelController');

const upload = require('../middleware/uploadMiddleware'); // Import upload middleware
const requireSuperAdmin = require('../middleware/superAdminMiddleware'); // For super admin only routes

// Route สำหรับดึงข้อมูล project memberships (ต้องอยู่ก่อน /:id เพื่อไม่ให้ conflict)
router.get('/memberships', authMiddleware, projectController.getProjectMemberships);

// Project Info Documents Routes
// GET /api/projects/info-docs - ดึงข้อมูล project_detail_file_url และ rules_file_url (ส่ง project_id ใน query)
// IMPORTANT: ต้องอยู่ก่อน /:id เพื่อไม่ให้ถูก match เป็น project id
router.get('/info-docs', authMiddleware, projectModelController.getProjectInfoDocs);

// Route สำหรับดึงโปรเจกต์ทั้งหมด (Super Admin Only)
router.get('/', authMiddleware, requireSuperAdmin, projectController.getAllProjects);

// Route สำหรับสร้างโปรเจกต์ใหม่ (Super Admin Only)
router.post('/', authMiddleware, requireSuperAdmin, projectController.createProject);

// Route สำหรับแก้ไขโปรเจกต์ (Super Admin Only)
router.put('/:id', authMiddleware, requireSuperAdmin, projectController.updateProject);

// Route สำหรับลบโปรเจกต์ (Super Admin Only) - Soft Delete
router.delete('/:id', authMiddleware, requireSuperAdmin, projectController.deleteProject);

// Route สำหรับกู้คืนโปรเจกต์ที่ถูกลบ (Super Admin Only)
router.post('/:id/restore', authMiddleware, requireSuperAdmin, projectController.restoreProject);

// Route สำหรับดึงรายละเอียดโปรเจกต์
router.get('/:id', authMiddleware, projectController.getProjectDetails);

// POST /api/projects/info-docs - อัพโหลด/อัพเดท project_detail_file และ rules_file
// ส่ง project_id ใน body (FormData)
// ต้องมี role เป็น juristicMember หรือ juristicLeader เท่านั้น
// IMPORTANT: upload.fields ต้องอยู่ก่อน requireJuristicRole เพื่อให้ parse FormData ก่อน
router.post('/info-docs', authMiddleware, upload.fields([
    { name: 'project_detail_file', maxCount: 1 },
    { name: 'rules_file', maxCount: 1 }
]), requireJuristicRole, projectModelController.upsertProjectInfoDocs);

// DELETE /api/projects/info-docs - ลบไฟล์ project_detail หรือ rules
// Body: { project_id, file_type: 'project_detail' | 'rules' }
router.delete('/info-docs', authMiddleware, requireJuristicRole, projectModelController.deleteProjectInfoDoc);

// House Models Routes
// GET /api/projects/:id/house-models
router.get('/:id/house-models', authMiddleware, houseModelController.getHouseModelsByProject);

// POST /api/projects/house-models (รองรับทั้ง JSON และ Multipart/Form-data)
router.post('/house-models', authMiddleware, upload.fields([
    { name: 'plan_file', maxCount: 1 },
    { name: 'detail_file', maxCount: 1 }
]), houseModelController.upsertHouseModel);

// DELETE /api/projects/house-models/:id
router.delete('/house-models/:id', authMiddleware, houseModelController.deleteHouseModel);

// ==================== Member/Resident Routes (Read-Only) ====================
// สำหรับสมาชิกโครงการ (ลูกบ้าน) ดูข้อมูลโครงการ

// GET /api/projects/:project_id/member/info-docs
// ดึงเอกสารโครงการ (project_detail, rules) สำหรับลูกบ้าน
router.get('/:project_id/member/info-docs', authMiddleware, projectModelController.getProjectInfoDocsForResident);

// GET /api/projects/:project_id/member/info-docs-v2
// Version 2: Returns raw Cloudinary URLs (project_detail_file_url, rules_file_url)
// สำหรับใช้กับ getStreamPdfUrl() และ pdf-stream endpoint
router.get('/:project_id/member/info-docs-v2', authMiddleware, projectModelController.getProjectInfoDocsForResidentV2);


// GET /api/projects/:project_id/member/house-models
// ดึงแบบบ้านทั้งหมดของโครงการสำหรับลูกบ้าน
router.get('/:project_id/member/house-models', authMiddleware, projectModelController.getHouseModelsForResident);

// GET /api/projects/:project_id/member/documents
// ดึงเอกสารทั้งหมด (info docs + house models) ในครั้งเดียว
router.get('/:project_id/member/documents', authMiddleware, projectModelController.getAllProjectDocsForResident);

// GET /api/projects/:project_id/member/my-house-model
// ดึงแบบบ้านของ user ตาม unit ที่อยู่ (match building -> model_name)
router.get('/:project_id/member/my-house-model', authMiddleware, houseModelController.getMyHouseModel);

// GET /api/projects/:project_id/member/my-house-model-v2
// Version 2: Returns raw Cloudinary URLs (plan_file_url, detail_file_url)
// สำหรับใช้กับ getStreamPdfUrl() และ pdf-stream endpoint
router.get('/:project_id/member/my-house-model-v2', authMiddleware, houseModelController.getMyHouseModelV2);

// Route สำหรับดาวน์โหลด PDF ผ่าน Proxy (แก้ 401 Untrusted) - Verify token ใน controller
router.get("/:project_id/member/download-pdf", houseModelController.proxyPdfDownload);

// NEW: Optimized PDF streaming with Cache support - ดีกว่า download-pdf
// มี Cache-Control, ETag, 304 support สำหรับ performance ที่ดีขึ้น
router.get("/:project_id/member/pdf-stream", houseModelController.streamPdfProxy);

module.exports = router;
