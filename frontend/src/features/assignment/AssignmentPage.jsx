import React, { useState } from 'react';
import { useAssignments, useDeleteAssignment, useSubmittedAssignments } from './api/queries';
import { AssignmentFilters } from './components/AssignmentFilters';
import { AssignmentTable } from './components/AssignmentTable';
import { AssignmentSubmissionTable } from './components/AssignmentSubmissionTable';
import { AssignmentModal } from './components/AssignmentModal';
import { FaBook, FaPlus, FaEye, FaCalendarAlt, FaClock, FaCheckCircle, FaInfoCircle, FaPaperclip, FaDownload, FaEdit } from 'react-icons/fa';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../auth';
import useDebounce from '../../hooks/useDebounce';

export const AssignmentPage = () => {
    const { user } = useAuth();
    const isAdmin = ['admin', 'super_admin'].includes(user?.role);
    const isTeacher = user?.role === 'teacher';
    const canCreate = isAdmin || isTeacher;
    const canEdit = isAdmin || isTeacher;
    const canDelete = isAdmin;
    const canViewSubmitted = isAdmin || isTeacher;

    // State
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Filters
    const [standardFilter, setStandardFilter] = useState('all');
    const [sectionFilter, setSectionFilter] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('active');

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [selectedAssignment, setSelectedAssignment] = useState(null);

    const assignmentQueryParams = {
        standard: standardFilter === 'all' ? undefined : standardFilter,
        section: sectionFilter === 'all' ? undefined : sectionFilter,
        subject: subjectFilter === 'all' ? undefined : subjectFilter,
        status: activeTab === 'submitted' ? undefined : activeTab,
        search: debouncedSearch,
        page,
        pageSize
    };

    const submittedQueryParams = {
        standard: standardFilter === 'all' ? undefined : standardFilter,
        section: sectionFilter === 'all' ? undefined : sectionFilter,
        subject: subjectFilter === 'all' ? undefined : subjectFilter,
        search: debouncedSearch,
        page,
        pageSize
    };

    const { data: assignmentResponse, isLoading: assignmentsLoading } = useAssignments(assignmentQueryParams, {
        enabled: activeTab !== 'submitted',
    });
    const { data: submittedResponse, isLoading: submittedLoading } = useSubmittedAssignments(submittedQueryParams, {
        enabled: canViewSubmitted && activeTab === 'submitted',
    });
    const deleteMutation = useDeleteAssignment();

    const assignments = assignmentResponse?.data?.assignments || [];
    const submissions = submittedResponse?.data?.submissions || [];
    const totalItems = activeTab === 'submitted'
        ? submittedResponse?.data?.pagination?.total || 0
        : assignmentResponse?.data?.pagination?.total || 0;
    const isLoading = activeTab === 'submitted' ? submittedLoading : assignmentsLoading;

    const tabs = [
        { id: 'active', label: 'Active Assignments' },
        ...(canViewSubmitted ? [{ id: 'submitted', label: 'Submitted' }] : []),
        { id: 'closed', label: 'Closed' },
    ];

    // Handlers
    const handleAddClick = () => {
        setEditingAssignment(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (assignment) => {
        if (!canEdit) return;
        setEditingAssignment(assignment);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (assignment) => {
        if (!canDelete) return;
        if (window.confirm(`Are you sure you want to delete "${assignment.title}"?`)) {
            try {
                await deleteMutation.mutateAsync(assignment._id);
            } catch (error) {
                console.error('Failed to delete assignment:', error);
            }
        }
    };

    const handleViewClick = (item) => {
        const assignment = item.assignment || item;
        setSelectedAssignment(assignment);
    };

    const handleDownload = async (url, filename) => {
        if (!url) return;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename || 'download';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error('Download failed:', err);
            // Fallback to direct link if fetch fails (e.g. CORS)
            window.open(url, '_blank');
        }
    };

    const handleSearchChange = (value) => {
        setSearchQuery(value);
        setPage(0);
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-primary transform hover:rotate-6 transition-transform">
                            <FaBook size={32} />
                        </div>
                        <div className="space-y-1">
                            <h1 className="page-title">Assignments</h1>
                            <p className="page-subtitle">Manage and track academic work across classes</p>
                        </div>
                    </div>
                    {canCreate && (
                        <button
                            onClick={handleAddClick}
                            className="btn-primary px-6 rounded-xl shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
                        >
                            <FaPlus className="text-xs" />
                            <span>Create Assignment</span>
                        </button>
                    )}
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-2 p-1 bg-gray-100/80 rounded-xl w-fit">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setPage(0); }}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                                    {totalItems}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {/* Filters & Search */}
                    <AssignmentFilters
                        searchQuery={searchQuery}
                        onSearchChange={handleSearchChange}
                        searchPlaceholder={activeTab === 'submitted' ? 'Search by assignment, student, email or roll number...' : 'Search assignments...'}
                        standardFilter={standardFilter}
                        onStandardChange={(val) => { setStandardFilter(val); setSectionFilter('all'); setSubjectFilter('all'); setPage(0); }}
                        sectionFilter={sectionFilter}
                        onSectionChange={(val) => { setSectionFilter(val); setSubjectFilter('all'); setPage(0); }}
                        subjectFilter={subjectFilter}
                        onSubjectChange={(val) => { setSubjectFilter(val); setPage(0); }}
                        statusFilter={activeTab}
                        onStatusChange={setActiveTab}
                        onAddAssignment={handleAddClick}
                        canCreate={false} // Hidden here as we moved it to header
                    />

                    {/* Table */}
                    {activeTab === 'submitted' ? (
                        <AssignmentSubmissionTable
                            submissions={submissions}
                            loading={isLoading}
                            currentPage={page}
                            totalItems={totalItems}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={(value) => { setPageSize(value); setPage(0); }}
                            onViewClick={handleViewClick}
                        />
                    ) : (
                        <AssignmentTable
                            assignments={assignments}
                            loading={isLoading}
                            onViewClick={handleViewClick}
                            onEditClick={canEdit ? handleEditClick : null}
                            onDeleteClick={canDelete ? handleDeleteClick : null}
                            currentPage={page}
                            totalItems={totalItems}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onSortClick={() => {}} // Placeholder or implement if needed
                            onPageSizeChange={(value) => { setPageSize(value); setPage(0); }}
                        />
                    )}
                </div>

                {/* Modal */}
                <AssignmentModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    assignmentToEdit={editingAssignment}
                />

                {/* Assignment Detail View Modal */}
                {selectedAssignment && (
                    <div className="modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 overflow-y-auto animate-in fade-in duration-300">
                        <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl my-auto relative animate-in zoom-in-95 duration-300">
                            <div className="max-h-[90vh] overflow-y-auto custom-scrollbar no-scrollbar">
                                {/* Header */}
                                <div className="p-8 md:p-10 bg-white border-b border-slate-100 flex items-center justify-between rounded-t-[32px] sticky top-0 z-10">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-[22px] flex items-center justify-center border border-slate-100 shadow-sm bg-indigo-50">
                                            <FaBook className="text-indigo-600" size={28} />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{selectedAssignment.title}</h2>
                                            <div className="flex items-center gap-2 mt-1.5 font-medium">
                                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-100">
                                                    Class {selectedAssignment.standard}-{selectedAssignment.section}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                                    selectedAssignment.status === 'active' 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                                }`}>
                                                    {selectedAssignment.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setSelectedAssignment(null)}
                                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-100 shadow-sm"
                                        >
                                            <FaPlus className="rotate-45" size={24} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 md:p-8">
                                    {/* Info Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Audience</div>
                                            <div className="text-slate-900 font-bold">Class {selectedAssignment.standard} • Section {selectedAssignment.section}</div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Academic Details</div>
                                            <div className="text-slate-900 font-bold">{selectedAssignment.subject} • {selectedAssignment.teacher?.name || 'Staff'}</div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Deadline</div>
                                            <div className="text-slate-900 font-bold">
                                                {new Date(selectedAssignment.dueDate).toLocaleDateString()} • {selectedAssignment.requiresSubmission ? 'Submission Required' : 'No Submission'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="mb-10">
                                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3 px-1">
                                            <FaInfoCircle className="text-indigo-600" size={14} />
                                            Instructions & Overview
                                        </h4>
                                        <div className="p-5 rounded-2xl bg-indigo-50/10 border border-indigo-100 text-slate-700 leading-relaxed italic whitespace-pre-wrap shadow-inner">
                                            {selectedAssignment.description || "No instructions provided."}
                                        </div>
                                    </div>

                                    {/* Attachments */}
                                    {selectedAssignment.attachments?.length > 0 && (
                                        <div>
                                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-4 px-1">
                                                <FaPaperclip className="text-indigo-600" size={14} />
                                                Learning Materials
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {selectedAssignment.attachments.map((file, idx) => (
                                                    <div key={idx} className="group relative p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-lg transition-all flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all shadow-sm">
                                                                <FaBook size={18} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{file.originalName || file.name}</div>
                                                                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{file.fileType || 'file'}</div>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleDownload(file.url, file.originalName || file.name)}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100 shadow-sm hover:shadow"
                                                            title="Download File"
                                                        >
                                                            <FaDownload size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
};

export default AssignmentPage;
