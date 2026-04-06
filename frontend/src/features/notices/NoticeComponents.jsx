import React, { useState, useRef } from 'react';
import {
    FaCheck, FaCircleNotch, FaTimes, FaDownload, FaPaperclip, FaPaperPlane, FaTrash, FaUpload,
    FaFilePdf, FaFileWord, FaFilePowerpoint, FaFileExcel, FaFileAlt, FaImage, FaFileVideo
} from 'react-icons/fa';
import { getFileIcon, getRecipientLabel } from './NoticeUtils';
import { useAcknowledgeNotice, useAcknowledgments } from './api/queries';
import { MODAL_OVERLAY, RECIPIENT_LABELS } from './noticeConstants';
import { SearchableList, RadioOption } from '../../components/ui/NoticeUIComponents';

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'ppt', 'pptx', 'xls', 'xlsx', 'mp4', 'mov', 'avi', 'csv', 'txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 3;

const getNoticeAttachments = (item) => {
    const attachments = [];

    if (item?.attachment?.filename || item?.attachment?.path || item?.attachment?.secure_url) {
        attachments.push(item.attachment);
    }

    if (Array.isArray(item?.attachments) && item.attachments.length > 0) {
        attachments.push(...item.attachments);
    }

    return attachments.filter(Boolean);
};

export const NoticeAttachmentList = ({ item, handleDownload, title = 'Attachments' }) => {
    const attachments = getNoticeAttachments(item);

    if (attachments.length === 0) {
        return null;
    }

    return (
        <div>
            <h5 className="text-sm font-medium text-gray-900 mb-3">
                {title} {attachments.length > 1 ? `(${attachments.length})` : ''}
            </h5>
            <div className="space-y-2">
                {attachments.map((attachment, index) => {
                    const fileName = attachment.originalName || attachment.filename || `Attachment ${index + 1}`;
                    const label = attachment.label || '';

                    return (
                        <button
                            key={`${attachment.public_id || attachment.filename || attachment.path || fileName}-${index}`}
                            onClick={() => handleDownload(
                                attachment.secure_url || attachment.path,
                                fileName
                            )}
                            className="w-full flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group text-left overflow-hidden"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                                <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                    {getFileIcon(fileName)}
                                </div>
                                <div className="min-w-0 overflow-hidden">
                                    <p className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors truncate" title={fileName}>
                                        {fileName}
                                    </p>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                                        {label ? `${label} • ` : ''}
                                        {((fileName || '').split('.').pop()) || 'File'}
                                    </p>
                                </div>
                            </div>
                            <div className="p-2 text-gray-400 group-hover:text-primary group-hover:bg-primary/5 rounded-lg transition-colors shrink-0">
                                <FaDownload size={14} />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export const ReceiverAckButton = ({ noticeId, currentUserId, acknowledgments = [] }) => {
    const isAcknowledged = acknowledgments.some(a =>
        a.userId === currentUserId || (a.userId && a.userId._id === currentUserId)
    );
    const ackMutation = useAcknowledgeNotice(noticeId);
    const [showModal, setShowModal] = useState(false);
    const [responseText, setResponseText] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const fileInputRef = useRef(null);
    const [ackToast, setAckToast] = useState(null);

    const showAckToast = (type, text) => {
        setAckToast({ type, text });
        setTimeout(() => setAckToast(null), 4000);
    };

    const canSubmit = responseText.trim().length >= 2 || selectedFiles.length > 0;

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const validFiles = [];
        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                showAckToast('error', `File "${file.name}" exceeds 10MB limit`);
                continue;
            }
            const extension = file.name.split('.').pop()?.toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(extension)) {
                showAckToast('error', `File type ".${extension}" is not allowed`);
                continue;
            }
            validFiles.push(file);
        }

        const newFiles = [...selectedFiles, ...validFiles].slice(0, MAX_FILES);
        setSelectedFiles(newFiles);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Already acknowledged — show green pill
    if (isAcknowledged) {
        return (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/80 border border-emerald-200/60 text-emerald-700 font-medium text-[12px] shadow-[0_1px_2px_rgba(16,185,129,0.05)] tracking-wide">
                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                    <FaCheck className="text-[9px]" />
                </div>
                <span>Acknowledged</span>
            </div>
        );
    }

    const handleSubmit = () => {
        ackMutation.mutate(
            { responseMessage: responseText.trim(), files: selectedFiles },
            {
                onSuccess: () => {
                    setShowModal(false);
                    setResponseText('');
                    setSelectedFiles([]);
                    showAckToast('success', 'Acknowledgment sent successfully');
                },
                onError: (error) => {
                    const msg = error?.response?.data?.message || 'Failed to send acknowledgment';
                    showAckToast('error', msg);
                }
            }
        );
    };

    return (
        <>
            {ackToast && (
                <div className={`fixed top-6 right-6 z-[110] px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-fadeIn ${ackToast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                        {ackToast.type === 'success' ? <FaCheck size={10} /> : <FaTimes size={10} />}
                    </div>
                    <span className="text-sm font-medium">{ackToast.text}</span>
                </div>
            )}
            <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0F5FF] hover:bg-[#E5EDFF] border border-blue-200/60 text-[#2563EB] font-medium text-[12px] tracking-wide transition-all duration-200 hover:shadow-[0_2px_4px_rgba(37,99,235,0.08)] group cursor-pointer"
            >
                <div className="w-4 h-4 rounded border-2 border-[#60A5FA] group-hover:border-[#3B82F6] group-hover:bg-[#3B82F6] text-white flex items-center justify-center transition-all duration-200">
                    <FaCheck className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 scale-50 group-hover:scale-100" />
                </div>
                <span>Pending Acknowledgment</span>
            </button>

            {/* Acknowledgment Response Modal */}
            {showModal && (
                <div className={MODAL_OVERLAY} onClick={() => setShowModal(false)}>
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <FaCheck size={14} />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900">Send Acknowledgment</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Add a message or attach files to confirm you’ve read this notice.</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Message</label>
                                    <span className="text-[11px] text-gray-400">{responseText.length}/500</span>
                                </div>
                                <textarea
                                    value={responseText}
                                    onChange={(e) => setResponseText(e.target.value)}
                                    maxLength={500}
                                    rows={3}
                                    placeholder="Type your response..."
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all bg-gray-50/60"
                                />
                            </div>
                            <div className="border border-gray-200 rounded-xl p-4 bg-white">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Attachments</label>
                                    <span className="text-[11px] text-gray-400">{selectedFiles.length}/{MAX_FILES}</span>
                                </div>
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        multiple
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx,.xls,.xlsx,.mp4,.mov,.avi,.csv,.txt"
                                        className="hidden"
                                    />
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        {selectedFiles.length > 0 ? (
                                            <>
                                                <div className="w-full space-y-2">
                                                    {selectedFiles.map((file, index) => (
                                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                {getFileIcon(file.name)}
                                                                <div className="min-w-0">
                                                                    <span className="text-xs text-gray-700 truncate block">{file.name}</span>
                                                                    <span className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => removeFile(index)}
                                                                className="text-gray-400 hover:text-red-500 p-1"
                                                            >
                                                                <FaTrash size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                {selectedFiles.length < MAX_FILES && (
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="text-xs text-primary hover:underline"
                                                    >
                                                        + Add more files
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex flex-col items-center gap-1 text-gray-500 hover:text-primary transition-colors"
                                            >
                                                <FaUpload size={18} />
                                                <span className="text-xs">Attach files (max {MAX_FILES}, 10MB each)</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-2">Allowed: PDF, DOC/DOCX, JPG/PNG, PPT/PPTX, XLS/XLSX, MP4/MOV/AVI, CSV, TXT</p>
                            </div>
                            <div className={`text-xs ${canSubmit ? 'text-emerald-600' : 'text-gray-400'}`}>
                                {canSubmit ? 'Ready to acknowledge' : 'Add a message (min 2 chars) or at least 1 attachment'}
                            </div>
                        </div>
                        <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
                            <button
                                onClick={() => { setShowModal(false); setResponseText(''); setSelectedFiles([]); }}
                                disabled={ackMutation.isPending}
                                className="flex-1 px-3 py-2 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={ackMutation.isPending || !canSubmit}
                                className="flex-1 px-3 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {ackMutation.isPending ? (
                                    <><FaCircleNotch className="animate-spin text-xs" /> Submitting...</>
                                ) : (
                                    <><FaCheck size={11} /> Acknowledge</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export const AcknowledgmentPanel = ({ noticeId, handleDownload }) => {
    const { data: ackData, isLoading, isError } = useAcknowledgments(noticeId);

    if (isLoading) {
        return <div className="py-4 flex justify-center"><FaCircleNotch className="animate-spin text-primary" size={20} /></div>;
    }

    if (isError || !ackData?.success) {
        return <div className="text-sm text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">Failed to load acknowledgment status.</div>;
    }

    const { acknowledgedCount, pendingCount, acknowledged, pending, note } = ackData.data;
    const totalCount = pendingCount !== null ? acknowledgedCount + pendingCount : null;
    const progressPercent = totalCount > 0 ? Math.round((acknowledgedCount / totalCount) * 100) : 0;
    const pendingStudents = pending.filter((u) => u.role === 'student');
    const pendingTeachers = pending.filter((u) => u.role === 'teacher');
    const pendingOthers = pending.filter((u) => u.role !== 'student' && u.role !== 'teacher');

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-4">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <h5 className="text-sm font-semibold text-gray-900 flex items-center justify-between">
                    Acknowledgment Status
                    {totalCount !== null && (
                        <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                            {progressPercent}% completed ({acknowledgedCount}/{totalCount})
                        </span>
                    )}
                </h5>
                {totalCount !== null && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div className="bg-primary h-1.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                )}
            </div>

            <div className="p-4 space-y-4">
                {note && <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">{note}</p>}

                <div>
                    <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex flex-wrap gap-2 items-center">
                        Acknowledged <span className="bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[10px]">{acknowledgedCount}</span>
                    </h6>
                    {acknowledged.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No one has acknowledged yet.</p>
                    ) : (
                        <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {acknowledged.map((u, i) => (
                                <li key={i} className="text-sm py-1.5 border-b border-gray-50 last:border-0">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-800">{u.name} <span className="text-gray-400 font-normal text-xs ml-1">({u.role})</span></span>
                                        <span className="text-xs text-gray-500">{new Date(u.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    {u.responseMessage && (
                                        <p className="text-xs text-gray-500 italic mt-0.5 ml-0.5 line-clamp-2">"{u.responseMessage}"</p>
                                    )}
                                    {u.attachments && u.attachments.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {u.attachments.map((att, attIndex) => {
                                                const fileName = att.originalName || att.filename || 'attachment';
                                                const fileExt = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                                                return (
                                                    <button
                                                        key={attIndex}
                                                        onClick={() => handleDownload?.(att.secure_url || att.path, fileName)}
                                                        className="flex items-center justify-between w-full p-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors group"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            <div className="shrink-0">
                                                                {getFileIcon(fileName)}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs font-medium text-gray-700 truncate">{fileName}</p>
                                                                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{fileExt}</p>
                                                            </div>
                                                        </div>
                                                        <div className="p-1.5 text-gray-400 group-hover:text-primary group-hover:bg-primary/5 rounded-lg transition-colors shrink-0">
                                                            <FaDownload size={12} />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {pendingCount !== null && pendingCount > 0 && (
                    <div className="pt-4 border-t border-gray-100 space-y-3">
                        <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            Pending <span className="bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded text-[10px]">{pendingCount}</span>
                        </h6>
                        {pendingStudents.length > 0 && (
                            <div>
                                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    Students <span className="ml-1 text-amber-600">({pendingStudents.length})</span>
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                                    {pendingStudents.map((u, i) => (
                                        <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-600 text-xs border border-gray-200">
                                            {u.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {pendingTeachers.length > 0 && (
                            <div>
                                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    Teachers <span className="ml-1 text-amber-600">({pendingTeachers.length})</span>
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                                    {pendingTeachers.map((u, i) => (
                                        <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-600 text-xs border border-gray-200">
                                            {u.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {pendingOthers.length > 0 && (
                            <div>
                                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    Others <span className="ml-1 text-amber-600">({pendingOthers.length})</span>
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                                    {pendingOthers.map((u, i) => (
                                        <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-600 text-xs border border-gray-200">
                                            {u.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export const ViewItemModal = ({ viewItem, setViewItem, handleDownload }) => {
    if (!viewItem) return null;

    return (
        <div className={MODAL_OVERLAY}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">Notice Details</h3>
                    <button onClick={() => setViewItem(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><FaTimes className="text-gray-400" size={16} /></button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${viewItem.type === 'notice' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                            {viewItem.type === 'notice' ? <FaPaperPlane size={20} /> : <FaPaperclip size={20} />}
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-gray-900">{viewItem.title}</h4>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                <span>{new Date(viewItem.createdAt).toLocaleDateString()}</span><span>•</span><span>{getRecipientLabel(viewItem)}</span>
                            </div>
                            {viewItem.requiresAcknowledgment === true && (
                                <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                                    <FaCheck size={9} /> Acknowledgment Required
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{viewItem.message}</div>
                    <NoticeAttachmentList item={viewItem} handleDownload={handleDownload} />

                    {/* Acknowledgment Status Panel — sender view */}
                    {viewItem.requiresAcknowledgment === true && (
                        <AcknowledgmentPanel noticeId={viewItem._id} handleDownload={handleDownload} />
                    )}

                    <div className="pt-2">
                        <button onClick={() => setViewItem(null)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const SendModal = ({
    showSendModal, setShowSendModal,
    isAdmin, isTeacher,
    sendOption, setSendOption,
    searchTerm, setSearchTerm,
    userRoleFilter, setUserRoleFilter,
    classes, selectedClasses, setSelectedClasses,
    allUsers, selectedUsers, setSelectedUsers,
    students, selectedStudents, setSelectedStudents,
    groups, selectedGroups, setSelectedGroups,
    toggleSelection,
    isSending, handleFinalSend
}) => {
    if (!showSendModal) return null;
    const filteredUsers = userRoleFilter === 'all'
        ? allUsers
        : allUsers.filter(u => u.role === userRoleFilter);

    const renderGroupsOption = () => groups.length > 0 && (
        <RadioOption
            value="groups" title="Custom Groups" subtitle="Your created groups"
            sendOption={sendOption} setSendOption={setSendOption} setSearchTerm={setSearchTerm}
            expandedContent={
                <SearchableList
                    items={groups}
                    selectedArr={selectedGroups}
                    setSelectedArr={setSelectedGroups}
                    searchField={g => g.name}
                    placeholder="Search groups..."
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    toggleSelection={toggleSelection}
                    renderLabel={group => (
                        <><span className="text-sm">{group.name}</span><span className="text-xs text-gray-400">({(group.members || []).length})</span></>
                    )}
                />
            }
        />
    );

    return (
        <div className={MODAL_OVERLAY}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><FaPaperPlane className="text-primary" size={16} /></div>
                        <h3 className="text-lg font-semibold text-gray-900">Send Notice</h3>
                    </div>
                    <button onClick={() => setShowSendModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><FaTimes className="text-gray-400" size={16} /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-gray-500 mb-4">Choose who should receive this notice:</p>
                    {isAdmin && (
                        <div className="space-y-3">
                            <RadioOption value="school" title="Entire School" subtitle="All teachers and students" sendOption={sendOption} setSendOption={setSendOption} setSearchTerm={setSearchTerm} />
                            <RadioOption value="classes" title="Specific Classes" subtitle="Select one or more classes" sendOption={sendOption} setSendOption={setSendOption} setSearchTerm={setSearchTerm} expandedContent={
                                <SearchableList items={classes} selectedArr={selectedClasses} setSelectedArr={setSelectedClasses} searchField={c => c.label} placeholder="Search classes..." searchTerm={searchTerm} setSearchTerm={setSearchTerm} toggleSelection={toggleSelection} />
                            } />
                            <RadioOption value="users" title="Specific Users" subtitle="Select individual users" sendOption={sendOption} setSendOption={setSendOption} setSearchTerm={setSearchTerm} expandedContent={
                                <>
                                    <div className="flex items-center gap-2 mb-2">
                                        {['all', 'student', 'teacher'].map(role => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUserRoleFilter(role);
                                                }}
                                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                                    userRoleFilter === role
                                                        ? 'bg-primary text-white border-primary'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                {role === 'all' ? 'All' : role === 'student' ? 'Students' : 'Teachers'}
                                            </button>
                                        ))}
                                    </div>
                                    <SearchableList
                                        items={filteredUsers}
                                        selectedArr={selectedUsers}
                                        setSelectedArr={setSelectedUsers}
                                        searchField={u => `${u.name || ''} ${u.role || ''}`}
                                        placeholder="Search users..."
                                        searchTerm={searchTerm}
                                        setSearchTerm={setSearchTerm}
                                        toggleSelection={toggleSelection}
                                        hideUntilSearch
                                        minSearchLength={2}
                                        emptyLabel="Type at least 2 characters to search users"
                                        renderLabel={user => (
                                            <><span className="flex-1 truncate text-sm">{user.name}</span><span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${user.role === 'teacher' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>{user.role}</span></>
                                        )}
                                    />
                                </>
                            } />
                            {renderGroupsOption()}
                        </div>
                    )}
                    {isTeacher && (
                        <div className="space-y-3">
                            <RadioOption value="allStudents" title="All Students" subtitle="Your assigned class students" sendOption={sendOption} setSendOption={setSendOption} setSearchTerm={setSearchTerm} />
                            <RadioOption value="students" title="Specific Students" subtitle="Select individual students" sendOption={sendOption} setSendOption={setSendOption} setSearchTerm={setSearchTerm} expandedContent={
                                <SearchableList items={students} selectedArr={selectedStudents} setSelectedArr={setSelectedStudents} searchField={s => s.name} placeholder="Search students..." searchTerm={searchTerm} setSearchTerm={setSearchTerm} toggleSelection={toggleSelection} />
                            } />
                            {renderGroupsOption()}
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={() => setShowSendModal(false)}
                        disabled={isSending}
                        className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleFinalSend}
                        disabled={isSending}
                        className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Sending...
                            </>
                        ) : (
                            <>
                                <FaPaperPlane size={12} />
                                Send Now
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
