// Auth Feature - Public API
// API Hooks
export { useCurrentUser, useLogin, useLogout } from './api/queries';

// Bridge Hook (same API as old AuthContext)
export { useAuth } from './useAuth';

// Redux Slice & Selectors
export {
    setUser,
    clearUser,
    setLoading,
    selectUser,
    selectIsAuthenticated,
    selectIsLoading
} from './authSlice';

export { default as authReducer } from './authSlice';
