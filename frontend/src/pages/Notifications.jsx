import React, { useState, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import { useReceivedNotices } from '../features/notices';
import { useNavigate } from 'react-router-dom';
import { FaBell, FaInfoCircle, FaClock, FaChevronDown, FaFileAlt, FaArrowRight, FaPaperclip } from 'react-icons/fa';

const TIME_UNITS = [
  [31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute']
];

const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  for (const [divisor, unit] of TIME_UNITS) {
    const interval = seconds / divisor;
    if (interval > 1) return `${Math.floor(interval)} ${unit}s ago`;
  }
  return 'Just now';
};

const NOTIFICATION_TYPE_CONFIG = {
  file: { icon: <FaFileAlt className="text-purple-500" size={20} />, bg: 'bg-purple-50 border-purple-100', border: 'border-l-purple-500' },
  default: { icon: <FaInfoCircle className="text-blue-500" size={20} />, bg: 'bg-blue-50 border-blue-100', border: 'border-l-blue-500' },
};

const NotificationItem = ({ notification, onNavigate }) => {
  const config = NOTIFICATION_TYPE_CONFIG[notification.type] || NOTIFICATION_TYPE_CONFIG.default;
  return (
    <div
      onClick={onNavigate}
      className={`p-4 rounded-xl border ${config.bg} border-l-4 ${config.border} shadow-sm transition-all hover:shadow-md cursor-pointer group`}
    >
      <div className="flex items-start gap-4">
        <div className="mt-1 shrink-0 bg-white p-2 rounded-full shadow-sm">
          {config.icon}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-gray-900">{notification.title || 'Notice'}</h3>
            <span className="text-xs text-gray-500 flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-gray-100">
              <FaClock size={10} /> {getRelativeTime(notification.createdAt)}
            </span>
          </div>
          <p className="text-gray-600 text-sm mt-1 leading-relaxed line-clamp-2">{notification.message}</p>

          {/* Attachment hint — user must go to Notice Board to download */}
          {notification.attachment?.filename && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 bg-white/70 px-2 py-1.5 rounded border border-gray-100 w-fit">
              <FaPaperclip size={10} />
              <span className="font-medium">{notification.attachment.originalName || notification.attachment.filename}</span>
              <span className="text-gray-400">(open Notice Board to download)</span>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-gray-400 capitalize">
              From: {notification.createdBy?.name || 'Admin'} ({notification.createdBy?.role})
            </div>
            {/* CTA: visually signals the card is clickable */}
            <span className="text-xs font-medium text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              View in Notice Board <FaArrowRight size={10} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(5);
  const { data: noticesResponse, isLoading } = useReceivedNotices();
  const notifications = Array.isArray(noticesResponse?.data)
    ? noticesResponse.data
    : (noticesResponse?.data?.received || []);
  const visibleNotifications = useMemo(() => notifications.slice(0, visibleCount), [notifications, visibleCount]);
  const hasMore = visibleCount < notifications.length;
  const userRole = user?.role || 'teacher';

  // Navigate to the role-specific Notice page and open the Received tab
  const handleNavigateToNotice = () => {
    const rolePath = userRole === 'admin' ? '/admin/notice' : '/teacher/notice';
    navigate(rolePath, { state: { tab: 'received' } });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary"><FaBell /></div>
              Notifications
            </h1>
            <p className="text-gray-500 mt-2 ml-1">
              Stay updated with the latest alerts and announcements for <span className="font-semibold text-primary capitalize">{userRole.replace(/([A-Z])/g, ' $1').trim()}</span>
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm font-medium text-gray-600">Total: {notifications.length}</div>
        </div>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading notifications...</div>
          ) : visibleNotifications.length > 0 ? (
            <>
              {/* Info banner */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                <FaInfoCircle className="shrink-0" size={14} />
                <span>Click any notice to open it in the <strong>Notice Board</strong> where you can read the full message and download attachments.</span>
              </div>
              {visibleNotifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onNavigate={handleNavigateToNotice}
                />
              ))}
            </>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><FaBell size={32} /></div>
              <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
              <p className="text-gray-500 mt-1">You're all caught up! Check back later for updates.</p>
            </div>
          )}
        </div>
        {hasMore && (
          <div className="text-center pt-4">
            <button onClick={() => setVisibleCount(prev => prev + 5)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 hover:text-primary transition-all shadow-sm group">
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
