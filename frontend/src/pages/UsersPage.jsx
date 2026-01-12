import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import AddUserModal from '../components/AddUserModal';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    FaUserPlus,
    FaUsers,
    FaChalkboardTeacher,
    FaUserGraduate,
    FaUserShield,
    FaChevronLeft,
    FaChevronRight,
    FaFilter
} from 'react-icons/fa';

// Role hierarchy - what each role can view/create
const ROLE_PERMISSIONS = {
    super_admin: ['admin', 'teacher', 'student'],
    admin: ['teacher', 'student'],
    teacher: ['student']
};

const ROLE_LABELS = {
    admin: { label: 'Admin', icon: FaUserShield, color: 'purple' },
    teacher: { label: 'Teacher', icon: FaChalkboardTeacher, color: 'indigo' },
    student: { label: 'Student', icon: FaUserGraduate, color: 'green' }
};

const UsersPage = () => {
    const { user: currentUser } = useAuth();
    const [activeModal, setActiveModal] = useState(null);

    // Filters
    const [selectedRole, setSelectedRole] = useState('all');
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(0);

    // Data
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ totalCount: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);

    // Get allowed roles for current user
    const allowedRoles = ROLE_PERMISSIONS[currentUser?.role] || [];

    // Fetch users with filters and pagination
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
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
        if (currentUser) {
            fetchUsers();
        }
    }, [selectedRole, page, pageSize, currentUser]);

    // Reset page when filter changes
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
    };

    // Get role color classes
    const getRoleColorClasses = (role) => {
        const config = ROLE_LABELS[role];
        if (!config) return 'bg-gray-100 text-gray-600';
        return `bg-${config.color}-100 text-${config.color}-600`;
    };

    // Calculate showing range
    const showingStart = pagination.totalCount > 0 ? page * pageSize + 1 : 0;
    const showingEnd = Math.min((page + 1) * pageSize, pagination.totalCount);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Users</h1>
                        <p className="text-gray-500 mt-1">
                            Manage {allowedRoles.length > 1 ? 'users' : allowedRoles[0] + 's'} in your organization
                        </p>
                    </div>

                    {/* Add User Button/Dropdown */}
                    {allowedRoles.length > 0 && (
                        <div className="relative group">
                            <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 hover:from-blue-700 hover:to-indigo-700 transition-all font-medium">
                                <FaUserPlus />
                                <span>Add User</span>
                            </button>

                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 z-10 overflow-hidden">
                                {allowedRoles.map((role) => {
                                    const config = ROLE_LABELS[role];
                                    const Icon = config.icon;
                                    return (
                                        <button
                                            key={role}
                                            onClick={() => setActiveModal(role)}
                                            className={`w-full text-left px-4 py-3 hover:bg-${config.color}-50 text-gray-700 hover:text-${config.color}-600 flex items-center gap-2 transition-colors`}
                                        >
                                            <Icon /> Add {config.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Filters Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Role Filter - only show if multiple roles allowed */}
                        {allowedRoles.length > 1 && (
                            <div className="flex items-center gap-2">
                                <FaFilter className="text-gray-400" />
                                <select
                                    value={selectedRole}
                                    onChange={(e) => handleRoleChange(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                >
                                    <option value="all">All Roles</option>
                                    {allowedRoles.map((role) => (
                                        <option key={role} value={role}>
                                            {ROLE_LABELS[role]?.label || role}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Page Size */}
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-sm text-gray-500">Show:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => handlePageSizeChange(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
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
                        <div className="flex items-center gap-3">
                            <FaUsers className="text-blue-600" />
                            <h2 className="text-lg font-bold text-gray-800">User List</h2>
                        </div>
                        {pagination.totalCount > 0 && (
                            <span className="text-sm text-gray-500">
                                Showing {showingStart}-{showingEnd} of {pagination.totalCount}
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-500 mt-4">Loading users...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <FaUsers size={40} className="mx-auto mb-4 text-gray-300" />
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
                                        {users.map((u) => {
                                            const roleConfig = ROLE_LABELS[u.role];
                                            return (
                                                <tr key={u._id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm bg-${roleConfig?.color || 'gray'}-100 text-${roleConfig?.color || 'gray'}-600`}>
                                                                {u.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="font-medium text-gray-800">{u.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize bg-${roleConfig?.color || 'gray'}-100 text-${roleConfig?.color || 'gray'}-600`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm text-gray-600">{u.email}</td>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 text-xs ${u.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                                            <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                            {u.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="p-4 border-t border-gray-100 flex justify-between items-center">
                                    <button
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <FaChevronLeft size={12} /> Previous
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">
                                            Page {page + 1} of {pagination.totalPages}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setPage(p => Math.min(pagination.totalPages - 1, p + 1))}
                                        disabled={page >= pagination.totalPages - 1}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        </DashboardLayout>
    );
};

export default UsersPage;
