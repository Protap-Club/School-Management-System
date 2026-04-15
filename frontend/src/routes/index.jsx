// Routes Configuration
// Centralized route definitions with lazy-loaded pages

import { lazy, Suspense } from 'react';

// Lazy load pages for code-splitting
// Lazy load pages for code-splitting
const Login = lazy(() => import('@/features/auth/LoginPage'));
const Dashboard = lazy(() => import('@/features/dashboard/DashboardPage'));
const UsersPage = lazy(() => import('@/features/users/UsersPage'));
const Settings = lazy(() => import('@/features/settings/SettingsPage'));
const Attendance = lazy(() => import('@/features/attendance/AttendancePage'));
const Notice = lazy(() => import('@/features/notices/NoticePage'));
const TimetablePage = lazy(() => import('@/features/timetable/TimetablePage'));
const Calendar = lazy(() => import('@/features/calendar/CalendarPage'));
const Notifications = lazy(() => import('@/features/notifications/NotificationsPage'));
const Profile = lazy(() => import('@/features/profile/ProfilePage'));
const Fees = lazy(() => import('@/features/fees/FeesPage'));
const Examination = lazy(() => import('@/features/examination/ExaminationPage'));
const Assignments = lazy(() => import('@/features/assignment/AssignmentPage'));
const Result = lazy(() => import('@/features/result/ResultPage'));
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
    Profile,
    Fees,
    Examination,
    Assignments,
    Result,
};

// Export utilities
export { withSuspense, PageLoader };

// Prefetch critical routes after initial render to speed up navigation
export const prefetchRoutes = () => {
    if (typeof window !== 'undefined') {
        // Use requestIdleCallback if available, fallback to setTimeout
        const runPrefetch = () => {
            // Pre-load critical modules
            import('../pages/Dashboard').catch(() => {});
            import('../features/attendance/AttendancePage').catch(() => {});
        };

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(runPrefetch, { timeout: 2000 });
        } else {
            setTimeout(runPrefetch, 2000);
        }
    }
};

// Trigger prefetch on module load
prefetchRoutes();
