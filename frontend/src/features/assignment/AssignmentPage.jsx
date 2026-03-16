import React, { useState } from 'react';
import { useAssignments, useDeleteAssignment } from './api/queries';
import { AssignmentFilters } from './components/AssignmentFilters';
import { AssignmentTable } from './components/AssignmentTable';
import { AssignmentModal } from './components/AssignmentModal';
import { FaBook, FaPlus } from 'react-icons/fa';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../auth';
import useDebounce from '../../hooks/useDebounce';

export const AssignmentPage = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const isTeacher = user?.role === 'teacher';
    const canCreate = isTeacher; // Only teachers can create assignments
    const canManage = isAdmin || isTeacher; // Both can see edit/delete buttons technically, but teacher mostly manages their own
    
    // State
    const [page, setPage] = useState(0);
    const [pageSize] = useState(25);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    
    // Filters
    const [standardFilter, setStandardFilter] = useState('all');
    const [sectionFilter, setSectionFilter] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('active'); // Default to active

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);

    // Fetch data
    const queryParams = {
        standard: standardFilter === 'all' ? undefined : standardFilter,
        section: sectionFilter === 'all' ? undefined : sectionFilter,
        subject: subjectFilter === 'all' ? undefined : subjectFilter,
        status: statusFilter,
        search: debouncedSearch,
        page,
        pageSize
    };

    const { data: response, isLoading } = useAssignments(queryParams);
    const deleteMutation = useDeleteAssignment();

    const assignments = response?.data?.assignments || [];
    const totalItems = response?.data?.pagination?.total || 0;

    // Handlers
    const handleAddClick = () => {
        setEditingAssignment(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (assignment) => {
        if (!canManage) return;
        setEditingAssignment(assignment);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (assignment) => {
        if (!canManage) return;
        if (window.confirm(`Are you sure you want to delete "${assignment.title}"?`)) {
            try {
                await deleteMutation.mutateAsync(assignment._id);
            } catch (error) {
                console.error('Failed to delete assignment:', error);
            }
        }
    };

    const handleSearchChange = (value) => {
        setSearchQuery(value);
        setPage(0);
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                                <FaBook size={20} />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Assignments</h1>
                        </div>
                        <p className="text-sm text-gray-500 font-medium ml-12">Manage and track academic work across classes</p>
                    </div>

                    {canCreate && (
                        <button
                            onClick={handleAddClick}
                            className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all text-sm font-semibold shadow-md hover:shadow-lg active:scale-95"
                        >
                            <FaPlus className="text-xs" />
                            <span>Create Assignment</span>
                        </button>
                    )}
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-2 p-1 bg-gray-100/80 rounded-xl w-fit">
                    {[
                        { id: 'active', label: 'Active Assignments', count: statusFilter === 'active' ? totalItems : null },
                        { id: 'closed', label: 'Closed', count: statusFilter === 'closed' ? totalItems : null }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setStatusFilter(tab.id); setPage(0); }}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                                statusFilter === tab.id 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                            }`}
                        >
                            {tab.label}
                            {tab.count !== null && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${statusFilter === tab.id ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                                    {tab.count}
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
                        standardFilter={standardFilter}
                        onStandardChange={(val) => { setStandardFilter(val); setSectionFilter('all'); setSubjectFilter('all'); setPage(0); }}
                        sectionFilter={sectionFilter}
                        onSectionChange={(val) => { setSectionFilter(val); setSubjectFilter('all'); setPage(0); }}
                        subjectFilter={subjectFilter}
                        onSubjectChange={(val) => { setSubjectFilter(val); setPage(0); }}
                        // Status filter is now handled by tabs, so we hide it in AssignmentFilters if needed 
                        // or just pass a dummy to keep it from breaking.
                        statusFilter={statusFilter}
                        onStatusChange={setStatusFilter}
                        onAddAssignment={handleAddClick}
                        canCreate={false} // Hidden here as we moved it to header
                    />

                    {/* Table */}
                    <AssignmentTable 
                        assignments={assignments}
                        loading={isLoading}
                        onViewClick={(a) => handleEditClick(a)}
                        onEditClick={canManage ? handleEditClick : null}
                        onDeleteClick={canManage ? handleDeleteClick : null}
                        currentPage={page}
                        totalItems={totalItems}
                        onPageChange={setPage}
                    />
                </div>

                {/* Modal */}
                <AssignmentModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    assignmentToEdit={editingAssignment} 
                />

            </div>
        </DashboardLayout>
    );
};

export default AssignmentPage;
