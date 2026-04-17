import React from 'react';
import { SkeletonRows } from '@/components/ui/SkeletonRows';

const formatTimestamp = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return { dateLabel: '-', timeLabel: '-' };
    }

    return {
        dateLabel: date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }),
        timeLabel: date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }),
    };
};

export const AuditLogTable = ({ logs, isLoading }) => {
    if (isLoading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">Action</th>
                            <th className="px-6 py-4">Actor</th>
                            <th className="px-6 py-4">Target / Module</th>
                            <th className="px-6 py-4">Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        <SkeletonRows rows={5} columns={5} />
                    </tbody>
                </table>
            </div>
        );
    }

    if (!logs || logs.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="text-slate-400 mb-3">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-sm font-semibold text-slate-700">No Audit Logs Found</h3>
                <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or date range.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">Action Details</th>
                            <th className="px-6 py-4">Actor</th>
                            <th className="px-6 py-4">Module</th>
                            <th className="px-6 py-4">Source (IP/Client)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80">
                        {logs.map((log) => {
                            const { dateLabel, timeLabel } = formatTimestamp(log.createdAt);
                            return (
                            <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-700">
                                            {dateLabel}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {timeLabel}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-800 break-words whitespace-normal max-w-md">
                                    {log.description}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-slate-700">
                                            {log.actorId ? (log.actorId.name || 'Unknown User') : 'System'}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider w-max px-2 py-0.5 rounded-full mt-1 ${
                                            log.actorRole === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                                            log.actorRole === 'admin' ? 'bg-blue-100 text-blue-700' :
                                            log.actorRole === 'teacher' ? 'bg-emerald-100 text-emerald-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            {log.actorRole ? log.actorRole.replace('_', ' ') : 'System'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className={`font-medium ${!log.targetModel ? 'text-slate-500 italic text-xs' : 'text-slate-800'}`}>
                                            {log.targetModel || (log.action?.includes('LOG') ? 'Authentication' : 'System')}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono mt-0.5" title={log.targetId}>{log.targetId ? log.targetId.slice(-6) : ''}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded w-max">
                                            {log.ip === '::1' || log.ip === '127.0.0.1' ? 'localhost' : log.ip || 'Unknown IP'}
                                        </span>
                                        <span className="text-xs text-slate-400 mt-1">
                                            {log.userAgent || 'Unknown Client'}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
