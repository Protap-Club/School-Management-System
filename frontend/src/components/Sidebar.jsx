import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FaUserGraduate,
    FaChalkboardTeacher,
    FaUserShield,
    FaHome,
    FaSignOutAlt,
    FaCog
} from 'react-icons/fa';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getLinks = () => {
        switch (user?.role) {
            case 'admin':
            case 'super_admin':
                return [
                    { path: '/admin/dashboard', label: 'Dashboard', icon: <FaHome /> },
                    { path: '/admin/teachers', label: 'Teachers', icon: <FaChalkboardTeacher /> },
                    { path: '/admin/students', label: 'Students', icon: <FaUserGraduate /> },
                    { path: '/admin/settings', label: 'Settings', icon: <FaCog /> },
                ];
            case 'teacher':
                return [
                    { path: '/teacher/dashboard', label: 'Dashboard', icon: <FaHome /> },
                    { path: '/teacher/students', label: 'My Students', icon: <FaUserGraduate /> },
                    { path: '/teacher/profile', label: 'Profile', icon: <FaUserShield /> },
                ];
            case 'student':
                return [
                    { path: '/student/dashboard', label: 'Dashboard', icon: <FaHome /> },
                    { path: '/student/profile', label: 'My Profile', icon: <FaUserGraduate /> },
                ];
            default:
                return [];
        }
    };

    return (
        <div className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm fixed left-0 top-0 z-20">
            <div className="p-6 flex items-center justify-center border-b border-gray-100">
                <h1 className="text-2xl font-bold text-blue-600">SMS Portal</h1>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {getLinks().map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        end={link.path.endsWith('dashboard')}
                        className={({ isActive }) =>
                            `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                            }`
                        }
                    >
                        <span className="text-lg">{link.icon}</span>
                        <span className="font-medium">{link.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <div className="flex items-center space-x-3 px-4 py-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-red-100 text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200"
                >
                    <FaSignOutAlt />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
