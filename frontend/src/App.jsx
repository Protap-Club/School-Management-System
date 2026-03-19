import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import RequireFeature from './components/RequireFeature';

// Lazy-loaded pages from routes config
import { pages, PageLoader } from './routes';

function App() {
    // Destructure lazy-loaded page components
    const { Login, Dashboard, UsersPage, Settings, Attendance, Notice, TimetablePage, Calendar, Notifications, Fees, Examination, Assignments, Result } = pages;

    const rolePathMap = {
        super_admin: 'superadmin',
        admin: 'admin',
        teacher: 'teacher',
    };

    const buildRouteElement = (component, role, feature) => {
        const content = feature ? (
            <RequireFeature feature={feature}>
                {component}
            </RequireFeature>
        ) : component;

        return (
            <ProtectedRoute allowedRoles={[role]}>
                {content}
            </ProtectedRoute>
        );
    };

    const roleRoutes = [
        { suffix: 'users', roles: ['super_admin', 'admin', 'teacher'], component: <UsersPage /> },
        { suffix: 'settings', roles: ['super_admin', 'admin'], component: <Settings /> },
        { suffix: 'attendance', roles: ['super_admin', 'admin', 'teacher'], component: <Attendance />, feature: 'attendance' },
        { suffix: 'attendance/:classId', roles: ['super_admin', 'admin'], component: <Attendance />, feature: 'attendance' },
        { suffix: 'notice', roles: ['super_admin', 'admin', 'teacher'], component: <Notice />, feature: 'notice' },
        { suffix: 'timetable', roles: ['super_admin', 'admin', 'teacher'], component: <TimetablePage />, feature: 'timetable' },
        { suffix: 'calendar', roles: ['super_admin', 'admin', 'teacher'], component: <Calendar />, feature: 'calendar' },
        { suffix: 'fees', roles: ['super_admin', 'admin', 'teacher'], component: <Fees />, feature: 'fees' },
        { suffix: 'examination', roles: ['super_admin', 'admin', 'teacher'], component: <Examination />, feature: 'examination' },
        { suffix: 'result', roles: ['super_admin', 'admin', 'teacher'], component: <Result />, feature: 'result' },
        { suffix: 'assignments', roles: ['super_admin'], component: <Assignments />, feature: 'assignment' },
        { suffix: 'assignments', roles: ['admin', 'teacher'], component: <Assignments /> },
    ];

    return (
        <Router>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />

                    {/* Dashboard Route */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'teacher']}>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    {roleRoutes.flatMap(({ suffix, roles, component, feature }) =>
                        roles.map((role) => (
                            <Route
                                key={`${role}-${suffix}`}
                                path={`/${rolePathMap[role]}/${suffix}`}
                                element={buildRouteElement(component, role, feature)}
                            />
                        ))
                    )}

                    <Route
                        path="/notifications"
                        element={
                            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'teacher']}>
                                <Notifications />
                            </ProtectedRoute>
                        }
                    />

                    {/* Default Routes */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Suspense>
        </Router>
    );
}

export default App;
