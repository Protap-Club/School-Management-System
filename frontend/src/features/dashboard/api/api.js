// Dashboard API Functions
import api from '../../../lib/axios';

export const dashboardApi = {
    // Get students for stats (filtered by teacher's class)
    getStudentsStats: async () => {
        const response = await api.get('/user/get-users?role=student&pageSize=100');
        return response.data;
    },

    // Get all students with profiles (admin)
    getAllStudentsWithProfiles: async () => {
        const response = await api.get('/user/get-users-with-profiles?role=student');
        return response.data;
    },

    // Get students with profiles (for teacher class inference)
    getStudentsWithProfiles: async () => {
        const response = await api.get('/user/with-profiles?role=student');
        return response.data;
    },

    // Get single student filtered (for teacher profile inference)
    getFirstStudent: async () => {
        const response = await api.get('/user?role=student&pageSize=1');
        return response.data;
    },

    // Get dashboard summary stats
    getDashboardStats: async () => {
        const response = await api.get('/dashboard/stats');
        return response.data;
    },
};
