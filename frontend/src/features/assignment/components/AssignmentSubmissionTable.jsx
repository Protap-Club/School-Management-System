import React from 'react';
import { FaDownload, FaEye, FaPaperclip, FaRegClock } from 'react-icons/fa';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AssignmentPaginationControls } from './AssignmentPaginationControls';

const formatDateTime = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown';

    return parsed.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

export const AssignmentSubmissionTable = ({
    submissions,
    loading,
    currentPage = 0,
    totalItems = 0,
    pageSize = 25,
    onPageChange,
    onPageSizeChange,
    onViewClick,
}) => {
    if (loading) {
        return (
            <div className="py-16 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 mx-auto"></div>
                <p className="text-slate-400 text-sm mt-3">Loading submitted assignments...</p>
            </div>
        );
    }

    if (!submissions || submissions.length === 0) {
        return (
            <div className="py-16 text-center">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-slate-400 text-xl">S</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">No submitted assignments found</p>
                <p className="text-slate-400 text-xs mt-1">Student submissions will appear here once they are turned in</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80">
                            <TableHead className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Assignment</TableHead>
                            <TableHead className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Student</TableHead>
                            <TableHead className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Submitted</TableHead>
                            <TableHead className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Files</TableHead>
                            <TableHead className="w-24 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">View</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {submissions.map((submission) => {
                            const materialsCount = submission.assignment?.attachments?.length || 0;
                            const studentFilesCount = submission.files?.length || 0;
                            const latestFile = submission.files?.[0];

                            return (
                                <TableRow
                                    key={submission._id}
                                    className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-indigo-50/20 last:border-0"
                                    onClick={() => onViewClick?.(submission)}
                                >
                                    <TableCell className="px-4 py-3.5 align-top">
                                        <div className="text-sm font-semibold text-slate-900">
                                            {submission.assignment?.title || 'Untitled Assignment'}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            {submission.assignment?.subject || 'Unknown Subject'}
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
                                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                                                {submission.assignment?.standard || '-'}-{submission.assignment?.section || '-'}
                                            </span>
                                            <span className={`rounded-full px-2 py-0.5 ${submission.assignment?.status === 'closed' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700'}`}>
                                                {submission.assignment?.status || 'active'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3.5 align-top">
                                        <div className="text-sm font-semibold text-slate-900">
                                            {submission.student?.name || 'Unknown Student'}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            {submission.student?.email || 'No email'}
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
                                            {submission.student?.rollNumber && (
                                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                                                    Roll {submission.student.rollNumber}
                                                </span>
                                            )}
                                            {submission.student?.standard && submission.student?.section && (
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                                                    {submission.student.standard}-{submission.student.section}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3.5 align-top">
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                            <FaRegClock className="text-slate-400" size={12} />
                                            <span>{formatDateTime(submission.submittedAt)}</span>
                                        </div>
                                        <div className="mt-2">
                                            <Badge
                                                variant="outline"
                                                className={submission.isLate ? 'border-red-200 bg-red-50 text-red-700 shadow-sm' : 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm'}
                                            >
                                                {submission.isLate ? 'Late' : 'On Time'}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3.5 align-top">
                                        <div className="space-y-2 text-xs text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <FaPaperclip size={11} className="text-indigo-500" />
                                                <span>{materialsCount} material{materialsCount === 1 ? '' : 's'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FaDownload size={11} className="text-slate-400" />
                                                <span>{studentFilesCount} student file{studentFilesCount === 1 ? '' : 's'}</span>
                                            </div>
                                            {latestFile && (
                                                <div className="truncate rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                                                    {latestFile.originalName || latestFile.name || 'Attachment'}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3.5 text-right">
                                        <button
                                            onClick={(event) => { event.stopPropagation(); onViewClick?.(submission); }}
                                            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                                            title="View Details"
                                        >
                                            <FaEye size={13} />
                                        </button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            {onPageChange && (
                <AssignmentPaginationControls
                    currentPage={currentPage}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                />
            )}
        </div>
    );
};
