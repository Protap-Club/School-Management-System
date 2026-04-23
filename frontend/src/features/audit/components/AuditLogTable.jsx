import React, { useState } from 'react';
import { SkeletonRows } from '@/components/ui/SkeletonRows';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

// ─── Timestamp ───────────────────────────────────────────────────────────────

const formatTimestamp = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { dateLabel: '—', timeLabel: '—' };
    return {
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timeLabel: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };
};

// ─── Action Type Badge ────────────────────────────────────────────────────────

const ACTION_TYPE_STYLES = {
    LOGIN:     'bg-slate-100  text-slate-700  ring-slate-200',
    LOGOUT:    'bg-slate-100  text-slate-600  ring-slate-200',
    CREATE:    'bg-blue-50    text-blue-700   ring-blue-200',
    UPDATE:    'bg-amber-50   text-amber-700  ring-amber-200',
    DELETE:    'bg-red-50     text-red-700    ring-red-200',
    BROADCAST: 'bg-violet-50  text-violet-700 ring-violet-200',
};

/**
 * Client-side fallback: derive action_type from the raw action string for
 * documents written before the action_type field was added to the schema.
 */
const CLIENT_ACTION_TYPE_MAP = {
    'login.success':                    'LOGIN',
    'login.failed':                     'LOGIN',
    'logout':                           'LOGOUT',
    'password_reset.used':              'UPDATE',
    'user.created':                     'CREATE',
    'user.updated':                     'UPDATE',
    'user.deleted':                     'DELETE',
    'user.bulk_action':                 'UPDATE',
    'fees.payment_recorded':            'CREATE',
    'fees.salary_updated':              'UPDATE',
    'exam.status_changed':              'UPDATE',
    'school.feature_flag_toggled':      'UPDATE',
    'school.profile_updated':           'UPDATE',
    'notice.broadcast':                 'BROADCAST',
    'proxy.substitute_assigned':        'CREATE',
    'proxy.request_created':            'CREATE',
    'proxy.free_period_marked':         'UPDATE',
    'proxy.direct_assignment_created':  'CREATE',
    'proxy.request_cancelled':          'DELETE',
    'assignment.created':               'CREATE',
    'assignment.updated':               'UPDATE',
    'assignment.deleted':               'DELETE',
    'assignment.submitted':             'CREATE',
    'calendar.event_created':           'CREATE',
    'calendar.event_updated':           'UPDATE',
    'calendar.event_deleted':           'DELETE',
};

const resolveActionType = (log) =>
    log.action_type ?? CLIENT_ACTION_TYPE_MAP[log.action] ?? null;

const ActionTypeBadge = ({ type }) => {
    if (!type) return <span className="text-slate-400 text-xs italic">—</span>;
    const style = ACTION_TYPE_STYLES[type] ?? 'bg-slate-50 text-slate-500 ring-slate-200';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset ${style}`}>
            {type}
        </span>
    );
};

// ─── Severity Dot ─────────────────────────────────────────────────────────────

const SEVERITY_DOT = {
    LOW:    'bg-emerald-400',
    MEDIUM: 'bg-amber-400',
    HIGH:   'bg-red-500',
};

const SEVERITY_LABEL = {
    LOW:    'text-emerald-700',
    MEDIUM: 'text-amber-700',
    HIGH:   'text-red-700',
};

const SeverityDot = ({ level }) => {
    if (!level) return null;
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[level] ?? 'bg-slate-300'}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${SEVERITY_LABEL[level] ?? 'text-slate-500'}`}>
                {level}
            </span>
        </span>
    );
};

// ─── Outcome Pill ─────────────────────────────────────────────────────────────

const OutcomePill = ({ outcome }) => {
    if (!outcome) return null;
    const isSuccess = outcome === 'SUCCESS';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            isSuccess
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200'
        }`}>
            {isSuccess ? '✓ Success' : '✗ Failed'}
        </span>
    );
};

// ─── Actor Role Badge (matches existing teal/green palette) ───────────────────

const ROLE_STYLES = {
    super_admin: 'bg-purple-100 text-purple-700',
    admin:       'bg-blue-100   text-blue-700',
    teacher:     'bg-emerald-100 text-emerald-700',
};

const ActorRoleBadge = ({ role }) => {
    const style = ROLE_STYLES[role] ?? 'bg-slate-100 text-slate-600';
    return (
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-max ${style}`}>
            {role ? role.replace('_', ' ') : 'System'}
        </span>
    );
};

// ─── Changes Diff Table ───────────────────────────────────────────────────────

const ChangesDiffTable = ({ changes }) => {
    if (!Array.isArray(changes) || changes.length === 0) return null;
    return (
        <div className="mt-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 pb-1.5 border-b border-slate-100">Fields Changed</p>
            <table className="w-full text-xs border-collapse">
                <thead>
                    <tr className="border-b border-slate-100">
                        <th className="text-left py-1.5 pr-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-1/4">Field</th>
                        <th className="text-left py-1.5 pr-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-[37.5%]">Before</th>
                        <th className="text-left py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-[37.5%]">After</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {changes.map((c, i) => (
                        <tr key={i}>
                            <td className="py-1.5 pr-4 font-mono text-slate-500 font-normal">{c.field}</td>
                            <td className="py-1.5 pr-2">
                                <span className="font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                    {c.before !== undefined ? String(c.before) : '—'}
                                </span>
                            </td>
                            <td className="py-1.5">
                                <span className="font-mono text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                    {c.after !== undefined ? String(c.after) : '—'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ─── Expanded Row Panel ───────────────────────────────────────────────────────

const ExpandedPanel = ({ log }) => {
    const sessionId = log.session_id;
    const changes = log.metadata?.changes;
    // Gate diff on resolved action type — handles both DB field and legacy client-side fallback
    const resolvedType = resolveActionType(log);
    const hasChanges =
        resolvedType === 'UPDATE' &&
        Array.isArray(changes) &&
        changes.length > 0;
    // Show the full target ID (Module column only shows last-6 chars)
    const fullTargetId = log.targetId ? String(log.targetId) : null;

    return (
        <tr>
            <td colSpan={8} className="px-0 py-0">
                <div className="mx-0 bg-slate-50/70 border-t border-b border-slate-100 px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm animate-fadeIn">
                    {/* Full Resource ID — expanded view of the truncated Module shortId chip */}
                    {fullTargetId && (
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 pb-1 border-b border-slate-100">
                                Resource
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {log.targetModel && (
                                    <span className="text-slate-700 font-semibold">{log.targetModel}</span>
                                )}
                                <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded select-all">
                                    {fullTargetId}
                                </span>
                                <ExternalLink size={12} className="text-slate-400 flex-shrink-0" />
                            </div>
                        </div>
                    )}

                    {/* Session ID */}
                    {sessionId && (
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 pb-1 border-b border-slate-100">Session</p>
                            <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded select-all">
                                {sessionId}
                            </span>
                        </div>
                    )}

                    {/* Changes diff — only for UPDATE actions with a non-empty changes array */}
                    {hasChanges && (
                        <div className="md:col-span-3 border-t border-slate-100 pt-4">
                            <ChangesDiffTable changes={changes} />
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = () => (
    <tr>
        <td colSpan={7} className="py-8 sm:py-16 text-center">
            <svg className="mx-auto h-10 w-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-semibold text-slate-600">No audit logs found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or date range.</p>
        </td>
    </tr>
);

// ─── Data Row ─────────────────────────────────────────────────────────────────

const AuditLogRow = ({ log }) => {
    const [expanded, setExpanded] = useState(false);
    const [summaryExpanded, setSummaryExpanded] = useState(false);
    const { dateLabel, timeLabel } = formatTimestamp(log.createdAt);

    // Resolve action_type: use stored field first, fall back to client-side map
    // for documents written before the action_type field was added.
    const resolvedType = resolveActionType(log);

    const actorName = log.actorId?.name ?? 'System';
    const moduleName = log.targetModel ?? (log.action?.includes('login') || log.action?.includes('logout') ? 'Auth' : 'System');
    const moduleId = log.targetId ? String(log.targetId).slice(-6) : null;
    const ip = log.ip === '::1' || log.ip === '127.0.0.1' ? 'localhost' : (log.ip ?? '—');
    const client = log.userAgent ?? 'Unknown';

    // Truncation threshold for description summary
    const SUMMARY_LIMIT = 72;
    const needsTruncation = (log.description?.length ?? 0) > SUMMARY_LIMIT;

    const hasExpandable = log.session_id || log.targetId || log.metadata?.changes;

    return (
        <>
            <tr
                onClick={() => hasExpandable && setExpanded(e => !e)}
                className={`border-b border-slate-100 transition-colors duration-100 group
                    ${hasExpandable ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/40'}
                    ${expanded ? 'bg-slate-50' : ''}
                `}
            >
                {/* Expand toggle */}
                <td className="pl-4 pr-1 py-3 w-6 text-slate-300">
                    {hasExpandable && (
                        expanded
                            ? <ChevronDown size={14} className="text-slate-400" />
                            : <ChevronRight size={14} className="group-hover:text-slate-500 transition-colors" />
                    )}
                </td>

                {/* Timestamp */}
                <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-700">{dateLabel}</span>
                        <span className="text-[11px] text-slate-400 tabular-nums">{timeLabel}</span>
                    </div>
                </td>

                {/* Action type badge — uses resolved type (DB field or client fallback) */}
                <td className="px-3 py-3 whitespace-nowrap">
                    <ActionTypeBadge type={resolvedType} />
                </td>

                {/* Summary (shortened description) with Read more toggle */}
                <td className="px-3 py-3 max-w-[260px]">
                    <span className="text-sm text-slate-700 leading-snug whitespace-normal">
                        {needsTruncation && !summaryExpanded
                            ? log.description.slice(0, SUMMARY_LIMIT) + '…'
                            : log.description}
                    </span>
                    {needsTruncation && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setSummaryExpanded(v => !v); }}
                            className="ml-1 text-[11px] font-semibold text-blue-500 hover:text-blue-700 hover:underline focus:outline-none whitespace-nowrap"
                        >
                            {summaryExpanded ? 'Read less' : 'Read more'}
                        </button>
                    )}
                </td>

                {/* Severity + Outcome */}
                <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                        <SeverityDot level={log.severity} />
                        <OutcomePill outcome={log.outcome} />
                    </div>
                </td>

                {/* Actor */}
                <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-slate-700">{actorName}</span>
                        <ActorRoleBadge role={log.actorRole} />
                    </div>
                </td>

                {/* Module */}
                <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-slate-700 font-medium">{moduleName}</span>
                        {moduleId && (
                            <span
                                className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded w-max select-all"
                                title={log.targetId}
                            >
                                {moduleId}
                            </span>
                        )}
                    </div>
                </td>

                {/* IP / Client */}
                <td className="px-3 pr-5 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded w-max">
                            {ip}
                        </span>
                        <span className="text-[11px] text-slate-400">{client}</span>
                    </div>
                </td>
            </tr>

            {expanded && <ExpandedPanel log={log} />}
        </>
    );
};

// ─── Table Header ─────────────────────────────────────────────────────────────

const TH = ({ children, className = '' }) => (
    <th className={`px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap ${className}`}>
        {children}
    </th>
);

// ─── Main Export ──────────────────────────────────────────────────────────────

export const AuditLogTable = ({ logs, isLoading }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="w-6 pl-4" />
                        <TH>Timestamp</TH>
                        <TH>Type</TH>
                        <TH>Summary</TH>
                        <TH>Severity / Outcome</TH>
                        <TH>Actor</TH>
                        <TH>Module</TH>
                        <TH className="pr-5">IP / Client</TH>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                    {isLoading ? (
                        <SkeletonRows rows={8} columns={8} cellClass="px-3 py-3" barClass="h-3.5 rounded w-3/4" rowHeight="48px" />
                    ) : !logs || logs.length === 0 ? (
                        <EmptyState />
                    ) : (
                        logs.map(log => <AuditLogRow key={log._id} log={log} />)
                    )}
                </tbody>
            </table>
        </div>
    );
};
