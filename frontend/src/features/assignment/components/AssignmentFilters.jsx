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
            <div className="flex flex-wrap items-center gap-2">
                {/* Class filter */}
                <select
                    value={standardFilter}
                    onChange={(e) => onStandardChange(e.target.value)}
                    disabled={loading || availableStandards.length === 0}
                    className="px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none hover:bg-slate-100 transition-all cursor-pointer min-w-[130px]"
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
                    className="px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none hover:bg-slate-100 transition-all cursor-pointer min-w-[130px]"
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
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm font-medium"
                />
            </div>
        </div>
    );
};
