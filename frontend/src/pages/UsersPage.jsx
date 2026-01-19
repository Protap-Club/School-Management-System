import React, { useState, useEffect, useRef } from 'react';
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
    FaFilter,
    FaEllipsisV,
    FaCheck,
    FaEdit,
    FaTrash,
    FaTimes,
    FaArchive,
    FaUndo
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

    // Filters & Pagination
    const [selectedRole, setSelectedRole] = useState('all');
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(0);

    // Data
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ totalCount: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);

    // Selection Mode State
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const dropdownRef = useRef(null);

    // Edit Modal State
    const [editModal, setEditModal] = useState({ open: false, user: null });

    // Delete Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, users: [], isBulk: false });

    // Archive View State
    const [showArchived, setShowArchived] = useState(false);

    // Get allowed roles for current user
    const allowedRoles = ROLE_PERMISSIONS[currentUser?.role] || [];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch users with filters and pagination
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                role: selectedRole,
                page: page.toString(),
                pageSize: pageSize.toString()
            });

            const endpoint = showArchived ? '/user/archived' : '/user/get-users';
            const response = await api.get(`${endpoint}?${params}`);
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
    }, [selectedRole, page, pageSize, currentUser, showArchived]);

    // Reset selection when exiting selection mode
    useEffect(() => {
        if (!selectionMode) {
            setSelectedUsers([]);
        }
    }, [selectionMode]);

    // Handlers
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

    // Toggle dropdown for a specific user
    const toggleDropdown = (userId) => {
        setActiveDropdown(activeDropdown === userId ? null : userId);
    };

    // Enter selection mode
    const handleSelectAction = (userId) => {
        setSelectionMode(true);
        setSelectedUsers([userId]);
        setActiveDropdown(null);
    };

    // Toggle single user selection
    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    // Select all / deselect all
    const toggleSelectAll = () => {
        if (selectedUsers.length === users.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(users.map(u => u._id));
        }
    };

    // Exit selection mode
    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedUsers([]);
    };

    // Single Edit
    const handleEdit = (user) => {
        setEditModal({ open: true, user });
        setActiveDropdown(null);
    };

    // Single Delete
    const handleDelete = (user) => {
        setDeleteConfirm({ open: true, users: [user], isBulk: false });
        setActiveDropdown(null);
    };

    // Bulk Delete
    const handleBulkDelete = () => {
        const usersToDelete = users.filter(u => selectedUsers.includes(u._id));
        setDeleteConfirm({ open: true, users: usersToDelete, isBulk: true });
    };

    // Confirm Delete (Archive or Hard Delete)
    const confirmDelete = async () => {
        try {
            if (showArchived) {
                // Hard Delete
                if (deleteConfirm.isBulk) {
                    await api.delete('/user/delete-bulk', { data: { userIds: selectedUsers } });
                } else {
                    await api.delete(`/user/delete/${deleteConfirm.users[0]._id}`);
                }
            } else {
                // Soft Delete (Archive)
                if (deleteConfirm.isBulk) {
                    await api.put('/user/archive-bulk', { userIds: selectedUsers });
                } else {
                    await api.put(`/user/archive/${deleteConfirm.users[0]._id}`);
                }
            }
            // Optimistic update
            if (deleteConfirm.isBulk) {
                setUsers(prev => prev.filter(u => !selectedUsers.includes(u._id)));
            } else {
                setUsers(prev => prev.filter(u => u._id !== deleteConfirm.users[0]._id));
            }

            fetchUsers();
            exitSelectionMode();
            setMessage({ type: 'success', text: showArchived ? 'User(s) deleted permanently' : 'User(s) archived successfully' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Delete failed', error);
            setMessage({ type: 'error', text: 'Operation failed' });
        } finally {
            setDeleteConfirm({ open: false, users: [], isBulk: false });
        }
    };

    // Restore User
    const handleRestore = async (userId) => {
        try {
            await api.put(`/user/restore/${userId}`);
            setMessage({ type: 'success', text: 'User restored successfully' });
            // Optimistic update
            setUsers(prev => prev.filter(u => u._id !== userId));
            setActiveDropdown(null);

            fetchUsers();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Restore failed', error);
            setMessage({ type: 'error', text: 'Restore failed' });
        }
    };

    // Calculate showing range
    const showingStart = pagination.totalCount > 0 ? page * pageSize + 1 : 0;
    const showingEnd = Math.min((page + 1) * pageSize, pagination.totalCount);

    // Check if multiple selected
    const isMultipleSelected = selectedUsers.length > 1;

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
                    {allowedRoles.length > 0 && !selectionMode && (
                        <div className="relative group">
                            <button className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all font-medium">
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

                {/* Selection Mode Bulk Action Bar */}
                {selectionMode && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="bg-indigo-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                                {selectedUsers.length}
                            </span>
                            <span className="text-indigo-700 font-medium">
                                {selectedUsers.length === 1 ? 'user selected' : 'users selected'}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Edit - Only show for single selection */}
                            {selectedUsers.length === 1 && (
                                <button
                                    onClick={() => {
                                        const user = users.find(u => u._id === selectedUsers[0]);
                                        if (user) handleEdit(user);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                                >
                                    <FaEdit size={14} />
                                    Edit
                                </button>
                            )}

                            {/* Delete - Available for single or multiple */}
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedUsers.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                            >
                                <FaTrash size={14} />
                                {showArchived ? 'Delete Forever' : 'Delete'} {isMultipleSelected ? `(${selectedUsers.length})` : ''}
                            </button>

                            {/* Cancel Selection Mode */}
                            <button
                                onClick={exitSelectionMode}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                                <FaTimes size={14} />
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Filters Bar */}
                {!selectionMode && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Teacher Filter - Fixed to Student */}
                            {currentUser?.role === 'teacher' && (
                                <div className="flex items-center gap-2">
                                    <FaFilter className="text-gray-400" />
                                    <select
                                        disabled
                                        className="px-4 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50 text-gray-500 cursor-not-allowed"
                                    >
                                        <option>Student</option>
                                    </select>
                                </div>
                            )}

                            {/* Role Filter - only show if multiple roles allowed */}
                            {allowedRoles.length > 1 && (
                                <div className="flex items-center gap-2">
                                    <FaFilter className="text-gray-400" />
                                    <select
                                        value={selectedRole}
                                        onChange={(e) => handleRoleChange(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
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

                            {/* Archive Toggle - Only for Admin and Super Admin */}
                            {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && (
                                <button
                                    onClick={() => {
                                        setShowArchived(!showArchived);
                                        setPage(0);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${showArchived
                                        ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                        : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                                        }`}
                                >
                                    <FaArchive size={14} />
                                    {showArchived ? 'Viewing Archived' : 'View Archive'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <FaUsers className="text-primary" />
                            <h2 className="text-lg font-bold text-gray-800">User List</h2>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
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
                                            {/* Select All Checkbox - Only in selection mode */}
                                            {selectionMode && (
                                                <th className="px-5 py-3 w-12">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUsers.length === users.length && users.length > 0}
                                                        onChange={toggleSelectAll}
                                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </th>
                                            )}
                                            <th className="px-5 py-3 text-sm font-semibold text-gray-600">Name</th>
                                            <th className="px-5 py-3 text-sm font-semibold text-gray-600">Role</th>
                                            <th className="px-5 py-3 text-sm font-semibold text-gray-600">Email</th>
                                            <th className="px-5 py-3 text-sm font-semibold text-gray-600">Status</th>
                                            <th className="px-5 py-3 text-sm font-semibold text-gray-600 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100" ref={dropdownRef}>
                                        {users.map((u, index) => {
                                            const roleConfig = ROLE_LABELS[u.role];
                                            const isSelected = selectedUsers.includes(u._id);
                                            return (
                                                <tr
                                                    key={u._id}
                                                    className={`hover:bg-gray-50/50 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                                                >
                                                    {/* Row Checkbox - Only in selection mode */}
                                                    {selectionMode && (
                                                        <td className="px-5 py-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleUserSelection(u._id)}
                                                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                        </td>
                                                    )}
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

                                                    {/* Kebab Menu - Hidden in selection mode */}
                                                    <td className="px-5 py-4">
                                                        {!selectionMode && (
                                                            <div className="relative">
                                                                <button
                                                                    onClick={() => toggleDropdown(u._id)}
                                                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
                                                                >
                                                                    <FaEllipsisV size={14} />
                                                                </button>

                                                                {/* Dropdown Menu */}
                                                                {activeDropdown === u._id && (
                                                                    <div className={`absolute right-0 ${users.length > 2 && index >= users.length - 2 ? 'bottom-full mb-1' : 'top-full mt-1'} w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fadeIn`}>
                                                                        <button
                                                                            onClick={() => handleSelectAction(u._id)}
                                                                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 flex items-center gap-2 transition-colors text-sm"
                                                                        >
                                                                            <FaCheck size={12} className="text-indigo-500" />
                                                                            Select
                                                                        </button>

                                                                        {!showArchived ? (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handleEdit(u)}
                                                                                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 flex items-center gap-2 transition-colors text-sm"
                                                                                >
                                                                                    <FaEdit size={12} className="text-blue-500" />
                                                                                    Edit
                                                                                </button>
                                                                                {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && (
                                                                                    <button
                                                                                        onClick={() => handleDelete(u)}
                                                                                        className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors text-sm"
                                                                                    >
                                                                                        <FaArchive size={12} />
                                                                                        Archive
                                                                                    </button>
                                                                                )}
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handleRestore(u._id)}
                                                                                    className="w-full text-left px-4 py-2.5 hover:bg-green-50 text-green-600 flex items-center gap-2 transition-colors text-sm"
                                                                                >
                                                                                    <FaUndo size={12} />
                                                                                    Restore
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDelete(u)}
                                                                                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors text-sm"
                                                                                >
                                                                                    <FaTrash size={12} />
                                                                                    Delete Forever
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="p-4 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="text-gray-600">
                                        Showing {showingStart}-{showingEnd} of {pagination.totalCount}
                                    </div>

                                    {/* Page Size */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">Show:</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => handlePageSizeChange(e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white text-sm"
                                        >
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                            <option value="75">75</option>
                                            <option value="100">100</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(0, p - 1))}
                                            disabled={page === 0}
                                            className="px-3 py-1 text-gray-600 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                        >
                                            Previous
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {[...Array(pagination.totalPages)].map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setPage(idx)}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${page === idx
                                                        ? 'bg-primary text-white shadow-sm'
                                                        : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                                                        }`}
                                                >
                                                    {idx + 1}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => setPage(p => Math.min(pagination.totalPages - 1, p + 1))}
                                            disabled={page >= pagination.totalPages - 1}
                                            className="px-3 py-1 text-gray-600 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                        >
                                            Next
                                        </button>
                                    </div>
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

            {/* Delete Confirmation Modal */}
            {deleteConfirm.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-fadeIn">
                        <div className="p-6">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaTrash className="text-red-600" size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
                                {showArchived
                                    ? (deleteConfirm.isBulk ? `Permanently Delete ${deleteConfirm.users.length} Users?` : 'Permanently Delete User?')
                                    : (deleteConfirm.isBulk ? `Archive ${deleteConfirm.users.length} Users?` : 'Archive User?')}
                            </h3>
                            <p className="text-gray-500 text-center mb-6">
                                {showArchived
                                    ? (deleteConfirm.isBulk
                                        ? `Are you sure you want to permanently delete ${deleteConfirm.users.length} selected users? This action CANNOT be undone.`
                                        : `Are you sure you want to permanently delete "${deleteConfirm.users[0]?.name}"? This action CANNOT be undone.`)
                                    : (deleteConfirm.isBulk
                                        ? `Are you sure you want to archive ${deleteConfirm.users.length} selected users? They can be restored later.`
                                        : `Are you sure you want to archive "${deleteConfirm.users[0]?.name}"? This user can be restored later.`)}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm({ open: false, users: [], isBulk: false })}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                                >
                                    {showArchived ? 'Delete Forever' : 'Archive'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal Placeholder - You can implement full edit functionality */}
            {editModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-fadeIn">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-800">Edit User</h3>
                                <button
                                    onClick={() => setEditModal({ open: false, user: null })}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                            <p className="text-gray-500 mb-6">
                                Editing: <strong>{editModal.user?.name}</strong>
                            </p>
                            <p className="text-sm text-gray-400 italic mb-4">
                                Edit form fields can be added here based on your requirements.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setEditModal({ open: false, user: null })}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        // Save logic here
                                        setEditModal({ open: false, user: null });
                                        exitSelectionMode();
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-medium"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default UsersPage;
