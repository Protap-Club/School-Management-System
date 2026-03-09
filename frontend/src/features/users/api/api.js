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

    getUserById: async (id) => {
        const response = await api.get(`/users/${id}`);
        return response.data;
    },

    createUser: async (payload) => {
        const response = await api.post("/users", payload);
        return response.data;
    },

    toggleArchive: async ({ userIds, isArchived }) => {
        const response = await api.patch("/users/archive", { userIds, isArchived });
        return response.data;
    },

    getMyProfile: async () => {
        const response = await api.get("/users/me/profile");
        return response.data;
    },
};
