import ApiService from "./apiService";

// Units and Invitations API Service
class UnitsService {
  // Join unit with invitation code
  static async joinUnit(invitationCode) {
    try {
      const token = await ApiService.getToken();
      return await ApiService.post("/api/units/invitations/join", {
        invitation_code: invitationCode
      }, token);
    } catch (error) {
      console.error("Error joining unit:", error);
      throw error;
    }
  }

  // Get user's units
  static async getUserUnits() {
    try {
      const token = await ApiService.getToken();
      return await ApiService.get("/api/units/my-units", token);
    } catch (error) {
      console.error("Error fetching user units:", error);
      throw error;
    }
  }

  // Get unit details
  static async getUnitDetails(unitId) {
    try {
      const token = await ApiService.getToken();
      return await ApiService.get(`/api/units/${unitId}`, token);
    } catch (error) {
      console.error("Error fetching unit details:", error);
      throw error;
    }
  }

  // Create invitation code
  static async createInvitation(unitId) {
    try {
      const token = await ApiService.getToken();
      return await ApiService.post(`/api/units/${unitId}/invitations`, {}, token);
    } catch (error) {
      console.error("Error creating invitation:", error);
      throw error;
    }
  }

  // Get unit members
  static async getUnitMembers(unitId) {
    try {
      const token = await ApiService.getToken();
      return await ApiService.get(`/api/units/${unitId}/members`, token);
    } catch (error) {
      console.error("Error fetching unit members:", error);
      throw error;
    }
  }

  // Leave unit
  static async leaveUnit(unitId) {
    try {
      const token = await ApiService.getToken();
      return await ApiService.delete(`/api/units/${unitId}/leave`, token);
    } catch (error) {
      console.error("Error leaving unit:", error);
      throw error;
    }
  }
}

export default UnitsService;
