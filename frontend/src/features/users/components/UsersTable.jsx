import React from 'react';
import { FaCheck, FaSort, FaEllipsisV, FaChevronLeft, FaChevronRight, FaEdit, FaEye, FaUndo, FaArchive } from 'react-icons/fa';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const ITEMS_PER_PAGE = 25;

const PaginationControls = ({ currentPage, totalItems, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;
    const start = currentPage * ITEMS_PER_PAGE + 1;
    const end = Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalItems);
    return (
        <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50">
            <div className="text-xs text-gray-500">
                Showing <span className="font-medium text-gray-700">{start}</span> to <span className="font-medium text-gray-700">{end}</span> of <span className="font-medium text-gray-700">{totalItems}</span>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => onPageChange(Math.max(0, currentPage - 1))} disabled={currentPage === 0}
                    className="px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-md transition-colors font-medium">
                    <FaChevronLeft size={10} />
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i;
                    else if (currentPage < 3) pageNum = i;
                    else if (currentPage > totalPages - 4) pageNum = totalPages - 5 + i;
                    else pageNum = currentPage - 2 + i;
                    if (pageNum >= totalPages) return null;
                    return (
                        <button key={pageNum} onClick={() => onPageChange(pageNum)}
                            className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${currentPage === pageNum ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                            {pageNum + 1}
                        </button>
                    );
                })}
                <button onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage >= totalPages - 1}
                    className="px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-md transition-colors font-medium">
                    <FaChevronRight size={10} />
                </button>
            </div>
        </div>
    );
};

export const UsersTable = ({
    users,
    loading,
    showArchived,
    selectionMode,
    selectedUsers,
    onToggleSelectAll,
    onToggleUserSelection,
    onSortClick,
    showSortMenu,
    sortMenuRef,
    sortBy,
    onSortChange,
    sortOptions,
    allowedRoles,
    isAdminOrAbove,
    onRowClick,
    onEditClick,
    onArchiveClick,
    roleLabels,
    currentPage = 0,
    totalItems = 0,
    onPageChange,
}) => {
    if (loading) {
        return (
            <div className="py-16 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-600 mx-auto"></div>
                <p className="text-gray-400 text-sm mt-3">Loading users...</p>
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="py-16 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-gray-400 text-xl">👥</span>
                </div>
                <p className="text-gray-500 text-sm">No users found</p>
                <p className="text-gray-400 text-xs mt-1">
                    {showArchived ? 'No archived users' : 'Add your first user to get started'}
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-gray-100 bg-gray-50/50">
                            {selectionMode && (
                                <TableHead className="w-10 px-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.length === users.length && users.length > 0}
                                        onChange={onToggleSelectAll}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                    />
                                </TableHead>
                            )}
                            <TableHead className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <div className="flex items-center gap-2 relative">
                                    <span>User</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSortClick(); }}
                                        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                        title="Sort Users"
                                    >
                                        <FaSort size={12} />
                                    </button>
                                    {showSortMenu && (
                                        <div ref={sortMenuRef} className="absolute top-full left-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 animate-fadeIn">
                                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 border-b border-gray-50">Sort By</div>
                                            {sortOptions.filter(o => !o.requireMultiRole || allowedRoles.length > 1).map(opt => (
                                                <button
                                                    key={opt.key}
                                                    onClick={() => onSortChange(opt.key)}
                                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50 ${sortBy === opt.key ? 'text-indigo-600 font-medium' : 'text-gray-700'}`}
                                                >
                                                    {opt.label} {sortBy === opt.key && <FaCheck size={10} />}
                                                </button>
                                            ))}
                                            {sortBy !== 'default' && (
                                                <>
                                                    <div className="h-px bg-gray-50 my-1"></div>
                                                    <button
                                                        onClick={() => onSortChange('default')}
                                                        className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                                                    >
                                                        Reset Sort
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>
                            <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map(u => {
                            const roleConfig = roleLabels[u.role] || {
                                avatarClass: 'bg-gray-100 text-gray-700',
                                badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
                            };
                            const isSelected = selectedUsers.includes(u._id);
                            return (
                                <TableRow
                                    key={u._id}
                                    onClick={() => onRowClick(u)}
                                    className={`group transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-gray-50/50'}`}
                                >
                                    {selectionMode && (
                                        <TableCell className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => { e.stopPropagation(); onToggleUserSelection(u._id); }}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${roleConfig.avatarClass}`}>
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{u.name}</div>
                                                <div className="text-xs text-gray-400 md:hidden">{u.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Badge variant="outline" className={`capitalize ${roleConfig.badgeClass}`}>
                                            {u.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 hidden md:table-cell">
                                        <span className="text-sm text-gray-500">{u.email}</span>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                                            {u.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRowClick(u); }}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="View Details"
                                            >
                                                <FaEye size={14} />
                                            </button>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditClick(u); }}
                                                className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                title="Edit User"
                                            >
                                                <FaEdit size={14} />
                                            </button>

                                            {!selectionMode && isAdminOrAbove && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onArchiveClick(u); }}
                                                    className={`p-2 transition-all rounded-lg ${showArchived
                                                        ? 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700'
                                                        : 'text-gray-400 hover:bg-red-50 hover:text-red-600'}`}
                                                    title={showArchived ? "Restore User" : "Archive User"}
                                                >
                                                    {showArchived ? <FaUndo size={14} /> : <FaArchive size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            {onPageChange && (
                <PaginationControls
                    currentPage={currentPage}
                    totalItems={totalItems}
                    onPageChange={onPageChange}
                />
            )}
        </>
    );
};
