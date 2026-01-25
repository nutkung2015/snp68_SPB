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

    /**
     * Get project info docs V2 - Returns raw URLs
     */
    static async getProjectInfoDocsV2(projectId) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.get(`/api/projects/${projectId}/member/info-docs-v2`, token);
        } catch (error) {
            console.error("Error fetching project info docs v2:", error);
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

    /**
     * Get my house model V2 - Returns raw URLs
     */
    static async getMyHouseModelV2(projectId) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.get(`/api/projects/${projectId}/member/my-house-model-v2`, token);
        } catch (error) {
            console.error("Error fetching my house model v2:", error);
            throw error;
        }
    }


    /**
     * Generate URL for PDF viewing/downloading
     * Since we switched to Firebase Storage (fully public), we can just return the raw URL.
     * No need for proxy or complex logic anymore.
     * 
     * @param {string} projectId - Project ID (unused now but kept for compatibility)
     * @param {string} fileUrl - Raw storage URL
     * @param {string} filename - Filename (unused now)
     * @param {string} disposition - (unused now)
     * @returns {Promise<string|null>} - Direct URL
     */
    static async getStreamPdfUrl(projectId, fileUrl, filename = 'document.pdf', disposition = 'inline') {
        // Return URL directly as it's accessible publicly via Firebase Storage
        return fileUrl;
    }
}

export default ProjectDocumentsService;
