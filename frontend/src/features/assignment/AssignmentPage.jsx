import React, { useState, useRef } from 'react';
import { useAssignments, useDeleteAssignment } from './api/queries';
import { AssignmentFilters } from './components/AssignmentFilters';
import { AssignmentTable } from './components/AssignmentTable';
import { AssignmentModal } from './components/AssignmentModal';
import { FaBook } from 'react-icons/fa';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../auth';
import useDebounce from '../../hooks/useDebounce';

export const AssignmentPage = () => {
    const { user } = useAuth();
    const canCreate = ['teacher'].includes(user?.role); // Only teachers can create assignments

    // State
    const [page, setPage] = useState(0);
    const [pageSize] = useState(25);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 500);
    
    // Filters
    const [standardFilter, setStandardFilter] = useState('all');
    const [sectionFilter, setSectionFilter] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Sorting
    const [sortBy, setSortBy] = useState('default');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const sortMenuRef = useRef(null);

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);

    // Close sort menu on outside click
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
                setShowSortMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch data
    const queryParams = {
        standard: standardFilter === 'all' ? undefined : standardFilter,
        section: sectionFilter === 'all' ? undefined : sectionFilter,
        subject: subjectFilter === 'all' ? undefined : subjectFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        pageSize
    };

    const { data: response, isLoading } = useAssignments(queryParams);
    const deleteMutation = useDeleteAssignment();

    let assignments = response?.data?.assignments || [];
    const totalItems = response?.data?.pagination?.total || 0;

    // Local Search Filter (since backend query array was not exhaustive, 
    // assuming frontend handles generic word search parsing here for now)
    if (debouncedSearch) {
        const lowerQuery = debouncedSearch.toLowerCase();
        assignments = assignments.filter(a => 
            a.title?.toLowerCase().includes(lowerQuery) || 
            a.subject?.toLowerCase().includes(lowerQuery)
        );
    }

    // Handlers
    const handleAddClick = () => {
        setEditingAssignment(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (assignment) => {
        setEditingAssignment(assignment);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (assignment) => {
        if (window.confirm(`Are you sure you want to delete "${assignment.title}"?`)) {
            try {
                await deleteMutation.mutateAsync(assignment._id);
            } catch (error) {
                console.error('Failed to delete assignment:', error);
                alert('Failed to delete assignment');
            }
        }
    };

    const handleSortChange = (key) => {
        setSortBy(key);
        setShowSortMenu(false);
    };

    // Sorting logic if backend sorting is not passed
    let sortedAssignments = [...assignments];
    if (sortBy === 'titleAsc') {
        sortedAssignments.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'titleDesc') {
        sortedAssignments.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortBy === 'dueDateDesc') {
        sortedAssignments.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
    } else if (sortBy === 'dueDateAsc') {
        sortedAssignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-1">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                <FaBook size={18} />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight text-gray-900 uppercase">Assignment Management</h1>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">Create and track student assignments across all classes</p>
                    </div>
                </div>

                {/* Filters */}
                <AssignmentFilters 
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    standardFilter={standardFilter}
                    onStandardChange={(val) => { setStandardFilter(val); setSectionFilter('all'); setSubjectFilter('all'); setPage(0); }}
                    sectionFilter={sectionFilter}
                    onSectionChange={(val) => { setSectionFilter(val); setSubjectFilter('all'); setPage(0); }}
                    subjectFilter={subjectFilter}
                    onSubjectChange={(val) => { setSubjectFilter(val); setPage(0); }}
                    statusFilter={statusFilter}
                    onStatusChange={(val) => { setStatusFilter(val); setPage(0); }}
                    onAddAssignment={handleAddClick}
                    canCreate={canCreate}
                />

                {/* Table */}
                <AssignmentTable 
                    assignments={sortedAssignments}
                    loading={isLoading}
                    onViewClick={handleEditClick}
                    onEditClick={handleEditClick}
                    onDeleteClick={handleDeleteClick}
                    currentPage={page}
                    totalItems={totalItems}
                    onPageChange={setPage}
                    showSortMenu={showSortMenu}
                    sortMenuRef={sortMenuRef}
                    onSortClick={() => setShowSortMenu(!showSortMenu)}
                    sortBy={sortBy}
                    onSortChange={handleSortChange}
                    sortOptions={[
                        { key: 'titleAsc', label: 'Title (A-Z)' },
                        { key: 'titleDesc', label: 'Title (Z-A)' },
                        { key: 'dueDateDesc', label: 'Due Date (Newest)' },
                        { key: 'dueDateAsc', label: 'Due Date (Oldest)' }
                    ]}
                />

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
