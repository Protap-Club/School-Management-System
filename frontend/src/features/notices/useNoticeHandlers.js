import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import {
    useNotices, useCreateNotice, useDeleteNotice, useGroups,
    useCreateGroup, useDeleteGroup, useClasses, useStudents, useTeachers, useAllUsers,
    useReceivedNotices, useAcknowledgeNotice, useAcknowledgments,
} from './api/queries';
import { ALLOWED_EXTENSIONS, IMAGE_EXTENSIONS, SELECTION_VALIDATORS, RECIPIENT_MAP } from './noticeConstants';
import { getRecipientLabel, getFileIcon } from './NoticeUtils';

export const useNoticeHandlers = () => {
    const { user: currentUser } = useAuth();
    const isAdmin = ['admin', 'super_admin'].includes(currentUser?.role);
    const isTeacher = currentUser?.role === 'teacher';
    const fileInputRef = useRef(null);
    const PAGE_SIZE = 12;

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
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);

    // Group creation state
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupStudents, setNewGroupStudents] = useState([]);
    const [newGroupTeachers, setNewGroupTeachers] = useState([]);
    const [groupStudentSearch, setGroupStudentSearch] = useState('');

    // History state
    const [historySearch, setHistorySearch] = useState('');
    const [historyFilters, setHistoryFilters] = useState({ type: 'all', sentTo: 'all', date: 'all' });
    const [viewItem, setViewItem] = useState(null);
    const [toast, setToast] = useState({ type: '', text: '' });
    const [historyPage, setHistoryPage] = useState(1);
    const [receivedPage, setReceivedPage] = useState(1);

    const selectionState = useMemo(() => ({ selectedClasses, selectedUsers, selectedStudents, selectedGroups }), [selectedClasses, selectedUsers, selectedStudents, selectedGroups]);

    // Server-side user search for admins to avoid loading thousands of users into the client.
    const isAdminUserSearchActive = isAdmin && sendOption === 'users';
    const adminUserSearch = isAdminUserSearchActive ? searchTerm.trim() : '';
    const adminUserRole = isAdminUserSearchActive && userRoleFilter !== 'all' ? userRoleFilter : undefined;
    const shouldSearchAllUsers = isAdminUserSearchActive && adminUserSearch.length >= 2;
    const adminUserQuery = useMemo(() => ({
        search: adminUserSearch,
        role: adminUserRole,
        pageSize: '5000'
    }), [adminUserSearch, adminUserRole]);

    const isAdminGroupSearchActive = isAdmin && activeTab === 'groups';
    const adminGroupStudentSearch = isAdminGroupSearchActive ? groupStudentSearch.trim() : '';
    const shouldSearchGroupStudents = isAdminGroupSearchActive && adminGroupStudentSearch.length >= 2;
    const adminGroupStudentQuery = useMemo(() => ({
        search: adminGroupStudentSearch,
        role: 'student',
        pageSize: '5000'
    }), [adminGroupStudentSearch]);

    // Data hooks
    const { data: noticesData } = useNotices(historyFilters);
    const { data: receivedData } = useReceivedNotices();
    const { data: classesData } = useClasses(isAdmin); // Admins need all classes
    const { data: studentsData } = useStudents(isTeacher); // Teachers need their students
    const { data: teachersData } = useTeachers(isAdmin); // Admins might need teachers list
    const { data: allUsersData } = useAllUsers(adminUserQuery, shouldSearchAllUsers);
    const { data: adminGroupStudentsData } = useAllUsers(adminGroupStudentQuery, shouldSearchGroupStudents);
    const { data: groupsData } = useGroups();
    const createNoticeMutation = useCreateNotice();
    const isSending = createNoticeMutation.isPending;
    const deleteNoticeMutation = useDeleteNotice();
    const createGroupMutation = useCreateGroup();
    const deleteGroupMutation = useDeleteGroup();

    const rawStudents = studentsData?.data?.users || studentsData?.data || [];
    const teachers = teachersData?.data?.users || teachersData?.data || [];
    const allUsers = shouldSearchAllUsers ? (allUsersData?.data?.users || allUsersData?.data || []) : [];
    const adminGroupStudents = shouldSearchGroupStudents
        ? (adminGroupStudentsData?.data?.users || adminGroupStudentsData?.data || [])
        : [];
    const students = isTeacher ? rawStudents : adminGroupStudents;
    const classes = classesData?.data || [];
    const groups = groupsData?.data || [];
    const historyItems = noticesData?.data || [];
    // For received notices - backend returns { received, history } for teachers on mobile,
    // but on web it always returns a flat array via /notices/received
    const receivedItems = Array.isArray(receivedData?.data)
        ? receivedData.data
        : (receivedData?.data?.received || []);

    const showToast = useCallback((type, text) => { setToast({ type, text }); setTimeout(() => setToast({ type: '', text: '' }), 3000); }, []);

    // Extracted utility
    const toggleSelection = (array, setArray, value) => { setArray(array.includes(value) ? array.filter(v => v !== value) : [...array, value]); };

    const handleFileUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            showToast('error', 'Invalid file type. Check allowed formats.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB Limit
            showToast('error', 'File is too large. Max size is 10MB.');
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
            setGroupStudentSearch('');
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

    useEffect(() => {
        setHistoryPage(1);
    }, [historySearch, historyFilters, historyItems.length]);

    useEffect(() => {
        setReceivedPage(1);
    }, [receivedItems.length]);

    const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
    const totalReceivedPages = Math.max(1, Math.ceil(receivedItems.length / PAGE_SIZE));

    useEffect(() => {
        if (historyPage > totalHistoryPages) setHistoryPage(totalHistoryPages);
    }, [historyPage, totalHistoryPages]);

    useEffect(() => {
        if (receivedPage > totalReceivedPages) setReceivedPage(totalReceivedPages);
    }, [receivedPage, totalReceivedPages]);

    const pagedHistory = filteredHistory.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);
    const pagedReceivedItems = receivedItems.slice((receivedPage - 1) * PAGE_SIZE, receivedPage * PAGE_SIZE);

    return {
        currentUser, isAdmin, isTeacher, fileInputRef,
        activeTab, setActiveTab,
        message, setMessage, requireAck, setRequireAck, attachment, setAttachment, attachmentPreview, setAttachmentPreview, messageError, setMessageError,
        showSendModal, setShowSendModal, sendOption, setSendOption, searchTerm, setSearchTerm,
        selectedClasses, setSelectedClasses, selectedUsers, setSelectedUsers, selectedStudents, setSelectedStudents, selectedGroups, setSelectedGroups,
        userRoleFilter, setUserRoleFilter,
        newGroupName, setNewGroupName, newGroupStudents, setNewGroupStudents, newGroupTeachers, setNewGroupTeachers,
        groupStudentSearch, setGroupStudentSearch,
        historySearch, setHistorySearch, historyFilters, setHistoryFilters, viewItem, setViewItem, toast, showToast,
        isSending, students, teachers, allUsers, classes, groups, historyItems, receivedItems, filteredHistory,
        historyPage, setHistoryPage, totalHistoryPages, pagedHistory,
        receivedPage, setReceivedPage, totalReceivedPages, pagedReceivedItems,
        toggleSelection, handleFileUpload, removeAttachment, handleSendClick, resetComposeState, handleFinalSend, handleDeleteHistory, handleCreateGroup, handleDeleteGroup, handleDownload
    };
};
