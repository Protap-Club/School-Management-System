// Auth TanStack Query Hooks - v5 Compatible
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { authApi, authKeys } from './api';
import { setUser, clearUser, setLoading } from '../authSlice';

// Re-export authKeys for convenience
export { authKeys };

// Hook to check current user authentication
export const useCurrentUser = () => {
    const dispatch = useDispatch();
    const hasToken = !!localStorage.getItem('token');

    const query = useQuery({
        queryKey: authKeys.user(),
        queryFn: authApi.checkAuth,
        enabled: hasToken,
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Handle side effects with useEffect (v5 pattern)
    useEffect(() => {
        if (query.isSuccess && query.data?.success) {
            dispatch(setUser(query.data.user));
        }
    }, [query.isSuccess, query.data, dispatch]);

    useEffect(() => {
        if (query.isError) {
            localStorage.removeItem('token');
            dispatch(clearUser());
        }
    }, [query.isError, dispatch]);

    useEffect(() => {
        if (!query.isLoading && !query.isFetching) {
            dispatch(setLoading(false));
        }
    }, [query.isLoading, query.isFetching, dispatch]);

    // Set initial loading false if no token
    useEffect(() => {
        if (!hasToken) {
            dispatch(setLoading(false));
        }
    }, [hasToken, dispatch]);

    return query;
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
