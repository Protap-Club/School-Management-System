// Auth Hook - Bridge between old Context API and new Redux/Query
// This provides the same API as the old useAuth() hook
import { useSelector, useDispatch } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { selectUser, selectAccessToken, selectIsLoading, setUser, setAccessToken as storeAccessToken, clearUser, setLoading } from './authSlice';
import { clearAccessToken as clearAxiosAccessToken, getAccessToken as getAxiosAccessToken } from '../../lib/axios';
import { authApi, authKeys } from './api/api';

export const useAuth = () => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const user = useSelector(selectUser);
    const accessToken = useSelector(selectAccessToken);
    const loading = useSelector(selectIsLoading);

    const authQuery = useQuery({
        queryKey: authKeys.user(),
        queryFn: authApi.checkAuth,
        retry: false,
        staleTime: 10 * 60 * 1000,
    });

    useEffect(() => {
        if (authQuery.isSuccess) {
            if (authQuery.data?.success) {
                dispatch(storeAccessToken(getAxiosAccessToken()));
                dispatch(setUser(authQuery.data.user));
            } else {
                clearAxiosAccessToken();
                dispatch(clearUser());
            }
            dispatch(setLoading(false));
        } else if (authQuery.isError) {
            clearAxiosAccessToken();
            dispatch(clearUser());
            dispatch(setLoading(false));
        }
    }, [authQuery.isSuccess, authQuery.isError, authQuery.data, dispatch]);

    useEffect(() => {
        if (authQuery.isLoading || authQuery.isFetching) {
            dispatch(setLoading(true));
        } else {
            dispatch(setLoading(false));
        }
    }, [authQuery.isLoading, authQuery.isFetching, dispatch]);

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: authApi.login,
        onSuccess: (data) => {
            if (data.success) {
                dispatch(storeAccessToken(data.token));
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
        accessToken,
        loading: loading || authQuery.isLoading || authQuery.isFetching,
        isFetching: authQuery.isFetching,
        login,
        logout,
        isLoggingIn: loginMutation.isPending,
    };
};
