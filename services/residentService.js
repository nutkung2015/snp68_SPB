import ApiService from "./apiService";

// Resident Management API Service
class ResidentService {
    // Get all residents in a unit
    static async getUnitResidents(unitId) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.get(`/api/resident-management/units/${unitId}/members`, token);
        } catch (error) {
            console.error("Error fetching unit residents:", error);
            throw error;
        }
    }

    // Remove resident from unit
    static async removeResident(unitId, userId) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.delete(`/api/resident-management/units/${unitId}/members/${userId}`, token);
        } catch (error) {
            console.error("Error removing resident:", error);
            throw error;
        }
    }

    // Generate QR Code invitation for unit
    static async generateInvitationQR(unitId, role = "family") {
        try {
            const token = await ApiService.getToken();
            return await ApiService.post(`/api/resident-management/units/${unitId}/invitations`, { role }, token);
        } catch (error) {
            console.error("Error generating invitation QR:", error);
            throw error;
        }
    }

    // Get active invitations for unit
    static async getUnitInvitations(unitId) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.get(`/api/resident-management/units/${unitId}/invitations`, token);
        } catch (error) {
            console.error("Error fetching unit invitations:", error);
            throw error;
        }
    }

    // Cancel invitation
    static async cancelInvitation(unitId, invitationId) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.delete(`/api/resident-management/units/${unitId}/invitations/${invitationId}`, token);
        } catch (error) {
            console.error("Error cancelling invitation:", error);
            throw error;
        }
    }

    // Get unit vehicles
    static async getUnitVehicles(unitId) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.get(`/api/vehicle-management/units/${unitId}/vehicles`, token);
        } catch (error) {
            console.error("Error fetching unit vehicles:", error);
            throw error;
        }
    }

    // Add vehicle to unit
    static async addVehicle(unitId, vehicleData) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.post(`/api/vehicle-management/units/${unitId}/vehicles`, vehicleData, token);
        } catch (error) {
            console.error("Error adding vehicle:", error);
            throw error;
        }
    }

    // Update vehicle
    static async updateVehicle(unitId, vehicleId, vehicleData) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.put(`/api/vehicle-management/units/${unitId}/vehicles/${vehicleId}`, vehicleData, token);
        } catch (error) {
            console.error("Error updating vehicle:", error);
            throw error;
        }
    }

    // Remove vehicle from unit
    static async removeVehicle(unit_id, vehicleId) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.delete(`/api/vehicle-management/units/${unit_id}/vehicles/${vehicleId}`, token);
        } catch (error) {
            console.error("Error removing vehicle:", error);
            throw error;
        }
    }

    // New: Get all residents in a project (for Admin/Juristic)
    static async getAllResidents(projectId) {
        try {
            const token = await ApiService.getToken();
            return await ApiService.get(`/api/residents?project_id=${projectId}`, token);
        } catch (error) {
            console.error("Error fetching project residents:", error);
            throw error;
        }
    }
}


export default ResidentService;
