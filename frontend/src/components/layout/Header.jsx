import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../features/auth';
import { useSidebar } from '../../state';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserCircle, FaSignOutAlt, FaBuilding, FaChevronDown, FaSearch, FaBell } from 'react-icons/fa';
import AvatarUploadModal from './AvatarUploadModal';
import { useDispatch } from 'react-redux';
import { setUser } from '../../features/auth/authSlice';
import { useReceivedNotices } from '../../features/notices';
import { useQueryClient } from '@tanstack/react-query';

const Header = ({ onSearch, searchValue }) => {
    const { user, logout } = useAuth();
    const { toggleSidebar } = useSidebar();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const [schoolBranding, setSchoolBranding] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Fetch real received notices to get unread count
    const { data: noticesResponse } = useReceivedNotices();
    const [lastReadTime, setLastReadTime] = useState(() => {
        const stored = localStorage.getItem('lastReadNoticesAt');
        return stored ? parseInt(stored, 10) : null;
    });

    // Derive unread count based on lastReadTime
    const unreadCount = noticesResponse?.data
        ? (lastReadTime
            ? noticesResponse.data.filter(n => new Date(n.createdAt).getTime() > lastReadTime).length
            : noticesResponse.data.length)
        : 0;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch school branding
    useEffect(() => {
        const fetchBranding = async () => {
            if (user) {
                try {
                    const response = await api.get('/school');
                    if (response.data.success && response.data.data) {
                        setSchoolBranding(response.data.data);
                    }
                } catch (error) {
                    console.error('Failed to fetch branding', error);
                }
            }
        };

        fetchBranding();

        // Listen for settings updates to refresh branding (logo changes)
        window.addEventListener('settingsUpdated', fetchBranding);
        return () => window.removeEventListener('settingsUpdated', fetchBranding);
    }, [user]);

    const handleUploadSuccess = (newAvatarUrl) => {
        if (user) {
            dispatch(setUser({ ...user, avatarUrl: newAvatarUrl }));
            // Invalidate query to prevent old cache from overwriting Redux on remounts
            queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleNotificationClick = () => {
        // Mark as read by saving the current time
        const now = Date.now();
        localStorage.setItem('lastReadNoticesAt', now.toString());
        setLastReadTime(now);
        navigate('/notifications');
    };

    // Get Header Content
    const getHeaderContent = () => {
        if (schoolBranding?.school) {
            return {
                title: schoolBranding.school.name || 'SMS Portal',
                logo: schoolBranding.school.logoUrl
            };
        }
        // Fallback if no branding loaded yet
        return {
            title: user?.role === 'super_admin' ? 'Protap' : 'SMS Portal',
            logo: null
        };
    };

    const headerContent = getHeaderContent();

    // Role Gradient for Avatar
    const getRoleGradient = () => {
        switch (user?.role) {
            case 'super_admin': return 'from-purple-600 to-blue-600';
            case 'admin': return 'from-blue-600 to-indigo-600';
            case 'teacher': return 'from-indigo-600 to-purple-600';
            default: return 'from-gray-600 to-gray-700';
        }
    };

    return (
        <header className="fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4 shadow-sm">
            {/* Left: Toggle & Logo */}
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100"
                    title="Toggle Sidebar"
                >
                    <img src="/menus.png" alt="Menu" className="w-5 h-5" />
                </button>

                {/* Logo Section */}
                <div className="flex items-center gap-3">
                    {headerContent.logo ? (
                        <img
                            src={headerContent.logo}
                            alt="Logo"
                            className="h-10 w-auto object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                            <span className="font-bold text-lg">{(headerContent.title || 'SM').substring(0, 2).toUpperCase()}</span>
                        </div>
                    )}
                    <span className="font-bold text-gray-800 text-lg hidden md:block">
                        {headerContent.title}
                    </span>
                </div>
            </div>



            {/* Right: Icons & User Profile */}
            <div className="flex items-center gap-3">
                {/* Notification Bell */}
                <button
                    onClick={handleNotificationClick}
                    className="p-2 lg:p-2.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-100 relative group"
                    title="Notifications"
                >
                    <FaBell className="w-5 h-5" />
                    {/* Notification Badge */}
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse-subtle">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {/* User Profile */}
                <div className="relative flex items-center gap-1" ref={dropdownRef}>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className={`w-9 h-9 rounded-full bg-gradient-to-r ${getRoleGradient()} flex items-center justify-center text-white font-bold shadow-sm overflow-hidden hover:ring-2 hover:ring-blue-100 transition-all focus:outline-none shrink-0`}
                        title="Change Profile Picture"
                    >
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            user?.name?.charAt(0).toUpperCase() || 'U'
                        )}
                    </button>

                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 p-1.5 pr-2 rounded-full hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200 focus:outline-none"
                        title="Account Menu"
                    >
                        <div className="hidden md:flex flex-col items-start ml-1">
                            <span className="text-sm font-semibold text-gray-700 leading-tight">{user?.name}</span>
                            <span className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</span>
                        </div>
                        <FaChevronDown className={`text-gray-400 text-xs transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {dropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                                <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>

                            <div className="p-2">
                                {/* Role Badge */}
                                <div className="px-3 py-2">
                                    <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium capitalize bg-blue-50 text-blue-700 border border-blue-100 w-full text-center`}>
                                        {user?.role?.replace('_', ' ')}
                                    </span>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                                >
                                    <FaSignOutAlt />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AvatarUploadModal
                user={user}
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadSuccess={handleUploadSuccess}
            />
        </header>
    );
};

export default Header;
