import api from '../../../lib/axios';

export const salaryApi = {
    // Admin: Create salary entry
    createSalary: async (data) => {
        const response = await api.post('/fees/salaries', data);
        return response.data;
    },

    // Admin: List salary entries
    getSalaries: async (filters = {}) => {
        const response = await api.get('/fees/salaries', { params: filters });
        return response.data;
    },

    // Admin: Update salary status (mark as PAID)
    updateSalaryStatus: async ({ id, data }) => {
        const response = await api.patch(`/fees/salaries/${id}`, data);
        return response.data;
    },

    // Teacher: Get own salary records
    getMySalary: async (filters = {}) => {
        const response = await api.get('/fees/salaries/my', { params: filters });
        return response.data;
    },

    // Admin: Update teacher profile (expectedSalary)
    updateTeacherProfile: async ({ id, data }) => {
        const response = await api.patch(`/users/${id}/teacher-profile`, data);
        return response.data;
    },
};
