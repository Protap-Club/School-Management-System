// Attendance TanStack Query Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from './api';

export const attendanceKeys = {
    all: ['attendance'],
    students: () => [...attendanceKeys.all, 'students'],
    teachers: () => [...attendanceKeys.all, 'teachers'],
};

// Get students
export const useStudents = () => {
    return useQuery({
        queryKey: attendanceKeys.students(),
        queryFn: attendanceApi.getStudents,
    });
};

// Get teachers
export const useTeachers = () => {
    return useQuery({
        queryKey: attendanceKeys.teachers(),
        queryFn: attendanceApi.getTeachers,
    });
};

// Link NFC tag to student
export const useLinkNfcTag = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: attendanceApi.linkNfcTag,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
        },
    });
};

// Mark attendance via NFC
export const useMarkNfcAttendance = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: attendanceApi.markNfcAttendance,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
        },
    });
};
