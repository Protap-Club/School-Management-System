// Axios Instance Configuration
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

// Request interceptor — attach access token
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

// Refresh token interceptor
// Queues failed requests while a refresh is in progress so we don't fire
// multiple /refresh calls simultaneously.

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

        // Only attempt refresh on 401 and not on the refresh/login endpoints themselves
        const isAuthEndpoint =
            originalRequest.url?.includes('/auth/refresh') ||
            originalRequest.url?.includes('/auth/login');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            if (isRefreshing) {
                // Another refresh is in-flight — queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((newToken) => {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call refresh endpoint (cookie is sent automatically)
                const { data } = await api.post('/auth/refresh');

                // Store the new access token
                localStorage.setItem('token', data.token);
                api.defaults.headers.common.Authorization = `Bearer ${data.token}`;

                processQueue(null, data.token);

                // Retry the original request with the new token
                originalRequest.headers.Authorization = `Bearer ${data.token}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);

                // Refresh failed — session is dead, force logout
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
