import React, { useState, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
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
    FaSearch
} from 'react-icons/fa';

// Mock data for frontend-only implementation
const MOCK_STUDENTS = [
    { _id: '1', name: 'Rahul Sharma', email: 'rahul@student.com' },
    { _id: '2', name: 'Priya Patel', email: 'priya@student.com' },
    { _id: '3', name: 'Amit Kumar', email: 'amit@student.com' },
    { _id: '4', name: 'Sneha Gupta', email: 'sneha@student.com' },
    { _id: '5', name: 'Vikram Singh', email: 'vikram@student.com' },
    { _id: '6', name: 'Ananya Reddy', email: 'ananya@student.com' },
];

const MOCK_CLASSES = [
    { value: '9-A', label: 'Class 9 - Section A' },
    { value: '9-B', label: 'Class 9 - Section B' },
    { value: '10-A', label: 'Class 10 - Section A' },
    { value: '10-B', label: 'Class 10 - Section B' },
    { value: '11-A', label: 'Class 11 - Section A' },
    { value: '11-B', label: 'Class 11 - Section B' },
    { value: '12-A', label: 'Class 12 - Section A' },
    { value: '12-B', label: 'Class 12 - Section B' },
];

const MOCK_USERS = [
    { _id: '1', name: 'Mr. John Smith', role: 'teacher', email: 'john@school.com' },
    { _id: '2', name: 'Ms. Sarah Johnson', role: 'teacher', email: 'sarah@school.com' },
    { _id: '3', name: 'Rahul Sharma', role: 'student', email: 'rahul@student.com' },
    { _id: '4', name: 'Priya Patel', role: 'student', email: 'priya@student.com' },
    { _id: '5', name: 'Amit Kumar', role: 'student', email: 'amit@student.com' },
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'];

// Get file icon based on extension
const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) return <FaImage className="text-green-500" size={24} />;
    if (ext === 'pdf') return <FaFilePdf className="text-red-500" size={24} />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord className="text-blue-500" size={24} />;
    if (['ppt', 'pptx'].includes(ext)) return <FaFilePowerpoint className="text-orange-500" size={24} />;
    if (['xls', 'xlsx'].includes(ext)) return <FaFileExcel className="text-green-600" size={24} />;
    return <FaFileAlt className="text-gray-500" size={24} />;
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

    // Groups state (Teacher only)
    const [groups, setGroups] = useState([
        { id: '1', name: 'Class Representatives', students: ['1', '2'] },
        { id: '2', name: 'Sports Team', students: ['3', '4', '5'] },
    ]);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupStudents, setNewGroupStudents] = useState([]);

    // Toast state
    const [toast, setToast] = useState({ type: '', text: '' });

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
    const handleFinalSend = () => {
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

        // Success - clear state
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
    };

    // Handle create group
    const handleCreateGroup = () => {
        if (!newGroupName.trim()) {
            setToast({ type: 'error', text: 'Group name is required' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
            return;
        }
        if (newGroupStudents.length === 0) {
            setToast({ type: 'error', text: 'Select at least one student' });
            setTimeout(() => setToast({ type: '', text: '' }), 3000);
            return;
        }

        const newGroup = {
            id: Date.now().toString(),
            name: newGroupName,
            students: newGroupStudents
        };
        setGroups([...groups, newGroup]);
        setNewGroupName('');
        setNewGroupStudents([]);
        setToast({ type: 'success', text: 'Group created successfully!' });
        setTimeout(() => setToast({ type: '', text: '' }), 3000);
    };

    // Handle delete group
    const handleDeleteGroup = (groupId) => {
        setGroups(groups.filter(g => g.id !== groupId));
        setToast({ type: 'success', text: 'Group deleted' });
        setTimeout(() => setToast({ type: '', text: '' }), 3000);
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

                {/* Tab Navigation (Teacher sees Groups tab) */}
                {isTeacher && (
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
                    </div>
                )}

                {/* Compose Tab */}
                {(activeTab === 'compose' || isAdmin) && (
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
                                        <p className="text-sm text-gray-500">PDF, DOC, PPT, XLS, PNG, JPG (optional)</p>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg"
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

                {/* Groups Tab (Teacher Only) */}
                {isTeacher && activeTab === 'groups' && (
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
                                        {MOCK_STUDENTS.map(student => (
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
                                                key={group.id}
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg flex items-center justify-center">
                                                        <FaUsers className="text-violet-500" size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{group.name}</p>
                                                        <p className="text-xs text-gray-400">{group.students.length} student{group.students.length !== 1 ? 's' : ''}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteGroup(group.id)}
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
                                                        {MOCK_CLASSES
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
                                                        {MOCK_CLASSES.filter(cls => cls.label.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
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
                                                        {MOCK_USERS
                                                            .filter(user =>
                                                                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                                user.role.toLowerCase().includes(searchTerm.toLowerCase())
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
                                                        {MOCK_USERS.filter(user =>
                                                            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                            user.role.toLowerCase().includes(searchTerm.toLowerCase())
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
                                                        {MOCK_STUDENTS
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
                                                        {MOCK_STUDENTS.filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
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
                                                                    <label key={group.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-b-0">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedGroups.includes(group.id)}
                                                                            onChange={() => toggleSelection(selectedGroups, setSelectedGroups, group.id)}
                                                                            className="w-3.5 h-3.5 text-primary border-gray-300 rounded focus:ring-primary"
                                                                        />
                                                                        <span>{group.name}</span>
                                                                        <span className="text-xs text-gray-400">({group.students.length})</span>
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
            )}
        </DashboardLayout>
    );
};

export default Notice;
