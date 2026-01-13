import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUserCircle, FaSignOutAlt, FaBuilding, FaChevronDown, FaSearch } from 'react-icons/fa';

const Header = () => {
    const { user, logout } = useAuth();
    const { toggleSidebar } = useSidebar();
    const navigate = useNavigate();
    const [schoolBranding, setSchoolBranding] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

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
            if (user && user.role !== 'super_admin' && user.schoolId) {
                try {
                    const response = await api.get('/school/my-branding');
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

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Get Header Content
    const getHeaderContent = () => {
        if (user?.role === 'super_admin') {
            return {
                title: 'Protap',
                logo: null
            };
        } else if (schoolBranding) {
            return {
                title: schoolBranding.name,
                logo: schoolBranding.logoUrl
            };
        }
        return {
            title: 'SMS Portal',
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
                            src={headerContent.logo.startsWith('/') ? `http://localhost:5000${headerContent.logo}` : headerContent.logo}
                            alt="Logo"
                            className="h-10 w-auto object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                            <span className="font-bold text-lg">{headerContent.title.substring(0, 2).toUpperCase()}</span>
                        </div>
                    )}
                    <span className="font-bold text-gray-800 text-lg hidden md:block">
                        {headerContent.title}
                    </span>
                </div>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex items-center ml-auto mr-6 w-64">
                <div className="relative w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <FaSearch />
                    </span>
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full py-2 pl-10 pr-4 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>
            </div>

            {/* Right: User Profile */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-3 p-1.5 rounded-full hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200 focus:outline-none"
                >
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-r ${getRoleGradient()} flex items-center justify-center text-white font-bold shadow-sm`}>
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden md:flex flex-col items-start mr-1">
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
        </header>
    );
};

export default Header;
