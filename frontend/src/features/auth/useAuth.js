// Auth Hook - Bridge between old Context API and new Redux/Query
// This provides the same API as the old useAuth() hook
import { useSelector, useDispatch } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { selectUser, selectIsLoading, setUser, clearUser, setLoading } from './authSlice';
import { authApi, authKeys } from './api/api';

export const useAuth = () => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const user = useSelector(selectUser);
    const loading = useSelector(selectIsLoading);
    const hasToken = !!localStorage.getItem('token');

    // Auth check query
    const authQuery = useQuery({
        queryKey: authKeys.user(),
        queryFn: authApi.checkAuth,
        enabled: hasToken,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    // Handle auth check side effects
    useEffect(() => {
        if (authQuery.isSuccess && authQuery.data?.success) {
            dispatch(setUser(authQuery.data.user));
        }
    }, [authQuery.isSuccess, authQuery.data, dispatch]);

    useEffect(() => {
        if (authQuery.isError) {
            localStorage.removeItem('token');
            dispatch(clearUser());
        }
    }, [authQuery.isError, dispatch]);

    useEffect(() => {
        if (!authQuery.isLoading && !authQuery.isFetching) {
            dispatch(setLoading(false));
        }
    }, [authQuery.isLoading, authQuery.isFetching, dispatch]);

    useEffect(() => {
        if (!hasToken) {
            dispatch(setLoading(false));
        }
    }, [hasToken, dispatch]);

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: authApi.login,
        onSuccess: (data) => {
            if (data.success) {
                localStorage.setItem('token', data.token);
                dispatch(setUser(data.user));
                queryClient.invalidateQueries({ queryKey: authKeys.user() });
            }
        },
    });

    // Logout mutation — now calls the backend to clear refresh cookie
    const logoutMutation = useMutation({
        mutationFn: authApi.logout,
        onSuccess: () => {
            dispatch(clearUser());
            queryClient.clear();
        },
    });

    const login = async (email, password) => {
        const result = await loginMutation.mutateAsync({ email, password });
        if (result.success) {
            return result.user;
        }
        throw new Error(result.message || 'Login failed');
    };

    const logout = () => {
        logoutMutation.mutate();
    };

    return {
        user,
        loading,
        login,
        logout,
        isLoggingIn: loginMutation.isPending,
    };
};
