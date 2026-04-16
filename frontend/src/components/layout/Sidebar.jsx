import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../features/auth';
import { useSidebar, useFeatures, setMobileSidebarOpen } from '../../state';
import {
    FaUserGraduate,
    FaCog,
    FaClipboardList,
    FaHome,
    FaBullhorn,
    FaCalendarAlt,
    FaCalendarDay,
    FaMoneyCheckAlt,
    FaGraduationCap,
    FaBook,
    FaClipboardCheck,
} from 'react-icons/fa';

const Sidebar = () => {
    const dispatch = useDispatch();
    const { user } = useAuth();
    const location = useLocation();
    const { isCollapsed, isMobileOpen } = useSidebar();
    const { hasFeature } = useFeatures();

    useEffect(() => {
        dispatch(setMobileSidebarOpen(false));
    }, [dispatch, location.pathname]);

    const getLinks = () => {
        const dashboardLink = { path: '/dashboard', label: 'Dashboard', icon: <FaHome /> };

        switch (user?.role) {
            case 'super_admin': {
                const superAdminLinks = [dashboardLink];

                // Calendar
                if (hasFeature('calendar')) {
                    superAdminLinks.push({ path: '/superadmin/calendar', label: 'Calendar', icon: <FaCalendarDay /> });
                }

                // Attendance
                if (hasFeature('attendance')) {
                    superAdminLinks.push({ path: '/superadmin/attendance', label: 'Attendance', icon: <FaClipboardList /> });
                }

                // Timetable
                if (hasFeature('timetable')) {
                    superAdminLinks.push({ path: '/superadmin/timetable', label: 'Timetable', icon: <FaCalendarAlt /> });
                }

                // Users
                superAdminLinks.push({ path: '/superadmin/users', label: 'Users', icon: <FaUserGraduate /> });

                // Notice
                if (hasFeature('notice')) {
                    superAdminLinks.push({ path: '/superadmin/notice', label: 'Notice', icon: <FaBullhorn /> });
                }

                // Fees
                if (hasFeature('fees')) {
                    superAdminLinks.push({ path: '/superadmin/fees', label: 'Payment', icon: <FaMoneyCheckAlt /> });
                }

                // Examination + Results (combined module)
                if (hasFeature('examination')) {
                    superAdminLinks.push({ path: '/superadmin/examination', label: 'Examination', icon: <FaGraduationCap /> });
                    superAdminLinks.push({ path: '/superadmin/result', label: 'Results', icon: <FaClipboardCheck /> });
                }

                // Assignments
                if (hasFeature('assignment')) {
                    superAdminLinks.push({ path: '/superadmin/assignments', label: 'Assignments', icon: <FaBook /> });
                }

                // Settings always last
                superAdminLinks.push({ path: '/superadmin/settings', label: 'Settings', icon: <FaCog /> });

                return superAdminLinks;
            }
            case 'admin': {
                // Build links based on enabled features
                // Requested Order: Dashboard, Attendance, Timetable, Users, Notice
                const adminLinks = [dashboardLink];

                // 2. Calendar
                if (hasFeature('calendar')) {
                    adminLinks.push({ path: '/admin/calendar', label: 'Calendar', icon: <FaCalendarDay /> });
                }

                // 3. Attendance
                if (hasFeature('attendance')) {
                    adminLinks.push({ path: '/admin/attendance', label: 'Attendance', icon: <FaClipboardList /> });
                }

                // 4. Timetable
                if (hasFeature('timetable')) {
                    adminLinks.push({ path: '/admin/timetable', label: 'Timetable', icon: <FaCalendarAlt /> });
                }

                // 5. Users
                adminLinks.push({ path: '/admin/users', label: 'Users', icon: <FaUserGraduate /> });

                // 6. Notice
                if (hasFeature('notice')) {
                    adminLinks.push({ path: '/admin/notice', label: 'Notice', icon: <FaBullhorn /> });
                }

                // 7. Fees
                if (hasFeature('fees')) {
                    adminLinks.push({ path: '/admin/fees', label: 'Payment', icon: <FaMoneyCheckAlt />, feature: 'fees' });
                }

                // Examination + Results (combined module)
                if (hasFeature('examination')) {
                    adminLinks.push({ path: '/admin/examination', label: 'Examination', icon: <FaGraduationCap /> });
                    adminLinks.push({ path: '/admin/result', label: 'Results', icon: <FaClipboardCheck /> });
                }

                if (hasFeature('assignment')) {
                    adminLinks.push({ path: '/admin/assignments', label: 'Assignments', icon: <FaBook /> });
                }

                // Settings always last
                adminLinks.push({ path: '/admin/settings', label: 'Settings', icon: <FaCog /> });

                return adminLinks;
            }
            case 'teacher': {
                // Build links based on enabled features
                // Requested Order: Dashboard, Calendar, Attendance, Timetable, Users, Notice
                const teacherLinks = [dashboardLink];

                // 2. Calendar
                if (hasFeature('calendar')) {
                    teacherLinks.push({ path: '/teacher/calendar', label: 'Calendar', icon: <FaCalendarDay /> });
                }

                // 3. Attendance
                if (hasFeature('attendance')) {
                    teacherLinks.push({ path: '/teacher/attendance', label: 'Attendance', icon: <FaClipboardList /> });
                }

                // 4. Timetable
                if (hasFeature('timetable')) {
                    teacherLinks.push({ path: '/teacher/timetable', label: 'Timetable', icon: <FaCalendarAlt /> });
                }

                // 5. Users
                teacherLinks.push({ path: '/teacher/users', label: 'Users', icon: <FaUserGraduate /> });

                // 6. Notice
                if (hasFeature('notice')) {
                    teacherLinks.push({ path: '/teacher/notice', label: 'Notice', icon: <FaBullhorn /> });
                }

                // 7. Fees
                if (hasFeature('fees')) {
                    teacherLinks.push({ path: '/teacher/fees', label: 'Payment', icon: <FaMoneyCheckAlt />, feature: 'fees' });
                }

                // Examination + Results (combined module)
                if (hasFeature('examination')) {
                    teacherLinks.push({ path: '/teacher/examination', label: 'Examination', icon: <FaGraduationCap /> });
                    teacherLinks.push({ path: '/teacher/result', label: 'Results', icon: <FaClipboardCheck /> });
                }

                // Assignments
                if (hasFeature('assignment')) {
                    teacherLinks.push({ path: '/teacher/assignments', label: 'Assignments', icon: <FaBook /> });
                }

                // Removed settings for teachers as requested
                // teacherLinks.push({ path: '/teacher/settings', label: 'Settings', icon: <FaCog /> });

                return teacherLinks;
            }
            default:
                return [];
        }
    };

    return (
        <aside
            id="dashboard-sidebar"
            className={`fixed left-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-[17rem] flex-col border-r border-gray-100 bg-white shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${isCollapsed ? 'md:w-20' : 'md:w-64'
                }`}
        >
            {/* Scrollable Navigation Area */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {getLinks().map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        title={isCollapsed ? link.label : ''}
                        className={({ isActive }) => {
                            // Custom active check for Attendance to include subroutes (classes)
                            const isAttendance = link.label === 'Attendance' && window.location.pathname.includes('/attendance');
                            const actuallyActive = isActive || isAttendance;

                            return `flex items-center ${isCollapsed ? 'md:justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${actuallyActive
                                ? 'bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`;
                        }}
                    >
                        <span className={`shrink-0 text-lg transition-colors duration-200 ${isCollapsed ? '' : ''}`}>
                            {link.icon}
                        </span>
                        <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'
                            }`}>
                            {link.label}
                        </span>
                    </NavLink>
                ))}
            </nav>

            {/* Version Info (Optional Bottom Element) */}
            <div className={`border-t border-gray-100 p-4 text-center ${isCollapsed ? 'md:block' : ''}`}>
                <p className="text-xs text-gray-400">v1.0.0</p>
            </div>
        </aside>
    );
};

export default Sidebar;
