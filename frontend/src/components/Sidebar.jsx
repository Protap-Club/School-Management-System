import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import {
    FaUserGraduate,
    FaCog,
    FaClipboardList,
    FaHome,
} from 'react-icons/fa';

const Sidebar = () => {
    const { user } = useAuth();
    const { isCollapsed } = useSidebar();

    const getLinks = () => {
        const dashboardLink = { path: '/dashboard', label: 'Dashboard', icon: <FaHome /> };
        switch (user?.role) {
            case 'super_admin':
                return [
                    dashboardLink,
                    { path: '/superadmin/users', label: 'Users', icon: <FaUserGraduate /> },
                    { path: '/superadmin/settings', label: 'Settings', icon: <FaCog /> },
                ];
            case 'admin':
                return [
                    dashboardLink,
                    { path: '/admin/users', label: 'Users', icon: <FaUserGraduate /> },
                    { path: '/admin/settings', label: 'Settings', icon: <FaCog /> },
                ];
            case 'teacher':
                return [
                    dashboardLink,
                    { path: '/teacher/users', label: 'Users', icon: <FaUserGraduate /> },
                    { path: '/teacher/settings', label: 'Settings', icon: <FaCog /> },
                ];
            default:
                return [];
        }
    };

    return (
        <aside
            className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 flex flex-col z-40 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 md:w-20 -translate-x-full md:translate-x-0' : 'w-64'
                }`}
        >
            {/* Scrollable Navigation Area */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {getLinks().map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        title={isCollapsed ? link.label : ''}
                        className={({ isActive }) =>
                            `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                            }`
                        }
                    >
                        <span className="flex-shrink-0 text-lg">{link.icon}</span>
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
