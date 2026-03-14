import React, { useEffect } from 'react';
import { Sidebar, Header } from '../components/layout';
import { useSidebar } from '../state';
import api from '../api/axios';

const DashboardLayout = ({ children, onSearch, searchValue }) => {
    const { isCollapsed } = useSidebar();

    // Theme is now managed globally via useTheme hook and early bootstrapping in main.jsx
    // This removes the flickering and ensures persistence across refreshes.

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
                    <div className="max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
