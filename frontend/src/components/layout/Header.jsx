import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../features/auth';
import { useSidebar } from '../../state';
import api from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { headerContent } from '../../config/headerContent.js';
import { FaBars, FaUserCircle, FaSignOutAlt, FaBuilding, FaChevronDown, FaSearch, FaBell } from 'react-icons/fa';
import AvatarUploadModal from './AvatarUploadModal';
import { useDispatch } from 'react-redux';
import { setUser } from '../../features/auth/authSlice';
import { useReceivedNotices } from '../../features/notices';
import { useQueryClient } from '@tanstack/react-query';
import { authKeys } from '../../features/auth/api/api';

const ROLE_GRADIENTS = {
    super_admin: 'from-purple-600 to-blue-600',
    admin: 'from-blue-600 to-indigo-600',
    teacher: 'from-indigo-600 to-purple-600',
};

const Header = () => {
    const { user, accessToken, logout } = useAuth();
    const { toggleSidebar } = useSidebar();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const [schoolBranding, setSchoolBranding] = useState(null);
    const [refreshKey, setRefreshKey] = useState(() => Date.now());
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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchBranding = async () => {
            if (!user || !accessToken) return;

            try {
                const response = await api.get('/school');
                if (response.data.success && response.data.data) {
                    setSchoolBranding(response.data.data);
                    setRefreshKey(Date.now());
                }
            } catch (error) {
                console.error('Failed to fetch branding', error);
            }
        };
        fetchBranding();
        window.addEventListener('settingsUpdated', fetchBranding);
        return () => window.removeEventListener('settingsUpdated', fetchBranding);
    }, [user, accessToken]);

    const handleUploadSuccess = (newAvatarUrl) => {
        if (user) {
            dispatch(setUser({ ...user, avatarUrl: newAvatarUrl }));
            setRefreshKey(Date.now());
            // Invalidate query to prevent old cache from overwriting Redux on remounts
            queryClient.invalidateQueries({ queryKey: authKeys.user() });
        }
    };

    const handleNotificationClick = () => {
        // Mark as read by saving the current time
        const now = Date.now();
        localStorage.setItem('lastReadNoticesAt', now.toString());
        setLastReadTime(now);
        navigate('/notifications');
    };

    const title = schoolBranding?.school?.name || (user?.role === 'super_admin' ? 'Protap' : 'SMS Portal');
    const logo = schoolBranding?.school?.logoUrl || null;
    const roleGradient = ROLE_GRADIENTS[user?.role] || 'from-gray-600 to-gray-700';

    return (
        <header className="fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4 shadow-sm">
            <div className="flex items-center gap-4">
                <button onClick={toggleSidebar}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100" title="Toggle Sidebar">
                    <img src="/menus.png" alt="Menu" className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                    {(logo || headerContent.logo) ? (
                        <img
                            src={logo ? `${logo}${logo.includes('?') ? '&' : '?'}t=${refreshKey}` : headerContent.logo}
                            alt="Logo"
                            className="h-10 w-auto object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                            <span className="font-bold text-lg">{(title || 'SM').substring(0, 2).toUpperCase()}</span>
                        </div>
                    )}
                    <span className="font-bold text-gray-800 text-lg hidden md:block">{title}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {user?.role !== 'super_admin' && (
                    <button onClick={handleNotificationClick}
                        className="p-2 lg:p-2.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-100 relative group" title="Notifications">
                        <FaBell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse-subtle">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                )}

                {/* User Profile */}
                <div className="relative flex items-center" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className={`w-10 h-10 rounded-full bg-gradient-to-r ${roleGradient} flex items-center justify-center text-white font-bold shadow-sm overflow-hidden hover:ring-2 hover:ring-blue-100 transition-all focus:outline-none shrink-0 border-2 border-transparent focus:border-blue-200`}
                        title="Account Menu"
                    >
                        {user?.avatarUrl ? (
                            <img src={`${user.avatarUrl}${user.avatarUrl.includes('?') ? '&' : '?'}t=${refreshKey}`} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            user?.name?.charAt(0).toUpperCase() || 'U'
                        )}
                    </button>
                    {dropdownOpen && (
                        <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200 z-50">
                            {/* Header Section */}
                            <div className="p-6 flex flex-col items-center border-b border-gray-100 bg-gray-50/30">
                                <div className="relative mb-3">
                                    <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${roleGradient} flex items-center justify-center text-white font-bold text-3xl shadow-md overflow-hidden`}>
                                        {user?.avatarUrl ? (
                                            <img src={`${user.avatarUrl}${user.avatarUrl.includes('?') ? '&' : '?'}t=${refreshKey}`} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            user?.name?.charAt(0).toUpperCase() || 'U'
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setDropdownOpen(false);
                                            setIsUploadModalOpen(true);
                                        }}
                                        className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-md text-gray-600 hover:text-blue-600 border border-gray-200 transition-colors"
                                        title="Change Profile Picture"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </button>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 tracking-tight">{user?.name}</h3>
                                <p className="text-sm text-gray-500 mb-1">{user?.email}</p>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-100 text-blue-800">
                                    {user?.role?.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Actions Section */}
                            <div className="p-3">
                                <button
                                    onClick={() => {
                                        const rolePath = user?.role === 'super_admin' ? 'superadmin' : user?.role;
                                        setDropdownOpen(false);
                                        navigate(`/${rolePath}/profile`);
                                    }}
                                    className="w-full flex justify-center items-center py-2.5 px-4 rounded-[20px] mb-2 border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Manage your Account
                                </button>
                            </div>
                            
                            {/* Footer Section */}
                            <div className="p-2 border-t border-gray-100 bg-gray-50 flex justify-between items-center px-4">
                               <button 
                                    onClick={() => { setDropdownOpen(false); logout(); navigate('/login'); }}
                                    className="flex w-full items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold"
                                >
                                    <FaSignOutAlt /> Sign Out
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
