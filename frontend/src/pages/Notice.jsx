import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import {
    useNotices, useCreateNotice, useDeleteNotice, useGroups,
    useCreateGroup, useDeleteGroup, useClasses, useStudents, useTeachers, useAllUsers,
    useReceivedNotices, useAcknowledgeNotice, useAcknowledgments,
} from '../features/notices';
import {
    FaPaperPlane, FaUsers, FaPaperclip, FaTimes, FaCheck, FaFilePdf, FaFileWord,
    FaFilePowerpoint, FaFileExcel, FaFileAlt, FaImage, FaTrash, FaPlus, FaUserFriends,
    FaSearch, FaHistory, FaEye, FaDownload, FaFileVideo, FaFileCode, FaFileCsv, FaBell,
    FaInbox, FaBullhorn, FaCircleNotch
} from 'react-icons/fa';



// Allowed file extensions
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', // Documents
                            'png', 'jpg', 'jpeg', // Images
                            'mp4', 'mov', 'avi'   // Videos
];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi'];

const FILE_ICON_MAP = [
    { match: ext => IMAGE_EXTENSIONS.includes(ext), icon: <FaImage className="text-purple-500" size={24} /> },
    { match: ext => VIDEO_EXTENSIONS.includes(ext), icon: <FaFileVideo className="text-rose-500" size={24} /> },
    { match: ext => ext === 'pdf', icon: <FaFilePdf className="text-red-500" size={24} /> },
    { match: ext => ['doc', 'docx'].includes(ext), icon: <FaFileWord className="text-blue-500" size={24} /> },
    { match: ext => ['ppt', 'pptx'].includes(ext), icon: <FaFilePowerpoint className="text-orange-500" size={24} /> },
    { match: ext => ['xls', 'xlsx', 'csv'].includes(ext), icon: <FaFileExcel className="text-green-600" size={24} /> },
    { match: ext => ['txt', 'iti'].includes(ext), icon: <FaFileAlt className="text-gray-500" size={24} /> },
];

const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    return FILE_ICON_MAP.find(m => m.match(ext))?.icon || <FaFileAlt className="text-gray-400" size={24} />;
};

const RECIPIENT_LABELS = { all: 'Entire School', students: 'Students', users: 'Selected Users', groups: 'Groups' };
const SELECTION_VALIDATORS = {
    classes: { list: 'selectedClasses', msg: 'Please select at least one class' },
    users: { list: 'selectedUsers', msg: 'Please select at least one user' },
    students: { list: 'selectedStudents', msg: 'Please select at least one student' },
    groups: { list: 'selectedGroups', msg: 'Please select at least one group' },
};
const RECIPIENT_MAP = {
    school: { type: 'all', key: null }, allStudents: { type: 'students', key: null },
    classes: { type: 'classes', key: 'selectedClasses' }, users: { type: 'users', key: 'selectedUsers' },
    students: { type: 'students', key: 'selectedStudents' }, groups: { type: 'groups', key: 'selectedGroups' },
};

const getRecipientLabel = (item) => {
    if (item.recipientType === 'classes') return item.recipients?.join(', ') || 'Classes';
    return RECIPIENT_LABELS[item.recipientType] || item.recipientType || 'Unknown';
};

const MODAL_OVERLAY = 'fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4';

// --- Sub-components for Acknowledgment Feature ---

const ReceiverAckButton = ({ noticeId, currentUserId, acknowledgments = [] }) => {
    const isAcknowledged = acknowledgments.some(a =>
        a.userId === currentUserId || (a.userId && a.userId._id === currentUserId)
    );
    const ackMutation = useAcknowledgeNotice(noticeId);

    if (isAcknowledged) {
        return (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg border border-emerald-100">
                <FaCheck size={12} /> Acknowledged by you
            </div>
        );
    }

    return (
        <button
            onClick={() => ackMutation.mutate()}
            disabled={ackMutation.isPending}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-70"
        >
            {ackMutation.isPending ? <FaCircleNotch className="animate-spin" size={14} /> : <FaCheck size={14} />}
            {ackMutation.isPending ? 'Acknowledging...' : 'Acknowledge Notice'}
        </button>
    );
};

const AcknowledgmentPanel = ({ noticeId }) => {
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
                        <ul className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                            {acknowledged.map((u, i) => (
                                <li key={i} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                                    <span className="font-medium text-gray-800">{u.name} <span className="text-gray-400 font-normal text-xs ml-1">({u.role})</span></span>
                                    <span className="text-xs text-gray-500">{new Date(u.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
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

// --- Main Page Component ---
const Notice = () => {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';
    const isTeacher = currentUser?.role === 'teacher';
    const fileInputRef = useRef(null);

    // Compose state
    const [activeTab, setActiveTab] = useState('compose');
    const location = useLocation();

    // Auto-switch to received tab if navigated from Notifications page
    useEffect(() => {
        if (location.state?.tab) {
            setActiveTab(location.state.tab);
            // Clear state so browser back doesn't re-trigger
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);
    const [message, setMessage] = useState('');
    const [requireAck, setRequireAck] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [messageError, setMessageError] = useState('');

    // Send modal state
    const [showSendModal, setShowSendModal] = useState(false);
    const [sendOption, setSendOption] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);

    // Group creation state
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupStudents, setNewGroupStudents] = useState([]);
    const [newGroupTeachers, setNewGroupTeachers] = useState([]);

    // History state
    const [historySearch, setHistorySearch] = useState('');
    const [historyFilters, setHistoryFilters] = useState({ type: 'all', sentTo: 'all', date: 'all' });
    const [viewItem, setViewItem] = useState(null);
    const [toast, setToast] = useState({ type: '', text: '' });

    const selectionState = { selectedClasses, selectedUsers, selectedStudents, selectedGroups };

    // Data hooks
    const { data: noticesData } = useNotices(historyFilters);
    const { data: receivedData } = useReceivedNotices();
    const { data: classesData } = useClasses();
    const { data: studentsData } = useStudents();
    const { data: teachersData } = useTeachers();
    const { data: allUsersData } = useAllUsers();
    const { data: groupsData } = useGroups();
    const createNoticeMutation = useCreateNotice();
    const isSending = createNoticeMutation.isPending;
    const deleteNoticeMutation = useDeleteNotice();
    const createGroupMutation = useCreateGroup();
    const deleteGroupMutation = useDeleteGroup();

    const students = studentsData?.data?.users || studentsData?.data || [];
    const teachers = teachersData?.data?.users || teachersData?.data || [];
    const allUsers = allUsersData?.data?.users || allUsersData?.data || [];
    const classes = classesData?.data || [];
    const groups = groupsData?.data || [];
    const historyItems = noticesData?.data || [];
    // For received notices - backend returns { received, history } for teachers on mobile,
    // but on web it always returns a flat array via /notices/received
    const receivedItems = Array.isArray(receivedData?.data)
        ? receivedData.data
        : (receivedData?.data?.received || []);

    const showToast = useCallback((type, text) => { setToast({ type, text }); setTimeout(() => setToast({ type: '', text: '' }), 3000); }, []);
    const toggleSelection = (array, setArray, value) => { setArray(array.includes(value) ? array.filter(v => v !== value) : [...array, value]); };

    const handleFileUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            setToast({ type: 'error', text: 'Invalid file type. Check allowed formats.' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB Limit
            setToast({ type: 'error', text: 'File is too large. Max size is 10MB.' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
            return;
        }

        setAttachment(file);
        if (IMAGE_EXTENSIONS.includes(ext)) {
            const reader = new FileReader();
            reader.onload = (ev) => setAttachmentPreview(ev.target.result);
            reader.readAsDataURL(file);
        } else { setAttachmentPreview(null); }
    }, [showToast]);

    const removeAttachment = useCallback(() => { setAttachment(null); setAttachmentPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }, []);

    const handleSendClick = useCallback(() => {
        if (!message.trim()) { setMessageError('Message is required'); return; }
        setMessageError(''); setShowSendModal(true);
    }, [message]);

    const resetComposeState = useCallback(() => {
        setMessage(''); setAttachment(null); setAttachmentPreview(null);
        setShowSendModal(false); setSendOption(''); setRequireAck(false);
        setSelectedClasses([]); setSelectedUsers([]); setSelectedStudents([]); setSelectedGroups([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const handleFinalSend = useCallback(async () => {
        if (!sendOption) { showToast('error', 'Please select recipients'); return; }
        const validator = SELECTION_VALIDATORS[sendOption];
        if (validator && selectionState[validator.list].length === 0) { showToast('error', validator.msg); return; }
        const mapping = RECIPIENT_MAP[sendOption] || { type: sendOption, key: null };
        const recipients = mapping.key ? selectionState[mapping.key] : [];
        try {
            await createNoticeMutation.mutateAsync({ message, title: message.substring(0, 50), recipientType: mapping.type, recipients, attachment: attachment || undefined, requiresAcknowledgment: requireAck });
            showToast('success', 'Notice sent successfully!');
            resetComposeState();
        } catch (error) { showToast('error', error?.response?.data?.message || 'Failed to send notice'); }
    }, [sendOption, selectionState, message, attachment, requireAck, createNoticeMutation, showToast, resetComposeState]);

    const handleDeleteHistory = useCallback(async (itemId) => {
        try { await deleteNoticeMutation.mutateAsync(itemId); showToast('success', 'Notice deleted'); }
        catch (error) { showToast('error', error?.response?.data?.message || 'Failed to delete'); }
    }, [deleteNoticeMutation, showToast]);

    const handleCreateGroup = useCallback(async () => {
        if (!newGroupName.trim()) { showToast('error', 'Group name is required'); return; }
        if (newGroupStudents.length === 0 && newGroupTeachers.length === 0) { showToast('error', 'Select at least one student or teacher'); return; }
        try {
            await createGroupMutation.mutateAsync({ name: newGroupName, students: [...newGroupStudents, ...newGroupTeachers] });
            setNewGroupName(''); setNewGroupStudents([]); setNewGroupTeachers([]);
            showToast('success', 'Group created successfully!');
        } catch (error) { showToast('error', error?.response?.data?.message || 'Failed to create group'); }
    }, [newGroupName, newGroupStudents, newGroupTeachers, createGroupMutation, showToast]);

    const handleDeleteGroup = useCallback(async (groupId) => {
        try { await deleteGroupMutation.mutateAsync(groupId); showToast('success', 'Group deleted'); }
        catch (error) { showToast('error', error?.response?.data?.message || 'Failed to delete group'); }
    }, [deleteGroupMutation, showToast]);

    /**
     * Downloads a file from a cross-origin URL (Cloudinary) with the correct filename.
     *
     * WHY fetch → Blob instead of <a download href="...">?
     * Browsers IGNORE the `download` attribute on <a> when the href is cross-origin
     * (e.g. res.cloudinary.com). The browser just navigates to the URL and renders
     * the raw binary, which is why users see "%PDF-1.7..." text.
     *
     * This function:
     *  1. fetch() the file cross-origin (Cloudinary allows this via CORS headers)
     *  2. Converts the response to a Blob
     *  3. Creates a same-origin blob: URL → browser DOES honour `download` on same-origin
     *  4. Clicks a temporary <a> to trigger the Save dialog with the correct filename
     *  5. Revokes the blob URL to free memory
     */
    const handleDownload = useCallback(async (url, filename) => {
        if (!url) { showToast('error', 'No file available to download'); return; }
        try {
            showToast('success', 'Download starting...');
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename || 'download'; // browser WILL honour download on blob: URLs
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl); // free memory
        } catch (err) {
            console.error('Download failed:', err);
            showToast('error', 'Download failed. Try again.');
        }
    }, [showToast]);

    const filteredHistory = useMemo(() => {
        if (!historySearch) return historyItems;
        const s = historySearch.toLowerCase();
        return historyItems.filter(item =>
            (item.title || '').toLowerCase().includes(s) || (item.message || '').toLowerCase().includes(s) || getRecipientLabel(item).toLowerCase().includes(s)
        );
    }, [historyItems, historySearch]);

    // --- Render helpers ---

    const renderSectionHeader = (icon, iconBg, iconColor, title, subtitle) => (
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center`}>
                {React.cloneElement(icon, { className: iconColor, size: 18 })}
            </div>
            <div>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
        </div>
    );

    const renderSearchableList = (items, selectedArr, setSelectedArr, searchField, placeholder, renderLabel) => (
        <div className="mt-3 space-y-3">
            <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input type="text" placeholder={placeholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    onClick={(e) => e.stopPropagation()} />
            </div>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                {items.filter(item => searchField(item).toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                    <label key={item._id || item.value} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-b-0">
                        <input type="checkbox" checked={selectedArr.includes(item._id || item.value)}
                            onChange={() => toggleSelection(selectedArr, setSelectedArr, item._id || item.value)}
                            className="w-3.5 h-3.5 text-primary border-gray-300 rounded focus:ring-primary" />
                        {renderLabel ? renderLabel(item) : <span>{item.name || item.label}</span>}
                    </label>
                ))}
                {items.filter(item => searchField(item).toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-gray-400">No results found</div>
                )}
            </div>
        </div>
    );

    const renderRadioOption = (value, title, subtitle, expandedContent) => (
        <label className={`flex items-${expandedContent ? 'start' : 'center'} gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors`}>
            <input type="radio" name="sendOption" value={value} checked={sendOption === value}
                onChange={(e) => { setSendOption(e.target.value); setSearchTerm(''); }}
                className={`w-4 h-4 text-primary border-gray-300 focus:ring-primary${expandedContent ? ' mt-0.5' : ''}`} />
            <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{title}</p>
                <p className="text-xs text-gray-400 mb-2">{subtitle}</p>
                {sendOption === value && expandedContent}
            </div>
        </label>
    );

    const renderGroupsOption = () => groups.length > 0 && renderRadioOption(
        'groups', 'Custom Groups', 'Your created groups',
        renderSearchableList(groups, selectedGroups, setSelectedGroups, g => g.name, 'Search groups...', (group) => (
            <><span>{group.name}</span><span className="text-xs text-gray-400">({(group.members || []).length})</span></>
        ))
    );

    const renderTabButton = (tab, icon, label) => (
        <button onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {React.cloneElement(icon, { className: "inline mr-2", size: 12 })}{label}
        </button>
    );

    const renderFilterSelect = (label, filterKey, options) => (
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase">{label}:</span>
            <select value={historyFilters[filterKey]} onChange={(e) => setHistoryFilters({ ...historyFilters, [filterKey]: e.target.value })}
                className="text-sm border-gray-200 rounded-lg focus:ring-primary focus:border-primary px-2 py-1 bg-white">
                {options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
        </div>
    );

    const renderMemberList = (items, selectedArr, setSelectedArr) => (
        <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
            {items.map(item => (
                <label key={item._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0">
                    <input type="checkbox" checked={selectedArr.includes(item._id)}
                        onChange={() => toggleSelection(selectedArr, setSelectedArr, item._id)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
                    <span className="text-sm text-gray-700">{item.name}</span>
                </label>
            ))}
        </div>
    );



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
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Notice Board</h1>
                    <p className="text-gray-500 mt-1">{isAdmin ? 'Send notices to the entire school, classes, or specific users' : 'Send notices to your students or groups'}</p>
                </div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    {(isAdmin || isTeacher) && renderTabButton('compose', <FaPaperPlane />, 'Compose')}
                    {(isTeacher || isAdmin) && renderTabButton('groups', <FaUserFriends />, 'Groups')}
                    {(isAdmin || isTeacher) && renderTabButton('history', <FaHistory />, 'History')}
                    {renderTabButton('received', <FaPaperclip />, 'Received')}
                </div>

                {activeTab === 'compose' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                {renderSectionHeader(<FaPaperPlane />, 'from-blue-100 to-indigo-100', 'text-indigo-500', 'Compose Notice', 'Write your message below')}
                                <div className="p-6">
                                    <textarea value={message} onChange={(e) => { setMessage(e.target.value); if (e.target.value.trim()) setMessageError(''); }}
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
                                        <p className="text-sm text-gray-500">JPG, JPEG, PNG, PPT, PPTX, DOC, DOCX, XLSX, XLS, MP4, MOV, AVI, CSV, TXT (Max 10MB)</p>
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
                                    className="relative w-full overflow-hidden group flex items-center justify-center gap-2 bg-linear-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-700 text-white font-medium py-3.5 px-4 rounded-xl shadow-lg shadow-primary/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:-translate-y-0.5"
                                >
                                    <div className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out"></div>
                                    <FaPaperPlane className="relative z-10 group-hover:rotate-12 transition-transform duration-300" size={14} />
                                    <span className="relative z-10">Send Notice</span>
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
                            {renderSectionHeader(<FaPlus />, 'from-emerald-100 to-green-100', 'text-emerald-500', 'Create New Group', 'Group students for quick messaging')}
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                                    <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g., Science Club"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Students</label>
                                    {renderMemberList(students, newGroupStudents, setNewGroupStudents)}
                                </div>
                                {isAdmin && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Teachers</label>
                                        {renderMemberList(teachers, newGroupTeachers, setNewGroupTeachers)}
                                    </div>
                                )}
                                <button onClick={handleCreateGroup}
                                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors">
                                    <FaPlus size={12} /> Create Group
                                </button>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            {renderSectionHeader(<FaUserFriends />, 'from-violet-100 to-purple-100', 'text-violet-500', 'Your Groups', `${groups.length} group${groups.length !== 1 ? 's' : ''} created`)}
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
                                {renderFilterSelect('Type', 'type', [['all', 'All'], ['notice', 'Notice'], ['file', 'File']])}
                                <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
                                {renderFilterSelect('Sent To', 'sentTo', [['all', 'All'], ['group', 'Group / Class'], ['individual', 'Individual']])}
                                <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
                                {renderFilterSelect('Date', 'date', [['all', 'Any Time'], ['today', 'Today'], ['last7', 'Last 7 Days'], ['last30', 'Last 30 Days']])}
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
                                filteredHistory.map(item => (
                                    <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow group">
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
                                                        {item.attachment && item.attachment.filename && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                                <FaPaperclip className="mr-1" size={10} />
                                                                1
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
                        </div>
                    </div>
                )}

                {activeTab === 'received' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            {renderSectionHeader(<FaPaperclip />, 'from-violet-100 to-purple-100', 'text-violet-500', 'Received Notices', 'Notices sent to you by admin or teachers')}
                        </div>

                        {receivedItems.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FaBell className="text-gray-300" size={24} />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No notices received yet</h3>
                                <p className="text-gray-500 text-sm mt-1">Notices sent to you will appear here</p>
                            </div>
                        ) : (
                            receivedItems.map(item => (
                                <div key={item._id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col md:flex-row gap-4 items-start">
                                        {/* Type icon */}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.type === 'file' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {item.type === 'file' ? <FaPaperclip size={16} /> : <FaPaperPlane size={16} />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            {/* Header row */}
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-base font-semibold text-gray-900 truncate">{item.title || 'Notice'}</h3>
                                                    {item.attachment?.filename && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                            <FaPaperclip className="mr-1" size={10} />1
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400 flex-shrink-0">
                                                    {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>

                                            {/* Sender */}
                                            {item.createdBy && (
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold flex-shrink-0">
                                                        {(item.createdBy.name || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-gray-600">{item.createdBy.name}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                        item.createdBy.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
                                                    }`}>{item.createdBy.role}</span>
                                                </div>
                                            )}

                                            {/* Message body */}
                                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mb-3">{item.message}</p>

                                            {/* Attachment */}
                                            {item.attachment?.filename && (
                                                <button
                                                    onClick={() => handleDownload(
                                                        item.attachment.secure_url || item.attachment.path,
                                                        item.attachment.originalName || item.attachment.filename
                                                    )}
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-700 transition-colors group"
                                                >
                                                    <div className="w-7 h-7 bg-white border border-gray-100 rounded-lg flex items-center justify-center">
                                                        {getFileIcon(item.attachment.originalName || item.attachment.filename)}
                                                    </div>
                                                    <span className="font-medium group-hover:text-primary transition-colors truncate max-w-[200px]">
                                                        {item.attachment.originalName || item.attachment.filename}
                                                    </span>
                                                    <FaDownload className="text-gray-400 group-hover:text-primary transition-colors flex-shrink-0" size={12} />
                                                </button>
                                            )}

                                            {/* Acknowledgment CTA — receiver side */}
                                            {item.requiresAcknowledgment && (
                                                <ReceiverAckButton noticeId={item._id} currentUserId={currentUser?._id} acknowledgments={item.acknowledgments} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {viewItem && (
                    <div className={MODAL_OVERLAY}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                                <h3 className="text-lg font-semibold text-gray-900">Notice Details</h3>
                                <button onClick={() => setViewItem(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><FaTimes className="text-gray-400" size={16} /></button>
                            </div>
                            <div className="p-6 space-y-6 overflow-y-auto">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${viewItem.type === 'notice' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {viewItem.type === 'notice' ? <FaPaperPlane size={20} /> : <FaPaperclip size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900">{viewItem.title}</h4>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                            <span>{new Date(viewItem.createdAt).toLocaleDateString()}</span><span>•</span><span>{getRecipientLabel(viewItem)}</span>
                                        </div>
                                        {viewItem.requiresAcknowledgment && (
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
                                                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center">
                                                        {getFileIcon(viewItem.attachment.originalName || viewItem.attachment.filename)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">{viewItem.attachment.originalName || viewItem.attachment.filename}</p>
                                                        <p className="text-xs text-gray-500">{((viewItem.attachment.size || 0) / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                                <div className="p-2 text-gray-400 group-hover:text-primary group-hover:bg-primary/5 rounded-lg transition-colors">
                                                    <FaDownload size={14} />
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Acknowledgment Status Panel — sender view */}
                                {viewItem.requiresAcknowledgment && (
                                    <AcknowledgmentPanel noticeId={viewItem._id} />
                                )}

                                <div className="pt-2">
                                    <button onClick={() => setViewItem(null)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showSendModal && (
                <div className={MODAL_OVERLAY}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
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
                                    {renderRadioOption('school', 'Entire School', 'All teachers and students', null)}
                                    {renderRadioOption('classes', 'Specific Classes', 'Select one or more classes',
                                        renderSearchableList(classes, selectedClasses, setSelectedClasses, cls => cls.label, 'Search classes...', null)
                                    )}
                                    {renderRadioOption('users', 'Specific Users', 'Select individual users',
                                        renderSearchableList(allUsers, selectedUsers, setSelectedUsers,
                                            u => `${u.name || ''} ${u.role || ''}`, 'Search users...',
                                            (user) => (<><span className="flex-1 truncate">{user.name}</span><span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${user.role === 'teacher' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>{user.role}</span></>)
                                        )
                                    )}
                                    {renderGroupsOption()}
                                </div>
                            )}
                            {isTeacher && (
                                <div className="space-y-3">
                                    {renderRadioOption('allStudents', 'All Students', 'Your assigned class students', null)}
                                    {renderRadioOption('students', 'Specific Students', 'Select individual students',
                                        renderSearchableList(students, selectedStudents, setSelectedStudents, s => s.name, 'Search students...', null)
                                    )}
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
            )}
        </DashboardLayout>
    );
};

export default Notice;