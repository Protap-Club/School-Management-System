import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// SuperAdmin Pages
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import InstitutesPage from './pages/InstitutesPage';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';

// Teacher Pages
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherProfile from './pages/TeacherProfile';

// Shared Pages
import TeachersPage from './pages/TeachersPage';
import StudentsPage from './pages/StudentsPage';
import AdminsPage from './pages/AdminsPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* SuperAdmin Routes */}
          <Route
            path="/superadmin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/institutes"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <InstitutesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/admins"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AdminsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/teachers"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <TeachersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/students"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <StudentsPage />
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
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TeachersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <StudentsPage />
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
            path="/teacher/dashboard"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/students"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <StudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/profile"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherProfile />
              </ProtectedRoute>
            }
          />

          {/* Default Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

