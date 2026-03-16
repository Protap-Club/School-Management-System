import React from 'react';
import { FaDownload, FaPaperclip, FaRegClock } from 'react-icons/fa';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const ITEMS_PER_PAGE = 25;

const PaginationControls = ({ currentPage, totalItems, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    const start = currentPage * ITEMS_PER_PAGE + 1;
    const end = Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalItems);

    return (
        <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50">
            <div className="text-xs text-gray-500">
                Showing <span className="font-medium text-gray-700">{start}</span> to <span className="font-medium text-gray-700">{end}</span> of <span className="font-medium text-gray-700">{totalItems}</span>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-md transition-colors font-medium"
                >
                    Prev
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i;
                    else if (currentPage < 3) pageNum = i;
                    else if (currentPage > totalPages - 4) pageNum = totalPages - 5 + i;
                    else pageNum = currentPage - 2 + i;
                    if (pageNum >= totalPages) return null;

                    return (
                        <button
                            key={pageNum}
                            onClick={() => onPageChange(pageNum)}
                            className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${currentPage === pageNum ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {pageNum + 1}
                        </button>
                    );
                })}
                <button
                    onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-md transition-colors font-medium"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

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

const FileDownloadLink = ({ file, tone = 'slate' }) => {
    const toneClasses = tone === 'indigo'
        ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100'
        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100';

    return (
        <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            download={file.originalName || file.name || 'attachment'}
            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${toneClasses}`}
        >
            <span className="flex min-w-0 items-center gap-2">
                <FaPaperclip size={11} />
                <span className="truncate">{file.originalName || file.name || 'Attachment'}</span>
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <FaDownload size={11} />
                Download
            </span>
        </a>
    );
};

export const AssignmentSubmissionTable = ({
    submissions,
    loading,
    currentPage = 0,
    totalItems = 0,
    onPageChange,
}) => {
    if (loading) {
        return (
            <div className="py-16 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 mx-auto"></div>
                <p className="text-gray-400 text-sm mt-3">Loading submitted assignments...</p>
            </div>
        );
    }

    if (!submissions || submissions.length === 0) {
        return (
            <div className="py-16 text-center">
                <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-gray-400 text-xl">S</span>
                </div>
                <p className="text-gray-500 text-sm font-medium">No submitted assignments found</p>
                <p className="text-gray-400 text-xs mt-1">Student submissions will appear here once they are turned in</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-gray-100 bg-gray-50/80 hover:bg-gray-50/80">
                            <TableHead className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignment</TableHead>
                            <TableHead className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</TableHead>
                            <TableHead className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</TableHead>
                            <TableHead className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Attachments</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {submissions.map((submission) => (
                            <TableRow
                                key={submission._id}
                                className="transition-colors hover:bg-indigo-50/20 border-b border-gray-50 last:border-0"
                            >
                                <TableCell className="px-5 py-4 align-top">
                                    <div className="text-sm font-semibold text-gray-900">{submission.assignment?.title || 'Untitled Assignment'}</div>
                                    <div className="mt-1 text-xs text-gray-500">
                                        {submission.assignment?.subject || 'Unknown Subject'}
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
                                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                                            {submission.assignment?.standard || '-'}-{submission.assignment?.section || '-'}
                                        </span>
                                        <span className={`rounded-full px-2 py-0.5 ${submission.assignment?.status === 'closed' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700'}`}>
                                            {submission.assignment?.status || 'active'}
                                        </span>
                                        {submission.assignment?.createdBy?.name && (
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                                                Teacher: {submission.assignment.createdBy.name}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="px-5 py-4 align-top">
                                    <div className="text-sm font-semibold text-gray-900">{submission.student?.name || 'Unknown Student'}</div>
                                    <div className="mt-1 text-xs text-gray-500">{submission.student?.email || 'No email'}</div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
                                        {submission.student?.rollNumber && (
                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                                                Roll: {submission.student.rollNumber}
                                            </span>
                                        )}
                                        {submission.student?.standard && submission.student?.section && (
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                                                {submission.student.standard}-{submission.student.section}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="px-5 py-4 align-top">
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                        <FaRegClock className="text-gray-400" size={12} />
                                        <span>{formatDateTime(submission.submittedAt)}</span>
                                    </div>
                                    <div className="mt-2">
                                        <Badge
                                            variant="outline"
                                            className={submission.isLate ? 'bg-red-50 text-red-700 border-red-200 shadow-sm' : 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'}
                                        >
                                            {submission.isLate ? 'Late Submission' : 'On Time'}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="px-5 py-4 align-top">
                                    <div className="space-y-2">
                                        <div>
                                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                                Assignment Materials
                                            </div>
                                            <div className="space-y-2">
                                                {(submission.assignment?.attachments || []).length > 0 ? (
                                                    (submission.assignment.attachments || []).map((file) => (
                                                        <FileDownloadLink
                                                            key={`material-${file.publicId || file.url}`}
                                                            file={file}
                                                            tone="indigo"
                                                        />
                                                    ))
                                                ) : (
                                                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">
                                                        No materials attached
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                                Student Files
                                            </div>
                                            <div className="space-y-2">
                                                {(submission.files || []).map((file) => (
                                                    <FileDownloadLink
                                                        key={`submission-${file.publicId || file.url}`}
                                                        file={file}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            {onPageChange && (
                <PaginationControls
                    currentPage={currentPage}
                    totalItems={totalItems}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    );
};
