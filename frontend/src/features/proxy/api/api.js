import api from "../../../lib/axios";

/**
 * Proxy API endpoints
 */
export const proxyApi = {
    // Teacher: Create proxy request (mark unavailable)
    createProxyRequest: (data) => api.post("/proxies/requests", data),

    // Teacher: Get my proxy requests
    getMyProxyRequests: (params = {}) => api.get("/proxies/requests/my", { params }),

    // Teacher: Cancel my proxy request
    cancelProxyRequest: (requestId) => api.patch(`/proxies/requests/${requestId}/cancel`),

    // Teacher: Get my schedule with proxies for a date
    getMyScheduleWithProxies: (date) => api.get("/proxies/schedule/my", { params: { date } }),

    // Admin: Get all proxy requests
    getProxyRequests: (params = {}) => api.get("/proxies/requests", { params }),

    // Admin: Get available teachers for a slot
    getAvailableTeachers: (params) => api.get("/proxies/available-teachers", { params }),

    // Admin: Assign proxy teacher
    assignProxyTeacher: (requestId, data) => api.post(`/proxies/requests/${requestId}/assign`, data),

    // Admin: Mark as free period
    markAsFreePeriod: (requestId, data) => api.post(`/proxies/requests/${requestId}/free-period`, data),

    // Admin: Create direct proxy assignment
    createDirectAssignment: (data) => api.post("/proxies/assignments/direct", data),

    // Admin: Update existing proxy assignment
    updateProxyAssignment: (assignmentId, data) => api.patch(`/proxies/assignments/${assignmentId}`, data),

    // Get proxy assignments for a date
    getProxyAssignments: (date) => api.get("/proxies/assignments", { params: { date } }),

    // Get timetable with proxy overrides
    getTimetableWithProxies: (standard, section, date) => 
        api.get("/proxies/timetable-with-proxies", { params: { standard, section, date } }),
};
