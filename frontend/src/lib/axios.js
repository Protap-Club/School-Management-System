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

<<<<<<< HEAD
// Request interceptor — attach access token
=======
// Request interceptor: attach access token 
>>>>>>> fix
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

<<<<<<< HEAD
// Refresh token interceptor
// Queues failed requests while a refresh is in progress so we don't fire
// multiple /refresh calls simultaneously.

let isRefreshing = false;
let failedQueue = [];

=======
// Response interceptor: silent refresh on 401 
let isRefreshing = false;
let failedQueue = [];

// Queue failed requests while a refresh is in progress.
// Once the refresh completes, replay them with the new token.
>>>>>>> fix
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

<<<<<<< HEAD
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
=======
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
>>>>>>> fix
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
<<<<<<< HEAD
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
=======
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

>>>>>>> fix
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
