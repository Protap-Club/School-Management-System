// Axios Instance Configuration — Single source of truth for API client
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Send cookies (refresh token) with every request
    timeout: 10000,
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

// Queue failed requests while a refresh is in progress.
// Once the refresh completes, replay them with the new token.
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

        // Only attempt refresh on 401, and not if the failing request is itself the refresh call
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/refresh')
        ) {
            // If a refresh is already in flight, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call refresh endpoint — cookie is sent automatically
                const { data } = await api.post('/auth/refresh');

                const newToken = data.token;
                localStorage.setItem('token', newToken);

                // Update the failed request and replay the queue
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                processQueue(null, newToken);

                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed — session is truly expired
                processQueue(refreshError, null);
                localStorage.removeItem('token');

                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
