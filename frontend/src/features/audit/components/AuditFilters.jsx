import React from 'react';
import { Search, ChevronDown, Calendar, X } from 'lucide-react';

// ─── Shared styles ────────────────────────────────────────────────────────────

/**
 * Common class string applied to every filter control (select + date input).
 * Matches Google Cloud Console filter bar: uniform height, subtle border,
 * soft shadow, clean focus ring, no vendor arrow on selects.
 */
const CONTROL_CLS =
    'h-9 w-full px-3 text-sm text-slate-700 bg-white ' +
    'border border-slate-200 rounded-lg shadow-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60 ' +
    'hover:border-slate-300 transition-all duration-150 ' +
    'appearance-none cursor-pointer';

// ─── Styled Select ────────────────────────────────────────────────────────────

const FilterSelect = ({ value, onChange, children, 'aria-label': ariaLabel }) => (
    <div className="relative flex-1 min-w-[130px]">
        <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            aria-label={ariaLabel}
            className={CONTROL_CLS}
        >
            {children}
        </select>
        {/* Custom dropdown arrow — replaces browser default */}
        <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
    </div>
);

// ─── Styled Date Input ────────────────────────────────────────────────────────

const DateInput = ({ value, onChange, placeholder, 'aria-label': ariaLabel }) => (
    <div className="relative flex-1 min-w-[130px]">
        {/* Calendar icon overlay — decorative */}
        <Calendar
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            aria-label={ariaLabel}
            placeholder={placeholder}
            className={`${CONTROL_CLS} pl-8 cursor-text`}
            style={{
                /* Normalize browser date-picker chrome to look like a text input */
                colorScheme: 'light',
            }}
        />
    </div>
);

// ─── Vertical Divider ─────────────────────────────────────────────────────────

const Divider = () => (
    <div className="h-5 w-px bg-slate-200 flex-shrink-0 self-center" />
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const AuditFilters = ({ filters, setFilters }) => {
    const set = (key, value) => setFilters(prev => ({ ...prev, [key]: value, page: 0 }));

    const hasActiveFilters =
        filters.search || filters.targetModel || filters.actorRole ||
        filters.startDate || filters.endDate ||
        filters.action_type || filters.severity || filters.outcome;

    return (
        <div className="w-full px-4 py-3 bg-white ring-1 ring-slate-900/5 rounded-xl shadow-sm mb-2">
            {/* ── Single unified filter bar ─────────────────────────────── */}
            <div className="flex items-center gap-2 flex-wrap">

                {/* Search — widest control */}
                <div className="relative flex-[2] min-w-[200px]">
                    <Search
                        size={13}
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        placeholder="Search by action, name…"
                        value={filters.search || ''}
                        onChange={(e) => set('search', e.target.value)}
                        aria-label="Search audit logs"
                        className={`${CONTROL_CLS} pl-8 cursor-text`}
                    />
                </div>

                <Divider />

                {/* Module */}
                <FilterSelect
                    aria-label="Filter by module"
                    value={filters.targetModel}
                    onChange={(v) => set('targetModel', v)}
                >
                    <option value="">All Modules</option>
                    <option value="Assignment">Assignments</option>
                    <option value="Auth">Authentication</option>
                    <option value="CalendarEvent">Calendar</option>
                    <option value="Examination">Examinations</option>
                    <option value="Fee">Fees</option>
                    <option value="Notice">Notices</option>
                    <option value="ProxyRequest">Proxy</option>
                    <option value="School">School</option>
                    <option value="User">Users</option>
                </FilterSelect>

                {/* Actor Role */}
                <FilterSelect
                    aria-label="Filter by actor role"
                    value={filters.actorRole}
                    onChange={(v) => set('actorRole', v)}
                >
                    <option value="">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                </FilterSelect>

                {/* Action Type */}
                <FilterSelect
                    aria-label="Filter by action type"
                    value={filters.action_type}
                    onChange={(v) => set('action_type', v)}
                >
                    <option value="">All Types</option>
                    <option value="LOGIN">Login</option>
                    <option value="LOGOUT">Logout</option>
                    <option value="CREATE">Create</option>
                    <option value="UPDATE">Update</option>
                    <option value="DELETE">Delete</option>
                    <option value="BROADCAST">Broadcast</option>
                </FilterSelect>

                {/* Severity */}
                <FilterSelect
                    aria-label="Filter by severity"
                    value={filters.severity}
                    onChange={(v) => set('severity', v)}
                >
                    <option value="">All Severities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                </FilterSelect>

                {/* Outcome */}
                <FilterSelect
                    aria-label="Filter by outcome"
                    value={filters.outcome}
                    onChange={(v) => set('outcome', v)}
                >
                    <option value="">All Outcomes</option>
                    <option value="SUCCESS">Success</option>
                    <option value="FAILED">Failed</option>
                </FilterSelect>

                <Divider />

                {/* Date range — always wraps as a pair, never splits */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <DateInput
                        aria-label="Start date"
                        value={filters.startDate}
                        onChange={(v) => set('startDate', v)}
                        placeholder="Start date"
                    />
                    <span className="text-slate-400 text-xs font-medium">to</span>
                    <DateInput
                        aria-label="End date"
                        value={filters.endDate}
                        onChange={(v) => set('endDate', v)}
                        placeholder="End date"
                    />
                </div>

                {/* Clear — only shown when any filter is active */}
                {hasActiveFilters && (
                    <>
                        <Divider />
                        <button
                            onClick={() => setFilters({ page: 0, limit: filters.limit ?? 25 })}
                            aria-label="Clear all filters"
                            className="flex-shrink-0 flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all duration-150 whitespace-nowrap"
                        >
                            <X size={12} />
                            Clear
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
