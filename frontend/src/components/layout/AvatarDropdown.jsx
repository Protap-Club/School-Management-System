import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa';

const AvatarDropdown = () => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

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

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-9 w-9 rounded-md bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
                {user?.name?.charAt(0) || 'A'}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface rounded-md border border-border-subtle shadow-soft overflow-hidden z-50">
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
        </div>
    );
};

export default AvatarDropdown;
