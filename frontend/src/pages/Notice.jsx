import React, { useState, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import {
    useNotices,
    useCreateNotice,
    useDeleteNotice,
    useGroups,
    useCreateGroup,
    useDeleteGroup,
    useClasses,
    useStudents,
    useTeachers,
    useAllUsers,
} from '../features/notices';
import {
    FaPaperPlane,
    FaUsers,
    FaPaperclip,
    FaTimes,
    FaCheck,
    FaFilePdf,
    FaFileWord,
    FaFilePowerpoint,
    FaFileExcel,
    FaFileAlt,
    FaImage,
    FaTrash,
    FaPlus,
    FaUserFriends,
    FaSearch,
    FaHistory,
    FaEye,
    FaDownload,
    FaFileVideo,
    FaFileCode,
    FaFileCsv
} from 'react-icons/fa';



// Allowed file extensions
const ALLOWED_EXTENSIONS = [
    'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'iti', // Documents
    'png', 'jpg', 'jpeg', // Images
    'mp4', 'mov', 'avi'   // Videos
];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi'];

// Get file icon based on extension
const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) return <FaImage className="text-purple-500" size={24} />;
    if (VIDEO_EXTENSIONS.includes(ext)) return <FaFileVideo className="text-rose-500" size={24} />;
    if (ext === 'pdf') return <FaFilePdf className="text-red-500" size={24} />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord className="text-blue-500" size={24} />;
    if (['ppt', 'pptx'].includes(ext)) return <FaFilePowerpoint className="text-orange-500" size={24} />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FaFileExcel className="text-green-600" size={24} />;
    if (['txt', 'iti'].includes(ext)) return <FaFileAlt className="text-gray-500" size={24} />;
    return <FaFileAlt className="text-gray-400" size={24} />;
};

const Notice = () => {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';
    const isTeacher = currentUser?.role === 'teacher';
    const fileInputRef = useRef(null);

    // Tab state
    const [activeTab, setActiveTab] = useState('compose');

    // Compose state
    const [message, setMessage] = useState('');
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

    // Groups state
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupStudents, setNewGroupStudents] = useState([]);
    const [newGroupTeachers, setNewGroupTeachers] = useState([]);

    // History state
    const [historySearch, setHistorySearch] = useState('');
    const [historyFilters, setHistoryFilters] = useState({ type: 'all', sentTo: 'all', date: 'all' });
    const [viewItem, setViewItem] = useState(null);

    // Toast state
    const [toast, setToast] = useState({ type: '', text: '' });

    // ═══ API Hooks ═══
    const { data: noticesData } = useNotices(historyFilters);
    const { data: classesData } = useClasses();
    const { data: studentsData } = useStudents();
    const { data: teachersData } = useTeachers();
    const { data: allUsersData } = useAllUsers();
    const { data: groupsData } = useGroups();
    const createNoticeMutation = useCreateNotice();
    const deleteNoticeMutation = useDeleteNotice();
    const createGroupMutation = useCreateGroup();
    const deleteGroupMutation = useDeleteGroup();

    // Derive lists from API data
    const students = studentsData?.data?.users || studentsData?.data || [];
    const teachers = teachersData?.data?.users || teachersData?.data || [];
    const allUsers = allUsersData?.data?.users || allUsersData?.data || [];
    const classes = classesData?.data || [];
    const groups = groupsData?.data || [];
    const historyItems = noticesData?.data || [];

    // Handle file upload
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            setToast({ type: 'error', text: 'Internal Server Error' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
            return;
        }

        setAttachment(file);

        // Create preview for images
        if (IMAGE_EXTENSIONS.includes(ext)) {
            const reader = new FileReader();
            reader.onload = (e) => setAttachmentPreview(e.target.result);
            reader.readAsDataURL(file);
        } else {
            setAttachmentPreview(null);
        }
    };

    // Remove attachment
    const removeAttachment = () => {
        setAttachment(null);
        setAttachmentPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Handle send button click
    const handleSendClick = () => {
        if (!message.trim()) {
            setMessageError('Message is required');
            return;
        }
        setMessageError('');
        setShowSendModal(true);
    };

    // Handle final send
    const handleFinalSend = async () => {
        if (!sendOption) {
            setToast({ type: 'error', text: 'Please select recipients' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
            return;
        }

        // Validate selection based on option
        if (sendOption === 'classes' && selectedClasses.length === 0) {
            setToast({ type: 'error', text: 'Please select at least one class' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
            return;
        }
        if (sendOption === 'users' && selectedUsers.length === 0) {
            setToast({ type: 'error', text: 'Please select at least one user' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
            return;
        }
        if (sendOption === 'students' && selectedStudents.length === 0) {
            setToast({ type: 'error', text: 'Please select at least one student' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
            return;
        }
        if (sendOption === 'groups' && selectedGroups.length === 0) {
            setToast({ type: 'error', text: 'Please select at least one group' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
            return;
        }

        // Build recipients list based on send option
        let recipientType = sendOption;
        let recipients = [];
        if (sendOption === 'school') { recipientType = 'all'; recipients = []; }
        else if (sendOption === 'allStudents') { recipientType = 'students'; recipients = []; }
        else if (sendOption === 'classes') { recipients = selectedClasses; }
        else if (sendOption === 'users') { recipients = selectedUsers; }
        else if (sendOption === 'students') { recipients = selectedStudents; }
        else if (sendOption === 'groups') { recipients = selectedGroups; }

        try {
            await createNoticeMutation.mutateAsync({
                message,
                title: message.substring(0, 50),
                recipientType,
                recipients,
                attachment: attachment || undefined,
            });

            setToast({ type: 'success', text: 'Notice sent successfully!' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);

            // Reset form
            setMessage('');
            setAttachment(null);
            setAttachmentPreview(null);
            setShowSendModal(false);
            setSendOption('');
            setSelectedClasses([]);
            setSelectedUsers([]);
            setSelectedStudents([]);
            setSelectedGroups([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            setToast({ type: 'error', text: error?.response?.data?.message || 'Failed to send notice' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
        }
    };

    // Helper: format recipientType for display
    const getRecipientLabel = (item) => {
        if (item.recipientType === 'all') return 'Entire School';
        if (item.recipientType === 'classes') return item.recipients?.join(', ') || 'Classes';
        if (item.recipientType === 'students') return 'Students';
        if (item.recipientType === 'users') return 'Selected Users';
        if (item.recipientType === 'groups') return 'Groups';
        return item.recipientType || 'Unknown';
    };

    // Filter History Items (backend handles type/sentTo/date filters, we just do client-side search)
    const filteredHistory = historyItems.filter(item => {
        if (!historySearch) return true;
        const searchLower = historySearch.toLowerCase();
        return (
            (item.title || '').toLowerCase().includes(searchLower) ||
            (item.message || '').toLowerCase().includes(searchLower) ||
            getRecipientLabel(item).toLowerCase().includes(searchLower)
        );
    });

    // Handle delete history
    const handleDeleteHistory = async (itemId) => {
        try {
            await deleteNoticeMutation.mutateAsync(itemId);
            setToast({ type: 'success', text: 'Notice deleted' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
        } catch (error) {
            setToast({ type: 'error', text: error?.response?.data?.message || 'Failed to delete' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
        }
    };

    // Handle create group
    // Handle create group
    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            setToast({ type: 'error', text: 'Group name is required' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
            return;
        }
        if (newGroupStudents.length === 0 && newGroupTeachers.length === 0) {
            setToast({ type: 'error', text: 'Select at least one student or teacher' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
            return;
        }

        try {
            await createGroupMutation.mutateAsync({
                name: newGroupName,
                students: [...newGroupStudents, ...newGroupTeachers],
            });
            setNewGroupName('');
            setNewGroupStudents([]);
            setNewGroupTeachers([]);
            setToast({ type: 'success', text: 'Group created successfully!' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
        } catch (error) {
            setToast({ type: 'error', text: error?.response?.data?.message || 'Failed to create group' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
        }
    };

    // Handle delete group
    const handleDeleteGroup = async (groupId) => {
        try {
            await deleteGroupMutation.mutateAsync(groupId);
            setToast({ type: 'success', text: 'Group deleted' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
        } catch (error) {
            setToast({ type: 'error', text: error?.response?.data?.message || 'Failed to delete group' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
        }
    };

    // Toggle selection in array
    const toggleSelection = (array, setArray, value) => {
        if (array.includes(value)) {
            setArray(array.filter(v => v !== value));
        } else {
            setArray([...array, value]);
        }
    };

    return (
        <DashboardLayout>
            {/* Toast Notification */}
            {toast.text && (
                <div className={`fixed top-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${toast.type === 'success'
                    ? 'bg-emerald-500/90 text-white'
                    : 'bg-red-500/90 text-white'
                    }`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
                        {toast.type === 'success' ? <FaCheck size={12} /> : <FaTimes size={12} />}
                    </div>
                    <span className="font-medium">{toast.text}</span>
                </div>
            )}

            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Notice Board</h1>
                    <p className="text-gray-500 mt-1">
                        {isAdmin ? 'Send notices to the entire school, classes, or specific users' : 'Send notices to your students or groups'}
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('compose')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'compose'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <FaPaperPlane className="inline mr-2" size={12} />
                        Compose
                    </button>
                    {(isTeacher || isAdmin) && (
                        <button
                            onClick={() => setActiveTab('groups')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'groups'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <FaUserFriends className="inline mr-2" size={12} />
                            Groups
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <FaHistory className="inline mr-2" size={12} />
                        History
                    </button>
                </div>

                {/* Compose Tab */}
                {activeTab === 'compose' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Message Composer - Takes 2 columns */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Message Section */}
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                                        <FaPaperPlane className="text-indigo-500" size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Compose Notice</h2>
                                        <p className="text-sm text-gray-500">Write your message below</p>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <textarea
                                        value={message}
                                        onChange={(e) => {
                                            setMessage(e.target.value);
                                            if (e.target.value.trim()) setMessageError('');
                                        }}
                                        placeholder="Write your notice here..."
                                        rows={8}
                                        className={`w-full px-4 py-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${messageError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                            }`}
                                    />
                                    {messageError && (
                                        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                                            <FaTimes size={10} /> {messageError}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Attachment Section */}
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                        <FaPaperclip className="text-amber-600" size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Attachment</h2>
                                        <p className="text-sm text-gray-500">JPG,JPEG,PNG,PPT,PPTX,DOC,DOCX,XLXS,XLS,MP4,MOV,AVI,ITI,CSV,TXT</p>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.iti,.png,.jpg,.jpeg,.mp4,.mov,.avi"
                                        className="hidden"
                                    />

                                    {!attachment ? (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full group flex flex-col items-center justify-center gap-3 px-6 py-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer"
                                        >
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
                                                <img
                                                    src={attachmentPreview}
                                                    alt="Preview"
                                                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                                                    {getFileIcon(attachment.name)}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                                                <p className="text-xs text-gray-400">{(attachment.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                            <button
                                                onClick={removeAttachment}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Send Section - Right Column */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ready to Send?</h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Click send to choose your recipients and deliver this notice.
                                </p>
                                <button
                                    onClick={handleSendClick}
                                    disabled={!message.trim()}
                                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                >
                                    <FaPaperPlane size={14} />
                                    Send Notice
                                </button>
                            </div>

                            {/* Quick Stats */}
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Notice Preview</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Characters</span>
                                        <span className="font-medium text-gray-900">{message.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Words</span>
                                        <span className="font-medium text-gray-900">{message.trim() ? message.trim().split(/\s+/).length : 0}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Attachment</span>
                                        <span className="font-medium text-gray-900">{attachment ? '1 file' : 'None'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Groups Tab (Teacher & Admin) */}
                {(isTeacher || isAdmin) && activeTab === 'groups' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Create Group */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center">
                                    <FaPlus className="text-emerald-500" size={18} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Create New Group</h2>
                                    <p className="text-sm text-gray-500">Group students for quick messaging</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                                    <input
                                        type="text"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        placeholder="e.g., Science Club"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Students</label>
                                    <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                                        {students.map(student => (
                                            <label
                                                key={student._id}
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={newGroupStudents.includes(student._id)}
                                                    onChange={() => toggleSelection(newGroupStudents, setNewGroupStudents, student._id)}
                                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                                />
                                                <span className="text-sm text-gray-700">{student.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Select Teachers (Admin Only) */}
                                {isAdmin && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Teachers</label>
                                        <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                                            {teachers.map(teacher => (
                                                <label
                                                    key={teacher._id}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={newGroupTeachers.includes(teacher._id)}
                                                        onChange={() => toggleSelection(newGroupTeachers, setNewGroupTeachers, teacher._id)}
                                                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                                    />
                                                    <span className="text-sm text-gray-700">{teacher.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleCreateGroup}
                                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors"
                                >
                                    <FaPlus size={12} />
                                    Create Group
                                </button>
                            </div>
                        </div>

                        {/* Groups List */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                                    <FaUserFriends className="text-violet-500" size={18} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Your Groups</h2>
                                    <p className="text-sm text-gray-500">{groups.length} group{groups.length !== 1 ? 's' : ''} created</p>
                                </div>
                            </div>
                            <div className="p-6">
                                {groups.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <FaUserFriends className="text-gray-400" size={20} />
                                        </div>
                                        <p className="text-gray-500 text-sm">No groups created yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {groups.map(group => (
                                            <div
                                                key={group._id}
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg flex items-center justify-center">
                                                        <FaUsers className="text-violet-500" size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{group.name}</p>
                                                        <p className="text-xs text-gray-400">{(group.members || []).length} member{(group.members || []).length !== 1 ? 's' : ''}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteGroup(group._id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <FaTrash size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="space-y-6">
                        {/* History Header & Controls */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Notice & Files History</h2>
                                    <p className="text-sm text-gray-500">Track all your sent communications</p>
                                </div>
                                {/* Search Bar */}
                                <div className="relative w-full md:w-72">
                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Search history..."
                                        value={historySearch}
                                        onChange={(e) => setHistorySearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                {/* Type Filter */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500 uppercase">Type:</span>
                                    <select
                                        value={historyFilters.type}
                                        onChange={(e) => setHistoryFilters({ ...historyFilters, type: e.target.value })}
                                        className="text-sm border-gray-200 rounded-lg focus:ring-primary focus:border-primary px-2 py-1 bg-white"
                                    >
                                        <option value="all">All</option>
                                        <option value="notice">Notice</option>
                                        <option value="file">File</option>
                                    </select>
                                </div>
                                <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>

                                {/* Sent To Filter */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500 uppercase">Sent To:</span>
                                    <select
                                        value={historyFilters.sentTo}
                                        onChange={(e) => setHistoryFilters({ ...historyFilters, sentTo: e.target.value })}
                                        className="text-sm border-gray-200 rounded-lg focus:ring-primary focus:border-primary px-2 py-1 bg-white"
                                    >
                                        <option value="all">All</option>
                                        <option value="group">Group / Class</option>
                                        <option value="individual">Individual</option>
                                    </select>
                                </div>
                                <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>

                                {/* Date Filter */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500 uppercase">Date:</span>
                                    <select
                                        value={historyFilters.date}
                                        onChange={(e) => setHistoryFilters({ ...historyFilters, date: e.target.value })}
                                        className="text-sm border-gray-200 rounded-lg focus:ring-primary focus:border-primary px-2 py-1 bg-white"
                                    >
                                        <option value="all">Any Time</option>
                                        <option value="today">Today</option>
                                        <option value="last7">Last 7 Days</option>
                                        <option value="last30">Last 30 Days</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* History List */}
                        <div className="space-y-4">
                            {filteredHistory.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FaHistory className="text-gray-300" size={24} />
                                    </div>
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
                                                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
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

                {/* View History Item Modal */}
                {viewItem && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Notice Details</h3>
                                <button
                                    onClick={() => setViewItem(null)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <FaTimes className="text-gray-400" size={16} />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                {/* Header Info */}
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${viewItem.type === 'notice' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                                        }`}>
                                        {viewItem.type === 'notice' ? <FaPaperPlane size={20} /> : <FaPaperclip size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900">{viewItem.title}</h4>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                            <span>{new Date(viewItem.createdAt).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span>{getRecipientLabel(viewItem)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Message Body */}
                                <div className="bg-gray-50 rounded-xl p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                                    {viewItem.message}
                                </div>

                                {/* Attachments */}
                                {viewItem.attachment && viewItem.attachment.filename && (
                                    <div>
                                        <h5 className="text-sm font-medium text-gray-900 mb-3">Attachment</h5>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center">
                                                        {getFileIcon(viewItem.attachment.originalName || viewItem.attachment.filename)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{viewItem.attachment.originalName || viewItem.attachment.filename}</p>
                                                        <p className="text-xs text-gray-500">{((viewItem.attachment.size || 0) / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                                <a href={viewItem.attachment.path} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                                                    <FaDownload size={14} />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        onClick={() => setViewItem(null)}
                                        className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Send Modal */}
            {showSendModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <FaPaperPlane className="text-primary" size={16} />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Send Notice</h3>
                            </div>
                            <button
                                onClick={() => setShowSendModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <FaTimes className="text-gray-400" size={16} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <p className="text-sm text-gray-500 mb-4">Choose who should receive this notice:</p>

                            {/* Admin Options */}
                            {isAdmin && (
                                <div className="space-y-3">
                                    {/* Entire School */}
                                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="radio"
                                            name="sendOption"
                                            value="school"
                                            checked={sendOption === 'school'}
                                            onChange={(e) => {
                                                setSendOption(e.target.value);
                                                setSearchTerm('');
                                            }}
                                            className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Entire School</p>
                                            <p className="text-xs text-gray-400">All teachers and students</p>
                                        </div>
                                    </label>

                                    {/* Specific Classes */}
                                    <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="radio"
                                            name="sendOption"
                                            value="classes"
                                            checked={sendOption === 'classes'}
                                            onChange={(e) => {
                                                setSendOption(e.target.value);
                                                setSearchTerm('');
                                            }}
                                            className="w-4 h-4 text-primary border-gray-300 focus:ring-primary mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">Specific Classes</p>
                                            <p className="text-xs text-gray-400 mb-2">Select one or more classes</p>
                                            {sendOption === 'classes' && (
                                                <div className="mt-3 space-y-3">
                                                    <div className="relative">
                                                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                        <input
                                                            type="text"
                                                            placeholder="Search classes..."
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                                                        {classes
                                                            .filter(cls => cls.label.toLowerCase().includes(searchTerm.toLowerCase()))
                                                            .map(cls => (
                                                                <label key={cls.value} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-b-0">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedClasses.includes(cls.value)}
                                                                        onChange={() => toggleSelection(selectedClasses, setSelectedClasses, cls.value)}
                                                                        className="w-3.5 h-3.5 text-primary border-gray-300 rounded focus:ring-primary"
                                                                    />
                                                                    {cls.label}
                                                                </label>
                                                            ))}
                                                        {classes.filter(cls => cls.label.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                                            <div className="px-3 py-4 text-center text-xs text-gray-400">
                                                                No classes found
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </label>

                                    {/* Specific Users */}
                                    <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="radio"
                                            name="sendOption"
                                            value="users"
                                            checked={sendOption === 'users'}
                                            onChange={(e) => {
                                                setSendOption(e.target.value);
                                                setSearchTerm('');
                                            }}
                                            className="w-4 h-4 text-primary border-gray-300 focus:ring-primary mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">Specific Users</p>
                                            <p className="text-xs text-gray-400 mb-2">Select individual users</p>
                                            {sendOption === 'users' && (
                                                <div className="mt-3 space-y-3">
                                                    <div className="relative">
                                                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                        <input
                                                            type="text"
                                                            placeholder="Search users..."
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                                                        {allUsers
                                                            .filter(user =>
                                                                (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                                (user.role || '').toLowerCase().includes(searchTerm.toLowerCase())
                                                            )
                                                            .map(user => (
                                                                <label key={user._id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-b-0">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedUsers.includes(user._id)}
                                                                        onChange={() => toggleSelection(selectedUsers, setSelectedUsers, user._id)}
                                                                        className="w-3.5 h-3.5 text-primary border-gray-300 rounded focus:ring-primary"
                                                                    />
                                                                    <span className="flex-1 truncate">{user.name}</span>
                                                                    <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${user.role === 'teacher' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                                                                        {user.role}
                                                                    </span>
                                                                </label>
                                                            ))}
                                                        {allUsers.filter(user =>
                                                            (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                            (user.role || '').toLowerCase().includes(searchTerm.toLowerCase())
                                                        ).length === 0 && (
                                                                <div className="px-3 py-4 text-center text-xs text-gray-400">
                                                                    No users found
                                                                </div>
                                                            )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </label>

                                    {/* Custom Groups */}
                                    {groups.length > 0 && (
                                        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                            <input
                                                type="radio"
                                                name="sendOption"
                                                value="groups"
                                                checked={sendOption === 'groups'}
                                                onChange={(e) => {
                                                    setSendOption(e.target.value);
                                                    setSearchTerm('');
                                                }}
                                                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary mt-0.5"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">Custom Groups</p>
                                                <p className="text-xs text-gray-400 mb-2">Your created groups</p>
                                                {sendOption === 'groups' && (
                                                    <div className="mt-3 space-y-3">
                                                        <div className="relative">
                                                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                            <input
                                                                type="text"
                                                                placeholder="Search groups..."
                                                                value={searchTerm}
                                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                                                            {groups
                                                                .filter(group => group.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                                                .map(group => (
                                                                    <label key={group._id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-b-0">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedGroups.includes(group._id)}
                                                                            onChange={() => toggleSelection(selectedGroups, setSelectedGroups, group._id)}
                                                                            className="w-3.5 h-3.5 text-primary border-gray-300 rounded focus:ring-primary"
                                                                        />
                                                                        <span>{group.name}</span>
                                                                        <span className="text-xs text-gray-400">({(group.members || []).length})</span>
                                                                    </label>
                                                                ))}
                                                            {groups.filter(group => group.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                                                <div className="px-3 py-4 text-center text-xs text-gray-400">
                                                                    No groups found
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    )}
                                </div>
                            )}

                            {/* Teacher Options */}
                            {isTeacher && (
                                <div className="space-y-3">
                                    {/* All Students */}
                                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="radio"
                                            name="sendOption"
                                            value="allStudents"
                                            checked={sendOption === 'allStudents'}
                                            onChange={(e) => {
                                                setSendOption(e.target.value);
                                                setSearchTerm('');
                                            }}
                                            className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">All Students</p>
                                            <p className="text-xs text-gray-400">Your assigned class students</p>
                                        </div>
                                    </label>

                                    {/* Specific Students */}
                                    <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="radio"
                                            name="sendOption"
                                            value="students"
                                            checked={sendOption === 'students'}
                                            onChange={(e) => {
                                                setSendOption(e.target.value);
                                                setSearchTerm('');
                                            }}
                                            className="w-4 h-4 text-primary border-gray-300 focus:ring-primary mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">Specific Students</p>
                                            <p className="text-xs text-gray-400 mb-2">Select individual students</p>
                                            {sendOption === 'students' && (
                                                <div className="mt-3 space-y-3">
                                                    <div className="relative">
                                                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                        <input
                                                            type="text"
                                                            placeholder="Search students..."
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                                                        {students
                                                            .filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                                            .map(student => (
                                                                <label key={student._id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-b-0">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedStudents.includes(student._id)}
                                                                        onChange={() => toggleSelection(selectedStudents, setSelectedStudents, student._id)}
                                                                        className="w-3.5 h-3.5 text-primary border-gray-300 rounded focus:ring-primary"
                                                                    />
                                                                    {student.name}
                                                                </label>
                                                            ))}
                                                        {students.filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                                            <div className="px-3 py-4 text-center text-xs text-gray-400">
                                                                No students found
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </label>

                                    {/* Custom Groups */}
                                    {groups.length > 0 && (
                                        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                            <input
                                                type="radio"
                                                name="sendOption"
                                                value="groups"
                                                checked={sendOption === 'groups'}
                                                onChange={(e) => {
                                                    setSendOption(e.target.value);
                                                    setSearchTerm('');
                                                }}
                                                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary mt-0.5"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">Custom Groups</p>
                                                <p className="text-xs text-gray-400 mb-2">Your created groups</p>
                                                {sendOption === 'groups' && (
                                                    <div className="mt-3 space-y-3">
                                                        <div className="relative">
                                                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                            <input
                                                                type="text"
                                                                placeholder="Search groups..."
                                                                value={searchTerm}
                                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                                                            {groups
                                                                .filter(group => group.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                                                .map(group => (
                                                                    <label key={group._id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-b-0">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedGroups.includes(group._id)}
                                                                            onChange={() => toggleSelection(selectedGroups, setSelectedGroups, group._id)}
                                                                            className="w-3.5 h-3.5 text-primary border-gray-300 rounded focus:ring-primary"
                                                                        />
                                                                        <span>{group.name}</span>
                                                                        <span className="text-xs text-gray-400">({(group.members || []).length})</span>
                                                                    </label>
                                                                ))}
                                                            {groups.filter(group => group.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                                                <div className="px-3 py-4 text-center text-xs text-gray-400">
                                                                    No groups found
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setShowSendModal(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFinalSend}
                                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <FaPaperPlane size={12} />
                                Send Now
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
        </DashboardLayout >
    );
};

export default Notice;
