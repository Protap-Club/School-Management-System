import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import AddUserModal from '../components/AddUserModal';
import api from '../api/axios';
import { FaUserPlus, FaUserGraduate } from 'react-icons/fa';

const TeacherDashboard = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/user/get-users');
            if (response.data.success) {
                // Filter mainly for students as teacher dashboard usually focuses on them
                const studentList = response.data.data.filter(user => user.role === 'student');
                setStudents(studentList);
            }
        } catch (error) {
            console.error('Failed to fetch students', error);
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
                        <p className="text-gray-500 mt-1">Manage your students and classes</p>
                    </div>

                    {/* Add Button - Only adds Student */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all font-medium"
                    >
                        <FaUserPlus />
                        <span>Add Student</span>
                    </button>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-r from-primary to-primary-hover p-6 rounded-2xl text-white shadow-lg shadow-primary/20">
                        <h3 className="text-lg font-medium opacity-90">Total Students</h3>
                        <p className="text-4xl font-bold mt-2">{students.length}</p>
                    </div>
                    {/* Placeholder for another stat */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-gray-500 font-medium">Pending Approvals</h3>
                        <p className="text-4xl font-bold text-gray-800 mt-2">0</p>
                    </div>
                </div>

                {/* Student List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">My Students</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Roll No</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Course</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Email</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {students.map((u) => (
                                    <tr key={u._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">
                                                    {u.name.charAt(0)}
                                                </div>
                                                <span className="font-medium text-gray-800">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">N/A</td> {/* Backend doesn't send profile details in this list yet, only User model data */}
                                        <td className="px-6 py-4 text-sm text-gray-600">N/A</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                                    </tr>
                                ))}
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                            No students found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <AddUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                roleToAdd="student"
                onSuccess={fetchUsers}
            />
        </DashboardLayout>
    );
};

export default TeacherDashboard;
