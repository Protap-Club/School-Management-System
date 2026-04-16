import React from 'react';
import { FaFilter, FaSearch, FaCalendarAlt } from 'react-icons/fa';

export const AuditFilters = ({
    filters,
    setFilters
}) => {
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 0 }));
    };

    return (
        <div className="flex flex-col w-full p-5 bg-white ring-1 ring-slate-900/5 rounded-2xl shadow-sm mb-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                <div className="md:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 bg-white">Search Logs</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400"><FaSearch size={14} /></span>
                        <input
                            type="text"
                            placeholder="Search by action details or name..."
                            value={filters.search || ''}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full h-[42px] pl-10 pr-4 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all shadow-sm"
                        />
                    </div>
                </div>
                
                <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Module / Entity</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none"><FaFilter size={12} /></span>
                        <select
                            value={filters.targetModel || ''}
                            onChange={(e) => handleFilterChange('targetModel', e.target.value)}
                            className="w-full h-[42px] pl-10 pr-8 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all appearance-none cursor-pointer shadow-sm"
                        >
                            <option value="">All Modules</option>
                            <option value="Assignment">Assignments</option>
                            <option value="Auth">Authentication</option>
                            <option value="CalendarEvent">Calendar</option>
                            <option value="Examination">Examinations</option>
                            <option value="Fee">Fees</option>
                            <option value="Notice">Notices</option>
                            <option value="ProxyRequest">Proxy Requests</option>
                            <option value="School">School Settings</option>
                            <option value="User">Users</option>
                        </select>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Actor Role</label>
                    <select
                        value={filters.actorRole || ''}
                        onChange={(e) => handleFilterChange('actorRole', e.target.value)}
                        className="w-full h-[42px] px-3 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all cursor-pointer shadow-sm"
                    >
                        <option value="">All Roles</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="teacher">Teacher</option>
                        <option value="student">Student</option>
                    </select>
                </div>

                <div className="md:col-span-2">
                    {(filters.search || filters.targetModel || filters.actorRole || filters.startDate || filters.endDate) && (
                        <button
                            onClick={() => setFilters({ page: 0, limit: 25 })}
                            className="w-full h-[42px] text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex gap-2 items-center w-full sm:w-auto">
                    <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
                        <FaCalendarAlt size={12} />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Range</span>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={filters.startDate || ''}
                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        className="h-9 px-3 text-sm text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all shadow-sm"
                    />
                    <span className="text-slate-400 text-sm font-medium">to</span>
                    <input
                        type="date"
                        value={filters.endDate || ''}
                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        className="h-9 px-3 text-sm text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all shadow-sm"
                    />
                </div>
            </div>
        </div>
    );
};
