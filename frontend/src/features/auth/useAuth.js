// Auth Hook - Bridge between old Context API and new Redux/Query
// This provides the same API as the old useAuth() hook
import { useSelector } from 'react-redux';
import { selectUser, selectIsLoading, useLogin, useLogout, useCurrentUser } from './index';

export const useAuth = () => {
    const user = useSelector(selectUser);
    const loading = useSelector(selectIsLoading);

    const loginMutation = useLogin();
    const logoutMutation = useLogout();

    // Initialize auth check on mount
    useCurrentUser();

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
