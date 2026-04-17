import React from 'react';
import { FaFilter, FaSearch, FaCalendarAlt } from 'react-icons/fa';

// ─── Shared select wrapper ────────────────────────────────────────────────────

const FilterSelect = ({ label, value, onChange, children }) => (
    <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            {label}
        </label>
        <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-[42px] px-3 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all appearance-none cursor-pointer shadow-sm"
        >
            {children}
        </select>
    </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const AuditFilters = ({ filters, setFilters }) => {
    const set = (key, value) => setFilters(prev => ({ ...prev, [key]: value, page: 0 }));

    const hasActiveFilters =
        filters.search || filters.targetModel || filters.actorRole ||
        filters.startDate || filters.endDate ||
        filters.action_type || filters.severity || filters.outcome;

    return (
        <div className="flex flex-col w-full p-5 bg-white ring-1 ring-slate-900/5 rounded-2xl shadow-sm mb-2">

            {/* Row 1: Search + Module + Role + Action Type */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

                {/* Search — widest */}
                <div className="md:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Search Logs
                    </label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                            <FaSearch size={13} />
                        </span>
                        <input
                            type="text"
                            placeholder="Search by action details or name…"
                            value={filters.search || ''}
                            onChange={(e) => set('search', e.target.value)}
                            className="w-full h-[42px] pl-10 pr-4 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Module / Entity */}
                <div className="md:col-span-2">
                    <FilterSelect label="Module" value={filters.targetModel} onChange={(v) => set('targetModel', v)}>
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
                    </FilterSelect>
                </div>

                {/* Actor Role */}
                <div className="md:col-span-2">
                    <FilterSelect label="Actor Role" value={filters.actorRole} onChange={(v) => set('actorRole', v)}>
                        <option value="">All Roles</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="teacher">Teacher</option>
                        <option value="student">Student</option>
                    </FilterSelect>
                </div>

                {/* Action Type — new */}
                <div className="md:col-span-2">
                    <FilterSelect label="Action Type" value={filters.action_type} onChange={(v) => set('action_type', v)}>
                        <option value="">All Types</option>
                        <option value="LOGIN">Login</option>
                        <option value="LOGOUT">Logout</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="DELETE">Delete</option>
                        <option value="BROADCAST">Broadcast</option>
                    </FilterSelect>
                </div>

                {/* Clear button */}
                <div className="md:col-span-2 flex items-end">
                    {hasActiveFilters && (
                        <button
                            onClick={() => setFilters({ page: 0, limit: filters.limit ?? 25 })}
                            className="w-full h-[42px] text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Row 2: Severity + Outcome + Date range */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-start sm:items-end flex-wrap">

                {/* Severity — new */}
                <div className="w-36">
                    <FilterSelect label="Severity" value={filters.severity} onChange={(v) => set('severity', v)}>
                        <option value="">All Severities</option>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                    </FilterSelect>
                </div>

                {/* Outcome — new */}
                <div className="w-36">
                    <FilterSelect label="Outcome" value={filters.outcome} onChange={(v) => set('outcome', v)}>
                        <option value="">All Outcomes</option>
                        <option value="SUCCESS">Success</option>
                        <option value="FAILED">Failed</option>
                    </FilterSelect>
                </div>

                {/* Divider */}
                <div className="hidden sm:block h-[42px] w-px bg-slate-200 self-end" />

                {/* Date range */}
                <div className="flex items-end gap-3">
                    <div className="flex gap-2 items-center self-end pb-1.5 text-slate-400">
                        <FaCalendarAlt size={12} />
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date Range</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={filters.startDate || ''}
                            onChange={(e) => set('startDate', e.target.value)}
                            className="h-[42px] px-3 text-sm text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all shadow-sm"
                        />
                        <span className="text-slate-400 text-sm font-medium">to</span>
                        <input
                            type="date"
                            value={filters.endDate || ''}
                            onChange={(e) => set('endDate', e.target.value)}
                            className="h-[42px] px-3 text-sm text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
