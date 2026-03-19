// Axios Instance Configuration — Single source of truth for API client
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
let accessToken = null;

export const setAccessToken = (token) => {
    accessToken = token || null;
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => {
    accessToken = null;
};

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 30000,
});

// Request interceptor: attach in-memory access token
api.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
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
        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest) {
            if (originalRequest.url?.includes('/auth/login')) {
                return Promise.reject(error);
            }

            if (originalRequest.url?.includes('/auth/refresh')) {
                clearAccessToken();
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login?expired=true';
                }
                return Promise.reject(error);
            }

            if (!originalRequest._retry) {
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    })
                        .then((token) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return api(originalRequest);
                        })
                        .catch((queueError) => Promise.reject(queueError));
                }

                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    const refreshRes = await api.post('/auth/refresh', {}, { _retry: true });
                    const newToken = refreshRes.data.token;
                    setAccessToken(newToken);
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    processQueue(null, newToken);
                    return api(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    clearAccessToken();
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login?expired=true';
                    }
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }
        }

        if (!error.response) {
            return Promise.reject({
                ...error,
                message: 'Server unreachable. Please check your connection or try again later.'
            });
        }
        return Promise.reject(error);
    }
);

export default api;
