import React from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
    const { user } = useAuth();

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-3xl">
                        {user?.name?.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Hello, {user?.name}!</h1>
                        <p className="text-gray-500 mt-1">Student Dashboard</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[200px]">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">My Course</h2>
                        <div className="text-center py-10 text-gray-400">
                            Course details will appear here
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[200px]">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Notices</h2>
                        <div className="text-center py-10 text-gray-400">
                            No new notices
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default StudentDashboard;
