import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../api/axios';
import { FaChalkboardTeacher, FaSearch } from 'react-icons/fa';

const TeachersPage = () => {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const response = await api.get('/user/get-users-with-profiles?role=teacher');
                if (response.data.success) {
                    setTeachers(response.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch teachers', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTeachers();
    }, []);

    const filteredTeachers = teachers.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.profile?.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Teachers</h1>
                        <p className="text-gray-500 mt-1">Manage all teachers in the system</p>
                    </div>
                    <div className="flex items-center gap-2 bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl">
                        <FaChalkboardTeacher size={20} />
                        <span className="font-bold text-lg">{teachers.length}</span>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or department..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                {/* Teachers Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Email</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Department</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Designation</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Employee ID</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredTeachers.map((teacher) => (
                                    <tr key={teacher._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                                    {teacher.name.charAt(0)}
                                                </div>
                                                <span className="font-medium text-gray-800">{teacher.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{teacher.email}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                                                {teacher.profile?.department || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{teacher.profile?.designation || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">{teacher.profile?.employeeId || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${teacher.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${teacher.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                {teacher.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredTeachers.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                            {searchTerm ? 'No teachers found matching your search.' : 'No teachers found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default TeachersPage;
