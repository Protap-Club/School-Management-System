import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import { useReceivedNotices } from '../features/notices';
import {
  FaBell,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaChevronDown,
  FaFileAlt
} from 'react-icons/fa';

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";

  return "Just now";
};

const NotificationItem = ({ notification }) => {
  const isFile = notification.type === 'file';

  const getIcon = () => {
    if (isFile) return <FaFileAlt className="text-purple-500" size={20} />;

    // Default to info icon since backend doesn't have 'warning'/'success' types yet for notices
    // You could map specific titles to icons if needed, but keeping it simple for now
    return <FaInfoCircle className="text-blue-500" size={20} />;
  };

  const getBgColor = () => {
    if (isFile) return 'bg-purple-50 border-purple-100';
    return 'bg-blue-50 border-blue-100';
  };

  return (
    <div className={`p-4 rounded-xl border ${getBgColor()} border-l-4 ${isFile ? 'border-l-purple-500' : 'border-l-blue-500'} shadow-sm transition-all hover:shadow-md cursor-pointer group`}>
      <div className="flex items-start gap-4">
        <div className="mt-1 shrink-0 bg-white p-2 rounded-full shadow-sm">
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-gray-900">
              {notification.title || 'Notice'}
            </h3>
            <span className="text-xs text-gray-500 flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-gray-100">
              <FaClock size={10} /> {getRelativeTime(notification.createdAt)}
            </span>
          </div>
          <p className="text-gray-600 text-sm mt-1 leading-relaxed">
            {notification.message}
          </p>

          {notification.attachment && (
            <a
              href={notification.attachment.secure_url || notification.attachment.path || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors p-2 rounded border border-blue-100 w-fit cursor-pointer"
            >
              <FaFileAlt size={10} />
              <span className="font-medium hover:underline">{notification.attachment.originalName || notification.attachment.filename}</span>
            </a>
          )}

          <div className="mt-2 text-xs text-gray-400 capitalize">
            From: {notification.createdBy?.name || 'Admin'} ({notification.createdBy?.role})
          </div>
        </div>
      </div>
    </div>
  );
};

const Notifications = () => {
  const { user } = useAuth();
  const [visibleCount, setVisibleCount] = useState(5);

  // Fetch real received notices
  const { data: noticesResponse, isLoading } = useReceivedNotices();
  const notifications = noticesResponse?.data || [];

  const handleSeeMore = () => {
    setVisibleCount(prev => prev + 5);
  };

  const visibleNotifications = notifications.slice(0, visibleCount);
  const hasMore = visibleCount < notifications.length;
  const userRole = user?.role || 'student';

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
              Stay updated with the latest alerts and announcements for <span className="font-semibold text-primary capitalize">{userRole.replace(/([A-Z])/g, ' $1').trim()}</span>
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm font-medium text-gray-600">
            Total: {notifications.length}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading notifications...</div>
          ) : visibleNotifications.length > 0 ? (
            visibleNotifications.map((notification) => (
              <NotificationItem key={notification._id} notification={notification} />
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
