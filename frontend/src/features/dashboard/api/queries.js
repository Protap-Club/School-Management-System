// Dashboard TanStack Query Hooks
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './api';

export const dashboardKeys = {
    all: ['dashboard'],
    stats: () => [...dashboardKeys.all, 'stats'],
    students: () => [...dashboardKeys.all, 'students'],
    studentsWithProfiles: () => [...dashboardKeys.all, 'studentsWithProfiles'],
    allStudentsWithProfiles: () => [...dashboardKeys.all, 'allStudentsWithProfiles'],
    firstStudent: () => [...dashboardKeys.all, 'firstStudent'],
};

// Get students for stats (teacher view)
export const useStudentsStats = (options = {}) => {
    return useQuery({
        queryKey: dashboardKeys.students(),
        queryFn: dashboardApi.getStudentsStats,
        ...options,
    });
};

// Get all students with profiles (admin view)
export const useAllStudentsWithProfiles = (options = {}) => {
    return useQuery({
        queryKey: dashboardKeys.allStudentsWithProfiles(),
        queryFn: dashboardApi.getAllStudentsWithProfiles,
        ...options,
    });
};

// Get students with profiles (for teacher inference)
export const useStudentsWithProfiles = (options = {}) => {
    return useQuery({
        queryKey: dashboardKeys.studentsWithProfiles(),
        queryFn: dashboardApi.getStudentsWithProfiles,
        ...options,
    });
};

// Get first student (for teacher profile inference)
export const useFirstStudent = (options = {}) => {
    return useQuery({
        queryKey: dashboardKeys.firstStudent(),
        queryFn: dashboardApi.getFirstStudent,
        ...options,
    });
};

// Get dashboard stats
export const useDashboardStats = (options = {}) => {
    return useQuery({
        queryKey: dashboardKeys.stats(),
        queryFn: dashboardApi.getDashboardStats,
        ...options,
    });
};
