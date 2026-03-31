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
import { useToastMessage } from '../../hooks/useToastMessage';



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
const MODAL_OVERLAY = 'modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4';

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
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, users: [], isBulk: false });
    const [archiveReplacementTeacherId, setArchiveReplacementTeacherId] = useState('');
    const [archiveError, setArchiveError] = useState('');
    const [archiveErrorDetails, setArchiveErrorDetails] = useState(null);
    const { message, showMessage } = useToastMessage();

    const allowedRoles = ROLE_PERMISSIONS[currentUser?.role] || [];
    const isAdminOrAbove = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

    // Queries
    const queryParams = { role: selectedRole, page, pageSize, name: searchQuery };
    const { data: usersData, isLoading: usersLoading } = useUsers(queryParams);
    const { data: archivedData, isLoading: archivedLoading } = useArchivedUsers(queryParams);
    const { data: activeTeachersData } = useUsers({
        role: 'teacher',
        page: 0,
        pageSize: 5000,
        enabled: isAdminOrAbove && !showArchived,
    });

    const toggleStatusMutation = useToggleUsersStatus();
    const currentData = showArchived ? archivedData?.data : usersData?.data;
    const loading = showArchived ? archivedLoading : usersLoading;
    const usersList = useMemo(() => (Array.isArray(currentData?.users) ? currentData.users : []), [currentData]);
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

    const handleSelectAction = (userId) => { setSelectionMode(true); setSelectedUsers([userId]); };
    const toggleUserSelection = (userId) => setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    const toggleSelectAll = () => setSelectedUsers(selectedUsers.length === filteredUsers.length ? [] : filteredUsers.map(u => u._id));

    const handleDeleteClick = (user) => {
        setArchiveReplacementTeacherId('');
        setArchiveError('');
        setArchiveErrorDetails(null);
        setDeleteConfirm({ open: true, users: [user], isBulk: false });
    };
    const handleBulkDeleteClick = () => {
        setArchiveReplacementTeacherId('');
        setArchiveError('');
        setArchiveErrorDetails(null);
        setDeleteConfirm({ open: true, users: filteredUsers.filter(u => selectedUsers.includes(u._id)), isBulk: true });
    };

    const isTeacherArchiveFlow = !showArchived
        && deleteConfirm.open
        && deleteConfirm.users.length === 1
        && deleteConfirm.users[0]?.role === 'teacher';
    const replacementTeacherOptions = useMemo(
        () => (activeTeachersData?.data?.users || []).filter(
            (teacher) => String(teacher._id) !== String(deleteConfirm.users[0]?._id)
        ),
        [activeTeachersData?.data?.users, deleteConfirm.users]
    );

    const closeArchiveModal = useCallback(() => {
        setArchiveReplacementTeacherId('');
        setArchiveError('');
        setArchiveErrorDetails(null);
        setDeleteConfirm({ open: false, users: [], isBulk: false });
    }, []);

    const getArchiveErrorPayload = useCallback((error) => {
        const response = error?.response?.data || {};
        const nestedError = response?.error || {};

        return {
            message: nestedError.message || response.message || 'Operation failed',
            code: nestedError.code || response.code || null,
            details: nestedError.details || response.details || null,
        };
    }, []);

    const confirmDelete = async () => {
        setArchiveError('');
        setArchiveErrorDetails(null);
        try {
            const userIdsToProcess = deleteConfirm.isBulk ? selectedUsers : [deleteConfirm.users[0]._id];
            await toggleStatusMutation.mutateAsync({
                userIds: userIdsToProcess,
                isArchived: !showArchived,
                ...(isTeacherArchiveFlow && archiveReplacementTeacherId
                    ? { replacementTeacherId: archiveReplacementTeacherId }
                    : {}),
            });
            showMessage('success', showArchived ? 'User(s) restored successfully' : 'User(s) archived successfully');
            exitSelectionMode();
            closeArchiveModal();
        } catch (error) {
            console.error('Delete failed', error);
            const archiveFailure = getArchiveErrorPayload(error);
            setArchiveError(archiveFailure.message);
            setArchiveErrorDetails(archiveFailure.details);
            showMessage('error', archiveFailure.message);
        }
    };

    return (
        <DashboardLayout>
            {message?.text && (
                <div className={`fixed top-6 right-6 z-[100] px-5 py-3.5 rounded-lg shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${message.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-white/20">
                        {message.type === 'success' ? <FaCheck size={10} /> : <FaTimes size={10} />}
                    </div>
                    <span className="font-medium text-sm">{message.text}</span>
                </div>
            )}

            <div className="space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-primary transform hover:rotate-6 transition-transform">
                            <FaUserShield size={32} />
                        </div>
                        <div className="space-y-1">
                            <h1 className="page-title">{showArchived ? 'Archived Users' : 'Users'}</h1>
                            <p className="page-subtitle">
                                {showArchived ? 'Manage archived users - restore or permanently delete' : `Manage ${allowedRoles.length > 1 ? 'all users' : allowedRoles[0] + 's'} in your organization`}
                            </p>
                        </div>
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
                        isAdminOrAbove={isAdminOrAbove}
                        onRowClick={(u) => { setModalMode('view'); setSelectedUser(u); }}
                        onEditClick={(u) => { setModalMode('edit'); setSelectedUser(u); }}
                        onArchiveClick={(u) => handleDeleteClick(u)}
                        roleLabels={ROLE_LABELS}
                        currentPage={page}
                        totalItems={currentData?.totalCount || filteredUsers.length}
                        onPageChange={setPage}
                    />
                </div>
            </div>

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
                                {archiveError && (
                                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
                                        <p className="font-semibold">{archiveError}</p>
                                        {archiveErrorDetails && (
                                            <div className="mt-2 space-y-1 text-xs text-red-600">
                                                {Array.isArray(archiveErrorDetails.assignedClassLabels) && archiveErrorDetails.assignedClassLabels.length > 0 && (
                                                    <p>Assigned classes: {archiveErrorDetails.assignedClassLabels.join(', ')}</p>
                                                )}
                                                {Number(archiveErrorDetails.timetableEntryCount) > 0 && (
                                                    <p>Active timetable entries: {archiveErrorDetails.timetableEntryCount}</p>
                                                )}
                                                {Number(archiveErrorDetails.activeAssignmentCount) > 0 && (
                                                    <p>Active assignments: {archiveErrorDetails.activeAssignmentCount}</p>
                                                )}
                                                {Number(archiveErrorDetails.activeOwnedExamCount) > 0 && (
                                                    <p>Active exams created by teacher: {archiveErrorDetails.activeOwnedExamCount}</p>
                                                )}
                                                {Number(archiveErrorDetails.activeInvigilationCount) > 0 && (
                                                    <p>Active invigilation slots: {archiveErrorDetails.activeInvigilationCount}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {isTeacherArchiveFlow && (
                                    <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
                                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                                            Temporary Replacement Teacher
                                        </label>
                                        <select
                                            value={archiveReplacementTeacherId}
                                            onChange={(event) => setArchiveReplacementTeacherId(event.target.value)}
                                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                                        >
                                            <option value="">Select replacement later</option>
                                            {replacementTeacherOptions.map((teacher) => (
                                                <option key={teacher._id} value={teacher._id}>
                                                    {teacher.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                                            Use this when the archived teacher still owns active classes, timetable entries, assignments, or ongoing exams. This replacement is treated as temporary ownership transfer for active work.
                                        </p>
                                        {replacementTeacherOptions.length === 0 && (
                                            <p className="mt-2 text-xs text-amber-600">
                                                No other active teacher is available right now. Create or restore one before archiving if replacement is required.
                                            </p>
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-2.5">
                                    <button onClick={closeArchiveModal} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg">Cancel</button>
                                    <button
                                        onClick={confirmDelete}
                                        disabled={toggleStatusMutation.isPending}
                                        className={`flex-1 px-4 py-2 rounded-lg text-white disabled:opacity-70 disabled:cursor-not-allowed ${showArchived ? 'bg-emerald-600' : 'bg-amber-600'}`}
                                    >
                                        {toggleStatusMutation.isPending ? 'Processing...' : (showArchived ? 'Restore' : 'Archive')}
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
