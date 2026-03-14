import React from 'react';
import { FaSort, FaCheck, FaEdit, FaEye, FaTrash } from 'react-icons/fa';
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
                    Prev
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
                            className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${currentPage === pageNum ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                            {pageNum + 1}
                        </button>
                    );
                })}
                <button onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage >= totalPages - 1}
                    className="px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-md transition-colors font-medium">
                    Next
                </button>
            </div>
        </div>
    );
};

export const AssignmentTable = ({
    assignments,
    loading,
    onViewClick,
    onEditClick,
    onDeleteClick,
    currentPage = 0,
    totalItems = 0,
    onPageChange,
    onSortClick,
    showSortMenu,
    sortMenuRef,
    sortBy,
    onSortChange,
    sortOptions = []
}) => {
    if (loading) {
        return (
            <div className="py-16 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 mx-auto"></div>
                <p className="text-gray-400 text-sm mt-3">Loading assignments...</p>
            </div>
        );
    }

    if (!assignments || assignments.length === 0) {
        return (
            <div className="py-16 text-center">
                <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-gray-400 text-xl">📄</span>
                </div>
                <p className="text-gray-500 text-sm font-medium">No assignments found</p>
                <p className="text-gray-400 text-xs mt-1">Try adjusting filters to see more results</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-gray-100 bg-gray-50/80 hover:bg-gray-50/80">
                            <TableHead className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <div className="flex items-center gap-2 relative">
                                    <span>Title</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSortClick && onSortClick(); }}
                                        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                        title="Sort"
                                    >
                                        <FaSort size={12} />
                                    </button>
                                    {showSortMenu && (
                                        <div ref={sortMenuRef} className="absolute top-full left-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-fadeIn">
                                            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">Sort By</div>
                                            {sortOptions.map(opt => (
                                                <button
                                                    key={opt.key}
                                                    onClick={() => onSortChange(opt.key)}
                                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-indigo-50/50 ${sortBy === opt.key ? 'text-indigo-600 font-medium' : 'text-gray-700'}`}
                                                >
                                                    {opt.label} {sortBy === opt.key && <FaCheck size={10} />}
                                                </button>
                                            ))}
                                            {sortBy !== 'default' && (
                                                <>
                                                    <div className="h-px bg-gray-50 my-1"></div>
                                                    <button
                                                        onClick={() => onSortChange('default')}
                                                        className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 font-medium"
                                                    >
                                                        Reset Sort
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </TableHead>
                            <TableHead className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</TableHead>
                            <TableHead className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</TableHead>
                            <TableHead className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</TableHead>
                            <TableHead className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</TableHead>
                            <TableHead className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assignments.map(assignment => {
                            const dateValue = new Date(assignment.dueDate);
                            const formattedDate = !isNaN(dateValue.getTime()) ? dateValue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Invalid Date';
                            const isPastDue = assignment.status === 'active' && dateValue < new Date();

                            return (
                                <TableRow
                                    key={assignment._id}
                                    className="group transition-colors hover:bg-indigo-50/30 cursor-pointer border-b border-gray-50 last:border-0"
                                    onClick={() => onViewClick(assignment)}
                                >
                                    <TableCell className="px-5 py-4">
                                        <div className="text-sm font-semibold text-gray-900 mb-0.5 group-hover:text-indigo-700 transition-colors">{assignment.title}</div>
                                        <div className="text-xs text-gray-500 line-clamp-1 max-w-[200px]">{assignment.description || 'No description'}</div>
                                    </TableCell>
                                    <TableCell className="px-5 py-4 text-sm text-gray-600 font-medium">
                                        {assignment.subject}
                                    </TableCell>
                                    <TableCell className="px-5 py-4">
                                        <div className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 uppercase tracking-tight">
                                            {assignment.standard}-{assignment.section}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-5 py-4">
                                        <div className={`text-sm font-medium ${isPastDue ? 'text-red-600' : 'text-gray-900'}`}>
                                            {formattedDate}
                                            {isPastDue && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">Late</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-5 py-4">
                                        <Badge
                                            variant="outline"
                                            className={`capitalize font-medium tracking-wide ${
                                                assignment.status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${assignment.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                            {assignment.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-5 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onViewClick(assignment); }}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all shadow-sm"
                                                title="View Details"
                                            >
                                                <FaEye size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditClick(assignment); }}
                                                className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all shadow-sm"
                                                title="Edit Assignment"
                                            >
                                                <FaEdit size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteClick(assignment); }}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shadow-sm"
                                                title="Delete Assignment"
                                            >
                                                <FaTrash size={14} />
                                            </button>
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
        </div>
    );
};
