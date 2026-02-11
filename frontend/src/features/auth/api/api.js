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

<<<<<<< HEAD
    // Refresh the access token (cookie is sent automatically)
    refresh: async () => {
=======
    // Refresh access token (cookie sent automatically)
    refreshToken: async () => {
>>>>>>> fix
        const response = await api.post('/auth/refresh');
        return response.data;
    },

<<<<<<< HEAD
    // Logout — call backend to clear cookie + DB, then clear local token
=======
    // Logout calls backend to clear refresh cookie, then clears local token
>>>>>>> fix
    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch {
<<<<<<< HEAD
            // Even if the API call fails, still clear local state
=======
>>>>>>> fix
        }
        localStorage.removeItem('token');
    },
};
