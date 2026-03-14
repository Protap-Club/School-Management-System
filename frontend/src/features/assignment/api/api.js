import api from "../../../lib/axios";

export const assignmentApi = {
    getAssignments: async ({ status, standard, section, subject, page = 0, pageSize = 25 } = {}) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
        });

        if (status && status !== "all") params.append("status", status);
        if (standard && standard !== "all") params.append("standard", standard);
        if (section && section !== "all") params.append("section", section);
        if (subject && subject !== "all") params.append("subject", subject);

        const response = await api.get(`/assignments?${params.toString()}`);
        return response.data;
    },

    getAssignmentById: async (id) => {
        const response = await api.get(`/assignments/${id}`);
        return response.data;
    },

    createAssignment: async (payload) => {
        // Assignments often include files, but assuming basic JSON mapping based on structure.
        // If attachments are handled, we might need a FormData approach, however
        // looking at the models attached, it takes an array of Cloudinary references.
        const response = await api.post("/assignments", payload);
        return response.data;
    },

    updateAssignment: async (id, payload) => {
        const response = await api.put(`/assignments/${id}`, payload);
        return response.data;
    },

    deleteAssignment: async (id) => {
        const response = await api.delete(`/assignments/${id}`);
        return response.data;
    },
    getMetadata: async () => {
        const response = await api.get("/assignments/meta/metadata");
        return response.data;
    },
};
