import ApiService from "./apiService";
import { Platform } from "react-native";

const SecurityService = {
    checkIn: async (data) => {
        /*
          data: {
            project_id,
            plate_number,
            province (optional),
            target_unit_id (optional for walk-in),
            unit_number (optional for walk-in - resolves to ID),
            visitor_name (optional),
            image_driver_url (optional),
            image_car_url (optional)
          }
        */
        const token = await ApiService.getToken();
        return ApiService.post("/api/security/entry/check-in", data, token);
    },

    checkOut: async (projectId, plateNumber, forceExit = false) => {
        const token = await ApiService.getToken();
        return ApiService.post(
            "/api/security/entry/check-out",
            { project_id: projectId, plate_number: plateNumber, force_exit: forceExit },
            token
        );
    },

    searchVehicles: async (projectId, query) => {
        const token = await ApiService.getToken();
        return ApiService.get(
            `/api/security/vehicles/search?project_id=${projectId}&q=${query}`,
            token
        );
    },

    getEntryLogs: async (projectId, status) => {
        // status: 'inside' (รถในโครงการ) | 'exited' (ประวัติ)
        const token = await ApiService.getToken();
        const url = status
            ? `/api/security/entry/logs?project_id=${projectId}&status=${status}`
            : `/api/security/entry/logs?project_id=${projectId}`;
        return ApiService.get(url, token);
    },

    // รถที่ลูกบ้านแจ้งล่วงหน้า (Tab รถเข้า)
    getScheduledVisitors: async (projectId) => {
        const token = await ApiService.getToken();
        return ApiService.get(`/api/security/visitors/scheduled?project_id=${projectId}`, token);
    },

    // ยืนยันรถเข้าจากการนัดหมาย
    confirmVisitorEntry: async (data) => {
        const token = await ApiService.getToken();
        return ApiService.post("/api/security/visitors/confirm-entry", data, token);
    },

    // Upload Visitor Image (Handles Web & Mobile)
    uploadVisitorImage: async (projectId, imageUri) => {
        const token = await ApiService.getToken();
        const formData = new FormData();
        const filename = imageUri.split('/').pop();

        formData.append('project_id', projectId);

        if (Platform.OS === 'web') {
            // Web: Fetch blob from blob:URI and append
            try {
                const response = await fetch(imageUri);
                const blob = await response.blob();
                formData.append('file', blob, filename);
            } catch (e) {
                console.error("Error converting blob on web", e);
            }
        } else {
            // Mobile: Standard React Native FormData
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;
            formData.append('file', { uri: imageUri, name: filename, type });
        }

        return ApiService.post("/api/upload/visitor-images", formData, token, true);
    }
};

export default SecurityService;
