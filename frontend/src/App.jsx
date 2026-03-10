import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import RequireFeature from './components/RequireFeature';

// Lazy-loaded pages from routes config
import { pages, PageLoader } from './routes';

function App() {
    // Destructure lazy-loaded page components
    const { Login, Dashboard, UsersPage, Settings, Attendance, Notice, TimetablePage, Calendar, Notifications, Fees } = pages;

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

                    {/* SuperAdmin Routes */}
                    <Route
                        path="/superadmin/users"
                        element={
                            <ProtectedRoute allowedRoles={['super_admin']}>
                                <UsersPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/superadmin/settings"
                        element={
                            <ProtectedRoute allowedRoles={['super_admin']}>
                                <Settings />
                            </ProtectedRoute>
                        }
                    />

                    {/* Admin Routes */}
                    <Route
                        path="/admin/users"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <UsersPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/settings"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <Settings />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/attendance"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <RequireFeature feature="attendance">
                                    <Attendance />
                                </RequireFeature>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/attendance/:classId"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <RequireFeature feature="attendance">
                                    <Attendance />
                                </RequireFeature>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/notice"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <RequireFeature feature="notice">
                                    <Notice />
                                </RequireFeature>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/timetable"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <RequireFeature feature="timetable">
                                    <TimetablePage />
                                </RequireFeature>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/calendar"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <RequireFeature feature="calendar">
                                    <Calendar />
                                </RequireFeature>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/fees"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <RequireFeature feature="fees">
                                    <Fees />
                                </RequireFeature>
                            </ProtectedRoute>
                        }
                    />

                    {/* Teacher Routes */}
                    <Route
                        path="/teacher/users"
                        element={
                            <ProtectedRoute allowedRoles={['teacher']}>
                                <UsersPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/teacher/attendance"
                        element={
                            <ProtectedRoute allowedRoles={['teacher']}>
                                <RequireFeature feature="attendance">
                                    <Attendance />
                                </RequireFeature>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/teacher/notice"
                        element={
                            <ProtectedRoute allowedRoles={['teacher']}>
                                <RequireFeature feature="notice">
                                    <Notice />
                                </RequireFeature>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/teacher/timetable"
                        element={
                            <ProtectedRoute allowedRoles={['teacher']}>
                                <RequireFeature feature="timetable">
                                    <TimetablePage />
                                </RequireFeature>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/teacher/calendar"
                        element={
                            <ProtectedRoute allowedRoles={['teacher']}>
                                <RequireFeature feature="calendar">
                                    <Calendar />
                                </RequireFeature>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/teacher/fees"
                        element={
                            <ProtectedRoute allowedRoles={['teacher']}>
                                <RequireFeature feature="fees">
                                    <Fees />
                                </RequireFeature>
                            </ProtectedRoute>
                        }
                    />

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