import ApiService from "./apiService";

class ProjectCustomizationsService {
  static async getProjectCustomizations(projectId) {
    try {
      const response = await ApiService.get(
        `/api/project-customizations/${projectId}`
      );
      console.log("ProjectCustomizations API Response:", response);
      return response;
    } catch (error) {
      console.error("Error fetching project customizations:", error);
      throw error;
    }
  }
}

export default ProjectCustomizationsService;
