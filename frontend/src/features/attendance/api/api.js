// Attendance API — all server calls for the attendance feature.
import api from '../../../lib/axios';

export const attendanceApi = {
    /**
     * Fetch ALL students by paginating through every page.
     * The backend caps pageSize at 100, so we loop pages until we have every student.
     * Returns the same shape as a normal single-page response so the rest of the app needs no changes.
     */
    getStudents: async () => {
        const PAGE_SIZE = 100;
        let page = 0;
        let allUsers = [];
        let totalCount = Infinity; // will be set from the first response

        while (allUsers.length < totalCount) {
            const response = await api.get(`/users?role=student&pageSize=${PAGE_SIZE}&page=${page}`);
            const data = response.data?.data;
            if (!data) break;

            allUsers = allUsers.concat(data.users || []);
            totalCount = data.totalCount ?? allUsers.length; // lock in the real total
            page++;

            // Safety: if the server returned nothing new, stop to avoid infinite loop
            if ((data.users || []).length === 0) break;
        }

        return {
            success: true,
            data: {
                users: allUsers,
                totalCount: allUsers.length,
                pagination: { page: 0, pageSize: allUsers.length, totalPages: 1 },
            },
        };
    },

    /** Fetch ALL teachers (paginated, same pattern as getStudents). */
    getTeachers: async () => {
        const PAGE_SIZE = 100;
        let page = 0;
        let allUsers = [];
        let totalCount = Infinity;

        while (allUsers.length < totalCount) {
            const response = await api.get(`/users?role=teacher&pageSize=${PAGE_SIZE}&page=${page}&isArchived=false`);
            const data = response.data?.data;
            if (!data) break;

            allUsers = allUsers.concat(data.users || []);
            totalCount = data.totalCount ?? allUsers.length;
            page++;

            if ((data.users || []).length === 0) break;
        }

        return {
            success: true,
            data: {
                users: allUsers,
                totalCount: allUsers.length,
                pagination: { page: 0, pageSize: allUsers.length, totalPages: 1 },
            },
        };
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
