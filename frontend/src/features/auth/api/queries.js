// Auth TanStack Query Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { authApi } from './api';
import { setUser, clearUser, setLoading } from '../authSlice';

export const authKeys = {
    all: ['auth'],
    user: () => [...authKeys.all, 'user'],
};

// Hook to check current user authentication
export const useCurrentUser = () => {
    const dispatch = useDispatch();

    return useQuery({
        queryKey: authKeys.user(),
        queryFn: authApi.checkAuth,
        enabled: !!localStorage.getItem('token'),
        retry: false,
        onSuccess: (data) => {
            if (data.success) {
                dispatch(setUser(data.user));
            }
        },
        onError: () => {
            localStorage.removeItem('token');
            dispatch(clearUser());
        },
        onSettled: () => {
            dispatch(setLoading(false));
        },
    });
};

// Hook for login mutation
export const useLogin = () => {
    const queryClient = useQueryClient();
    const dispatch = useDispatch();

    return useMutation({
        mutationFn: authApi.login,
        onSuccess: (data) => {
            if (data.success) {
                localStorage.setItem('token', data.token);
                dispatch(setUser(data.user));
                queryClient.invalidateQueries({ queryKey: authKeys.user() });
            }
        },
    });
};

// Hook for logout
export const useLogout = () => {
    const queryClient = useQueryClient();
    const dispatch = useDispatch();

    return useMutation({
        mutationFn: async () => {
            authApi.logout();
            return { success: true };
        },
        onSuccess: () => {
            dispatch(clearUser());
            queryClient.clear();
        },
    });
};
