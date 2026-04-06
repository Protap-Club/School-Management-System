// Global Configuration

// Environment
export const API_BASE_URL = import.meta.env.VITE_API_URL;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

// User Roles
export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
};

// Pagination
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
};

// Feature Keys
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
