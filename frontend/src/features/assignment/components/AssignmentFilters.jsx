import React from 'react';
import { FaSearch } from 'react-icons/fa';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';

export const AssignmentFilters = ({
    searchQuery,
    onSearchChange,
    searchPlaceholder = 'Search assignments...',
    standardFilter,
    onStandardChange,
    sectionFilter,
    onSectionChange,
}) => {
    const {
        availableStandards,
        getSectionsForStandard,
        allUniqueSections,
        loading,
    } = useSchoolClasses();

    // Get subjects from assignment metadata for the subject dropdown
    // We import the original hook just for subjects
    const sections = standardFilter && standardFilter !== 'all'
        ? getSectionsForStandard(standardFilter)
        : allUniqueSections;

    return (
        <div className="relative flex w-full flex-col gap-4 py-2 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-3">
                {/* Class filter */}
                <select
                    value={standardFilter}
                    onChange={(e) => onStandardChange(e.target.value)}
                    disabled={loading || availableStandards.length === 0}
                    className="px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/10 hover:border-primary/30 transition-all cursor-pointer w-44 shadow-sm"
                >
                    <option value="all">All Classes</option>
                    {availableStandards.map((std) => (
                        <option key={std} value={std}>Class {std}</option>
                    ))}
                </select>

                {/* Section filter */}
                <select
                    value={sectionFilter}
                    onChange={(e) => onSectionChange(e.target.value)}
                    disabled={loading}
                    className="px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/10 hover:border-primary/30 transition-all cursor-pointer w-44 shadow-sm"
                >
                    <option value="all">All Sections</option>
                    {sections.map((sec) => (
                        <option key={sec} value={sec}>{sec}</option>
                    ))}
                </select>
            </div>

            {/* Search Input */}
            <div className="relative z-0 min-w-[220px] flex-1 group">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={14} />
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium shadow-sm"
                />
            </div>
        </div>
    );
};
