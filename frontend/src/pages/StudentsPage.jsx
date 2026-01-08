import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../api/axios';
import { FaUserGraduate, FaSearch } from 'react-icons/fa';

const StudentsPage = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const response = await api.get('/user/get-users-with-profiles?role=student');
                if (response.data.success) {
                    setStudents(response.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch students', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, []);

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.profile?.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.profile?.course?.toLowerCase().includes(searchTerm.toLowerCase())
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
                        <h1 className="text-3xl font-bold text-gray-800">Students</h1>
                        <p className="text-gray-500 mt-1">Manage all students in the system</p>
                    </div>
                    <div className="flex items-center gap-2 bg-green-100 text-green-600 px-4 py-2 rounded-xl">
                        <FaUserGraduate size={20} />
                        <span className="font-bold text-lg">{students.length}</span>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, roll number, or course..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                {/* Students Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Roll Number</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Course</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Year</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Section</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Email</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.map((student) => (
                                    <tr key={student._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <span className="font-medium text-gray-800">{student.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm font-mono">
                                                {student.profile?.rollNumber || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                                                {student.profile?.course || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                            {student.profile?.year ? `Year ${student.profile.year}` : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {student.profile?.section || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{student.email}</td>
                                    </tr>
                                ))}
                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                            {searchTerm ? 'No students found matching your search.' : 'No students found.'}
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

export default StudentsPage;
