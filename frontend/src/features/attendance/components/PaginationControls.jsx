import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const PaginationControls = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;
    const start = totalItems === 0 ? 0 : currentPage * itemsPerPage + 1;
    const end = Math.min((currentPage + 1) * itemsPerPage, totalItems);

    return (
        <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50 w-full">
            <div className="text-xs text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-700">{start}</span> to <span className="font-bold text-gray-700">{end}</span> of <span className="font-bold text-gray-700">{totalItems}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-md transition-all font-bold border border-transparent hover:border-gray-200"
                >
                    <FaChevronLeft size={10} />
                </button>
                <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
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
                                className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-xs font-black transition-all ${currentPage === pageNum ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                {pageNum + 1}
                            </button>
                        );
                    })}
                </div>
                <button
                    onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-md transition-all font-bold border border-transparent hover:border-gray-200"
                >
                    <FaChevronRight size={10} />
                </button>
            </div>
        </div>
    );
};

export default PaginationControls;

