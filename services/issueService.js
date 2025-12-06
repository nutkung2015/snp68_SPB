import ApiService from "./apiService";

class IssueService {
  static async createPersonalRepair(formData) {
    try {
      const token = await ApiService.getToken();
      console.log('Token:', token);
      console.log('FormData being sent:', formData);

      const response = await ApiService.post("/api/repairs/personal", formData, token);
      console.log('Response from server:', response);
      return response;
    } catch (error) {
      console.error("Error creating personal repair:", error.response || error);
      throw error;
    }
  }

  static async getPersonalRepairs(projectId) {
    try {
      const token = await ApiService.getToken();
      const response = await ApiService.get(`/api/repairs/personal?project_id=${projectId}`, token);
      return response.data; // Assuming the API returns { status: 'success', data: [...] }
    } catch (error) {
      console.error("Error fetching personal repairs:", error.response || error);
      throw error;
    }
  }

  static async getPersonalRepairByResidents(projectId) {
    try {
      const token = await ApiService.getToken();
      const response = await ApiService.get(`/api/repairs/personal/my-repairs?project_id=${projectId}`, token);
      return response.data;
    } catch (error) {
      console.error("Error fetching personal repairs for resident:", error.response || error);
      throw error;
    }
  }

  static async getPersonalRepairById(issueId) {
    try {
      const token = await ApiService.getToken();
      const response = await ApiService.get(`/api/repairs/personal/${issueId}`, token);
      return response.data;
    } catch (error) {
      console.error("Error fetching personal repair details:", error.response || error);
      throw error;
    }
  }

  // Common Issues
  static async createCommonIssue(formData) {
    try {
      const token = await ApiService.getToken();
      console.log('Token:', token);
      console.log('FormData being sent:', formData);

      const response = await ApiService.post("/api/repairs/common-issues", formData, token);
      console.log('Response from server:', response);
      return response;
    } catch (error) {
      console.error("Error creating common issue:", error.response || error);
      throw error;
    }
  }

  static async getCommonIssues(projectId) {
    try {
      const token = await ApiService.getToken();
      const response = await ApiService.get(`/api/repairs/common-issues/my-issues?project_id=${projectId}`, token);
      return response.data;
    } catch (error) {
      console.error("Error fetching common issues:", error.response || error);
      throw error;
    }
  }

  static async getCommonIssueById(issueId) {
    try {
      const token = await ApiService.getToken();
      const response = await ApiService.get(`/api/repairs/common-issues/${issueId}`, token);
      return response.data;
    } catch (error) {
      console.error("Error fetching common issue details:", error.response || error);
      throw error;
    }
  }

  static async convertImagesToBase64(images) {
    const imagePromises = images.map(async (uri) => {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    });

    return Promise.all(imagePromises);
  }
}

export default IssueService;
