import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import api from '../api/axios';
import {
    FaUserGraduate,
    FaChalkboardTeacher,
    FaUserShield,
    FaHome,
    FaSignOutAlt,
    FaCog,
    FaBuilding,
    FaClipboardList
} from 'react-icons/fa';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const navigate = useNavigate();
    const [instituteBranding, setInstituteBranding] = useState(null);
    const [attendanceEnabled, setAttendanceEnabled] = useState(false);

    // Fetch institute branding for non-SuperAdmin users
    useEffect(() => {
        const fetchBranding = async () => {
            if (user && user.role !== 'super_admin' && user.instituteId) {
                try {
                    const response = await api.get('/institute/my-branding');
                    if (response.data.success && response.data.data) {
                        setInstituteBranding(response.data.data);
                    }
                } catch (error) {
                    console.error('Failed to fetch branding', error);
                }
            }
        };

        const checkAttendance = async () => {
            if (user && user.role === 'teacher') {
                try {
                    const response = await api.get('/attendance/check-access');
                    if (response.data.success) {
                        setAttendanceEnabled(response.data.enabled);
                    }
                } catch (error) {
                    console.error('Failed to check attendance access', error);
                }
            }
        };

        fetchBranding();
        checkAttendance();
    }, [user]);

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
                const teacherLinks = [
                    { path: '/teacher/dashboard', label: 'Dashboard', icon: <FaHome /> },
                    { path: '/teacher/students', label: 'Students', icon: <FaUserGraduate /> },
                ];
                // Conditionally add attendance link
                if (attendanceEnabled) {
                    teacherLinks.push({ path: '/teacher/attendance', label: 'Attendance', icon: <FaClipboardList /> });
                }
                return teacherLinks;
            default:
                return [];
        }
    };

    // Get role-specific gradient
    const getRoleGradient = () => {
        switch (user?.role) {
            case 'super_admin':
                return 'from-purple-600 to-blue-600';
            case 'admin':
                return 'from-blue-600 to-indigo-600';
            case 'teacher':
                return 'from-indigo-600 to-purple-600';
            default:
                return 'from-gray-600 to-gray-700';
        }
    };

    // Get header content based on role
    const getHeaderContent = () => {
        if (user?.role === 'super_admin') {
            // SuperAdmin sees "Protap"
            return {
                title: 'Protap',
                logo: null
            };
        } else if (instituteBranding) {
            // Other roles see institute branding
            return {
                title: instituteBranding.name,
                logo: instituteBranding.logoUrl
            };
        }
        return {
            title: 'SMS Portal',
            logo: null
        };
    };

    const headerContent = getHeaderContent();

    return (
        <aside
            className={`fixed left-0 top-0 min-h-screen bg-white border-r border-gray-200 flex flex-col z-40 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className={`absolute -right-4 top-20 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-all duration-200 z-50 hover:scale-110 hover:shadow-lg`}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                <img
                    src="/menus.png"
                    alt="Toggle menu"
                    className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Header */}
            <div className={`p-4 bg-gradient-to-r ${getRoleGradient()} overflow-hidden`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    {headerContent.logo ? (
                        <img
                            src={headerContent.logo.startsWith('/') ? `http://localhost:5000${headerContent.logo}` : headerContent.logo}
                            alt="Logo"
                            className={`rounded-lg object-cover bg-white/20 p-1 transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-10 h-10'}`}
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                            <FaBuilding className="text-white text-xl" />
                        </div>
                    )}
                    <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        <h1 className="text-lg font-bold text-white truncate max-w-[140px] whitespace-nowrap" title={headerContent.title}>
                            {headerContent.title}
                        </h1>
                        <p className="text-white/70 text-xs capitalize whitespace-nowrap">{user?.role?.replace('_', ' ')}</p>
                    </div>
                </div>
            </div>

            {/* User Info */}
            <div className={`p-4 border-b border-gray-100 ${isCollapsed ? 'flex justify-center' : ''}`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getRoleGradient()} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className={`flex-1 min-w-0 transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                        <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {getLinks().map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        title={isCollapsed ? link.label : ''}
                        className={({ isActive }) =>
                            `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                            }`
                        }
                    >
                        <span className="flex-shrink-0">{link.icon}</span>
                        <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            {link.label}
                        </span>
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <div className={`p-4 border-t border-gray-100`}>
                <button
                    onClick={handleLogout}
                    title={isCollapsed ? 'Logout' : ''}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors`}
                >
                    <FaSignOutAlt className="flex-shrink-0" />
                    <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Logout
                    </span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
