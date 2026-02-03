// Dashboard API Functions
import api from '../../../lib/axios';

export const dashboardApi = {
    // Get students for stats
    // GET /api/v1/users?role=student
    getStudents: async () => {
        const response = await api.get('/users?role=student&pageSize=100');
        return response.data;
    },

    // Get teachers
    // GET /api/v1/users?role=teacher
    getTeachers: async () => {
        const response = await api.get('/users?role=teacher&pageSize=100');
        return response.data;
    },

    // Get all users (for admin stats)
    // GET /api/v1/users
    getAllUsers: async () => {
        const response = await api.get('/users?pageSize=100');
        return response.data;
    },
};
