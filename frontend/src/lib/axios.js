// Axios Instance Configuration — Single source of truth for API client
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 30000,
});

// Request interceptor: attach access token 
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: silent refresh on 401 
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Network errors (no response from server)
        if (!error.response) {
            return Promise.reject({
                ...error,
                message: 'Server unreachable. Please check your connection or try again later.'
            });
        }

        const originalRequest = error.config;
        const status = error.response.status;

        // Handle 401 Unauthorized — attempt silent token refresh
        if (status === 401) {
            // If it's the login request, just reject and let the component handle it
            if (originalRequest.url?.includes('/auth/login')) {
                return Promise.reject(error);
            }

            // If it's a refresh request that failed, we're done — force logout
            if (originalRequest.url?.includes('/auth/refresh')) {
                localStorage.removeItem('token');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login?expired=true';
                }
                return Promise.reject(error);
            }

            // Otherwise, if not already retrying, attempt silent refresh
            if (!originalRequest._retry) {
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    })
                        .then((token) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return api(originalRequest);
                        })
                        .catch((err) => Promise.reject(err));
                }

                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    const refreshRes = await api.post('/auth/refresh', {}, { _retry: true });
                    const newToken = refreshRes.data.token;
                    localStorage.setItem('token', newToken);
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    processQueue(null, newToken);
                    return api(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    localStorage.removeItem('token');
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login?expired=true';
                    }
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }
        }

        // All other errors (400, 403, 404, 409, 422, 5xx) — reject normally
        return Promise.reject(error);
    }
);

export default api;
