import React from 'react';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';

const DashboardLayout = ({ children }) => {
    const { isCollapsed } = useSidebar();

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <main className={`p-8 min-h-screen transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-20' : 'ml-64'
                }`}>
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
