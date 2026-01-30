//Global Configuration
//Centralized environment variables and application constants


// Environment Variables
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// User Roles
export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
};
// Pagination Defaults
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
};

// Feature Flags (for feature gating)
export const FEATURES = {
    ATTENDANCE: 'attendance',
    TIMETABLE: 'timetable',
    NOTICE: 'notice',
};

// Local Storage Keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'token',
    SIDEBAR_STATE: 'sidebarCollapsed',
};
