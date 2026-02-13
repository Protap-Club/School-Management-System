import React, { useState, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import {
    useNotices, useCreateNotice, useDeleteNotice, useGroups,
    useCreateGroup, useDeleteGroup, useClasses, useStudents, useTeachers, useAllUsers,
} from '../features/notices';
import {
    FaPaperPlane, FaUsers, FaPaperclip, FaTimes, FaCheck, FaFilePdf, FaFileWord,
    FaFilePowerpoint, FaFileExcel, FaFileAlt, FaImage, FaTrash, FaPlus, FaUserFriends,
    FaSearch, FaHistory, FaEye, FaDownload, FaFileVideo, FaFileCode, FaFileCsv
} from 'react-icons/fa';

const ALLOWED_EXTENSIONS = [
    'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'iti',
    'png', 'jpg', 'jpeg', 'mp4', 'mov', 'avi'
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
    school: { type: 'all', key: null },
    allStudents: { type: 'students', key: null },
    classes: { type: 'classes', key: 'selectedClasses' },
    users: { type: 'users', key: 'selectedUsers' },
    students: { type: 'students', key: 'selectedStudents' },
    groups: { type: 'groups', key: 'selectedGroups' },
};

const Notice = () => {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';
    const isTeacher = currentUser?.role === 'teacher';
    const fileInputRef = useRef(null);

    const [activeTab, setActiveTab] = useState('compose');
    const [message, setMessage] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [messageError, setMessageError] = useState('');
    const [showSendModal, setShowSendModal] = useState(false);
    const [sendOption, setSendOption] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupStudents, setNewGroupStudents] = useState([]);
    const [newGroupTeachers, setNewGroupTeachers] = useState([]);
    const [historySearch, setHistorySearch] = useState('');
    const [historyFilters, setHistoryFilters] = useState({ type: 'all', sentTo: 'all', date: 'all' });
    const [viewItem, setViewItem] = useState(null);
    const [toast, setToast] = useState({ type: '', text: '' });

    const selectionState = { selectedClasses, selectedUsers, selectedStudents, selectedGroups };

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

    const students = studentsData?.data?.users || studentsData?.data || [];
    const teachers = teachersData?.data?.users || teachersData?.data || [];
    const allUsers = allUsersData?.data?.users || allUsersData?.data || [];
    const classes = classesData?.data || [];
    const groups = groupsData?.data || [];
    const historyItems = noticesData?.data || [];

    const showToast = (type, text) => { setToast({ type, text }); setTimeout(() => setToast({ type: '', text: '' }), 3000); };
    const toggleSelection = (array, setArray, value) => { setArray(array.includes(value) ? array.filter(v => v !== value) : [...array, value]); };
    const getRecipientLabel = (item) => {
        if (item.recipientType === 'classes') return item.recipients?.join(', ') || 'Classes';
        return RECIPIENT_LABELS[item.recipientType] || item.recipientType || 'Unknown';
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) { showToast('error', 'Internal Server Error'); return; }
        setAttachment(file);
        if (IMAGE_EXTENSIONS.includes(ext)) {
            const reader = new FileReader();
            reader.onload = (e) => setAttachmentPreview(e.target.result);
            reader.readAsDataURL(file);
        } else { setAttachmentPreview(null); }
    };

    const removeAttachment = () => { setAttachment(null); setAttachmentPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

    const handleSendClick = () => {
        if (!message.trim()) { setMessageError('Message is required'); return; }
        setMessageError(''); setShowSendModal(true);
    };

    const handleFinalSend = async () => {
        if (!sendOption) { showToast('error', 'Please select recipients'); return; }
        const validator = SELECTION_VALIDATORS[sendOption];
        if (validator && selectionState[validator.list].length === 0) { showToast('error', validator.msg); return; }
        const mapping = RECIPIENT_MAP[sendOption] || { type: sendOption, key: null };
        const recipientType = mapping.type;
        const recipients = mapping.key ? selectionState[mapping.key] : [];
        try {
            await createNoticeMutation.mutateAsync({ message, title: message.substring(0, 50), recipientType, recipients, attachment: attachment || undefined });
            showToast('success', 'Notice sent successfully!');
            setMessage(''); setAttachment(null); setAttachmentPreview(null);
            setShowSendModal(false); setSendOption('');
            setSelectedClasses([]); setSelectedUsers([]); setSelectedStudents([]); setSelectedGroups([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) { showToast('error', error?.response?.data?.message || 'Failed to send notice'); }
    };

    const handleDeleteHistory = async (itemId) => {
        try { await deleteNoticeMutation.mutateAsync(itemId); showToast('success', 'Notice deleted'); }
        catch (error) { showToast('error', error?.response?.data?.message || 'Failed to delete'); }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) { showToast('error', 'Group name is required'); return; }
        if (newGroupStudents.length === 0 && newGroupTeachers.length === 0) { showToast('error', 'Select at least one student or teacher'); return; }
        try {
            await createGroupMutation.mutateAsync({ name: newGroupName, students: [...newGroupStudents, ...newGroupTeachers] });
            setNewGroupName(''); setNewGroupStudents([]); setNewGroupTeachers([]);
            showToast('success', 'Group created successfully!');
        } catch (error) { showToast('error', error?.response?.data?.message || 'Failed to create group'); }
    };

    const handleDeleteGroup = async (groupId) => {
        try { await deleteGroupMutation.mutateAsync(groupId); showToast('success', 'Group deleted'); }
        catch (error) { showToast('error', error?.response?.data?.message || 'Failed to delete group'); }
    };

    const filteredHistory = historyItems.filter(item => {
        if (!historySearch) return true;
        const s = historySearch.toLowerCase();
        return (item.title || '').toLowerCase().includes(s) || (item.message || '').toLowerCase().includes(s) || getRecipientLabel(item).toLowerCase().includes(s);
    });

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
                    {renderTabButton('compose', <FaPaperPlane />, 'Compose')}
                    {(isTeacher || isAdmin) && renderTabButton('groups', <FaUserFriends />, 'Groups')}
                    {renderTabButton('history', <FaHistory />, 'History')}
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
                                    {messageError && (
                                        <p className="mt-2 text-sm text-red-500 flex items-center gap-1"><FaTimes size={10} /> {messageError}</p>
                                    )}
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                {renderSectionHeader(<FaPaperclip />, 'from-amber-100 to-orange-100', 'text-amber-600', 'Attachment', 'JPG,JPEG,PNG,PPT,PPTX,DOC,DOCX,XLXS,XLS,MP4,MOV,AVI,ITI,CSV,TXT')}
                                <div className="p-6">
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload}
                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.iti,.png,.jpg,.jpeg,.mp4,.mov,.avi" className="hidden" />
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
                            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ready to Send?</h3>
                                <p className="text-sm text-gray-500 mb-6">Click send to choose your recipients and deliver this notice.</p>
                                <button onClick={handleSendClick} disabled={!message.trim()}
                                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                                    <FaPaperPlane size={14} /> Send Notice
                                </button>
                            </div>
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Notice Preview</h3>
                                <div className="space-y-3">
                                    {[['Characters', message.length], ['Words', message.trim() ? message.trim().split(/\s+/).length : 0], ['Attachment', attachment ? '1 file' : 'None']].map(([label, value]) => (
                                        <div key={label} className="flex justify-between text-sm">
                                            <span className="text-gray-500">{label}</span>
                                            <span className="font-medium text-gray-900">{value}</span>
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
                                    <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                                        placeholder="e.g., Science Club"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Students</label>
                                    <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                                        {students.map(student => (
                                            <label key={student._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0">
                                                <input type="checkbox" checked={newGroupStudents.includes(student._id)}
                                                    onChange={() => toggleSelection(newGroupStudents, setNewGroupStudents, student._id)}
                                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
                                                <span className="text-sm text-gray-700">{student.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {isAdmin && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Teachers</label>
                                        <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                                            {teachers.map(teacher => (
                                                <label key={teacher._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0">
                                                    <input type="checkbox" checked={newGroupTeachers.includes(teacher._id)}
                                                        onChange={() => toggleSelection(newGroupTeachers, setNewGroupTeachers, teacher._id)}
                                                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
                                                    <span className="text-sm text-gray-700">{teacher.name}</span>
                                                </label>
                                            ))}
                                        </div>
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
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.type === 'notice' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                                {item.type === 'notice' ? <FaPaperPlane size={16} /> : <FaPaperclip size={16} />}
                                            </div>
                                            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 w-full">
                                                <div className="md:col-span-5">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-base font-semibold text-gray-900 truncate">{item.title}</h3>
                                                        {item.attachment && item.attachment.filename && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"><FaPaperclip className="mr-1" size={10} />1</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500 line-clamp-2">{item.message}</p>
                                                </div>
                                                <div className="md:col-span-3 flex items-center">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                                            {(item.recipientType === 'users' || item.recipientType === 'students') ? <FaUserFriends size={10} /> : <FaUsers size={10} />}
                                                        </div>
                                                        <span className="truncate max-w-[150px]" title={getRecipientLabel(item)}>{getRecipientLabel(item)}</span>
                                                    </div>
                                                </div>
                                                <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-6">
                                                    <div className="text-right">
                                                        <div className="text-sm font-medium text-emerald-600 flex items-center justify-end gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Sent
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-1">
                                                            {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setViewItem(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details"><FaEye size={16} /></button>
                                                        <button onClick={() => handleDeleteHistory(item._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><FaTrash size={16} /></button>
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

                {viewItem && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Notice Details</h3>
                                <button onClick={() => setViewItem(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><FaTimes className="text-gray-400" size={16} /></button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${viewItem.type === 'notice' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {viewItem.type === 'notice' ? <FaPaperPlane size={20} /> : <FaPaperclip size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900">{viewItem.title}</h4>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                            <span>{new Date(viewItem.createdAt).toLocaleDateString()}</span><span>•</span><span>{getRecipientLabel(viewItem)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{viewItem.message}</div>
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
                                                <a href={viewItem.attachment.path} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"><FaDownload size={14} /></a>
                                            </div>
                                        </div>
                                    </div>
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
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                            <button onClick={() => setShowSendModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleFinalSend} className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                                <FaPaperPlane size={12} /> Send Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Notice;
