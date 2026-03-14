// Notices API Functions
import api from '../../../lib/axios';

export const noticesApi = {
    // Get all notices with filters
    getNotices: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.type) params.append('type', filters.type);
        if (filters.sentTo) params.append('sentTo', filters.sentTo);
        if (filters.date) params.append('date', filters.date);
        const response = await api.get(`/notices?${params.toString()}`);
        return response.data;
    },

    // Get notice by ID
    getNoticeById: async (id) => {
        const response = await api.get(`/notices/${id}`);
        return response.data;
    },

    // Create notice
    createNotice: async (noticeData) => {
        const formData = new FormData();
        formData.append('message', noticeData.message);
        formData.append('title', noticeData.title || '');
        formData.append('recipients', JSON.stringify(noticeData.recipients));
        formData.append('recipientType', noticeData.recipientType);
        formData.append('requiresAcknowledgment', noticeData.requiresAcknowledgment ? 'true' : 'false');
        if (noticeData.attachment) {
            formData.append('attachment', noticeData.attachment);
        }
        const response = await api.post('/notices', formData);
        return response.data;
    },

    // Delete notice
    deleteNotice: async (id) => {
        const response = await api.delete(`/notices/${id}`);
        return response.data;
    },

    // Get received notices (for notifications/bell icon)
    getReceivedNotices: async () => {
        const response = await api.get('/notices/received');
        return response.data;
    },

    // Get classes list (derived from timetable data)
    getClasses: async () => {
        try {
            const response = await api.get('/timetables');
            const timetables = response.data?.data || [];
            // Transform timetable data into class options
            return {
                success: true,
                data: timetables.map(t => ({
                    value: `${t.standard}-${t.section}`,
                    label: `Class ${t.standard} - Section ${t.section}`
                }))
            };
        } catch {
            return { success: true, data: [] };
        }
    },

    // Get students list
    // Bug 4 fix: Use /notices/my-students instead of /users?role=student&pageSize=100
    // The old endpoint was capped at 100 records — teachers with >100 students (e.g. Priya with 122)
    // would see a truncated list. The new endpoint returns ALL assigned students with no pagination.
    getStudents: async () => {
        const response = await api.get('/notices/my-students');
        return response.data;
    },

    // Get teachers list
    getTeachers: async () => {
        const response = await api.get('/users?role=teacher&pageSize=100');
        return response.data;
    },

    // Get all users (students + teachers)
    getAllUsers: async () => {
        const response = await api.get('/users?pageSize=100');
        return response.data;
    },

    // Get groups (teacher)
    getGroups: async () => {
        const response = await api.get('/notices/groups');
        return response.data;
    },

    // Create group
    createGroup: async ({ name, students }) => {
        const response = await api.post('/notices/groups', { name, students });
        return response.data;
    },

    // Delete group
    deleteGroup: async (groupId) => {
        const response = await api.delete(`/notices/groups/${groupId}`);
        return response.data;
    },

    // Acknowledge a notice (receivers only)
    acknowledgeNotice: async (id, responseMessage = '') => {
        const response = await api.post(`/notices/${id}/acknowledge`, { responseMessage });
        return response.data;
    },

    // Get acknowledgment status for a notice (sender only)
    getAcknowledgments: async (id) => {
        const response = await api.get(`/notices/${id}/acknowledgments`);
        return response.data;
    },
};

