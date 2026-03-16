import React from 'react';
import { FaBook, FaChevronDown, FaPlus, FaSearch } from 'react-icons/fa';
import { useAssignmentOptions } from '../hooks/useAssignmentOptions';

const FilterSelect = ({
    value,
    onChange,
    disabled,
    options,
    icon = null,
    placeholder,
}) => (
    <div className={`group relative flex h-11 min-w-[150px] items-center rounded-xl border bg-white px-3 shadow-sm transition-all ${disabled ? 'border-slate-200 opacity-60' : 'border-slate-200 hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10'}`}>
        {icon && <span className="mr-2 text-slate-400 transition-colors group-focus-within:text-indigo-500">{icon}</span>}
        <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="h-full w-full appearance-none bg-transparent pr-7 text-sm font-semibold text-slate-700 outline-none"
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </select>
        <FaChevronDown className="pointer-events-none absolute right-3 text-xs text-slate-400 transition-colors group-focus-within:text-indigo-500" />
    </div>
);

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
        <div className="relative flex w-full flex-col gap-4 py-2 lg:flex-row lg:items-center">
            <div className="relative z-40 flex flex-wrap items-center gap-3 lg:flex-shrink-0">
                <FilterSelect
                    value={standardFilter}
                    onChange={(e) => onStandardChange(e.target.value)}
                    disabled={loading || availableStandards.length === 0}
                    placeholder="All Classes"
                    options={[
                        { value: 'all', label: 'All Classes' },
                        ...availableStandards.map((std) => ({ value: std, label: `Class ${std}` }))
                    ]}
                />
                <FilterSelect
                    value={sectionFilter}
                    onChange={(e) => onSectionChange(e.target.value)}
                    disabled={loading || sections.length === 0}
                    placeholder="All Sections"
                    options={[
                        { value: 'all', label: 'All Sections' },
                        ...sections.map((sec) => ({ value: sec, label: `Section ${sec}` }))
                    ]}
                />
                <FilterSelect
                    value={subjectFilter}
                    onChange={(e) => onSubjectChange(e.target.value)}
                    disabled={loading}
                    icon={<FaBook size={12} />}
                    placeholder="All Subjects"
                    options={[
                        { value: 'all', label: 'All Subjects' },
                        ...subjects.map((sub) => ({ value: sub, label: sub }))
                    ]}
                />
            </div>

            {/* Search Input */}
            <div className="relative z-0 min-w-[220px] flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400"><FaSearch size={14} /></span>
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
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
