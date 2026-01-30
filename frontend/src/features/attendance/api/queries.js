// Attendance TanStack Query Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from './api';

export const attendanceKeys = {
    all: ['attendance'],
    students: () => [...attendanceKeys.all, 'students'],
    studentsWithProfiles: () => [...attendanceKeys.all, 'studentsWithProfiles'],
    teachers: () => [...attendanceKeys.all, 'teachers'],
    byDate: (date) => [...attendanceKeys.all, 'date', date],
    summary: (startDate, endDate) => [...attendanceKeys.all, 'summary', startDate, endDate],
};

// Get students with profiles (admin)
export const useStudentsWithProfiles = () => {
    return useQuery({
        queryKey: attendanceKeys.studentsWithProfiles(),
        queryFn: attendanceApi.getStudentsWithProfiles,
    });
};

// Get students (teacher)
export const useStudents = () => {
    return useQuery({
        queryKey: attendanceKeys.students(),
        queryFn: attendanceApi.getStudents,
    });
};

// Get teachers with profiles (admin)
export const useTeachersWithProfiles = () => {
    return useQuery({
        queryKey: attendanceKeys.teachers(),
        queryFn: attendanceApi.getTeachersWithProfiles,
    });
};

// Get attendance by date
export const useAttendanceByDate = (date) => {
    return useQuery({
        queryKey: attendanceKeys.byDate(date),
        queryFn: () => attendanceApi.getAttendanceByDate(date),
        enabled: !!date,
    });
};

// Get attendance summary
export const useAttendanceSummary = (startDate, endDate) => {
    return useQuery({
        queryKey: attendanceKeys.summary(startDate, endDate),
        queryFn: () => attendanceApi.getAttendanceSummary({ startDate, endDate }),
        enabled: !!startDate && !!endDate,
    });
};

// Mark single attendance
export const useMarkAttendance = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: attendanceApi.markAttendance,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
        },
    });
};

// Mark bulk attendance
export const useMarkBulkAttendance = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: attendanceApi.markBulkAttendance,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
        },
    });
};
