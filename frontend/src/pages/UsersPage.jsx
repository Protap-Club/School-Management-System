import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import AddUserModal from '../components/AddUserModal';
import { useAuth } from '../features/auth';
import api from '../api/axios';
import {
    FaUserPlus, FaUsers, FaChalkboardTeacher, FaUserGraduate, FaUserShield,
    FaChevronLeft, FaChevronRight, FaFilter, FaEllipsisV, FaCheck, FaEdit,
    FaTrash, FaTimes, FaArchive, FaUndo, FaSearch, FaSort
} from 'react-icons/fa';
import UserDetailModal from '../components/users/UserDetailModal';

const ROLE_PERMISSIONS = { super_admin: ['admin', 'teacher', 'student'], admin: ['teacher', 'student'], teacher: ['student'] };
const ROLE_LABELS = {
    admin: { label: 'Admin', icon: FaUserShield, color: 'purple' },
    teacher: { label: 'Teacher', icon: FaChalkboardTeacher, color: 'indigo' },
    student: { label: 'Student', icon: FaUserGraduate, color: 'green' },
};
const SORT_OPTIONS = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role', requireMultiRole: true },
    { key: 'email', label: 'Email' },
];
const ROLE_ORDER = { super_admin: 0, admin: 1, teacher: 2, student: 3 };
const MODAL_OVERLAY = 'fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4';

const UsersPage = () => {
    const { user: currentUser } = useAuth();
    const dropdownRef = useRef(null);
    const sortMenuRef = useRef(null);

    // Data state
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ totalCount: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);

    // View / filter state
    const [selectedRole, setSelectedRole] = useState('all');
    const [pageSize, setPageSize] = useState(15);
    const [page, setPage] = useState(0);
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('default');
    const [showSortMenu, setShowSortMenu] = useState(false);

    // Selection state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);

    // Modal / dropdown state
    const [activeModal, setActiveModal] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const [editModal, setEditModal] = useState({ open: false, user: null });
    const [editName, setEditName] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, users: [], isBulk: false });
    const [message, setMessage] = useState({ type: '', text: '' });

    const allowedRoles = ROLE_PERMISSIONS[currentUser?.role] || [];
    const isAdminOrAbove = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

    const showMessage = useCallback((type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }, []);

    // Close dropdown/sort on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setActiveDropdown(null);
            if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) setShowSortMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
            if (selectedRole !== 'all') params.append('role', selectedRole);
            if (showArchived) params.append('isArchived', 'true');
            const response = await api.get(`/users?${params}`);
            if (response.data.success) {
                const result = response.data.data;
                const usersData = result?.users || [];
                setUsers(Array.isArray(usersData) ? usersData : []);
                setPagination({
                    totalCount: result?.totalCount || 0,
                    totalPages: result?.pagination?.totalPages || 0,
                });
            }
        } catch (error) { console.error('Failed to fetch users', error); setUsers([]); }
        finally { setLoading(false); }
    }, [page, pageSize, selectedRole, showArchived]);

    useEffect(() => { if (currentUser) fetchUsers(); }, [currentUser, fetchUsers]);
    useEffect(() => { if (!selectionMode) setSelectedUsers([]); }, [selectionMode]);

    const filteredUsers = useMemo(() =>
        users.filter(u =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'email') return a.email.localeCompare(b.email);
            if (sortBy === 'role') return (ROLE_ORDER[a.role] || 99) - (ROLE_ORDER[b.role] || 99);
            return 0;
        })
        , [users, searchQuery, sortBy]);

    // --- Handlers ---
    const handleRoleChange = (value) => { setSelectedRole(value); setPage(0); };
    const handlePageSizeChange = (value) => { setPageSize(parseInt(value)); setPage(0); };
    const exitSelectionMode = useCallback(() => { setSelectionMode(false); setSelectedUsers([]); }, []);

    const toggleDropdown = useCallback((userId, event) => {
        if (activeDropdown === userId) { setActiveDropdown(null); return; }
        const rect = event.currentTarget.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setDropdownPosition({
            top: spaceBelow < 140 ? rect.top - 144 : rect.bottom + 4,
            left: rect.right - 144,
        });
        setActiveDropdown(userId);
    }, [activeDropdown]);

    const handleSelectAction = (userId) => { setSelectionMode(true); setSelectedUsers([userId]); setActiveDropdown(null); };
    const toggleUserSelection = (userId) => setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    const toggleSelectAll = () => setSelectedUsers(selectedUsers.length === users.length ? [] : users.map(u => u._id));
    const handleEdit = (user) => { setEditModal({ open: true, user }); setEditName(user.name); setActiveDropdown(null); };

    const handleSaveEdit = useCallback(() => {
        if (!editModal.user || !editName.trim()) return;
        setUsers(prev => prev.map(u => u._id === editModal.user._id ? { ...u, name: editName } : u));
        setEditModal({ open: false, user: null });
        showMessage('success', 'User updated successfully');
    }, [editModal.user, editName, showMessage]);

    const handleDelete = (user) => { setDeleteConfirm({ open: true, users: [user], isBulk: false }); setActiveDropdown(null); };
    const handleBulkDelete = () => setDeleteConfirm({ open: true, users: users.filter(u => selectedUsers.includes(u._id)), isBulk: true });

    const confirmDelete = useCallback(async () => {
        try {
            const userIdsToProcess = deleteConfirm.isBulk ? selectedUsers : [deleteConfirm.users[0]._id];
            if (showArchived) await api.delete('/users', { data: { userIds: userIdsToProcess } });
            else await api.patch('/users/status', { userIds: userIdsToProcess });
            setUsers(prev => prev.filter(u => !userIdsToProcess.includes(u._id)));
            fetchUsers();
            exitSelectionMode();
            showMessage('success', showArchived ? 'User(s) deleted permanently' : 'User(s) archived successfully');
        } catch (error) {
            console.error('Delete failed', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Internal Server Error' });
        } finally { setDeleteConfirm({ open: false, users: [], isBulk: false }); }
    }, [deleteConfirm, selectedUsers, showArchived, fetchUsers, exitSelectionMode, showMessage]);

    const handleRestore = useCallback(async (userId) => {
        try {
            await api.patch('/users/status', { userIds: [userId], isArchived: false });
            setUsers(prev => prev.filter(u => u._id !== userId));
            setActiveDropdown(null);
            fetchUsers();
            showMessage('success', 'User restored successfully');
        } catch (error) {
            console.error('Restore failed', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Internal Server Error' });
        }
    }, [fetchUsers, showMessage]);

    const showingStart = (pagination?.totalCount || 0) > 0 ? page * pageSize + 1 : 0;
    const showingEnd = Math.min((page + 1) * pageSize, pagination?.totalCount || 0);

    // --- Render Helpers ---
    const getDropdownUser = () => filteredUsers.find(u => u._id === activeDropdown);

    const renderDropdownBtn = (onClick, icon, label, colorClass) => (
        <button onClick={onClick} className={`w-full text-left px-3 py-2 text-sm ${colorClass} flex items-center gap-2 transition-colors`}>
            {icon} {label}
        </button>
    );

    const renderDeleteModalText = () => {
        const { isBulk, users: confirmUsers } = deleteConfirm;
        if (showArchived) return {
            title: isBulk ? `Delete ${confirmUsers.length} users?` : 'Delete user?',
            desc: isBulk ? 'This will permanently delete selected users. This action cannot be undone.' : `This will permanently delete "${confirmUsers[0]?.name}". This cannot be undone.`,
        };
        return {
            title: isBulk ? `Archive ${confirmUsers.length} users?` : 'Archive user?',
            desc: isBulk ? 'Selected users will be moved to archive. You can restore them later.' : `"${confirmUsers[0]?.name}" will be moved to archive.`,
        };
    };

    return (
        <DashboardLayout>
            {message.text && (
                <div className={`fixed top-6 right-6 z-[100] px-5 py-3.5 rounded-lg shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${message.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-white/20">
                        {message.type === 'success' ? <FaCheck size={10} /> : <FaTimes size={10} />}
                    </div>
                    <span className="font-medium text-sm">{message.text}</span>
                    <button onClick={() => setMessage({ type: '', text: '' })} className="ml-2 p-1.5 hover:bg-white/20 rounded-md transition-colors"><FaTimes size={10} /></button>
                </div>
            )}
            <div className="space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{showArchived ? 'Archived Users' : 'Users'}</h1>
                        <p className="text-gray-500 text-sm mt-0.5">
                            {showArchived ? 'Manage archived users - restore or permanently delete' : `Manage ${allowedRoles.length > 1 ? 'all users' : allowedRoles[0] + 's'} in your organization`}
                        </p>
                    </div>
                    <div className="hidden sm:block"></div>
                </div>

                {selectionMode && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="bg-indigo-600 text-white text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center">{selectedUsers.length}</span>
                            <span className="text-indigo-700 text-sm font-medium">{selectedUsers.length === 1 ? 'user' : 'users'} selected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedUsers.length === 1 && !showArchived && (
                                <button onClick={() => { const user = users.find(u => u._id === selectedUsers[0]); if (user) handleEdit(user); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-md hover:bg-indigo-50 transition-colors text-sm font-medium">
                                    <FaEdit size={11} /> Edit
                                </button>
                            )}
                            <button onClick={handleBulkDelete} disabled={selectedUsers.length === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50">
                                {showArchived ? <FaTrash size={11} /> : <FaArchive size={11} />}
                                {showArchived ? 'Delete' : 'Archive'}
                                {selectedUsers.length > 1 && ` (${selectedUsers.length})`}
                            </button>
                            <button onClick={exitSelectionMode}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium">
                                <FaTimes size={11} /> Cancel
                            </button>
                        </div>
                    </div>
                )}

                {!selectionMode && allowedRoles.length > 0 && (
                    <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                        <div className="flex items-center gap-3 relative z-40 flex-shrink-0">
                            {allowedRoles.length > 1 && (
                                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 h-10 min-w-[140px]">
                                    <FaFilter className="text-gray-400" size={12} />
                                    <select value={selectedRole} onChange={(e) => handleRoleChange(e.target.value)} className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer w-full">
                                        <option value="all">Roles</option>
                                        {allowedRoles.map(role => <option key={role} value={role}>{ROLE_LABELS[role]?.label || role}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className={`relative z-0 ${allowedRoles.length === 1 ? 'w-full sm:w-64 sm:absolute sm:left-1/2 sm:-translate-x-1/2' : 'w-full sm:w-64 sm:mx-auto'}`}>
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400"><FaSearch size={14} /></span>
                            <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                        </div>
                        <div className="flex items-center gap-2 sm:ml-auto">
                            {isAdminOrAbove && (
                                <button onClick={() => { setShowArchived(!showArchived); setPage(0); }}
                                    className={`flex items-center justify-center gap-2 px-4 h-10 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${showArchived
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-700'}`}
                                    title={showArchived ? 'View Active Users' : 'View Archived Users'}>
                                    <FaArchive size={14} /><span className="hidden lg:inline">{showArchived ? 'Active' : 'Archive'}</span>
                                </button>
                            )}
                            {!showArchived && (
                                <div className="relative group">
                                    <button className="flex items-center justify-center gap-2 bg-gray-900 text-white px-5 h-10 rounded-lg hover:bg-gray-800 transition-all text-sm font-medium whitespace-nowrap shadow-sm hover:shadow-md">
                                        <FaUserPlus size={14} /><span className="hidden sm:inline">Add User</span><span className="sm:hidden">Add</span>
                                    </button>
                                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transform translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-20 py-1.5 overflow-hidden">
                                        {allowedRoles.map(role => {
                                            const config = ROLE_LABELS[role];
                                            const Icon = config.icon;
                                            return (
                                                <button key={role} onClick={() => setActiveModal(role)}
                                                    className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors text-sm">
                                                    <div className={`w-8 h-8 rounded-full bg-${config.color}-50 text-${config.color}-600 flex items-center justify-center`}><Icon size={14} /></div>
                                                    <span>Add {config.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="py-16 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-600 mx-auto"></div>
                            <p className="text-gray-400 text-sm mt-3">Loading users...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"><FaUsers size={20} className="text-gray-400" /></div>
                            <p className="text-gray-500 text-sm">No users found</p>
                            <p className="text-gray-400 text-xs mt-1">{showArchived ? 'No archived users' : 'Add your first user to get started'}</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            {selectionMode && (
                                                <th className="px-4 py-3 w-10">
                                                    <input type="checkbox" checked={selectedUsers.length === users.length && users.length > 0}
                                                        onChange={toggleSelectAll} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" />
                                                </th>
                                            )}
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <div className="flex items-center gap-2 relative">
                                                    <span>User</span>
                                                    <button onClick={(e) => { e.stopPropagation(); setShowSortMenu(!showSortMenu); }}
                                                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none" title="Sort Users">
                                                        <FaSort size={12} />
                                                    </button>
                                                    {showSortMenu && (
                                                        <div ref={sortMenuRef} className="absolute top-full left-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 animate-fadeIn">
                                                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 border-b border-gray-50">Sort By</div>
                                                            {SORT_OPTIONS.filter(o => !o.requireMultiRole || allowedRoles.length > 1).map(opt => (
                                                                <button key={opt.key} onClick={() => { setSortBy(opt.key); setShowSortMenu(false); }}
                                                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50 ${sortBy === opt.key ? 'text-indigo-600 font-medium' : 'text-gray-700'}`}>
                                                                    {opt.label} {sortBy === opt.key && <FaCheck size={10} />}
                                                                </button>
                                                            ))}
                                                            {sortBy !== 'default' && (
                                                                <>
                                                                    <div className="h-px bg-gray-50 my-1"></div>
                                                                    <button onClick={() => { setSortBy('default'); setShowSortMenu(false); }}
                                                                        className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50">Reset Sort</button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50" ref={dropdownRef}>
                                        {filteredUsers.length > 0 ? filteredUsers.map(u => {
                                            const roleConfig = ROLE_LABELS[u.role];
                                            const isSelected = selectedUsers.includes(u._id);
                                            return (
                                                <tr key={u._id} onClick={() => setSelectedUser(u)}
                                                    className={`group transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-gray-50/50'}`}>
                                                    {selectionMode && (
                                                        <td className="px-4 py-3">
                                                            <input type="checkbox" checked={isSelected} onChange={() => toggleUserSelection(u._id)}
                                                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" />
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-${roleConfig?.color || 'gray'}-100 text-${roleConfig?.color || 'gray'}-600`}>
                                                                {u.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">{u.name}</div>
                                                                <div className="text-xs text-gray-400 md:hidden">{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${roleConfig?.color || 'gray'}-50 text-${roleConfig?.color || 'gray'}-600 capitalize`}>{u.role}</span>
                                                    </td>
                                                    <td className="px-4 py-3 hidden md:table-cell"><span className="text-sm text-gray-500">{u.email}</span></td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                                                            {u.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {!selectionMode && (
                                                            <button onClick={(e) => toggleDropdown(u._id, e)}
                                                                className={`p-1.5 rounded-md transition-all ${activeDropdown === u._id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                                                                <FaEllipsisV size={12} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-400">No users found matching "{searchQuery}"</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {(pagination?.totalCount || 0) > 0 && (
                                <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50">
                                    <div className="text-xs text-gray-500">
                                        Showing <span className="font-medium text-gray-700">{showingStart}</span> to <span className="font-medium text-gray-700">{showingEnd}</span> of <span className="font-medium text-gray-700">{pagination?.totalCount || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                                            className="px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-md transition-colors font-medium">
                                            <FaChevronLeft size={10} />
                                        </button>
                                        {[...Array(Math.min(5, pagination?.totalPages || 0))].map((_, i) => {
                                            const totalPages = pagination?.totalPages || 0;
                                            let pageNum;
                                            if (totalPages <= 5) pageNum = i;
                                            else if (page < 3) pageNum = i;
                                            else if (page > totalPages - 4) pageNum = totalPages - 5 + i;
                                            else pageNum = page - 2 + i;
                                            if (pageNum >= totalPages) return null;
                                            return (
                                                <button key={pageNum} onClick={() => setPage(pageNum)}
                                                    className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${page === pageNum ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                                                    {pageNum + 1}
                                                </button>
                                            );
                                        })}
                                        <button onClick={() => setPage(p => Math.min((pagination?.totalPages || 1) - 1, p + 1))}
                                            disabled={page >= (pagination?.totalPages || 1) - 1}
                                            className="px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-md transition-colors font-medium">
                                            <FaChevronRight size={10} />
                                        </button>
                                    </div>
                                    <select value={pageSize} onChange={(e) => handlePageSizeChange(e.target.value)}
                                        className="px-2 py-1 border border-gray-200 rounded-md text-xs text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-gray-300">
                                        {[15, 30, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
                                    </select>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {activeDropdown && createPortal(
                <>
                    <div className="fixed inset-0 z-[99]" onClick={() => setActiveDropdown(null)} />
                    <div ref={dropdownRef} style={{ position: 'fixed', top: dropdownPosition.top, left: dropdownPosition.left }}
                        className="w-36 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-[100] animate-fadeIn">
                        {renderDropdownBtn(() => { const user = getDropdownUser(); if (user) handleSelectAction(user._id); },
                            <FaCheck size={11} className="text-gray-400" />, 'Select', 'text-gray-700 hover:bg-gray-50')}
                        {!showArchived ? (
                            <>
                                {renderDropdownBtn(() => { const user = getDropdownUser(); if (user) handleEdit(user); },
                                    <FaEdit size={11} className="text-gray-400" />, 'Edit', 'text-gray-700 hover:bg-gray-50')}
                                {isAdminOrAbove && (
                                    <>
                                        <div className="h-px bg-gray-100 my-1"></div>
                                        {renderDropdownBtn(() => { const user = getDropdownUser(); if (user) handleDelete(user); },
                                            <FaArchive size={11} />, 'Archive', 'text-red-600 hover:bg-red-50')}
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                {renderDropdownBtn(() => handleRestore(activeDropdown),
                                    <FaUndo size={11} />, 'Restore', 'text-emerald-600 hover:bg-emerald-50')}
                                {isAdminOrAbove && (
                                    <>
                                        <div className="h-px bg-gray-100 my-1"></div>
                                        {renderDropdownBtn(() => { const user = getDropdownUser(); if (user) handleDelete(user); },
                                            <FaTrash size={11} />, 'Delete', 'text-red-600 hover:bg-red-50')}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </>,
                document.body
            )}

            <AddUserModal isOpen={!!activeModal} onClose={() => setActiveModal(null)} roleToAdd={activeModal} onSuccess={() => fetchUsers()} />
            <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />

            {deleteConfirm.open && (() => {
                const { title, desc } = renderDeleteModalText();
                return (
                    <div className={MODAL_OVERLAY}>
                        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-fadeIn">
                            <div className="p-5">
                                <div className={`w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-4 ${showArchived ? 'bg-red-100' : 'bg-amber-100'}`}>
                                    {showArchived ? <FaTrash className="text-red-600" size={16} /> : <FaArchive className="text-amber-600" size={16} />}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 text-center mb-1.5">{title}</h3>
                                <p className="text-gray-500 text-sm text-center mb-5 leading-relaxed">{desc}</p>
                                <div className="flex gap-2.5">
                                    <button onClick={() => setDeleteConfirm({ open: false, users: [], isBulk: false })}
                                        className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">Cancel</button>
                                    <button onClick={confirmDelete}
                                        className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium text-white ${showArchived ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                                        {showArchived ? 'Delete' : 'Archive'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {editModal.open && (
                <div className={MODAL_OVERLAY}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
                            <button onClick={() => setEditModal({ open: false, user: null })} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600"><FaTimes size={12} /></button>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">{editModal.user?.name?.charAt(0).toUpperCase()}</div>
                                <div>
                                    <div className="font-medium text-gray-900">{editModal.user?.name}</div>
                                    <div className="text-xs text-gray-400">{editModal.user?.email}</div>
                                </div>
                            </div>
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm" placeholder="Enter user name" />
                            </div>
                            <div className="flex gap-2.5">
                                <button onClick={() => setEditModal({ open: false, user: null })}
                                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">Cancel</button>
                                <button onClick={handleSaveEdit}
                                    className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default UsersPage;
