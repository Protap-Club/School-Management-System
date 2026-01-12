import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';

const DashboardLayout = ({ children }) => {
    const { isCollapsed } = useSidebar();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navigation Header */}
            <Header />

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
