// Attendance API Functions
import api from '../../../lib/axios';

export const attendanceApi = {
    // Get students with profiles (for admin view)
    getStudentsWithProfiles: async () => {
        const response = await api.get('/user/with-profiles?role=student');
        return response.data;
    },

    // Get students (for teacher view - backend filtered)
    getStudents: async () => {
        const response = await api.get('/user?role=student&pageSize=100');
        return response.data;
    },

    // Get teachers with profiles (admin only)
    getTeachersWithProfiles: async () => {
        const response = await api.get('/user/get-users-with-profiles?role=teacher');
        return response.data;
    },

    // Mark attendance
    markAttendance: async ({ studentId, status, date }) => {
        const response = await api.post('/attendance/mark', { studentId, status, date });
        return response.data;
    },

    // Mark bulk attendance
    markBulkAttendance: async ({ entries, date }) => {
        const response = await api.post('/attendance/mark-bulk', { entries, date });
        return response.data;
    },

    // Get attendance records for date
    getAttendanceByDate: async (date) => {
        const response = await api.get(`/attendance?date=${date}`);
        return response.data;
    },

    // Get attendance summary
    getAttendanceSummary: async ({ startDate, endDate }) => {
        const response = await api.get(`/attendance/summary?startDate=${startDate}&endDate=${endDate}`);
        return response.data;
    },
};
