// Attendance API Functions
import api from '../../../lib/axios';

export const attendanceApi = {
    // Get students
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

    // Link NFC tag to student
    // POST /api/v1/attendance/nfc/link
    linkNfcTag: async ({ userId, tagId }) => {
        const response = await api.post('/attendance/nfc/link', { userId, tagId });
        return response.data;
    },

    // Mark attendance via NFC scan
    // POST /api/v1/attendance/nfc
    markNfcAttendance: async ({ tagId }) => {
        const response = await api.post('/attendance/nfc', { tagId });
        return response.data;
    },
};
