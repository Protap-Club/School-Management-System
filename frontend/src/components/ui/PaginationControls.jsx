import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

/**
 * Shared pagination controls — consolidates:
 *   - features/attendance/components/PaginationControls.jsx (prop: itemsPerPage)
 *   - features/assignment/components/AssignmentPaginationControls.jsx (prop: pageSize)
 *
 * Accepts both `pageSize` and `itemsPerPage` for backward compatibility.
 * `onPageSizeChange` is optional (Attendance doesn't use it).
 */
export const PaginationControls = ({
    currentPage,
    totalItems,
    pageSize,
    itemsPerPage,
    onPageChange,
    onPageSizeChange,
}) => {
    const size = pageSize || itemsPerPage || 25;
    const totalPages = Math.ceil(totalItems / size);
    if (totalPages <= 1 && !onPageSizeChange) return null;

    const start = totalItems === 0 ? 0 : currentPage * size + 1;
    const end = Math.min((currentPage + 1) * size, totalItems);

    const pageButtons = [...Array(Math.min(5, totalPages || 1))].map((_, i) => {
        let pageNum;

        if (totalPages <= 5) pageNum = i;
        else if (currentPage < 3) pageNum = i;
        else if (currentPage > totalPages - 4) pageNum = totalPages - 5 + i;
        else pageNum = currentPage - 2 + i;

        if (pageNum >= totalPages) return null;

        return (
            <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[30px] h-8 px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    currentPage === pageNum
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
                {pageNum + 1}
            </button>
        );
    });

    return (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{start}</span> to <span className="font-semibold text-slate-700">{end}</span> of <span className="font-semibold text-slate-700">{totalItems}</span>
                </div>
                {onPageSizeChange && (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <span>Rows</span>
                        <select
                            value={size}
                            onChange={(event) => onPageSizeChange(Number(event.target.value))}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-primary"
                        >
                            {PAGE_SIZE_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </label>
                )}
            </div>
            {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40"
                    >
                        <FaChevronLeft size={10} />
                        Prev
                    </button>
                    {pageButtons}
                    <button
                        onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage >= totalPages - 1}
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40"
                    >
                        Next
                        <FaChevronRight size={10} />
                    </button>
                </div>
            )}
        </div>
    );
};
