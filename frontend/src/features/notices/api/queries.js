// Notices TanStack Query Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { noticesApi } from './api';
import { selectAccessToken } from '../../auth/authSlice';

export const noticeKeys = {
    all: ['notices'],
    lists: () => [...noticeKeys.all, 'list'],
    list: (filters) => [...noticeKeys.lists(), filters],
    detail: (id) => [...noticeKeys.all, 'detail', id],
    groups: () => [...noticeKeys.all, 'groups'],
    classes: () => [...noticeKeys.all, 'classes'],
    students: () => [...noticeKeys.all, 'students'],
    teachers: () => [...noticeKeys.all, 'teachers'],
    allUsers: (filters = {}) => [...noticeKeys.all, 'allUsers', filters],
    received: () => [...noticeKeys.all, 'received'],
    acknowledgments: (id) => [...noticeKeys.all, 'acknowledgments', id],
};

const useProtectedQueryEnabled = (enabled = true) => {
    const accessToken = useSelector(selectAccessToken);
    return Boolean(accessToken) && enabled;
};

// Get notices with filters
export const useNotices = (filters = {}) => {
    const enabled = useProtectedQueryEnabled();
    return useQuery({
        queryKey: noticeKeys.list(filters),
        queryFn: () => noticesApi.getNotices(filters),
        enabled,
    });
};

// Get notice by ID
export const useNotice = (id) => {
    const enabled = useProtectedQueryEnabled(!!id);
    return useQuery({
        queryKey: noticeKeys.detail(id),
        queryFn: () => noticesApi.getNoticeById(id),
        enabled,
    });
};

// Get received notices (notifications)
export const useReceivedNotices = () => {
    const enabled = useProtectedQueryEnabled();
    return useQuery({
        queryKey: noticeKeys.received(),
        queryFn: noticesApi.getReceivedNotices,
        enabled,
    });
};

// Create notice mutation
export const useCreateNotice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: noticesApi.createNotice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: noticeKeys.lists() });
        },
    });
};

// Delete notice mutation
export const useDeleteNotice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: noticesApi.deleteNotice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: noticeKeys.lists() });
        },
    });
};

// Get classes
export const useClasses = (enabled = true) => {
    const queryEnabled = useProtectedQueryEnabled(enabled);
    return useQuery({
        queryKey: noticeKeys.classes(),
        queryFn: noticesApi.getClasses,
        enabled: queryEnabled,
    });
};

// Get students
export const useStudents = (enabled = true) => {
    const queryEnabled = useProtectedQueryEnabled(enabled);
    return useQuery({
        queryKey: noticeKeys.students(),
        queryFn: noticesApi.getStudents,
        enabled: queryEnabled,
    });
};

// Get teachers
export const useTeachers = (enabled = true) => {
    const queryEnabled = useProtectedQueryEnabled(enabled);
    return useQuery({
        queryKey: noticeKeys.teachers(),
        queryFn: noticesApi.getTeachers,
        enabled: queryEnabled,
    });
};

// Get all users (Admin only)
export const useAllUsers = (filters = {}, enabled = true) => {
    const queryEnabled = useProtectedQueryEnabled(enabled);
    return useQuery({
        queryKey: noticeKeys.allUsers(filters),
        queryFn: () => noticesApi.getAllUsers(filters),
        enabled: queryEnabled,
    });
};

// Get groups
export const useGroups = () => {
    const enabled = useProtectedQueryEnabled();
    return useQuery({
        queryKey: noticeKeys.groups(),
        queryFn: noticesApi.getGroups,
        enabled,
    });
};

// Create group mutation
export const useCreateGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: noticesApi.createGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: noticeKeys.groups() });
        },
    });
};

// Delete group mutation
export const useDeleteGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: noticesApi.deleteGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: noticeKeys.groups() });
        },
    });
};

// Acknowledge a notice (receivers: teacher/student)
export const useAcknowledgeNotice = (id) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ responseMessage, files }) => noticesApi.acknowledgeNotice(id, { responseMessage, files }),
        onSuccess: () => {
            // Refresh received notices so the acknowledged state updates immediately
            queryClient.invalidateQueries({ queryKey: noticeKeys.received() });
            queryClient.invalidateQueries({ queryKey: noticeKeys.acknowledgments(id) });
        },
    });
};

// Get acknowledgment status for a notice (sender view)
export const useAcknowledgments = (id) => {
    const enabled = useProtectedQueryEnabled(!!id);
    return useQuery({
        queryKey: noticeKeys.acknowledgments(id),
        queryFn: () => noticesApi.getAcknowledgments(id),
        enabled,
        staleTime: 30 * 1000, // 30 seconds — sender status can refresh quickly
    });
};
