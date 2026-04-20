// Attendance API — all server calls for the attendance feature.
import api from '../../../lib/axios';

// ─── Shared parallel paginator ────────────────────────────────────────────
// Fires page 0 first to get totalCount, then fans out all remaining pages
// simultaneously with Promise.all — no serial waterfall.
const paginateUsers = async (role, extra = '') => {
    const PAGE_SIZE = 100;
    const firstRes = await api.get(`/users?role=${role}&pageSize=${PAGE_SIZE}&page=0${extra}`);
    const firstData = firstRes.data?.data;
    if (!firstData) return [];

    const firstBatch = firstData.users || [];
    const totalCount = firstData.totalCount ?? firstBatch.length;
    const remainingPages = Math.ceil(totalCount / PAGE_SIZE) - 1;

    if (remainingPages <= 0) return firstBatch;

    // Fire all remaining pages at once
    const restResponses = await Promise.all(
        Array.from({ length: remainingPages }, (_, i) =>
            api.get(`/users?role=${role}&pageSize=${PAGE_SIZE}&page=${i + 1}${extra}`)
        )
    );

    return [
        ...firstBatch,
        ...restResponses.flatMap(r => r.data?.data?.users || []),
    ];
};

export const attendanceApi = {
    /**
     * Fetch ALL students — first page gives totalCount, remaining pages fire in parallel.
     */
    getStudents: async () => {
        const allUsers = await paginateUsers('student');
        return {
            success: true,
            data: {
                users: allUsers,
                totalCount: allUsers.length,
                pagination: { page: 0, pageSize: allUsers.length, totalPages: 1 },
            },
        };
    },

    /** Fetch ALL teachers — parallel fan-out, same pattern. */
    getTeachers: async () => {
        const allUsers = await paginateUsers('teacher', '&isArchived=false');
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
    linkNfcTag: async ({ studentId, nfcUid }) => {
        const response = await api.post('/attendance/nfc/link', { studentId, nfcUid });
        return response.data;
    },

    /** Mark attendance via NFC scan (called from browser/admin UI, not hardware reader). */
    markNfcAttendance: async ({ nfcUid }) => {
        const response = await api.post('/attendance/nfc', { nfcUid });
        return response.data;
    },

    /**
     * Fetch a specific student's full attendance history.
     * Returns: { today, calendar[], stats: { totalDays, totalPresent, totalAbsent, percentage } }
     */
    getStudentHistory: async (studentId) => {
        const response = await api.get(`/attendance/${studentId}`);
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
