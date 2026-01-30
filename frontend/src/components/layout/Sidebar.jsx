import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { useFeatures } from '../../context/FeatureContext';
import {
    FaUserGraduate,
    FaCog,
    FaClipboardList,
    FaHome,
    FaBullhorn,
    FaCalendarAlt,
} from 'react-icons/fa';

const Sidebar = () => {
    const { user } = useAuth();
    const { isCollapsed } = useSidebar();
    const { hasFeature } = useFeatures();

    const getLinks = () => {
        const dashboardLink = { path: '/dashboard', label: 'Dashboard', icon: <FaHome /> };

        switch (user?.role) {
            case 'super_admin':
                const superAdminLinks = [
                    dashboardLink,
                    { path: '/superadmin/users', label: 'Users', icon: <FaUserGraduate /> },
                    // { path: '/superadmin/timetable', label: 'Timetable', icon: <FaCalendarAlt /> }, // Removed as per request
                ];

                superAdminLinks.push({ path: '/superadmin/settings', label: 'Settings', icon: <FaCog /> });

                return superAdminLinks;
            case 'admin':
                // Build links based on enabled features
                const adminLinks = [
                    dashboardLink,
                    { path: '/admin/users', label: 'Users', icon: <FaUserGraduate /> },
                ];

                // Only show Attendance if feature is enabled
                if (hasFeature('attendance')) {
                    adminLinks.push({ path: '/admin/attendance', label: 'Attendance', icon: <FaClipboardList /> });
                }

                // Notice link (only if feature enabled)
                if (hasFeature('notice')) {
                    adminLinks.push({ path: '/admin/notice', label: 'Notice', icon: <FaBullhorn /> });
                }

                if (hasFeature('timetable')) {
                    adminLinks.push({ path: '/admin/timetable', label: 'Timetable', icon: <FaCalendarAlt /> });
                }

                // Settings always last
                adminLinks.push({ path: '/admin/settings', label: 'Settings', icon: <FaCog /> });

                return adminLinks;
            case 'teacher':
                // Build links based on enabled features
                const teacherLinks = [
                    dashboardLink,
                    { path: '/teacher/users', label: 'Users', icon: <FaUserGraduate /> },
                ];

                // Only show Attendance if feature is enabled
                if (hasFeature('attendance')) {
                    teacherLinks.push({ path: '/teacher/attendance', label: 'Attendance', icon: <FaClipboardList /> });
                }

                // Notice link (only if feature enabled)
                if (hasFeature('notice')) {
                    teacherLinks.push({ path: '/teacher/notice', label: 'Notice', icon: <FaBullhorn /> });
                }

                if (hasFeature('timetable')) {
                    teacherLinks.push({ path: '/teacher/timetable', label: 'Timetable', icon: <FaCalendarAlt /> });
                }

                return teacherLinks;
            default:
                return [];
        }
    };

    return (
        <aside
            className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-100 flex flex-col z-40 transition-all duration-300 ease-in-out shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] ${isCollapsed ? 'w-0 md:w-20 -translate-x-full md:translate-x-0' : 'w-64'
                }`}
        >
            {/* Scrollable Navigation Area */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {getLinks().map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        title={isCollapsed ? link.label : ''}
                        className={({ isActive }) =>
                            `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                                ? 'bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`
                        }
                    >
                        <span className={`flex-shrink-0 text-lg transition-colors duration-200 ${isCollapsed ? '' : ''}`}>
                            {link.icon}
                        </span>
                        <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 hidden md:block md:w-0 md:opacity-0' : 'w-auto opacity-100'
                            }`}>
                            {link.label}
                        </span>
                    </NavLink>
                ))}
            </nav>

            {/* Version Info (Optional Bottom Element) */}
            <div className={`p-4 border-t border-gray-100 text-center ${isCollapsed ? 'hidden md:block' : ''}`}>
                <p className="text-xs text-gray-400">v1.0.0</p>
            </div>
        </aside>
    );
};

export default Sidebar;
