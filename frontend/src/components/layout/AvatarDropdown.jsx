import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { FaUser, FaCog, FaSignOutAlt, FaChevronDown } from 'react-icons/fa';
import AvatarUploadModal from './AvatarUploadModal';
import { useDispatch } from 'react-redux';
import { setUser } from '../../features/auth/authSlice';

const AvatarDropdown = () => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleUploadSuccess = (newAvatarUrl) => {
        // Dispatch Redux action to update user state instantly
        if (user) {
            dispatch(setUser({ ...user, avatarUrl: newAvatarUrl }));
        }
    };

    const getSettingsPath = () => {
        switch (user?.role) {
            case 'super_admin':
                return '/superadmin/settings';
            case 'admin':
                return '/admin/settings';
            case 'teacher':
                return '/teacher/settings';
            default:
                return '/settings';
        }
    };

    const displayImage = user?.avatarUrl;

    return (
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
            {/* Click avatar to open the big avatar modal */}
            <button
                onClick={() => setIsUploadModalOpen(true)}
                className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-700 font-semibold hover:bg-gray-200 transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/20"
                title="Change Profile Picture"
            >
                {displayImage ? (
                    <img src={displayImage} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    user?.name?.charAt(0)?.toUpperCase() || 'U'
                )}
            </button>

            {/* Click chevron to open settings dropdown */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Account Menu"
            >
                <FaChevronDown size={12} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-md border border-border-subtle shadow-soft overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-border-subtle">
                        <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{user?.email || ''}</p>
                    </div>

                    <div className="py-1">
                        <button
                            onClick={() => {
                                navigate(getSettingsPath());
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <FaCog className="text-gray-400" />
                            <span>Settings</span>
                        </button>

                        <div className="h-px bg-border-subtle my-1" />

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <FaSignOutAlt className="text-red-500" />
                            <span>Sign out</span>
                        </button>
                    </div>
                </div>
            )}

            <AvatarUploadModal
                user={user}
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadSuccess={handleUploadSuccess}
            />
        </div>
    );
};

export default AvatarDropdown;
