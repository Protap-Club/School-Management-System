import api from "../../../lib/axios";

export const usersApi = {
    getUsers: async ({ role, page = 0, pageSize = 25, isArchived = false, name } = {}) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
            isArchived: String(Boolean(isArchived)),
        });

        if (role && role !== "all") params.append("role", role);
        if (name) params.append("name", name);

        const response = await api.get(`/users?${params.toString()}`);
        return response.data;
    },

    createUser: async (payload) => {
        const response = await api.post("/users", payload);
        return response.data;
    },

    updateUser: async (id, payload) => {
        const response = await api.patch(`/users/${id}`, payload);
        return response.data;
    },

    toggleArchive: async ({ userIds, isArchived, replacementTeacherId, skipReplacement } = {}) => {
        const response = await api.patch("/users/archive", {
            userIds,
            isArchived,
            ...(replacementTeacherId ? { replacementTeacherId } : {}),
            ...(skipReplacement ? { skipReplacement } : {}),
        });
        return response.data;
    },

    getNextRollNumber: async (standard, section) => {
        const response = await api.get(`/users/next-roll-number?standard=${standard}&section=${section}`);
        return response.data;
    },
};
