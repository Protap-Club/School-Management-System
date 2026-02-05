import React from 'react';
import DashboardLayout from '../layouts/DashboardLayout';

const Notifications = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">View your recent notifications and alerts</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          <p>No new notifications</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
