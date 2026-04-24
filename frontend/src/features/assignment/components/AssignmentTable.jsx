import React from 'react';
import { FaCheck, FaEdit, FaEye, FaSort, FaTrash } from 'react-icons/fa';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PaginationControls } from '../../../components/ui/PaginationControls';

// ─── Assignment Table Skeleton ────────────────────────────────────────────────
// Mirrors the real 6-column layout: title+desc block, subject, class pill,
// due date, status pill, actions (left empty during load)
const ROW_COUNT = 6;
const AssignmentTableSkeleton = () => (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="px-4 py-3"><div className="skeleton-shimmer h-3 rounded-md w-24" /></TableHead>
                        <TableHead className="px-4 py-3"><div className="skeleton-shimmer h-3 rounded-md w-16" /></TableHead>
                        <TableHead className="px-4 py-3"><div className="skeleton-shimmer h-3 rounded-md w-14" /></TableHead>
                        <TableHead className="px-4 py-3"><div className="skeleton-shimmer h-3 rounded-md w-10" /></TableHead>
                        <TableHead className="px-4 py-3"><div className="skeleton-shimmer h-3 rounded-md w-14" /></TableHead>
                        <TableHead className="w-28 px-4 py-3" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: ROW_COUNT }).map((_, i) => (
                        <TableRow key={i} className="border-b border-slate-100 last:border-0" style={{ height: '72px' }}>
                            {/* Assignment column — title + description lines + tag pills */}
                            <TableCell className="px-4 py-3.5">
                                <div className="space-y-2">
                                    <div className="skeleton-shimmer h-3.5 rounded-md w-48" />
                                    <div className="skeleton-shimmer h-2.5 rounded-md w-64" />
                                    <div className="flex gap-1.5 mt-1">
                                        <div className="skeleton-shimmer h-4 rounded-full w-20" />
                                        <div className="skeleton-shimmer h-4 rounded-full w-14" />
                                        <div className="skeleton-shimmer h-4 rounded-full w-16" />
                                    </div>
                                </div>
                            </TableCell>
                            {/* Subject */}
                            <TableCell className="px-4 py-3.5">
                                <div className="skeleton-shimmer h-3.5 rounded-md w-20" />
                                <div className="skeleton-shimmer h-2.5 rounded-md w-16 mt-1" />
                            </TableCell>
                            {/* Class pill */}
                            <TableCell className="px-4 py-3.5">
                                <div className="skeleton-shimmer h-5 rounded-md w-14" />
                            </TableCell>
                            {/* Due date */}
                            <TableCell className="px-4 py-3.5">
                                <div className="skeleton-shimmer h-3.5 rounded-md w-24" />
                            </TableCell>
                            {/* Status pill */}
                            <TableCell className="px-4 py-3.5">
                                <div className="skeleton-shimmer h-5 rounded-full w-16" />
                            </TableCell>
                            {/* Actions — always empty during load */}
                            <TableCell className="px-4 py-3.5 w-28" />
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </div>
);

export const AssignmentTable = ({
    assignments,
    loading,
    onViewClick,
    onEditClick,
    onDeleteClick,
    currentPage = 0,
    totalItems = 0,
    pageSize = 25,
    onPageChange,
    onPageSizeChange,
    onSortClick,
    showSortMenu,
    sortMenuRef,
    sortBy,
    onSortChange,
    sortOptions = []
}) => {
    if (loading) {
        return <AssignmentTableSkeleton />;
    }

    if (!assignments || assignments.length === 0) {
        return (
            <div className="py-16 text-center">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-slate-400 text-xl">A</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">No assignments found</p>
                <p className="text-slate-400 text-xs mt-1">Try adjusting filters to see more results</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80">
                            <TableHead className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                <div className="relative flex items-center gap-2">
                                    <span>Assignment</span>
                                    <button
                                        onClick={(event) => { event.stopPropagation(); onSortClick && onSortClick(); }}
                                        className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 focus:outline-none"
                                        title="Sort"
                                    >
                                        <FaSort size={12} />
                                    </button>
                                    {showSortMenu && (
                                        <div ref={sortMenuRef} className="absolute left-0 top-full z-50 mt-1 w-36 rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl animate-fadeIn">
                                            <div className="mb-1 border-b border-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Sort By
                                            </div>
                                            {sortOptions.map((option) => (
                                                <button
                                                    key={option.key}
                                                    onClick={() => onSortChange(option.key)}
                                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-indigo-50/50 ${sortBy === option.key ? 'font-medium text-indigo-600' : 'text-slate-700'}`}
                                                >
                                                    {option.label}
                                                    {sortBy === option.key && <FaCheck size={10} />}
                                                </button>
                                            ))}
                                            {sortBy !== 'default' && (
                                                <>
                                                    <div className="my-1 h-px bg-slate-50"></div>
                                                    <button
                                                        onClick={() => onSortChange('default')}
                                                        className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                                                    >
                                                        Reset Sort
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </TableHead>
                            <TableHead className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Subject</TableHead>
                            <TableHead className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Class</TableHead>
                            <TableHead className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Due</TableHead>
                            <TableHead className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Status</TableHead>
                            <TableHead className="w-28 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assignments.map((assignment) => {
                            const dueDate = new Date(assignment.dueDate);
                            const formattedDate = !Number.isNaN(dueDate.getTime())
                                ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'Invalid Date';
                            const isPastDue = assignment.status === 'active' && dueDate < new Date();

                            return (
                                <TableRow
                                    key={assignment._id}
                                    className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-indigo-50/20 last:border-0"
                                    onClick={() => onViewClick(assignment)}
                                >
                                    <TableCell className="px-4 py-3.5">
                                        <div className="text-sm font-semibold text-slate-900 transition-colors group-hover:text-indigo-700">
                                            {assignment.title}
                                        </div>
                                        <div className="mt-1 line-clamp-1 max-w-[260px] text-xs text-slate-500">
                                            {assignment.description || 'No description'}
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                                                Submission Required
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                                                {assignment.attachmentsCount || 0} File{assignment.attachmentsCount === 1 ? '' : 's'}
                                            </span>
                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                                                {assignment.submissionCount || 0} Turned In
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3.5 text-sm font-medium text-slate-600">
                                        <div>{assignment.subject}</div>
                                        <div className="mt-1 text-xs text-slate-400">
                                            {assignment.assignedTeacher?.name || assignment.createdBy?.name || 'Staff'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3.5">
                                        <div className="inline-flex items-center justify-center rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-tight text-indigo-700">
                                            {assignment.standard}-{assignment.section}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3.5">
                                        <div className={`text-sm font-medium ${isPastDue ? 'text-red-600' : 'text-slate-900'}`}>
                                            {formattedDate}
                                            {isPastDue && (
                                                <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700">
                                                    Late
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3.5">
                                        <Badge
                                            variant="outline"
                                            className={`capitalize font-medium tracking-wide ${
                                                assignment.status === 'active'
                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm'
                                                    : 'border-gray-200 bg-gray-100 text-gray-600'
                                            }`}
                                        >
                                            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${assignment.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                            {assignment.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {onViewClick && (
                                                <button
                                                    onClick={(event) => { event.stopPropagation(); onViewClick(assignment); }}
                                                    className="rounded-lg p-2 text-slate-500 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                                                    title="View Details"
                                                >
                                                    <FaEye size={13} />
                                                </button>
                                            )}
                                            {onEditClick && (
                                                <button
                                                    onClick={(event) => { event.stopPropagation(); onEditClick(assignment); }}
                                                    className="rounded-lg p-2 text-slate-500 transition-all hover:bg-amber-50 hover:text-amber-600"
                                                    title="Edit Assignment"
                                                >
                                                    <FaEdit size={13} />
                                                </button>
                                            )}
                                            {onDeleteClick && (
                                                <button
                                                    onClick={(event) => { event.stopPropagation(); onDeleteClick(assignment); }}
                                                    className="rounded-lg p-2 text-slate-500 transition-all hover:bg-red-50 hover:text-red-600"
                                                    title="Delete Assignment"
                                                >
                                                    <FaTrash size={13} />
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
                    pageSize={pageSize}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                />
            )}
        </div>
    );
};
