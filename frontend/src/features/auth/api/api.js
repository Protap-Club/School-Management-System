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

    // Refresh access token (cookie sent automatically)
    refreshToken: async () => {
        const response = await api.post('/auth/refresh');
        return response.data;
    },

    // Logout calls backend to clear refresh cookie, then clears local token
    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch {
        }
        localStorage.removeItem('token');
    },
};
