import React, { useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import api from '../api/axios';

const DashboardLayout = ({ children, onSearch, searchValue }) => {
    const { isCollapsed } = useSidebar();

    // Helper to darken color for hover state
    const adjustColor = (color, amount) => {
        return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
    }

    // Helper to convert hex to rgb channels
    const hexToRgb = (hex) => {
        const bigint = parseInt(hex.replace('#', ''), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `${r} ${g} ${b}`;
    }

    // Fetch and apply theme settings
    useEffect(() => {
        const fetchAndApplyTheme = async () => {
            try {
                // Check if user is logged in before fetching settings
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await api.get('/school/branding');
                if (response.data.success && response.data.data?.theme) {
                    const { accentColor } = response.data.data.theme;

                    // Set both Hex and RGB variables
                    document.documentElement.style.setProperty('--primary-color', accentColor);
                    document.documentElement.style.setProperty('--primary-rgb', hexToRgb(accentColor));

                    // Hover state
                    const hoverColor = adjustColor(accentColor, -25);
                    document.documentElement.style.setProperty('--primary-hover', hoverColor);
                    document.documentElement.style.setProperty('--primary-hover-rgb', hexToRgb(hoverColor));
                }
            } catch (error) {
                // Silently fail - theme will use defaults
            }
        };

        // Initial load
        fetchAndApplyTheme();

        // Listen for updates
        window.addEventListener('settingsUpdated', fetchAndApplyTheme);
        return () => window.removeEventListener('settingsUpdated', fetchAndApplyTheme);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navigation Header */}
            <Header onSearch={onSearch} searchValue={searchValue} />

            {/* Sidebar */}
            <div className="pt-16"> {/* Spacer for fixed header */}
                <Sidebar />

                {/* Main Content Area */}
                <main
                    className={`min-h-[calc(100vh-4rem)] p-8 transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-64'
                        }`}
                >
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
