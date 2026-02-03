// Users TanStack Query Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from './api';

export const userKeys = {
    all: ['users'],
    lists: () => [...userKeys.all, 'list'],
    list: (filters) => [...userKeys.lists(), filters],
    archived: () => [...userKeys.all, 'archived'],
};

// Get users with filters
export const useUsers = ({ role = 'all', page = 0, pageSize = 25 } = {}) => {
    return useQuery({
        queryKey: userKeys.list({ role, page, pageSize }),
        queryFn: () => usersApi.getUsers({ role, page, pageSize }),
        keepPreviousData: true,
    });
};

// Get archived users
export const useArchivedUsers = ({ role = 'all', page = 0, pageSize = 25 } = {}) => {
    return useQuery({
        queryKey: [...userKeys.archived(), { role, page, pageSize }],
        queryFn: () => usersApi.getUsers({ role, page, pageSize, archived: true }),
        keepPreviousData: true,
    });
};

// Create user mutation
export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersApi.createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
        },
    });
};

// Toggle user status (archive/restore) - single user
export const useToggleUserStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersApi.toggleUserStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
};

// Toggle user status (archive/restore) - bulk
export const useToggleUsersStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersApi.toggleUsersStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
};

// Delete user permanently - single
export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersApi.deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
};

// Delete users permanently - bulk
export const useDeleteUsers = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersApi.deleteUsers,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
};
