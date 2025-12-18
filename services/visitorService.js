import ApiService from "./apiService";

const VisitorService = {
    getPendingVisitors: async (projectId) => {
        const token = await ApiService.getToken();
        return ApiService.get(`/api/visitors/pending?project_id=${projectId}`, token);
    },

    getPendingVisitorsByUnit: async (unitId) => {
        const token = await ApiService.getToken();
        return ApiService.get(`/api/visitors/pending-by-unit?unit_id=${unitId}`, token);
    },

    actionEstamp: async (logId, action) => {
        // action: 'approved' | 'rejected'
        const token = await ApiService.getToken();
        return ApiService.post("/api/visitors/action", { log_id: logId, action }, token);
    },

    inviteVisitor: async (data) => {
        /*
          data: {
            project_id,
            unit_id,
            plate_number,
            visitor_name,
            expected_date (YYYY-MM-DD)
          }
        */
        const token = await ApiService.getToken();
        return ApiService.post("/api/visitors/invite", data, token);
    },
};

export default VisitorService;
