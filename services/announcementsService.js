import ApiService from "./apiService";

// Announcements API Service
class AnnouncementsService {
  // Get all announcements with filters
  static async getAnnouncements(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.status) queryParams.append('status', params.status);
      if (params.category) queryParams.append('category', params.category);
      if (params.timeFilter) queryParams.append('timeFilter', params.timeFilter);
      
      const queryString = queryParams.toString();
      const endpoint = `/api/announcements${queryString ? `?${queryString}` : ''}`;
      
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
}

export default AnnouncementsService;
