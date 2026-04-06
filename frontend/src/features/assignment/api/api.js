import api from "../../../lib/axios";

export const assignmentApi = {
    getAssignments: async ({ status, standard, section, subject, search, page = 0, pageSize = 25 } = {}) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
        });

        if (status && status !== "all") params.append("status", status);
        if (standard && standard !== "all") params.append("standard", standard);
        if (section && section !== "all") params.append("section", section);
        if (subject && subject !== "all") params.append("subject", subject);
        if (search?.trim()) params.append("search", search.trim());

        const response = await api.get(`/assignments?${params.toString()}`);
        return response.data;
    },

    getSubmittedAssignments: async ({ standard, section, subject, search, page = 0, pageSize = 25 } = {}) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
        });

        if (standard && standard !== "all") params.append("standard", standard);
        if (section && section !== "all") params.append("section", section);
        if (subject && subject !== "all") params.append("subject", subject);
        if (search?.trim()) params.append("search", search.trim());

        const response = await api.get(`/assignments/submitted?${params.toString()}`);
        return response.data;
    },

    getAssignmentById: async (id) => {
        const response = await api.get(`/assignments/${id}`);
        return response.data;
    },

    createAssignment: async (formData) => {
        // Use FormData for handling file attachments
        const response = await api.post("/assignments", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    updateAssignment: async (id, formData) => {
        const response = await api.put(`/assignments/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    deleteAssignment: async (id) => {
        const response = await api.delete(`/assignments/${id}`);
        return response.data;
    },
    removeAttachment: async ({ id, publicId }) => {
        const response = await api.delete(`/assignments/${id}/attachments/${encodeURIComponent(publicId)}`);
        return response.data;
    },
    getMetadata: async () => {
        const response = await api.get("/assignments/meta/metadata");
        return response.data;
    },
};
