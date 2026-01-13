import React from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../layouts/DashboardLayout';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary to-primary-hover rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          {/* Background decoration circles */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-white opacity-10"></div>

          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2 tracking-tight">
              Welcome, <span className="text-white/90">{user?.name}</span>
            </h1>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
