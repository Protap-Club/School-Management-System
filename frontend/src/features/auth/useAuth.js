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
    // retry: 1 gives the axios interceptor time to silently refresh the access token
    // on a 401 before React Query gives up and marks the query as failed.
    // retryDelay: 1500ms ensures the interceptor's /auth/refresh call has time to complete.
    const authQuery = useQuery({
        queryKey: authKeys.user(),
        queryFn: authApi.checkAuth,
        enabled: hasToken,
        retry: 1,
        retryDelay: 1500,
        staleTime: 10 * 60 * 1000,
    });

    // Handle auth check side effects
    useEffect(() => {
        if (hasToken) {
            console.log('Auth: Restoring session');
        }
    }, []); // Only once on mount if token exists

    useEffect(() => {
        if (authQuery.isSuccess && authQuery.data?.success) {
            dispatch(setUser(authQuery.data.user));
        } else if (authQuery.isError) {
            // Error handling is mostly done in axios interceptor (redirects)
            // but we ensure Redux state is cleared here if token is gone
            const tokenExists = !!localStorage.getItem('token');
            if (!tokenExists) {
                dispatch(clearUser());
            }
        }
    }, [authQuery.isSuccess, authQuery.isError, authQuery.data, dispatch, hasToken]);

    useEffect(() => {
        // isLoading is for the first time query runs
        // isFetching is whenever it runs (including background)
        if (!authQuery.isLoading && !authQuery.isError) {
            dispatch(setLoading(false));
        } else if (!hasToken) {
            dispatch(setLoading(false));
        }
    }, [authQuery.isLoading, authQuery.isError, hasToken, dispatch]);

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
            console.log('Auth: Logging out user');
            dispatch(clearUser());
            queryClient.clear();
            // Redirect to login
            window.location.href = '/login';
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
        loading: loading || (hasToken && authQuery.isLoading),
        isFetching: authQuery.isFetching,
        login,
        logout,
        isLoggingIn: loginMutation.isPending,
    };
};
