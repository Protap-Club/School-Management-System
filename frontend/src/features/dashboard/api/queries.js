// Dashboard TanStack Query Hooks
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './api';

export const dashboardKeys = {
    all: ['dashboard'],
    students: () => [...dashboardKeys.all, 'students'],
    teachers: () => [...dashboardKeys.all, 'teachers'],
    allUsers: () => [...dashboardKeys.all, 'allUsers'],
};

// Get students
export const useStudents = (options = {}) => {
    return useQuery({
        queryKey: dashboardKeys.students(),
        queryFn: dashboardApi.getStudents,
        ...options,
    });
};

// Get teachers
export const useTeachers = (options = {}) => {
    return useQuery({
        queryKey: dashboardKeys.teachers(),
        queryFn: dashboardApi.getTeachers,
        ...options,
    });
};

// Get all users (for admin stats)
export const useAllUsers = (options = {}) => {
    return useQuery({
        queryKey: dashboardKeys.allUsers(),
        queryFn: dashboardApi.getAllUsers,
        ...options,
    });
};
