// Users API Functions
import api from '../../../lib/axios';

export const usersApi = {
    // Get users with filters and pagination
    getUsers: async ({ role, page = 0, pageSize = 25, archived = false }) => {
        const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
        if (role && role !== 'all') params.append('role', role);
        const endpoint = archived ? '/user/archived' : '/user';
        const response = await api.get(`${endpoint}?${params}`);
        return response.data;
    },

    // Create new user
    createUser: async (userData) => {
        const response = await api.post('/user', userData);
        return response.data;
    },

    // Update user
    updateUser: async ({ id, data }) => {
        const response = await api.put(`/user/${id}`, data);
        return response.data;
    },

    // Archive user (soft delete)
    archiveUser: async (userId) => {
        const response = await api.put(`/user/archive/${userId}`);
        return response.data;
    },

    // Bulk archive users
    archiveUsers: async (userIds) => {
        const response = await api.put('/user/archive-bulk', { userIds });
        return response.data;
    },

    // Restore archived user
    restoreUser: async (userId) => {
        const response = await api.put(`/user/restore/${userId}`);
        return response.data;
    },

    // Delete user permanently
    deleteUser: async (userId) => {
        const response = await api.delete(`/user/${userId}`);
        return response.data;
    },

    // Bulk delete users
    deleteUsers: async (userIds) => {
        const response = await api.delete('/user/bulk', { data: { userIds } });
        return response.data;
    },
};
