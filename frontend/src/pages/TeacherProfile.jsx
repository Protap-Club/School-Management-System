import React from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaEnvelope, FaPhone, FaIdCard } from 'react-icons/fa';

const TeacherProfile = () => {
    const { user } = useAuth();

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
                    <p className="text-gray-500 mt-1">View your profile information</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Profile Header */}
                    <div className="bg-gradient-to-r from-indigo-500 to-blue-600 px-8 py-12">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-4xl font-bold border-4 border-white/30">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-white">
                                <h2 className="text-2xl font-bold">{user?.name}</h2>
                                <p className="text-white/80 capitalize">{user?.role?.replace('_', ' ')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Profile Details */}
                    <div className="p-8">
                        <h3 className="text-lg font-semibold text-gray-800 mb-6">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                    <FaUser size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Full Name</p>
                                    <p className="font-medium text-gray-800">{user?.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                                    <FaEnvelope size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Email Address</p>
                                    <p className="font-medium text-gray-800">{user?.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                                    <FaPhone size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Contact Number</p>
                                    <p className="font-medium text-gray-800">{user?.contactNo || 'Not provided'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                                    <FaIdCard size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Role</p>
                                    <p className="font-medium text-gray-800 capitalize">{user?.role?.replace('_', ' ')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default TeacherProfile;
