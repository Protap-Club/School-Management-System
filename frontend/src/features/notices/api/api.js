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
            const classOptions = timetables.map(t => ({
                standard: t.standard,
                section: t.section,
                value: `${t.standard}-${t.section}`,
                label: `Class ${t.standard} - Section ${t.section}`
            }));

            const normalize = (val) => {
                const num = Number(val);
                return Number.isNaN(num) ? null : num;
            };

            classOptions.sort((a, b) => {
                const aStdNum = normalize(a.standard);
                const bStdNum = normalize(b.standard);
                if (aStdNum !== null && bStdNum !== null && aStdNum !== bStdNum) {
                    return aStdNum - bStdNum;
                }
                const stdCompare = String(a.standard ?? '').localeCompare(
                    String(b.standard ?? ''),
                    undefined,
                    { numeric: true, sensitivity: 'base' }
                );
                if (stdCompare !== 0) return stdCompare;
                return String(a.section ?? '').localeCompare(
                    String(b.section ?? ''),
                    undefined,
                    { numeric: true, sensitivity: 'base' }
                );
            });

            return {
                success: true,
                data: classOptions.map(({ value, label }) => ({ value, label }))
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
        const response = await api.get('/users?role=teacher&pageSize=5000&isArchived=false');
        return response.data;
    },

    // Get all users (students + teachers)
    getAllUsers: async (filters = {}) => {
        const params = new URLSearchParams();
        // Server-side search avoids loading thousands of users just to filter on the client.
        if (filters.search) params.append('search', filters.search);
        if (filters.role && filters.role !== 'all') params.append('role', filters.role);
        params.append('pageSize', filters.pageSize || '5000');
        const query = params.toString();
        const response = await api.get(`/users${query ? `?${query}` : ''}`);
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
    acknowledgeNotice: async (id, { responseMessage = '', files = [] } = {}) => {
        const formData = new FormData();
        if (responseMessage) {
            formData.append('responseMessage', responseMessage);
        }
        if (files && files.length > 0) {
            files.forEach((file) => formData.append('ackAttachments', file));
        }
        const response = await api.post(`/notices/${id}/acknowledge`, formData);
        return response.data;
    },

    // Get acknowledgment status for a notice (sender only)
    getAcknowledgments: async (id) => {
        const response = await api.get(`/notices/${id}/acknowledgments`);
        return response.data;
    },
};

