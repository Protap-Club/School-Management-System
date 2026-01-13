import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// Shared Pages
import UsersPage from './pages/UsersPage';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SidebarProvider>
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
                  <Attendance />
                </ProtectedRoute>
              }
            />


            {/* Default Routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </SidebarProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
