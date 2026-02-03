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

    // Logout (clear token)
    logout: () => {
        localStorage.removeItem('token');
    },
};
