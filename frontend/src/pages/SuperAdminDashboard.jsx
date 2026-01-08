import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import AddUserModal from '../components/AddUserModal';
import api from '../api/axios';
import { FaUserPlus, FaUsers, FaChalkboardTeacher, FaUserGraduate, FaUserShield } from 'react-icons/fa';

const SuperAdminDashboard = () => {
    const [activeModal, setActiveModal] = useState(null); // 'admin' | 'teacher' | 'student' | null
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/user/get-users');
            if (response.data.success) {
                setUsers(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        teachers: users.filter(u => u.role === 'teacher').length,
        students: users.filter(u => u.role === 'student').length
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 relative">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Super Admin Dashboard</h1>
                        <p className="text-gray-500 mt-1">Full system administration control</p>
                    </div>

                    {/* Add Button with Hover Menu */}
                    <div className="relative group">
                        <button className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-purple-600/30 hover:from-purple-700 hover:to-blue-700 transition-all font-medium">
                            <FaUserPlus />
                            <span>Add New</span>
                        </button>

                        {/* Dropdown Menu */}
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 z-10 overflow-hidden">
                            <button
                                onClick={() => setActiveModal('admin')}
                                className="w-full text-left px-4 py-3 hover:bg-purple-50 text-gray-700 hover:text-purple-600 flex items-center gap-2 transition-colors"
                            >
                                <FaUserShield /> Add Admin
                            </button>
                            <button
                                onClick={() => setActiveModal('teacher')}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 hover:text-blue-600 flex items-center gap-2 transition-colors"
                            >
                                <FaChalkboardTeacher /> Add Teacher
                            </button>
                            <button
                                onClick={() => setActiveModal('student')}
                                className="w-full text-left px-4 py-3 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                            >
                                <FaUserGraduate /> Add Student
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                <FaUsers size={24} />
                            </div>
                            <span className="text-xs font-semibold bg-green-100 text-green-600 px-2 py-1 rounded-full">Active</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
                        <p className="text-sm text-gray-500">Total Users</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                                <FaUserShield size={24} />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.admins}</h3>
                        <p className="text-sm text-gray-500">Admins</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                                <FaChalkboardTeacher size={24} />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.teachers}</h3>
                        <p className="text-sm text-gray-500">Teachers</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                                <FaUserGraduate size={24} />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.students}</h3>
                        <p className="text-sm text-gray-500">Students</p>
                    </div>
                </div>

                {/* Recent Users Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800">All Users</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Role</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Email</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.slice(0, 10).map((u) => (
                                    <tr key={u._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                                                        u.role === 'teacher' ? 'bg-indigo-100 text-indigo-600' :
                                                            'bg-green-100 text-green-600'
                                                    }`}>
                                                    {u.name.charAt(0)}
                                                </div>
                                                <span className="font-medium text-gray-800">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize 
                                                ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                                                    u.role === 'teacher' ? 'bg-indigo-100 text-indigo-600' :
                                                        'bg-green-100 text-green-600'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex w-2 h-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                            No users found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <AddUserModal
                isOpen={!!activeModal}
                onClose={() => setActiveModal(null)}
                roleToAdd={activeModal}
                onSuccess={fetchUsers}
            />
        </DashboardLayout>
    );
};

export default SuperAdminDashboard;
