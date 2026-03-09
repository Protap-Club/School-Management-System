import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import AddUserModal from './components/AddUserModal';
import UserDetailModal from './components/UserDetailModal';
import { UserFilters } from './components/UserFilters';
import { BulkActionsBar } from './components/BulkActionsBar';
import { UsersTable } from './components/UsersTable';
import { useAuth } from '../auth';
import { FaUserShield, FaChalkboardTeacher, FaUserGraduate, FaCheck, FaTimes, FaEdit, FaArchive, FaUndo, FaEye } from 'react-icons/fa';
import {
    useUsers,
    useArchivedUsers,
    useToggleUsersStatus,
} from './api/queries';

const ROLE_PERMISSIONS = { super_admin: ['admin', 'teacher', 'student'], admin: ['teacher', 'student'], teacher: ['student'] };
const ROLE_LABELS = {
    admin: {
        label: 'Admin',
        icon: FaUserShield,
        menuIconClass: 'bg-violet-50 text-violet-600',
        avatarClass: 'bg-violet-100 text-violet-700',
        badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    },
    teacher: {
        label: 'Teacher',
        icon: FaChalkboardTeacher,
        menuIconClass: 'bg-indigo-50 text-indigo-600',
        avatarClass: 'bg-indigo-100 text-indigo-700',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    student: {
        label: 'Student',
        icon: FaUserGraduate,
        menuIconClass: 'bg-emerald-50 text-emerald-600',
        avatarClass: 'bg-emerald-100 text-emerald-700',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
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

    // View state
    const [selectedRole, setSelectedRole] = useState('all');
    const pageSize = 25;
    const [page, setPage] = useState(0);
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('default');
    const [showSortMenu, setShowSortMenu] = useState(false);

    // Selection state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);

    // Modals
    const [activeModal, setActiveModal] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalMode, setModalMode] = useState('view');
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, users: [], isBulk: false });
    const [message, setMessage] = useState({ type: '', text: '' });

    const allowedRoles = ROLE_PERMISSIONS[currentUser?.role] || [];
    const isAdminOrAbove = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

    // Queries
    const queryParams = { role: selectedRole, page, pageSize };
    const { data: usersData, isLoading: usersLoading } = useUsers(queryParams);
    const { data: archivedData, isLoading: archivedLoading } = useArchivedUsers(queryParams);

    const toggleStatusMutation = useToggleUsersStatus();
    const currentData = showArchived ? archivedData?.data : usersData?.data;
    const loading = showArchived ? archivedLoading : usersLoading;
    const usersList = useMemo(() => (Array.isArray(currentData?.users) ? currentData.users : []), [currentData]);

    const showMessage = useCallback((type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }, []);

    // Dropdown close logic
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Only handle sort menu here, activeDropdown portal has its own backdrop
            if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) setShowSortMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter, Sort Logic
    const filteredUsers = useMemo(() => {
        if (!usersList) return [];
        return usersList.filter(u =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'email') return a.email.localeCompare(b.email);
            if (sortBy === 'role') return (ROLE_ORDER[a.role] || 99) - (ROLE_ORDER[b.role] || 99);
            return 0;
        });
    }, [usersList, searchQuery, sortBy]);

    useEffect(() => { if (!selectionMode) setSelectedUsers([]); }, [selectionMode]);

    // Handlers
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
    const toggleSelectAll = () => setSelectedUsers(selectedUsers.length === filteredUsers.length ? [] : filteredUsers.map(u => u._id));

    const handleDeleteClick = (user) => { setDeleteConfirm({ open: true, users: [user], isBulk: false }); setActiveDropdown(null); };
    const handleBulkDeleteClick = () => setDeleteConfirm({ open: true, users: filteredUsers.filter(u => selectedUsers.includes(u._id)), isBulk: true });

    const confirmDelete = async () => {
        try {
            const userIdsToProcess = deleteConfirm.isBulk ? selectedUsers : [deleteConfirm.users[0]._id];
            await toggleStatusMutation.mutateAsync({ userIds: userIdsToProcess, isArchived: !showArchived });
            showMessage('success', showArchived ? 'User(s) restored successfully' : 'User(s) archived successfully');
            exitSelectionMode();
        } catch (error) {
            console.error('Delete failed', error);
            showMessage('error', error.response?.data?.message || 'Operation failed');
        } finally {
            setDeleteConfirm({ open: false, users: [], isBulk: false });
        }
    };

    const handleRestore = async (userId) => {
        try {
            await toggleStatusMutation.mutateAsync({ userIds: [userId], isArchived: false });
            setActiveDropdown(null);
            showMessage('success', 'User restored successfully');
        } catch (error) {
            console.error('Restore failed', error);
            showMessage('error', error.response?.data?.message || 'Operation failed');
        }
    };

    const renderDropdownBtn = (onClick, icon, label, colorClass) => (
        <button onClick={onClick} className={`w-full text-left px-3 py-2 text-sm ${colorClass} flex items-center gap-2 transition-colors`}>
            {icon} {label}
        </button>
    );

    const getDropdownUser = () => filteredUsers.find(u => String(u._id) === String(activeDropdown));

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
                </div>

                {selectionMode ? (
                    <BulkActionsBar
                        selectedCount={selectedUsers.length}
                        showArchived={showArchived}
                        canArchive={isAdminOrAbove}
                        onEdit={() => {
                            const user = filteredUsers.find(u => selectedUsers.includes(u._id));
                            if (user) {
                                setModalMode('edit');
                                setSelectedUser(user);
                            }
                        }}
                        onDelete={handleBulkDeleteClick}
                        onCancel={exitSelectionMode}
                    />
                ) : (
                    <UserFilters
                        allowedRoles={allowedRoles}
                        roleLabels={ROLE_LABELS}
                        selectedRole={selectedRole}
                        onRoleChange={(v) => { setSelectedRole(v); setPage(0); }}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        showArchived={showArchived}
                        onToggleArchived={() => { setShowArchived(!showArchived); setPage(0); }}
                        isAdminOrAbove={isAdminOrAbove}
                        onAddUserSelect={setActiveModal}
                    />
                )}

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" ref={dropdownRef}>
                    <UsersTable
                        users={filteredUsers}
                        loading={loading}
                        showArchived={showArchived}
                        selectionMode={selectionMode}
                        selectedUsers={selectedUsers}
                        onToggleSelectAll={toggleSelectAll}
                        onToggleUserSelection={toggleUserSelection}
                        onSortClick={() => setShowSortMenu(!showSortMenu)}
                        showSortMenu={showSortMenu}
                        sortMenuRef={sortMenuRef}
                        sortBy={sortBy}
                        onSortChange={(val) => { setSortBy(val); setShowSortMenu(false); }}
                        sortOptions={SORT_OPTIONS}
                        allowedRoles={allowedRoles}
                        activeDropdown={activeDropdown}
                        onToggleDropdown={toggleDropdown}
                        onRowClick={(u) => { setModalMode('view'); setSelectedUser(u); }}
                        roleLabels={ROLE_LABELS}
                        currentPage={page}
                        totalItems={currentData?.totalCount || filteredUsers.length}
                        onPageChange={setPage}
                    />
                </div>
            </div>

            {/* Dropdown Portals */}
            {activeDropdown && createPortal(
                <>
                    <div className="fixed inset-0 z-[99]" onClick={() => setActiveDropdown(null)} />
                    <div style={{ position: 'fixed', top: dropdownPosition.top, left: dropdownPosition.left }}
                        className="w-40 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-[100] animate-fadeIn">
                        {renderDropdownBtn(() => { const user = getDropdownUser(); if (user) handleSelectAction(user._id); },
                            <FaCheck size={11} className="text-gray-400" />, 'Select', 'text-gray-700 hover:bg-gray-50')}

                        {renderDropdownBtn(() => { const user = getDropdownUser(); if (user) { setModalMode('view'); setSelectedUser(user); } setActiveDropdown(null); },
                            <FaEye size={11} className="text-gray-400" />, 'View Details', 'text-gray-700 hover:bg-gray-50')}

                        {isAdminOrAbove && (
                            <>
                                <div className="h-px bg-gray-100 my-1"></div>
                                {!showArchived ? (
                                    renderDropdownBtn(() => { const user = getDropdownUser(); if (user) handleDeleteClick(user); },
                                        <FaArchive size={11} />, 'Archive', 'text-red-600 hover:bg-red-50')
                                ) : (
                                    renderDropdownBtn(() => handleRestore(activeDropdown),
                                        <FaUndo size={11} />, 'Restore', 'text-emerald-600 hover:bg-emerald-50')
                                )}
                            </>
                        )}
                    </div>
                </>,
                document.body
            )}

            {/* Modals */}
            <AddUserModal
                isOpen={!!activeModal}
                onClose={() => setActiveModal(null)}
                roleToAdd={activeModal}
                onSuccess={() => showMessage('success', 'User created successfully')}
            />
            <UserDetailModal
                user={selectedUser}
                onClose={() => { setSelectedUser(null); setModalMode('view'); }}
                initialMode={modalMode}
                onSuccess={(msg) => showMessage('success', msg || 'User updated successfully')}
            />

            {/* Delete/Archive Confirmation */}
            {deleteConfirm.open && (
                <div className={MODAL_OVERLAY}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-fadeIn">
                        <div className="p-5">
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-4 ${showArchived ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                                {showArchived ? <FaUndo className="text-emerald-600" size={16} /> : <FaArchive className="text-amber-600" size={16} />}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 text-center mb-1.5">
                                {showArchived
                                    ? (deleteConfirm.isBulk ? `Restore ${deleteConfirm.users.length} users?` : 'Restore user?')
                                    : (deleteConfirm.isBulk ? `Archive ${deleteConfirm.users.length} users?` : 'Archive user?')}
                            </h3>
                            <p className="text-gray-500 text-sm text-center mb-5 leading-relaxed">
                                {showArchived
                                    ? 'Selected users will be moved back to active users.'
                                    : 'Selected users will be moved to archived users.'}
                            </p>
                            <div className="flex gap-2.5">
                                <button onClick={() => setDeleteConfirm({ open: false, users: [], isBulk: false })} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg">Cancel</button>
                                <button onClick={confirmDelete} className={`flex-1 px-4 py-2 rounded-lg text-white ${showArchived ? 'bg-emerald-600' : 'bg-amber-600'}`}>{showArchived ? 'Restore' : 'Archive'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default UsersPage;
