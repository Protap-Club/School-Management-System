// Auth API Functions
import api, { clearAccessToken, setAccessToken, getAccessToken } from '../../../lib/axios';

export const authKeys = {
    all: ['auth'],
    user: () => [...authKeys.all, 'user'],
};

export const authApi = {
    // Login user and get token
    login: async ({ email, password }) => {
        const response = await api.post('/auth/login', { email, password });
        setAccessToken(response.data?.token);
        return response.data;
    },

    // Check if current token is valid
    checkAuth: async () => {
        if (!getAccessToken()) {
            try {
                const refreshRes = await api.post('/auth/refresh');
                if (refreshRes.data?.success) {
                    setAccessToken(refreshRes.data.token);
                } else {
                    return { success: false, message: "Not authenticated" };
                }
            } catch (error) {
                return { success: false, message: "Not authenticated" };
            }
        }
        
        try {
            const response = await api.get('/auth/me');
            return response.data;
        } catch (error) {
            return { success: false, message: error.response?.data?.message || "Not authenticated" };
        }
    },

    // Refresh access token (cookie sent automatically)
    refreshToken: async () => {
        const response = await api.post('/auth/refresh');
        setAccessToken(response.data?.token);
        return response.data;
    },

    // Logout calls backend to clear refresh cookie, then clears local token
    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Ignore logout response errors and clear local auth state regardless.
        }
        clearAccessToken();
    },

    // Update password for users with system-generated passwords
    updatePassword: async ({ currentPassword, newPassword }) => {
        const response = await api.post('/auth/update-password', { currentPassword, newPassword });
        return response.data;
    },

    // Request password reset email
    forgotPassword: async ({ email, method }) => {
        const response = await api.post('/auth/forgot-password', { email, method });
        return response.data;
    },

    // Reset password using token
    resetPassword: async ({ token, newPassword }) => {
        const response = await api.post('/auth/reset-password', { token, newPassword });
        return response.data;
    },

    // Reset password using email + OTP
    resetPasswordWithOtp: async ({ email, otp, newPassword }) => {
        const response = await api.post('/auth/reset-password-otp', { email, otp, newPassword });
        return response.data;
    },
};
