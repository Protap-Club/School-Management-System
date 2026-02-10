// Auth API Functions
import api from '../../../lib/axios';

export const authKeys = {
    all: ['auth'],
    user: () => [...authKeys.all, 'user'],
};

export const authApi = {
    // Login user and get token
    login: async ({ email, password }) => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },

    // Check if current token is valid
    checkAuth: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    // Refresh the access token (cookie is sent automatically)
    refresh: async () => {
        const response = await api.post('/auth/refresh');
        return response.data;
    },

    // Logout — call backend to clear cookie + DB, then clear local token
    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Even if the API call fails, still clear local state
        }
        localStorage.removeItem('token');
    },
};
