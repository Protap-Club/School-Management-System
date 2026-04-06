import React, { useEffect } from 'react';
import { Sidebar, Header } from '../components/layout';
import { useSidebar } from '../state';

const DashboardLayout = ({ children, onSearch, searchValue }) => {
    const { isCollapsed } = useSidebar();

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;

        const updateScrollLock = () => {
            const hasModal = document.querySelector('.modal-overlay');
            document.body.style.overflow = hasModal ? 'hidden' : previousOverflow || '';
        };

        updateScrollLock();
        const observer = new MutationObserver(updateScrollLock);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

        return () => {
            observer.disconnect();
            document.body.style.overflow = previousOverflow || '';
        };
    }, []);

    // Theme is now managed globally via useTheme hook and early bootstrapping in main.jsx
    // This removes the flickering and ensures persistence across refreshes.

    return (
        <div className="min-h-screen bg-gray-50 print:min-h-0">
            {/* Top Navigation Header */}
            <div className="no-print">
                <Header onSearch={onSearch} searchValue={searchValue} />
            </div>

            {/* Sidebar */}
            <div className="pt-16"> {/* Spacer for fixed header */}
                <div className="no-print"><Sidebar /></div>

                {/* Main Content Area */}
                <main
                    className={`min-h-[calc(100vh-4rem)] p-8 transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-64'
                        } print:min-h-0 print:p-0 print:ml-0`}
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
