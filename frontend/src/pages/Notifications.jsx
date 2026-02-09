import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import {
  FaBell,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaChevronDown,
} from 'react-icons/fa';

// Demo Data for different roles
const DEMO_NOTIFICATIONS = {
  superAdmin: [
    { id: 1, title: 'System Maintenance', message: 'Scheduled system maintenance on Feb 15th from 2 AM to 4 AM.', type: 'info', date: '2 hours ago', isRead: false },
    { id: 2, title: 'New School Registered', message: 'Greenwood High School has been successfully registered.', type: 'success', date: '5 hours ago', isRead: false },
    { id: 3, title: 'Server Load Alert', message: 'High server load detected in US-East region.', type: 'warning', date: '1 day ago', isRead: true },
    { id: 4, title: 'New Feature Deployed', message: 'AI-powered attendance analytics is now live.', type: 'success', date: '1 day ago', isRead: true },
    { id: 5, title: 'Subscription Payment', message: 'Received subscription payment from St. Mary\'s School.', type: 'info', date: '2 days ago', isRead: true },
    { id: 6, title: 'Security Alert', message: 'Multiple failed login attempts detected from IP 192.168.x.x.', type: 'warning', date: '3 days ago', isRead: true },
    { id: 7, title: 'Database Backup', message: 'Daily database backup completed successfully.', type: 'success', date: '3 days ago', isRead: true },
    { id: 8, title: 'User Report', message: 'New user registration has increased by 15% this week.', type: 'info', date: '4 days ago', isRead: true },
    { id: 9, title: 'Policy Update', message: 'Privacy policy has been updated. Please review.', type: 'info', date: '5 days ago', isRead: true },
    { id: 10, title: 'Feedback Received', message: 'New feedback received from Admin User #4521.', type: 'info', date: '1 week ago', isRead: true },
    { id: 11, title: 'Inactive Accounts', message: '50 inactive accounts have been archived automatically.', type: 'warning', date: '1 week ago', isRead: true },
  ],
  admin: [
    { id: 1, title: 'Low Attendance Alert', message: 'Class 10-A has reported less than 70% attendance today.', type: 'warning', date: '1 hour ago', isRead: false },
    { id: 2, title: 'Fee Payment Reminder', message: 'Month-end fee collection report is due.', type: 'info', date: '3 hours ago', isRead: false },
    { id: 3, title: 'Teacher Leave Request', message: 'Mr. Sharma (Math) has requested leave for tomorrow.', type: 'info', date: '5 hours ago', isRead: true },
    { id: 4, title: 'New Student Admission', message: 'New student profile created for Rahul Verma (Class 5).', type: 'success', date: '1 day ago', isRead: true },
    { id: 5, title: 'Event Planning', message: 'Annual Sports Day planning meeting scheduled at 2 PM.', type: 'info', date: '1 day ago', isRead: true },
    { id: 6, title: 'Library Stock Update', message: 'New shipment of science textbooks has arrived.', type: 'success', date: '2 days ago', isRead: true },
    { id: 7, title: 'Transport Issue', message: 'Bus No. 5 reported a breakdown. Alternate arranged.', type: 'warning', date: '2 days ago', isRead: true },
    { id: 8, title: 'Parent Complaint', message: 'New complaint registered regarding canteen food quality.', type: 'warning', date: '3 days ago', isRead: true },
    { id: 9, title: 'Exam Schedule', message: 'Mid-term exam schedule has been published.', type: 'info', date: '3 days ago', isRead: true },
    { id: 10, title: 'Staff Meeting', message: 'Monthly staff meeting minutes have been uploaded.', type: 'info', date: '4 days ago', isRead: true },
    { id: 11, title: 'System Warning', message: 'School license expires in 30 days. Renew now.', type: 'warning', date: '1 week ago', isRead: true },
  ],
  teacher: [
    { id: 1, title: 'Assignment Due', message: 'Math assignment for Class 9-B is due today.', type: 'info', date: '30 mins ago', isRead: false },
    { id: 2, title: 'Student Absence', message: 'Rohan (Class 10) has been absent for 3 consecutive days.', type: 'warning', date: '2 hours ago', isRead: false },
    { id: 3, title: 'Exam Duty', message: 'You have invigilation duty for History exam tomorrow.', type: 'info', date: '4 hours ago', isRead: true },
    { id: 4, title: 'Syllabus Update', message: 'Physics Chapter 5 completion deadline extended.', type: 'success', date: '1 day ago', isRead: true },
    { id: 5, title: 'Parent Meeting', message: 'Mrs. Gupta designated a meeting slot at 10 AM.', type: 'info', date: '1 day ago', isRead: true },
    { id: 6, title: 'New Resources', message: 'New digital teaching aids added for Chemistry.', type: 'success', date: '2 days ago', isRead: true },
    { id: 7, title: 'Time Table Change', message: 'Your Period 3 on Wednesday has been swapped.', type: 'warning', date: '2 days ago', isRead: true },
    { id: 8, title: 'Grading Deadline', message: 'Submit internal assessment marks by Friday.', type: 'info', date: '3 days ago', isRead: true },
    { id: 9, title: 'Holiday Notice', message: 'School remains closed on Monday for Regional Holiday.', type: 'info', date: '3 days ago', isRead: true },
    { id: 10, title: 'Class Achievement', message: 'Class 8-A won the Inter-school Quiz Competition.', type: 'success', date: '4 days ago', isRead: true },
    { id: 11, title: 'Workshop Invite', message: 'Invitation to "Modern Teaching Methods" workshop.', type: 'info', date: '1 week ago', isRead: true },
  ]
};

const NotificationItem = ({ notification }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'warning': return <FaExclamationTriangle className="text-yellow-500" size={20} />;
      case 'success': return <FaCheckCircle className="text-green-500" size={20} />;
      case 'info':
      default: return <FaInfoCircle className="text-blue-500" size={20} />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-100';
      case 'success': return 'bg-green-50 border-green-100';
      case 'info':
      default: return 'bg-blue-50 border-blue-100';
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${getBgColor(notification.type)} ${!notification.isRead ? 'border-l-4 border-l-primary shadow-sm' : ''} transition-all hover:shadow-md cursor-pointer group`}>
      <div className="flex items-start gap-4">
        <div className="mt-1 flex-shrink-0 bg-white p-2 rounded-full shadow-sm">
          {getIcon(notification.type)}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className={`font-semibold text-gray-900 ${!notification.isRead ? 'text-primary' : ''}`}>
              {notification.title}
            </h3>
            <span className="text-xs text-gray-500 flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-gray-100">
              <FaClock size={10} /> {notification.date}
            </span>
          </div>
          <p className="text-gray-600 text-sm mt-1 leading-relaxed">
            {notification.message}
          </p>
        </div>
        {!notification.isRead && (
          <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
        )}
      </div>
    </div>
  );
};

const Notifications = () => {
  const { user } = useAuth();
  const [visibleCount, setVisibleCount] = useState(5);
  const [notifications, setNotifications] = useState([]);
  const [role, setRole] = useState('student');

  useEffect(() => {
    // Determine user role and set notifications
    const userRole = user?.role || 'student'; // Fallback to student
    setRole(userRole);

    // Select demo data based on role
    let data = [];
    if (userRole === 'superAdmin' || userRole === 'superadmin') {
      data = DEMO_NOTIFICATIONS.superAdmin;
    } else if (userRole === 'admin') {
      data = DEMO_NOTIFICATIONS.admin;
    } else if (userRole === 'teacher') {
      data = DEMO_NOTIFICATIONS.teacher;
    } else {
      // Default or generic for student/others
      data = [
        { id: 1, title: 'Welcome', message: 'Welcome to the School Management System.', type: 'info', date: 'Just now', isRead: false },
        ...DEMO_NOTIFICATIONS.admin // Fallback to admin data for demo if needed
      ];
    }
    setNotifications(data);
  }, [user]);

  const handleSeeMore = () => {
    setVisibleCount(prev => prev + 5);
  };

  const visibleNotifications = notifications.slice(0, visibleCount);
  const hasMore = visibleCount < notifications.length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <FaBell />
              </div>
              Notifications
            </h1>
            <p className="text-gray-500 mt-2 ml-1">
              Stay updated with the latest alerts and announcements for <span className="font-semibold text-primary capitalize">{role?.replace(/([A-Z])/g, ' $1').trim()}</span>
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm font-medium text-gray-600">
            Total: {notifications.length}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {visibleNotifications.length > 0 ? (
            visibleNotifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <FaBell size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
              <p className="text-gray-500 mt-1">You're all caught up! Check back later for updates.</p>
            </div>
          )}
        </div>

        {/* See More Button */}
        {hasMore && (
          <div className="text-center pt-4">
            <button
              onClick={handleSeeMore}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 hover:text-primary transition-all shadow-sm group"
            >
              See More Notifications
              <FaChevronDown className="group-hover:translate-y-0.5 transition-transform text-gray-400 group-hover:text-primary" size={12} />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
