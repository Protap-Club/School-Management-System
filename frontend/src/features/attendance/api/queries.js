// Attendance TanStack Query Hooks — all server-state management for attendance.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from './api';

// ─── Query Keys ─────────────────────────────────────────
export const attendanceKeys = {
    all: ['attendance'],
    students: () => [...attendanceKeys.all, 'students'],
    teachers: () => [...attendanceKeys.all, 'teachers'],
    today: () => [...attendanceKeys.all, 'today'],
    profile: () => [...attendanceKeys.all, 'profile'],
};

// ─── Queries ────────────────────────────────────────────

/** Fetch all students for attendance view. */
export const useStudents = () => {
    return useQuery({
        queryKey: attendanceKeys.students(),
        queryFn: attendanceApi.getStudents,
    });
};

/** Fetch all teachers (admin view). */
export const useTeachers = () => {
    return useQuery({
        queryKey: attendanceKeys.teachers(),
        queryFn: attendanceApi.getTeachers,
    });
};

/** Fetch today's attendance records. */
export const useTodayAttendance = () => {
    return useQuery({
        queryKey: attendanceKeys.today(),
        queryFn: attendanceApi.getTodayAttendance,
    });
};

/** Fetch current user's profile. */
export const useProfile = () => {
    return useQuery({
        queryKey: attendanceKeys.profile(),
        queryFn: attendanceApi.getProfile,
    });
};

// ─── Mutations ──────────────────────────────────────────

/** Link NFC tag to a student. Invalidates all attendance queries on success. */
export const useLinkNfcTag = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: attendanceApi.linkNfcTag,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
        },
    });
};

/** Mark attendance via NFC scan. Invalidates all attendance queries on success. */
export const useMarkNfcAttendance = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: attendanceApi.markNfcAttendance,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
        },
    });
};

/**
 * Manually mark a student present or absent.
 * Uses optimistic updates — the UI toggles instantly, then rolls back on error.
 * The socket event `attendance-marked` will also update the cache on success.
 */
export const useMarkManualAttendance = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: attendanceApi.markManualAttendance,

        // Optimistic update: immediately reflect the toggle in the today query cache
        onMutate: async ({ studentId, status }) => {
            // Cancel any outgoing refetches so they don't overwrite our optimistic update
            await queryClient.cancelQueries({ queryKey: attendanceKeys.today() });

            const previousData = queryClient.getQueryData(attendanceKeys.today());

            queryClient.setQueryData(attendanceKeys.today(), (old) => {
                if (!old?.data) return old;
                const records = [...old.data];
                const existingIndex = records.findIndex(r => r.studentId === studentId);

                if (existingIndex >= 0) {
                    records[existingIndex] = {
                        ...records[existingIndex],
                        status,
                        checkInTime: status === 'Present' ? new Date().toISOString() : null,
                    };
                } else {
                    // New record for student who had no attendance today
                    records.push({
                        studentId,
                        status,
                        checkInTime: status === 'Present' ? new Date().toISOString() : null,
                        markedBy: 'Manual',
                    });
                }
                return { ...old, data: records };
            });

            return { previousData };
        },

        // Rollback on error
        onError: (_err, _variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(attendanceKeys.today(), context.previousData);
            }
        },

        // Refetch after mutation settles to sync with server truth
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: attendanceKeys.today() });
        },
    });
};
