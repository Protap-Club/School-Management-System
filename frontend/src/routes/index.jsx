// Routes Configuration
// Centralized route definitions with lazy-loaded pages

import { lazy, Suspense } from 'react';

// Lazy load pages for code-splitting
// Lazy load pages for code-splitting
const Login = lazy(() => import('../pages/Login'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const UsersPage = lazy(() => import('../features/users/UsersPage'));
const Settings = lazy(() => import('../pages/Settings'));
const Attendance = lazy(() => import('../features/attendance/AttendancePage'));
const Notice = lazy(() => import('../pages/Notice'));
const TimetablePage = lazy(() => import('../features/timetable/TimetablePage'));
const Calendar = lazy(() => import('../pages/Calendar'));
const Notifications = lazy(() => import('../pages/Notifications'));
const Fees = lazy(() => import('../pages/Fees'));
const Examination = lazy(() => import('../pages/Examination'));
const Assignments = lazy(() => import('../features/assignment/AssignmentPage'));
const Result = lazy(() => import('../pages/Result'));
const Profile = lazy(() => import('../pages/Profile'));

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
        attendance: '/superadmin/attendance',
        notice: '/superadmin/notice',
        timetable: '/superadmin/timetable',
        calendar: '/superadmin/calendar',
        fees: '/superadmin/fees',
        examination: '/superadmin/examination',
        result: '/superadmin/result',
        assignments: '/superadmin/assignments',
    },

    // Admin
    admin: {
        users: '/admin/users',
        settings: '/admin/settings',
        attendance: '/admin/attendance',
        notice: '/admin/notice',
        timetable: '/admin/timetable',
        calendar: '/admin/calendar',
        fees: '/admin/fees',
        examination: '/admin/examination',
        result: '/admin/result',
        notifications: '/notifications',
        assignments: '/admin/assignments',
    },

    // Teacher
    teacher: {
        users: '/teacher/users',
        attendance: '/teacher/attendance',
        notice: '/teacher/notice',
        timetable: '/teacher/timetable',
        calendar: '/teacher/calendar',
        fees: '/teacher/fees',
        examination: '/teacher/examination',
        assignments: '/teacher/assignments',
        result: '/teacher/result',
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
    Notifications,
    Fees,
    Examination,
    Assignments,
    Result,
    Profile,
};

// Export utilities
export { withSuspense, PageLoader };
