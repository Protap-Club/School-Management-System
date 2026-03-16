import React from 'react';
import { FaFilter, FaSearch, FaPlus, FaBook } from 'react-icons/fa';
import { useAssignmentOptions } from '../hooks/useAssignmentOptions';

export const AssignmentFilters = ({
    searchQuery,
    onSearchChange,
    searchPlaceholder = 'Search assignments...',
    standardFilter,
    onStandardChange,
    sectionFilter,
    onSectionChange,
    subjectFilter,
    onSubjectChange,
    statusFilter,
    onStatusChange,
    onAddAssignment,
    canCreate
}) => {
    const { 
        availableStandards, 
        getSectionsForStandard, 
        getSubjectsForClass, 
        loading 
    } = useAssignmentOptions();

    const sections = getSectionsForStandard(standardFilter);
    const subjects = getSubjectsForClass(standardFilter, sectionFilter);

    return (
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full bg-transparent py-2">
            <div className="flex flex-wrap items-center gap-3 relative z-40 flex-shrink-0">
                {/* Class Filter */}
                <div className="relative flex items-center bg-white border border-gray-200 rounded-lg px-3 h-10 min-w-[130px] shadow-sm hover:border-gray-300 transition-all focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500">
                    <select
                        value={standardFilter}
                        onChange={(e) => onStandardChange(e.target.value)}
                        disabled={loading || availableStandards.length === 0}
                        className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer w-full pr-6 disabled:opacity-50"
                    >
                        <option value="all">All Classes</option>
                        {availableStandards.map((std) => (
                            <option key={std} value={std}>Class {std}</option>
                        ))}
                    </select>
                </div>

                {/* Section Filter */}
                <div className="relative flex items-center bg-white border border-gray-200 rounded-lg px-3 h-10 min-w-[130px] shadow-sm hover:border-gray-300 transition-all focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500">
                    <select
                        value={sectionFilter}
                        onChange={(e) => onSectionChange(e.target.value)}
                        disabled={loading || sections.length === 0}
                        className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer w-full pr-6 disabled:opacity-50"
                    >
                        <option value="all">All Sections</option>
                        {sections.map((sec) => (
                            <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                    </select>
                </div>

                {/* Subject Filter */}
                <div className="relative flex items-center bg-white border border-sky-200 rounded-lg px-3 h-10 min-w-[140px] shadow-sm hover:border-sky-400 transition-all focus-within:ring-2 focus-within:ring-sky-500/10 focus-within:border-sky-500">
                    <FaBook className="text-sky-400 mr-2" size={12} />
                    <select
                        value={subjectFilter}
                        onChange={(e) => onSubjectChange(e.target.value)}
                        disabled={loading}
                        className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer w-full pr-6 disabled:opacity-50 appearance-none"
                    >
                        <option value="all">All Subjects</option>
                        {subjects.map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                        ))}
                    </select>
                </div>

            </div>

            {/* Search Input */}
            <div className="relative z-0 flex-1 min-w-[200px]">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400"><FaSearch size={14} /></span>
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:ml-auto">
                {canCreate && (
                    <button
                        onClick={onAddAssignment}
                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 h-10 rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium whitespace-nowrap shadow-sm hover:shadow-md"
                    >
                        <FaPlus size={14} />
                        <span>Add Assignment</span>
                    </button>
                )}
            </div>
        </div>
    );
};
