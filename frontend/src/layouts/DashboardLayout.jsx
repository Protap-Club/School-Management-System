import React, { useEffect } from 'react';
import { Sidebar, Header } from '../components/layout';
import { useSidebar } from '../state';

const DashboardLayout = ({ children, onSearch, searchValue }) => {
    const { isCollapsed, isMobileOpen, setMobileSidebarOpen } = useSidebar();

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;

        const updateScrollLock = () => {
            const hasModal = document.querySelector('.modal-overlay');
            document.body.style.overflow = hasModal || isMobileOpen ? 'hidden' : previousOverflow || '';
        };

        updateScrollLock();
        const observer = new MutationObserver(updateScrollLock);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

        return () => {
            observer.disconnect();
            document.body.style.overflow = previousOverflow || '';
        };
    }, [isMobileOpen]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setMobileSidebarOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, [setMobileSidebarOpen]);

    // Theme is now managed globally via useTheme hook and early bootstrapping in main.jsx
    // This removes the flickering and ensures persistence across refreshes.

    return (
        <div className="min-h-screen overflow-x-hidden bg-gray-50 print:min-h-0">
            {/* Top Navigation Header */}
            <div className="no-print">
                <Header onSearch={onSearch} searchValue={searchValue} />
            </div>

            {/* Sidebar */}
            <div className="pt-16"> {/* Spacer for fixed header */}
                <div className="no-print"><Sidebar /></div>
                {isMobileOpen && (
                    <button
                        type="button"
                        aria-label="Close sidebar overlay"
                        className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] md:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}

                {/* Main Content Area */}
                <main
                    className={`min-h-[calc(100vh-4rem)] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-64'
                        } print:min-h-0 print:p-0 print:ml-0`}
                >
                    <div className="mx-auto w-full max-w-[1600px] min-w-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
