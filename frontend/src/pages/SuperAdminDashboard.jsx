import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import AddUserModal from '../components/AddUserModal';
import AddInstituteModal from '../components/AddInstituteModal';
import api from '../api/axios';
import { FaUserPlus, FaBuilding, FaChalkboardTeacher, FaUserGraduate, FaUserShield, FaChevronLeft, FaChevronRight, FaPlus } from 'react-icons/fa';

const SuperAdminDashboard = () => {
    const [activeModal, setActiveModal] = useState(null);
    const [showInstituteModal, setShowInstituteModal] = useState(false);

    // Institutes for dropdown
    const [institutes, setInstitutes] = useState([]);

    // Filters
    const [selectedInstitute, setSelectedInstitute] = useState('');
    const [selectedRole, setSelectedRole] = useState('all');
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(0);

    // Users data
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ totalCount: 0, totalPages: 0 });
    const [loading, setLoading] = useState(false);

    // Fetch institutes for dropdown
    const fetchInstitutes = async () => {
        try {
            const response = await api.get('/institute/list');
            if (response.data.success) {
                setInstitutes(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch institutes', error);
        }
    };

    // Fetch users with filters and pagination
    const fetchUsers = async () => {
        if (!selectedInstitute) {
            setUsers([]);
            setPagination({ totalCount: 0, totalPages: 0 });
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({
                instituteId: selectedInstitute,
                role: selectedRole,
                page: page.toString(),
                pageSize: pageSize.toString()
            });

            const response = await api.get(`/user/get-users?${params}`);
            if (response.data.success) {
                setUsers(response.data.data);
                setPagination(response.data.pagination);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstitutes();
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [selectedInstitute, selectedRole, page, pageSize]);

    // Reset page when filters change
    const handleInstituteChange = (value) => {
        setSelectedInstitute(value);
        setPage(0);
    };

    const handleRoleChange = (value) => {
        setSelectedRole(value);
        setPage(0);
    };

    const handlePageSizeChange = (value) => {
        setPageSize(parseInt(value));
        setPage(0);
    };

    const handleUserCreated = () => {
        fetchUsers();
        fetchInstitutes();
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Super Admin Dashboard</h1>
                        <p className="text-gray-500 mt-1">Full system administration control</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowInstituteModal(true)}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-purple-600/30 transition-all font-medium"
                        >
                            <FaBuilding />
                            <span>Add Institute</span>
                        </button>

                        {/* Add User Dropdown */}
                        <div className="relative group">
                            <button className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all font-medium">
                                <FaUserPlus />
                                <span>Add User</span>
                            </button>

                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 z-10 overflow-hidden">
                                <button
                                    onClick={() => setActiveModal('admin')}
                                    className="w-full text-left px-4 py-3 hover:bg-purple-50 text-gray-700 hover:text-purple-600 flex items-center gap-2 transition-colors"
                                >
                                    <FaUserShield /> Add Admin
                                </button>
                                <button
                                    onClick={() => setActiveModal('teacher')}
                                    className="w-full text-left px-4 py-3 hover:bg-primary/5 text-gray-700 hover:text-primary flex items-center gap-2 transition-colors"
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
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                                <FaBuilding size={20} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">{institutes.length}</h3>
                                <p className="text-sm text-gray-500">Institutes</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Institute Selector */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Institute *</label>
                            <select
                                value={selectedInstitute}
                                onChange={(e) => handleInstituteChange(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            >
                                <option value="">-- Select Institute --</option>
                                {institutes.map(inst => (
                                    <option key={inst._id} value={inst._id}>
                                        {inst.name} ({inst.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* User Type Filter */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">User Type</label>
                            <select
                                value={selectedRole}
                                onChange={(e) => handleRoleChange(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            >
                                <option value="all">All</option>
                                <option value="admin">Admin</option>
                                <option value="teacher">Teacher</option>
                                <option value="student">Student</option>
                            </select>
                        </div>

                        {/* Page Size */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Page Size</label>
                            <select
                                value={pageSize}
                                onChange={(e) => handlePageSizeChange(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            >
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="75">75</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">Users</h2>
                        {pagination.totalCount > 0 && (
                            <span className="text-sm text-gray-500">
                                Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, pagination.totalCount)} of {pagination.totalCount}
                            </span>
                        )}
                    </div>

                    {!selectedInstitute ? (
                        <div className="p-12 text-center text-gray-500">
                            <FaBuilding size={40} className="mx-auto mb-4 text-gray-300" />
                            <p>Please select an institute to view users</p>
                        </div>
                    ) : loading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <p>No users found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-5 py-3 text-sm font-semibold text-gray-600">Name</th>
                                            <th className="px-5 py-3 text-sm font-semibold text-gray-600">Role</th>
                                            <th className="px-5 py-3 text-sm font-semibold text-gray-600">Email</th>
                                            <th className="px-5 py-3 text-sm font-semibold text-gray-600">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {users.map((u) => (
                                            <tr key={u._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-5 py-3">
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
                                                <td className="px-5 py-3">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                                                        u.role === 'teacher' ? 'bg-indigo-100 text-indigo-600' :
                                                            'bg-green-100 text-green-600'
                                                        }`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-gray-600">{u.email}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 text-xs ${u.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                                        <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                        {u.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="p-4 border-t border-gray-100 flex justify-between items-center">
                                    <button
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FaChevronLeft size={12} /> Previous
                                    </button>
                                    <span className="text-sm text-gray-600">
                                        Page {page + 1} of {pagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(pagination.totalPages - 1, p + 1))}
                                        disabled={page >= pagination.totalPages - 1}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next <FaChevronRight size={12} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Add User Modal */}
            <AddUserModal
                isOpen={!!activeModal}
                onClose={() => setActiveModal(null)}
                roleToAdd={activeModal}
                onSuccess={handleUserCreated}
            />

            {/* Add Institute Modal */}
            {showInstituteModal && (
                <AddInstituteModal
                    onClose={() => setShowInstituteModal(false)}
                    onSuccess={() => {
                        fetchInstitutes();
                        setShowInstituteModal(false);
                    }}
                />
            )}
        </DashboardLayout>
    );
};

export default SuperAdminDashboard;
