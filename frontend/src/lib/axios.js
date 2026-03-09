// Axios Instance Configuration — Single source of truth for API client
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Send cookies (refresh token) with every request
    timeout: 10000,
    validateStatus: (status) => status < 500, // Treat 4xx as relative success to manage console noise
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
    async (response) => {
        const originalRequest = response.config;

        // Handle 401 Unauthorized
        if (response.status === 401) {
            // 1. If it's the login request, just return and let the component handle it
            if (originalRequest.url?.includes('/auth/login')) {
                console.log('Invalid credentials');
                return response;
            }

            // 2. If it's a refresh request that failed, we're done
            if (originalRequest.url?.includes('/auth/refresh')) {
                localStorage.removeItem('token');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login?expired=true';
                }
                return response;
            }

            // 3. Otherwise, if not already retrying, attempt silent refresh
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

                    if (refreshRes.status === 401) {
                        throw new Error('Refresh failed');
                    }

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
                    return response; // Return the original 401
                } finally {
                    isRefreshing = false;
                }
            }
        }

        // Handle 403 Forbidden
        if (response.status === 403) {
            // For 403, we don't logout, but return it for the component to handle
            return response;
        }

        return response;
    },
    async (error) => {
        // 5xx and Network Errors still go here
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
