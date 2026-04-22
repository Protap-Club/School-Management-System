import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../features/auth';
import { useSidebar } from '../../state';
import { useNavigate } from 'react-router-dom';
import { headerContent } from '../../config/headerContent.js';
import { FaSignOutAlt, FaBell, FaUser } from 'react-icons/fa';
import AvatarUploadModal from './AvatarUploadModal';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../../features/auth/authSlice';
import { useReceivedNotices } from '../../features/notices';
import { useQueryClient } from '@tanstack/react-query';
import { authKeys } from '../../features/auth/api/api';
import { selectBranding } from '../../state/themeSlice';

const ROLE_GRADIENTS = {
    super_admin: 'from-purple-600 to-blue-600',
    admin: 'from-blue-600 to-indigo-600',
    teacher: 'from-indigo-600 to-purple-600',
};

const Header = () => {
    const { user, logout } = useAuth();
    const { isMobileOpen, toggleSidebar, setMobileSidebarOpen } = useSidebar();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const school = useSelector(selectBranding);
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

    const handleUploadSuccess = (payload) => {
        if (user) {
            const nextUser = {
                ...user,
                avatarUrl: payload?.avatarUrl || user.avatarUrl,
                avatarPublicId: payload?.avatarPublicId || user.avatarPublicId,
                updatedAt: payload?.updatedAt || user.updatedAt,
            };
            dispatch(setUser(nextUser));
            // Keep auth cache in sync so route switches don't overwrite with stale data
            queryClient.setQueryData(authKeys.user(), { success: true, user: nextUser });
        }
    };

    const handleNotificationClick = () => {
        // Mark as read by saving the current time
        const now = Date.now();
        localStorage.setItem('lastReadNoticesAt', now.toString());
        setLastReadTime(now);
        navigate('/notifications');
    };

    const handleSidebarButtonClick = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setMobileSidebarOpen(!isMobileOpen);
            return;
        }

        toggleSidebar();
    };

    const title = school?.name || (user?.role === 'super_admin' ? 'Protap' : 'SMS Portal');
    const logo = school?.logoUrl || null;
    const logoVersion = school?.logoPublicId || school?.updatedAt || null;
    const roleGradient = ROLE_GRADIENTS[user?.role] || 'from-gray-600 to-gray-700';
    const avatarVersion = user?.avatarPublicId || user?.updatedAt || null;
    const avatarSrc = user?.avatarUrl
        ? `${user.avatarUrl}${avatarVersion ? `${user.avatarUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(avatarVersion)}` : ''}`
        : null;

    return (
        <header className="fixed top-0 left-0 z-50 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-3 shadow-sm sm:px-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                <button
                    onClick={handleSidebarButtonClick}
                    aria-label={isMobileOpen ? 'Close sidebar' : 'Open sidebar'}
                    aria-expanded={isMobileOpen}
                    aria-controls="dashboard-sidebar"
                    className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Toggle Sidebar">
                    <img src="/menus.png" alt="Menu" className="w-5 h-5" />
                </button>
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    {(logo || headerContent.logo) ? (
                        <img
                            src={logo ? `${logo}${logoVersion ? `${logo.includes('?') ? '&' : '?'}v=${encodeURIComponent(logoVersion)}` : ''}` : headerContent.logo}
                            alt="Logo"
                            className="h-9 w-auto max-w-[2.5rem] object-contain sm:h-10 sm:max-w-none"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                            <span className="font-bold text-lg">{(title || 'SM').substring(0, 2).toUpperCase()}</span>
                        </div>
                    )}
                    <span className="hidden truncate text-base font-bold text-gray-800 md:block lg:text-lg">{title}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
                {user?.role !== 'super_admin' && (
                    <button onClick={handleNotificationClick}
                        className="p-2 lg:p-2.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-100 relative group min-h-[44px] min-w-[44px] flex items-center justify-center" title="Notifications">
                        <FaBell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse-subtle">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                )}

                {/* User Profile */}
                {/* User Profile */}
                <div className="relative flex items-center gap-2 border-l border-gray-200 pl-2 sm:gap-3 lg:gap-4 lg:pl-4" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 md:gap-3 focus:outline-none rounded-lg p-1 hover:bg-gray-50 transition-colors min-h-[44px]"
                        title="Account Menu"
                    >
                        <div
                            className={`w-10 h-10 rounded-full bg-gradient-to-r ${roleGradient} flex items-center justify-center text-white font-bold shadow-sm overflow-hidden shrink-0 border-2 border-transparent`}
                        >
                        {avatarSrc ? (
                                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" loading="eager" />
                            ) : (
                                user?.name?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        <div className="hidden min-w-0 md:flex flex-col text-left">
                            <span className="text-sm font-semibold text-gray-800 leading-none mb-1">{user?.name}</span>
                            <span className="text-xs text-gray-500 font-medium capitalize leading-none">{user?.role?.replace('_', ' ')}</span>
                        </div>
                    </button>
                    
                    {dropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200 z-50">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col items-center text-center">
                                <button
                                    onClick={() => {
                                        setDropdownOpen(false);
                                        setIsUploadModalOpen(true);
                                    }}
                                    className="relative mb-2 group focus:outline-none"
                                    title="Change Profile Picture"
                                >
                                    <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${roleGradient} flex items-center justify-center text-white font-bold shadow-md overflow-hidden text-2xl group-hover:ring-2 group-hover:ring-blue-100 transition-all`}>
                                        {avatarSrc ? (
                                            <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" loading="eager" />
                                        ) : (
                                            user?.name?.charAt(0).toUpperCase() || 'U'
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                </button>
                                <p className="text-sm font-bold text-gray-800 w-full truncate">{user?.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                            </div>
                            <div className="p-2">
                                <button 
                                    onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-medium mb-1"
                                >
                                    <FaUser className="w-4 h-4" /> Profile
                                </button>
                                <button 
                                    onClick={() => { setDropdownOpen(false); logout(); navigate('/login'); }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                                >
                                    <FaSignOutAlt className="w-4 h-4" /> Sign Out
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
