import React, { useState } from 'react';
import {
    FaCheck, FaCircleNotch, FaTimes, FaDownload, FaPaperclip, FaPaperPlane,
    FaFilePdf, FaFileWord, FaFilePowerpoint, FaFileExcel, FaFileAlt, FaImage, FaFileVideo
} from 'react-icons/fa';
import { getFileIcon, getRecipientLabel } from './NoticeUtils';
import { useAcknowledgeNotice, useAcknowledgments } from './api/queries';
import { MODAL_OVERLAY, RECIPIENT_LABELS } from './noticeConstants';
import { SearchableList, RadioOption } from '../../components/ui/NoticeUIComponents';

export const ReceiverAckButton = ({ noticeId, currentUserId, acknowledgments = [] }) => {
    const isAcknowledged = acknowledgments.some(a =>
        a.userId === currentUserId || (a.userId && a.userId._id === currentUserId)
    );
    const ackMutation = useAcknowledgeNotice(noticeId);
    const [showModal, setShowModal] = useState(false);
    const [responseText, setResponseText] = useState('');

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
        ackMutation.mutate(responseText.trim(), {
            onSuccess: () => {
                setShowModal(false);
                setResponseText('');
            },
        });
    };

    return (
        <>
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
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold text-gray-900">Acknowledge Notice</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Add a response message before acknowledging.</p>
                        </div>
                        <div className="p-5 space-y-3">
                            <textarea
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                maxLength={500}
                                rows={3}
                                placeholder="Type your response..."
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all"
                            />
                            <p className="text-xs text-gray-400 text-right">{responseText.length}/500</p>
                        </div>
                        <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
                            <button
                                onClick={() => { setShowModal(false); setResponseText(''); }}
                                disabled={ackMutation.isPending}
                                className="flex-1 px-3 py-2 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={ackMutation.isPending || responseText.trim().length < 2}
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

export const AcknowledgmentPanel = ({ noticeId }) => {
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
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {pendingCount !== null && pendingCount > 0 && (
                    <div className="pt-4 border-t border-gray-100">
                        <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            Pending <span className="bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded text-[10px]">{pendingCount}</span>
                        </h6>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                            {pending.map((u, i) => (
                                <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-600 text-xs border border-gray-200">
                                    {u.name} <span className="text-gray-400 ml-1">({u.role})</span>
                                </span>
                            ))}
                        </div>
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
                    {viewItem.attachment && viewItem.attachment.filename && (
                        <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-3">Attachment</h5>
                            <div className="space-y-2">
                                <button
                                    onClick={() => handleDownload(
                                        viewItem.attachment.secure_url || viewItem.attachment.path,
                                        viewItem.attachment.originalName || viewItem.attachment.filename
                                    )}
                                    className="w-full flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group text-left overflow-hidden"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                                        <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                            {getFileIcon(viewItem.attachment.originalName || viewItem.attachment.filename)}
                                        </div>
                                        <div className="min-w-0 overflow-hidden">
                                            <p className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors truncate" title={viewItem.attachment.originalName || viewItem.attachment.filename}>{viewItem.attachment.originalName || viewItem.attachment.filename}</p>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">{((viewItem.attachment.originalName || viewItem.attachment.filename || '').split('.').pop()) || 'File'}</p>
                                        </div>
                                    </div>
                                    <div className="p-2 text-gray-400 group-hover:text-primary group-hover:bg-primary/5 rounded-lg transition-colors shrink-0">
                                        <FaDownload size={14} />
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Acknowledgment Status Panel — sender view */}
                    {viewItem.requiresAcknowledgment === true && (
                        <AcknowledgmentPanel noticeId={viewItem._id} />
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
    classes, selectedClasses, setSelectedClasses,
    allUsers, selectedUsers, setSelectedUsers,
    students, selectedStudents, setSelectedStudents,
    groups, selectedGroups, setSelectedGroups,
    toggleSelection,
    isSending, handleFinalSend
}) => {
    if (!showSendModal) return null;

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
                                <SearchableList items={allUsers} selectedArr={selectedUsers} setSelectedArr={setSelectedUsers} searchField={u => `${u.name || ''} ${u.role || ''}`} placeholder="Search users..." searchTerm={searchTerm} setSearchTerm={setSearchTerm} toggleSelection={toggleSelection} renderLabel={user => (
                                    <><span className="flex-1 truncate text-sm">{user.name}</span><span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${user.role === 'teacher' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>{user.role}</span></>
                                )} />
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
