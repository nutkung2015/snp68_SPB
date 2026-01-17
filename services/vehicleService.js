import AsyncStorage from "@react-native-async-storage/async-storage";
import apiService from "./apiService";

/**
 * Vehicle Service
 * API สำหรับจัดการรถของ Unit
 * Base Path: /api/resident-vehicles/:unitId
 * 
 * Database Schema (project_vehicles):
 * - id, project_id, unit_id, plate_number, province, brand, color, is_active, created_at
 */

// Helper function to get token
const getToken = async () => {
    try {
        const userDataStr = await AsyncStorage.getItem("userData");
        const userData = userDataStr ? JSON.parse(userDataStr) : null;
        return userData?.token || null;
    } catch (error) {
        console.error("Error getting token:", error);
        return null;
    }
};

const VehicleService = {
    /**
     * Get all vehicles of a unit
     * @param {string} unitId - UUID ของ Unit
     * @returns {Promise<Object>} - { status, data: Vehicle[], count }
     */
    getUnitVehicles: async (unitId) => {
        try {
            const token = await getToken();
            const response = await apiService.get(`/api/resident-vehicles/${unitId}`, token);
            return response;
        } catch (error) {
            console.error("VehicleService.getUnitVehicles error:", error);
            throw error;
        }
    },

    /**
     * Get single vehicle by ID
     * @param {string} unitId - UUID ของ Unit
     * @param {string} vehicleId - UUID ของ Vehicle
     * @returns {Promise<Object>} - { status, data: Vehicle }
     */
    getVehicleById: async (unitId, vehicleId) => {
        try {
            const token = await getToken();
            const response = await apiService.get(`/api/resident-vehicles/${unitId}/${vehicleId}`, token);
            return response;
        } catch (error) {
            console.error("VehicleService.getVehicleById error:", error);
            throw error;
        }
    },

    /**
     * Add a vehicle to a unit
     * @param {string} unitId - UUID ของ Unit
     * @param {Object} vehicleData - { plate_number, province?, brand?, color?, is_active? }
     * @returns {Promise<Object>} - { status, message, vehicle_id }
     */
    addVehicle: async (unitId, vehicleData) => {
        try {
            const token = await getToken();
            const response = await apiService.post(`/api/resident-vehicles/${unitId}`, vehicleData, token);
            return response;
        } catch (error) {
            console.error("VehicleService.addVehicle error:", error);
            throw error;
        }
    },

    /**
     * Update a vehicle
     * @param {string} unitId - UUID ของ Unit
     * @param {string} vehicleId - UUID ของ Vehicle
     * @param {Object} vehicleData - { plate_number?, province?, brand?, color?, is_active? }
     * @returns {Promise<Object>} - { status, message }
     */
    updateVehicle: async (unitId, vehicleId, vehicleData) => {
        try {
            const token = await getToken();
            const response = await apiService.put(`/api/resident-vehicles/${unitId}/${vehicleId}`, vehicleData, token);
            return response;
        } catch (error) {
            console.error("VehicleService.updateVehicle error:", error);
            throw error;
        }
    },

    /**
     * Remove a vehicle from a unit
     * @param {string} unitId - UUID ของ Unit
     * @param {string} vehicleId - UUID ของ Vehicle
     * @returns {Promise<Object>} - { status, message }
     */
    removeVehicle: async (unitId, vehicleId) => {
        try {
            const token = await getToken();
            const response = await apiService.delete(`/api/resident-vehicles/${unitId}/${vehicleId}`, token);
            return response;
        } catch (error) {
            console.error("VehicleService.removeVehicle error:", error);
            throw error;
        }
    },

    /**
     * Toggle vehicle active status
     * @param {string} unitId - UUID ของ Unit
     * @param {string} vehicleId - UUID ของ Vehicle
     * @param {boolean} isActive - true = รถใช้งาน
     * @returns {Promise<Object>}
     */
    setActiveVehicle: async (unitId, vehicleId, isActive) => {
        try {
            const token = await getToken();
            const response = await apiService.put(`/api/resident-vehicles/${unitId}/${vehicleId}`, {
                is_active: isActive
            }, token);
            return response;
        } catch (error) {
            console.error("VehicleService.setActiveVehicle error:", error);
            throw error;
        }
    }
};

export default VehicleService;
