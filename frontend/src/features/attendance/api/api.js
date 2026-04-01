// Attendance API — all server calls for the attendance feature.
import api from '../../../lib/axios';

export const attendanceApi = {
    /** Fetch all students (paginated). */
    getStudents: async () => {
        const response = await api.get('/users?role=student&pageSize=100');
        return response.data;
    },

    /** Fetch all teachers (paginated). */
    getTeachers: async () => {
        const response = await api.get('/users?role=teacher&pageSize=500&isArchived=false');
        return response.data;
    },

    /** Fetch today's attendance records for the current school. */
    getTodayAttendance: async () => {
        const response = await api.get('/attendance/today');
        return response.data;
    },

    /** Fetch current user profile. */
    getProfile: async () => {
        const response = await api.get('/users/me/profile');
        return response.data;
    },

    /** Link an NFC tag to a student. */
    linkNfcTag: async ({ userId, tagId }) => {
        const response = await api.post('/attendance/nfc/link', { userId, tagId });
        return response.data;
    },

    /** Mark attendance via NFC scan. */
    markNfcAttendance: async ({ tagId }) => {
        const response = await api.post('/attendance/nfc', { tagId });
        return response.data;
    },

    /**
     * Manually mark a student present or absent.
     * @param {{ studentId: string, status: 'Present' | 'Absent' }} params
     */
    markManualAttendance: async ({ studentId, status }) => {
        const response = await api.put('/attendance/manual', { studentId, status });
        return response.data;
    },

    replaceClassTeacher: async ({ standard, section, replacementTeacherId, mode = 'replace', reassignTeacherId } = {}) => {
        const response = await api.patch('/users/class-teacher/replace', {
            standard,
            section,
            replacementTeacherId,
            mode,
            ...(reassignTeacherId ? { reassignTeacherId } : {}),
        });
        return response.data;
    },
};
