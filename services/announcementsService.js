import ApiService from "./apiService";

// Announcements API Service
class AnnouncementsService {
  // Get all announcements with filters
  static async getAnnouncements(params = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (params.limit) queryParams.append('limit', params.limit);
      if (params.status) queryParams.append('status', params.status);
      if (params.type) queryParams.append('type', params.type);
      if (params.days) queryParams.append('days', params.days);
      if (params.latest) queryParams.append('latest', params.latest);
      if (params.projectId) queryParams.append('project_id', params.projectId);

      const queryString = queryParams.toString();
      let endpoint = '/api/announcements';

      if (params.projectId) {
        endpoint += '/resident';
      }

      endpoint += queryString ? `?${queryString}` : '';

      const token = await ApiService.getToken();
      return await ApiService.get(endpoint, token);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      throw error;
    }
  }

  // Get announcement by ID
  static async getAnnouncementById(announcementId) {
    try {
      const token = await ApiService.getToken();
      return await ApiService.get(`/api/announcements/${announcementId}`, token);
    } catch (error) {
      console.error("Error fetching announcement detail:", error);
      throw error;
    }
  }

  // Create new announcement
  static async createAnnouncement(announcementData) {
    try {
      const token = await ApiService.getToken();
      return await ApiService.post("/api/announcements", announcementData, token);
    } catch (error) {
      console.error("Error creating announcement:", error);
      throw error;
    }
  }

  // Update announcement
  static async updateAnnouncement(announcementId, announcementData) {
    try {
      const token = await ApiService.getToken();
      return await ApiService.put(`/api/announcements/${announcementId}`, announcementData, token);
    } catch (error) {
      console.error("Error updating announcement:", error);
      throw error;
    }
  }

  // Delete announcement
  static async deleteAnnouncement(announcementId) {
    try {
      const token = await ApiService.getToken();
      return await ApiService.delete(`/api/announcements/${announcementId}`, token);
    } catch (error) {
      console.error("Error deleting announcement:", error);
      throw error;
    }
  }

  // Acknowledge announcement
  static async acknowledgeAnnouncement(announcementId) {
    try {
      const token = await ApiService.getToken();
      return await ApiService.post(`/api/announcements/${announcementId}/acknowledge`, {}, token);
    } catch (error) {
      console.error("Error acknowledging announcement:", error);
      throw error;
    }
  }

  // Get global announcements for user's project
  static async getGlobalAnnouncements(projectId) {
    try {
      const token = await ApiService.getToken();
      const endpoint = `/api/announcements/global?project_id=${projectId}`;
      return await ApiService.get(endpoint, token);
    } catch (error) {
      console.error("Error fetching global announcements:", error);
      throw error;
    }
  }

  // Get single global announcement by ID
  static async getGlobalAnnouncementById(announcementId) {
    try {
      const token = await ApiService.getToken();
      return await ApiService.get(`/api/announcements/global/${announcementId}`, token);
    } catch (error) {
      console.error("Error fetching global announcement detail:", error);
      throw error;
    }
  }
}

export default AnnouncementsService;
