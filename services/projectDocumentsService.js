import ApiService from "./apiService";

// Project Documents Service for Members/Residents
class ProjectDocumentsService {
    // Get all project documents (info docs + house models)
    static async getProjectDocuments(projectId) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.get(`/api/projects/${projectId}/member/documents`, token);
        } catch (error) {
            console.error("Error fetching project documents:", error);
            throw error;
        }
    }

    // Get project info docs only
    static async getProjectInfoDocs(projectId) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.get(`/api/projects/${projectId}/member/info-docs`, token);
        } catch (error) {
            console.error("Error fetching project info docs:", error);
            throw error;
        }
    }

    // Get house models only
    static async getHouseModels(projectId) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.get(`/api/projects/${projectId}/member/house-models`, token);
        } catch (error) {
            console.error("Error fetching house models:", error);
            throw error;
        }
    }

    // Get my house model (based on user's unit building type)
    static async getMyHouseModel(projectId) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.get(`/api/projects/${projectId}/member/my-house-model`, token);
        } catch (error) {
            console.error("Error fetching my house model:", error);
            throw error;
        }
    }

    // Helper to construct authenticated Proxy URL (BaseURL + Path + Token)
    static async getAuthenticatedProxyUrl(relativeUrl) {
        try {
            if (!relativeUrl) return null;

            // ถ้าเป็น Full URL อยู่แล้ว (เช่น Cloudinary link เก่า) ให้คืนค่าเดิม
            if (relativeUrl.startsWith('http')) {
                return relativeUrl;
            }

            const token = await ApiService.getToken();
            // ดึง Base URL จาก config (ผ่าน ApiService หรือ import โดยตรง)
            // สมมติว่า relativeUrl คือ /api/projects/...
            // เราต้องการ http://domain/api/projects/...?token=xxx

            // เนื่องจาก ApiService ซ่อน axios instance ไว้
            // เรา import getApiBaseUrl จาก config ได้เลย
            const { getApiBaseUrl } = require('../utils/config');
            const baseUrl = getApiBaseUrl();

            // เชื่อมด้วย ? หรือ &
            const separator = relativeUrl.includes('?') ? '&' : '?';

            return `${baseUrl}${relativeUrl}${separator}token=${token}`;
        } catch (error) {
            console.error("Error generating authenticated url:", error);
            return null;
        }
    }
}

export default ProjectDocumentsService;
