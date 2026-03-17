import React from 'react';
import { FaBook, FaPlus, FaSearch } from 'react-icons/fa';
import { useAssignmentOptions } from '../hooks/useAssignmentOptions';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select";

const FilterSelect = ({
    value,
    onChange,
    disabled,
    options,
    icon = null,
    placeholder,
}) => (
    <div className="flex flex-col min-w-[160px]">
        <Select 
            value={value?.toString()} 
            onValueChange={(val) => onChange({ target: { value: val } })}
            disabled={disabled}
        >
            <SelectTrigger className="h-13 w-full rounded-xl border-slate-200 bg-white px-4 shadow-sm transition-all hover:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-600 text-sm font-semibold text-slate-700">
                <div className="flex items-center gap-2.5">
                    {icon && <span className="text-slate-400">{icon}</span>}
                    <SelectValue placeholder={placeholder} />
                </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl z-[150] overflow-hidden">
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()} className="text-sm py-2.5 px-4 cursor-pointer focus:bg-indigo-50 focus:text-indigo-700 rounded-lg mx-1 my-0.5 transition-colors">
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
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
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"><FaSearch size={14} /></span>
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="h-13 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-50/50 sm:text-base font-medium"
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
