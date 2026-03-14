import React from 'react';
import { FaFilter, FaSearch, FaPlus } from 'react-icons/fa';

export const AssignmentFilters = ({
    searchQuery,
    onSearchChange,
    standardFilter,
    onStandardChange,
    sectionFilter,
    onSectionChange,
    statusFilter,
    onStatusChange,
    onAddAssignment
}) => {
    return (
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full bg-transparent py-2">
            <div className="flex flex-wrap items-center gap-3 relative z-40 flex-shrink-0">
                {/* Class Filter */}
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 h-10 min-w-[120px] shadow-sm">
                    <select
                        value={standardFilter}
                        onChange={(e) => onStandardChange(e.target.value)}
                        className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer w-full p-0"
                    >
                        <option value="all">All Classes</option>
                        {[...Array(12)].map((_, i) => (
                            <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                        ))}
                    </select>
                </div>

                {/* Section Filter */}
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 h-10 min-w-[120px] shadow-sm">
                    <select
                        value={sectionFilter}
                        onChange={(e) => onSectionChange(e.target.value)}
                        className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer w-full p-0"
                    >
                        <option value="all">All Sections</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                    </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 h-10 min-w-[120px] shadow-sm">
                    <select
                        value={statusFilter}
                        onChange={(e) => onStatusChange(e.target.value)}
                        className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer w-full p-0"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>
            </div>

            {/* Search Input */}
            <div className="relative z-0 flex-1 min-w-[200px]">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400"><FaSearch size={14} /></span>
                <input
                    type="text"
                    placeholder="Search assignments..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:ml-auto">
                <button
                    onClick={onAddAssignment}
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 h-10 rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium whitespace-nowrap shadow-sm hover:shadow-md"
                >
                    <FaPlus size={14} />
                    <span>Add Assignment</span>
                </button>
            </div>
        </div>
    );
};
