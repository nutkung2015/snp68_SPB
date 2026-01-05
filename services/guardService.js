import ApiService from './apiService';

/**
 * Guard Service
 * บริการสำหรับจัดการข้อมูลป้อมยาม / รปภ.
 */
class GuardService {
    /**
     * ดึงเบอร์โทรป้อมยามของบ้านผู้ใช้ปัจจุบัน
     * @returns {Promise<Object>} ข้อมูลป้อมยามรวมถึงเบอร์โทร
     */
    static async getMyGuardPhone() {
        const token = await ApiService.getToken();
        return ApiService.get('/api/guards/my-guard-phone', token);
    }

    /**
     * ดึงข้อมูลป้อมยามทั้งหมดของโครงการ
     * @param {string} projectId - ID ของโครงการ
     * @returns {Promise<Object>} รายการป้อมยามทั้งหมด
     */
    static async getGuardPhonesByProject(projectId) {
        const token = await ApiService.getToken();
        return ApiService.get(`/api/guards/project/${projectId}`, token);
    }

    /**
     * ดึงเบอร์โทรป้อมยามตาม unit ID
     * @param {string} unitId - ID ของบ้าน
     * @returns {Promise<Object>} ข้อมูลป้อมยาม
     */
    static async getGuardPhoneByUnit(unitId) {
        const token = await ApiService.getToken();
        return ApiService.get(`/api/guards/unit/${unitId}`, token);
    }

    /**
     * ดึงข้อมูลป้อมยามตาม ID
     * @param {string} guardPostId - ID ของป้อมยาม
     * @returns {Promise<Object>} รายละเอียดป้อมยามพร้อมโซน
     */
    static async getGuardPostDetail(guardPostId) {
        const token = await ApiService.getToken();
        return ApiService.get(`/api/guards/post/${guardPostId}`, token);
    }

    /**
     * ดึงรายการป้อมยามทั้งหมดของโครงการ (CRUD API)
     * @param {string} projectId - ID ของโครงการ
     * @param {string} status - สถานะ (active/inactive)
     * @returns {Promise<Object>} รายการป้อมยาม
     */
    static async getGuardPosts(projectId, status = 'active') {
        const token = await ApiService.getToken();
        let url = `/api/guard-posts?project_id=${projectId}`;
        if (status) {
            url += `&status=${status}`;
        }
        return ApiService.get(url, token);
    }

    /**
     * ดึงข้อมูลป้อมยามตาม ID (CRUD API)
     * @param {string} guardPostId - ID ของป้อมยาม
     * @returns {Promise<Object>} รายละเอียดป้อมยาม
     */
    static async getGuardPostById(guardPostId) {
        const token = await ApiService.getToken();
        return ApiService.get(`/api/guard-posts/${guardPostId}`, token);
    }
}

export default GuardService;
