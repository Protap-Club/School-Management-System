// Routes Configuration
// Centralized route definitions with lazy-loaded pages

import { lazy, Suspense } from 'react';

// Lazy load pages for code-splitting
const Login = lazy(() => import('../pages/Login'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const UsersPage = lazy(() => import('../pages/UsersPage'));
const Settings = lazy(() => import('../pages/Settings'));
const Attendance = lazy(() => import('../pages/Attendance'));
const Notice = lazy(() => import('../pages/Notice'));
const TimetablePage = lazy(() => import('../pages/Timetable'));
const Calendar = lazy(() => import('../pages/Calendar'));

// Loading fallback component
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
);

// Wrap component with Suspense
const withSuspense = (Component) => (
    <Suspense fallback={<PageLoader />}>
        <Component />
    </Suspense>
);

// Route path definitions
export const routes = {
    // Public
    login: '/login',

    // Dashboard (shared)
    dashboard: '/dashboard',

    // Super Admin
    superadmin: {
        users: '/superadmin/users',
        settings: '/superadmin/settings',
    },

    // Admin
    admin: {
        users: '/admin/users',
        settings: '/admin/settings',
        attendance: '/admin/attendance',
        notice: '/admin/notice',
        notice: '/admin/notice',
        timetable: '/admin/timetable',
        calendar: '/admin/calendar',
    },

    // Teacher
    teacher: {
        users: '/teacher/users',
        attendance: '/teacher/attendance',
        notice: '/teacher/notice',
        notice: '/teacher/notice',
        timetable: '/teacher/timetable',
        calendar: '/teacher/calendar',
    },
};

// Page components (lazy-loaded)
export const pages = {
    Login,
    Dashboard,
    UsersPage,
    Settings,
    Attendance,
    Notice,
    TimetablePage,
    Calendar,
};

// Export utilities
export { withSuspense, PageLoader };
