import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    FaPaperPlane, FaUsers, FaPaperclip, FaTimes, FaCheck, FaTrash, FaPlus, FaUserFriends,
    FaHistory, FaEye, FaBell, FaSearch
} from 'react-icons/fa';

import { useNoticeHandlers } from './useNoticeHandlers';
import { ReceiverAckButton, ViewItemModal, SendModal, NoticeAttachmentList } from './NoticeComponents';
import { getFileIcon, getRecipientLabel } from './NoticeUtils';
import { SectionHeader, TabButton, FilterSelect, SearchableList, MemberList } from '../../components/ui/NoticeUIComponents';
import { formatValue } from '../../utils';

const NoticePage = () => {
    const handlers = useNoticeHandlers();
    
    // Destructure everything needed for rendering
    const {
        isAdmin, isTeacher, fileInputRef, activeTab, setActiveTab,
        message, setMessage, requireAck, setRequireAck, attachment, attachmentPreview, messageError,
        showSendModal, setShowSendModal, sendOption, setSendOption, searchTerm, setSearchTerm, userRoleFilter, setUserRoleFilter,
        selectedClasses, setSelectedClasses, selectedUsers, setSelectedUsers, selectedStudents, setSelectedStudents, selectedGroups, setSelectedGroups,
        newGroupName, setNewGroupName, newGroupStudents, setNewGroupStudents, newGroupTeachers, setNewGroupTeachers,
        groupStudentSearch, setGroupStudentSearch,
        historySearch, setHistorySearch, historyFilters, setHistoryFilters, viewItem, setViewItem, toast,
        isSending, students, teachers, allUsers, classes, groups, receivedItems, filteredHistory,
        historyPage, setHistoryPage, totalHistoryPages, pagedHistory,
        receivedPage, setReceivedPage, totalReceivedPages, pagedReceivedItems,
        selectedReceivedNoticeIds, toggleReceivedNoticeSelection, toggleSelectAllReceivedOnPage,
        handleDeleteReceivedNotice, handleBulkDeleteReceivedNotices, isDeletingReceived,
        toggleSelection, handleFileUpload, removeAttachment, handleSendClick, handleFinalSend, handleDeleteHistory, handleCreateGroup, handleDeleteGroup, handleDownload,
        currentUser
    } = handlers;

    const getNoticeAttachmentCount = (item) => {
        const directAttachmentCount = item?.attachment ? 1 : 0;
        const structuredAttachmentCount = Array.isArray(item?.attachments) ? item.attachments.length : 0;
        return directAttachmentCount + structuredAttachmentCount;
    };

    const pagedReceivedNoticeIds = pagedReceivedItems.map((item) => item._id);
    const allReceivedOnPageSelected =
        pagedReceivedNoticeIds.length > 0 &&
        pagedReceivedNoticeIds.every((id) => selectedReceivedNoticeIds.includes(id));

    return (
        <DashboardLayout>
            {toast.text && (
                <div className={`fixed top-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
                        {toast.type === 'success' ? <FaCheck size={12} /> : <FaTimes size={12} />}
                    </div>
                    <span className="font-medium">{toast.text}</span>
                </div>
            )}
            <div className="space-y-6">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-primary transform hover:rotate-6 transition-transform">
                        <FaBell size={32} />
                    </div>
                    <div className="space-y-1">
                        <h1 className="page-title">Notice Board</h1>
                        <p className="page-subtitle">{isAdmin ? 'Send notices to the entire school, classes, or specific users' : 'Send notices to your students or groups'}</p>
                    </div>
                </div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    {(isAdmin || isTeacher) && <TabButton tab="compose" activeTab={activeTab} icon={<FaPaperPlane />} label="Compose" setActiveTab={setActiveTab} />}
                    {(isTeacher || isAdmin) && <TabButton tab="groups" activeTab={activeTab} icon={<FaUserFriends />} label="Groups" setActiveTab={setActiveTab} />}
                    {(isAdmin || isTeacher) && <TabButton tab="history" activeTab={activeTab} icon={<FaHistory />} label="History" setActiveTab={setActiveTab} />}
                    <TabButton tab="received" activeTab={activeTab} icon={<FaPaperclip />} label="Received" setActiveTab={setActiveTab} />
                </div>

                {activeTab === 'compose' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                <SectionHeader icon={<FaPaperPlane />} iconBg="from-blue-100 to-indigo-100" iconColor="text-indigo-500" title="Compose Notice" subtitle="Write your message below" />
                                <div className="p-6">
                                    <textarea value={message} onChange={(e) => { setMessage(e.target.value); }}
                                        placeholder="Write your notice here..." rows={8}
                                        className={`w-full px-4 py-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${messageError ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                                    {messageError && <p className="mt-2 text-sm text-red-500 flex items-center gap-1"><FaTimes size={10} /> {messageError}</p>}
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                        <FaPaperclip className="text-amber-600" size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Attachment</h2>
                                        <p className="text-sm text-gray-500">JPG, JPEG, PDF, PNG, PPT, PPTX, DOC, DOCX, XLSX, XLS, MP4, MOV, AVI, CSV, TXT (Max 10MB)</p>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.mp4,.mov,.avi"
                                        className="hidden"
                                    />

                                    {!attachment ? (
                                        <button onClick={() => fileInputRef.current?.click()}
                                            className="w-full group flex flex-col items-center justify-center gap-3 px-6 py-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer">
                                            <div className="w-14 h-14 rounded-2xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
                                                <FaPaperclip className="text-gray-400 group-hover:text-gray-600" size={20} />
                                            </div>
                                            <div className="text-center">
                                                <span className="text-base font-medium text-gray-700">Click to attach file</span>
                                                <p className="text-sm text-gray-400 mt-1">Max 1 file at a time</p>
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                            {attachmentPreview ? (
                                                <img src={attachmentPreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                                            ) : (
                                                <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 flex items-center justify-center">{getFileIcon(attachment.name)}</div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                                                <p className="text-xs text-gray-400">{(attachment.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                            <button onClick={removeAttachment} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FaTrash size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <FaPaperPlane className="text-emerald-600" size={14} />
                                    </span>
                                    Ready to Send?
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    Click send to choose your recipients and deliver this notice immediately.
                                </p>

                                {/* Require Acknowledgment Toggle */}
                                <label className="flex items-start gap-3 p-3 mb-5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors select-none">
                                    <div className="relative flex-shrink-0 mt-0.5">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={requireAck}
                                            onChange={(e) => setRequireAck(e.target.checked)}
                                        />
                                        <div className={`w-10 h-6 rounded-full transition-colors duration-200 ${requireAck ? 'bg-primary' : 'bg-gray-200'}`}></div>
                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${requireAck ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Require Acknowledgment</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Recipients must confirm they've read this notice</p>
                                    </div>
                                </label>

                                <button
                                    onClick={handleSendClick}
                                    disabled={!message.trim()}
                                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium py-3.5 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:-translate-y-0.5"
                                >
                                    <FaPaperPlane className="group-hover:rotate-12 transition-transform duration-300" size={14} />
                                    <span>Send Notice</span>
                                </button>
                            </div>
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Notice Preview</h3>
                                <div className="space-y-3">
                                    {[['Characters', message.length], ['Words', message.trim() ? message.trim().split(/\s+/).length : 0], ['Attachment', attachment ? '1 file' : 'None'], ['Acknowledgment', requireAck ? 'Required' : 'Not required']].map(([label, value]) => (
                                        <div key={label} className="flex justify-between text-sm">
                                            <span className="text-gray-500">{label}</span>
                                            <span className={`font-medium ${label === 'Acknowledgment' && requireAck ? 'text-primary' : 'text-gray-900'}`}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {(isTeacher || isAdmin) && activeTab === 'groups' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <SectionHeader icon={<FaPlus />} iconBg="from-emerald-100 to-green-100" iconColor="text-emerald-500" title="Create New Group" subtitle="Group students for quick messaging" />
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                                    <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g., Science Club"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Students</label>
                                    <SearchableList
                                        items={students}
                                        selectedArr={newGroupStudents}
                                        setSelectedArr={setNewGroupStudents}
                                        searchField={s => s.name || ''}
                                        placeholder="Search students..."
                                        searchTerm={groupStudentSearch}
                                        setSearchTerm={setGroupStudentSearch}
                                        toggleSelection={toggleSelection}
                                        hideUntilSearch
                                        minSearchLength={2}
                                        emptyLabel="Type at least 2 characters to search students"
                                    />
                                </div>
                                {isAdmin && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Teachers</label>
                                        <MemberList
                                            items={teachers}
                                            selectedArr={newGroupTeachers}
                                            setSelectedArr={setNewGroupTeachers}
                                            toggleSelection={toggleSelection}
                                        />
                                    </div>
                                )}
                                <button onClick={handleCreateGroup}
                                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-xl transition-colors">
                                    <FaPlus size={12} /> Create Group
                                </button>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <SectionHeader icon={<FaUserFriends />} iconBg="from-violet-100 to-purple-100" iconColor="text-violet-500" title="Your Groups" subtitle={`${groups.length} group${groups.length !== 1 ? 's' : ''} created`} />
                            <div className="p-6">
                                {groups.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"><FaUserFriends className="text-gray-400" size={20} /></div>
                                        <p className="text-gray-500 text-sm">No groups created yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {groups.map(group => (
                                            <div key={group._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg flex items-center justify-center"><FaUsers className="text-violet-500" size={14} /></div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{group.name}</p>
                                                        <p className="text-xs text-gray-400">{(group.members || []).length} member{(group.members || []).length !== 1 ? 's' : ''}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteGroup(group._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FaTrash size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Notice & Files History</h2>
                                    <p className="text-sm text-gray-500">Track all your sent communications</p>
                                </div>
                                <div className="relative w-full md:w-72">
                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input type="text" placeholder="Search history..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <FilterSelect label="Type" filterKey="type" options={[['all', 'All'], ['notice', 'Notice'], ['file', 'File']]} historyFilters={historyFilters} setHistoryFilters={setHistoryFilters} />
                                <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
                                <FilterSelect label="Sent To" filterKey="sentTo" options={[['all', 'All'], ['group', 'Group / Class'], ['individual', 'Individual']]} historyFilters={historyFilters} setHistoryFilters={setHistoryFilters} />
                                <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
                                <FilterSelect label="Date" filterKey="date" options={[['all', 'Any Time'], ['today', 'Today'], ['last7', 'Last 7 Days'], ['last30', 'Last 30 Days']]} historyFilters={historyFilters} setHistoryFilters={setHistoryFilters} />
                            </div>
                        </div>
                        <div className="space-y-4">
                            {filteredHistory.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"><FaHistory className="text-gray-300" size={24} /></div>
                                    <h3 className="text-lg font-medium text-gray-900">No history found</h3>
                                    <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search terms</p>
                                </div>
                            ) : (
                                pagedHistory.map(item => (
                                    <div key={item._id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow group">
                                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                            {/* Icon */}
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.type === 'notice' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                                                }`}>
                                                {item.type === 'notice' ? <FaPaperPlane size={16} /> : <FaPaperclip size={16} />}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 w-full">
                                                {/* Details */}
                                                <div className="md:col-span-5">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-base font-semibold text-gray-900 truncate">{item.title}</h3>
                                                        {getNoticeAttachmentCount(item) > 0 && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                                <FaPaperclip className="mr-1" size={10} />
                                                                {getNoticeAttachmentCount(item)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500 line-clamp-2">{item.message}</p>
                                                </div>

                                                {/* Sent To */}
                                                <div className="md:col-span-3 flex items-center">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                                            {(item.recipientType === 'users' || item.recipientType === 'students') ? <FaUserFriends size={10} /> : <FaUsers size={10} />}
                                                        </div>
                                                        <span className="truncate max-w-[150px]" title={getRecipientLabel(item)}>{getRecipientLabel(item)}</span>
                                                    </div>
                                                </div>

                                                {/* Status & Date */}
                                                <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-6">
                                                    <div className="text-right">
                                                        <div className="text-sm font-medium text-emerald-600 flex items-center justify-end gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                            Sent
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-1">
                                                            {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1 transition-opacity">
                                                        <button
                                                            onClick={() => setViewItem(item)}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="View Details"
                                                        >
                                                            <FaEye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteHistory(item._id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <FaTrash size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            {filteredHistory.length > 0 && totalHistoryPages > 1 && (
                                <div className="flex items-center justify-between pt-2">
                                    <span className="text-xs text-gray-500">Page {historyPage} of {totalHistoryPages}</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                            disabled={historyPage === 1}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Prev
                                        </button>
                                        <button
                                            onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                                            disabled={historyPage === totalHistoryPages}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'received' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <SectionHeader icon={<FaPaperclip />} iconBg="from-violet-100 to-purple-100" iconColor="text-violet-500" title="Received Notices" subtitle="Notices sent to you by admin or teachers" />
                        </div>

                        {receivedItems.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <label className="inline-flex items-center gap-3 text-sm text-gray-700 font-medium">
                                    <input
                                        type="checkbox"
                                        checked={allReceivedOnPageSelected}
                                        onChange={() => toggleSelectAllReceivedOnPage(pagedReceivedNoticeIds)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                                    />
                                    <span>Select all on this page</span>
                                </label>

                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-500">
                                        {selectedReceivedNoticeIds.length} selected
                                    </span>
                                    <button
                                        onClick={handleBulkDeleteReceivedNotices}
                                        disabled={selectedReceivedNoticeIds.length === 0 || isDeletingReceived}
                                        className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <FaTrash size={13} />
                                        <span>{isDeletingReceived ? 'Removing...' : 'Delete Selected'}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {receivedItems.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FaBell className="text-gray-300" size={24} />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No notices received yet</h3>
                                <p className="text-gray-500 text-sm mt-1">Notices sent to you will appear here</p>
                            </div>
                        ) : (
                            pagedReceivedItems.map(item => (
                                <div key={item._id} className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-shadow ${selectedReceivedNoticeIds.includes(item._id) ? 'border-primary/40 ring-2 ring-primary/10' : 'border-gray-200'}`}>
                                    {/* Top Row */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1 mb-4 border-b border-gray-100 pb-3">
                                        {/* Sender Info */}
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedReceivedNoticeIds.includes(item._id)}
                                                onChange={() => toggleReceivedNoticeSelection(item._id)}
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                                            />
                                            {item.createdBy?.avatar ? (
                                                <img src={item.createdBy.avatar} alt={item.createdBy.name} className="w-9 h-9 rounded-full object-cover shadow-sm" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-linear-to-br flex items-center justify-center font-bold text-sm shadow-sm from-amber-100 to-amber-200 text-amber-700">
                                                    {(item.createdBy?.name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-900 text-[15px]">
                                                        {item.createdBy?.name || 'System User'}
                                                    </span>
                                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide ${item.createdBy?.isArchived ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                                                        {item.createdBy?.isArchived ? `Archived ${item.createdBy?.role || 'User'}` : (item.createdBy?.role || 'User')}
                                                    </span>
                                                </div>
                                                {isAdmin && (
                                                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                                                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                                                            {getRecipientLabel(item)}
                                                        </span>
                                                        {item.requiresAcknowledgment === true && (
                                                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                                                                Acks {item.acknowledgments?.length || 0}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Ack Status & Date */}
                                        <div className="flex items-center gap-3">
                                            {item.requiresAcknowledgment === true && !isAdmin && (
                                                <>
                                                    <ReceiverAckButton noticeId={item._id} currentUserId={currentUser?._id} acknowledgments={item.acknowledgments} />
                                                    <div className="w-px h-3.5 bg-gray-200 hidden sm:block"></div>
                                                </>
                                            )}
                                            <button
                                                onClick={() => setViewItem(item)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="View Details"
                                            >
                                                <FaEye size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteReceivedNotice(item._id)}
                                                disabled={isDeletingReceived}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                                title="Delete Notice"
                                            >
                                                <FaTrash size={15} />
                                            </button>
                                            <span className="text-gray-400 font-medium text-[13px] whitespace-nowrap">
                                                {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Notice Content */}
                                    <div className="flex gap-4 ml-1">
                                        <div className="mt-1">
                                            <FaPaperclip className="text-blue-500" size={18} />
                                        </div>
                                        <div className="flex-1 w-full min-w-0 pr-2">
                                            <h3 className="text-[18px] font-extrabold text-gray-900 mb-1.5 leading-tight tracking-tight">
                                                {formatValue(item.title, 'Notice')}
                                            </h3>
                                            <p className="text-[15px] text-gray-600 leading-relaxed whitespace-pre-wrap mb-5">
                                                {item.message}
                                            </p>

                                            {/* Attachment Box */}
                                            <NoticeAttachmentList item={item} handleDownload={handleDownload} />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {receivedItems.length > 0 && totalReceivedPages > 1 && (
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-xs text-gray-500">Page {receivedPage} of {totalReceivedPages}</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setReceivedPage(p => Math.max(1, p - 1))}
                                        disabled={receivedPage === 1}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        onClick={() => setReceivedPage(p => Math.min(totalReceivedPages, p + 1))}
                                        disabled={receivedPage === totalReceivedPages}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <ViewItemModal viewItem={viewItem} setViewItem={setViewItem} handleDownload={handleDownload} />
            </div>

            <SendModal
                showSendModal={showSendModal} setShowSendModal={setShowSendModal}
                isAdmin={isAdmin} isTeacher={isTeacher}
                sendOption={sendOption} setSendOption={setSendOption}
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                userRoleFilter={userRoleFilter} setUserRoleFilter={setUserRoleFilter}
                classes={classes} selectedClasses={selectedClasses} setSelectedClasses={setSelectedClasses}
                allUsers={allUsers} selectedUsers={selectedUsers} setSelectedUsers={setSelectedUsers}
                students={students} selectedStudents={selectedStudents} setSelectedStudents={setSelectedStudents}
                groups={groups} selectedGroups={selectedGroups} setSelectedGroups={setSelectedGroups}
                toggleSelection={toggleSelection}
                isSending={isSending} handleFinalSend={handleFinalSend}
            />
        </DashboardLayout>
    );
};

export default NoticePage;
