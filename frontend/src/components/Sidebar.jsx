import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    FaUserGraduate,
    FaChalkboardTeacher,
    FaUserShield,
    FaHome,
    FaSignOutAlt,
    FaCog,
    FaUsers,
    FaBuilding
} from 'react-icons/fa';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [logoUrl, setLogoUrl] = useState('');

    // Fetch settings for logo
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get('/settings');
                if (response.data.success && response.data.data.logoUrl) {
                    setLogoUrl(response.data.data.logoUrl);
                }
            } catch (error) {
                console.error('Failed to fetch settings for logo', error);
            }
        };
        fetchSettings();

        // Listen for settings updates
        const handleSettingsUpdate = () => fetchSettings();
        window.addEventListener('settingsUpdated', handleSettingsUpdate);
        return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getLinks = () => {
        switch (user?.role) {
            case 'super_admin':
                return [
                    { path: '/superadmin/dashboard', label: 'Dashboard', icon: <FaHome /> },
                    { path: '/superadmin/institutes', label: 'Institutes', icon: <FaBuilding /> },
                    { path: '/superadmin/admins', label: 'Admins', icon: <FaUserShield /> },
                    { path: '/superadmin/teachers', label: 'Teachers', icon: <FaChalkboardTeacher /> },
                    { path: '/superadmin/students', label: 'Students', icon: <FaUserGraduate /> },
                    { path: '/superadmin/settings', label: 'Settings', icon: <FaCog /> },
                ];
            case 'admin':
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
            default:
                return [];
        }
    };

    const getRoleColor = () => {
        switch (user?.role) {
            case 'super_admin':
                return 'from-purple-600 to-indigo-600';
            case 'admin':
                return 'from-blue-600 to-blue-700';
            case 'teacher':
                return 'from-indigo-500 to-blue-500';
            default:
                return 'from-gray-600 to-gray-700';
        }
    };

    return (
        <div className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm fixed left-0 top-0 z-20">
            <div className={`p-6 flex items-center justify-center gap-3 border-b border-gray-100 bg-gradient-to-r ${getRoleColor()}`}>
                {logoUrl && (
                    <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-10 w-10 object-contain rounded-lg bg-white/20 p-1"
                        onError={(e) => e.target.style.display = 'none'}
                    />
                )}
                <h1 className="text-xl font-bold text-white">SMS Portal</h1>
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
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getRoleColor()} flex items-center justify-center text-white font-bold`}>
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
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


