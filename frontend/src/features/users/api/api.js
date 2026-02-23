// Users API Functions
import api from '../../../lib/axios';

export const usersApi = {
    // Get users with filters and pagination
    // GET /api/v1/users
    getUsers: async ({ role, page = 0, pageSize = 25, archived = false }) => {
        const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString()
        });
        if (role && role !== 'all') params.append('role', role);
        if (archived) params.append('archived', 'true');
        const response = await api.get(`/users?${params}`);
        return response.data;
    },

    // Create new user
    // POST /api/v1/users
    createUser: async (userData) => {
        const response = await api.post('/users', userData);
        return response.data;
    },

    // Archive/Restore user (toggle) - single user
    // PATCH /api/v1/users/status
    toggleUserStatus: async (userId) => {
        const response = await api.patch('/users/status', { userIds: [userId] });
        return response.data;
    },

    // Archive/Restore users (toggle) - bulk
    // PATCH /api/v1/users/status
    toggleUsersStatus: async (userIds) => {
        const response = await api.patch('/users/status', { userIds });
        return response.data;
    },

    // Hard delete user permanently - single
    // DELETE /api/v1/users
    deleteUser: async (userId) => {
        const response = await api.delete('/users', { data: { userIds: [userId] } });
        return response.data;
    },

    // Hard delete users permanently - bulk
    // DELETE /api/v1/users
    deleteUsers: async (userIds) => {
        const response = await api.delete('/users', { data: { userIds } });
        return response.data;
    },
};
