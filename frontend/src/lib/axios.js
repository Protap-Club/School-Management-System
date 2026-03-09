// Axios Instance Configuration — Single source of truth for API client
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
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
            console.log('[Auth] Access token expired, attempting refresh...');

            // If a refresh is already in flight, queue this request
            if (isRefreshing) {
                console.log('[Auth] Refresh already in progress, queuing request:', originalRequest.url);
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
                // Call refresh endpoint — HttpOnly cookie is sent automatically by the browser
                // We use a clean axios post to avoid interceptor side effects if any
                const { data } = await api.post('/auth/refresh', {}, { _retry: true });

                const newToken = data.token;
                if (!newToken) {
                    throw new Error('No access token returned from refresh');
                }

                console.log('[Auth] Refresh successful, replaying queued requests');
                localStorage.setItem('token', newToken);

                // Update the failed request and replay the queue
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                processQueue(null, newToken);

                return api(originalRequest);
            } catch (refreshError) {
                console.error('[Auth] Refresh failed:', refreshError.response?.data?.message || refreshError.message);
                
                // Refresh failed — session is truly expired
                processQueue(refreshError, null);
                localStorage.removeItem('token');

                // Redirect to login if not already there
                if (window.location.pathname !== '/login') {
                    console.warn('[Auth] Redirecting to login...');
                    window.location.href = '/login?expired=true';
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
