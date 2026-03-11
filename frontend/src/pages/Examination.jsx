import React, { useState, useCallback, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import {
  useExams, useMyExams, useCreateExam, useUpdateExam, useDeleteExam, useUpdateExamStatus,
  EXAM_QUERY_KEYS,
} from '../features/examination';
import { getSchoolClasses } from '../api/school';
import ExamModal from '../components/examination/ExamModal';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCalendarAlt, FaClock, FaUserGraduate,
  FaChalkboardTeacher, FaCheckCircle, FaExclamationTriangle, FaBan, FaFilter, FaSearch } from 'react-icons/fa';

// Constants
const EXAM_TYPES = {
  TERM_EXAM: { label: 'Term Exam', color: 'bg-blue-100 text-blue-800' },
  CLASS_TEST: { label: 'Class Test', color: 'bg-green-100 text-green-800' },
};

const EXAM_CATEGORIES = {
  MIDTERM: 'Midterm',
  FINAL: 'Final',
  SEMESTER: 'Semester',
  UNIT_TEST: 'Unit Test',
  CLASS_TEST: 'Class Test',
  SURPRISE_TEST: 'Surprise Test',
  WEEKLY_QUIZ: 'Weekly Quiz',
  OTHER: 'Other',
};

const STATUS_STYLES = {
  DRAFT: { color: 'bg-gray-100 text-gray-800', icon: FaExclamationTriangle },
  PUBLISHED: { color: 'bg-blue-100 text-blue-800', icon: FaCalendarAlt },
  COMPLETED: { color: 'bg-green-100 text-green-800', icon: FaCheckCircle },
  CANCELLED: { color: 'bg-red-100 text-red-800', icon: FaBan },
};

const currentYear = new Date().getFullYear();

// Components
const StatusBadge = ({ status }) => {
  const style = STATUS_STYLES[status] || STATUS_STYLES.DRAFT;
  const Icon = style.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.color}`}>
      <Icon size={10} />
      {status}
    </span>
  );
};

const ExamTypeBadge = ({ examType }) => {
  const type = EXAM_TYPES[examType] || EXAM_TYPES.CLASS_TEST;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${type.color}`}>
      {type.label}
    </span>
  );
};

const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="text-center py-16">
    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Icon className="text-gray-300" size={24} />
    </div>
    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
    <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
  </div>
);

const SkeletonRow = ({ cols }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-gray-100 rounded-lg w-3/4"></div>
      </td>
    ))}
  </tr>
);

// Main Component
const Examination = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const [activeTab, setActiveTab] = useState(isStudent ? 'myExams' : 'list');
  const [filters, setFilters] = useState({
    examType: '',
    academicYear: currentYear,
    standard: '',
    section: '',
    status: '',
  });
  const [selectedExam, setSelectedExam] = useState(null);
  const [showModal, setShowModal] = useState({ type: '', open: false, data: null });
  const [toast, setToast] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [classesData, setClassesData] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);

  // Queries
  const { data: exams = [], isLoading: examsLoading, error: examsError } = useExams(
    isStudent ? {} : filters
  );
  
  const { data: myExams = { termExams: [], classTests: [] }, isLoading: myExamsLoading } = useMyExams(
    isStudent ? filters : {}
  );

  // Mutations
  const createExamMutation = useCreateExam();
  const updateExamMutation = useUpdateExam();
  const deleteExamMutation = useDeleteExam();
  const updateStatusMutation = useUpdateExamStatus();

  // Fetch classes data for filters
  React.useEffect(() => {
    const fetchClasses = async () => {
      setClassesLoading(true);
      try {
        const response = await getSchoolClasses();
        if (response.success && response.data?.classes) {
          setClassesData(response.data.classes);
        }
      } catch (error) {
        console.error('Failed to fetch classes:', error);
      } finally {
        setClassesLoading(false);
      }
    };

    if (!isStudent) {
      fetchClasses();
    }
  }, [isStudent]);

  // Get available standards and sections for filters
  const availableStandards = useMemo(() => {
    const standards = [];
    
    // Add default standards 1-12
    for (let i = 1; i <= 12; i++) {
      standards.push(i.toString());
    }
    
    // Add standards from backend if they don't exist
    if (classesData.length) {
      classesData.forEach(c => {
        if (!standards.includes(c.standard)) {
          standards.push(c.standard);
        }
      });
    }
    
    return standards.sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
  }, [classesData]);

  const availableSections = useMemo(() => {
    const sections = ['A', 'B', 'C']; // Default sections
    
    // Add sections from backend if they don't exist
    if (filters.standard && classesData.length) {
      classesData
        .filter(c => c.standard === filters.standard)
        .forEach(c => {
          if (!sections.includes(c.section)) {
            sections.push(c.section);
          }
        });
    }
    
    return sections.sort();
  }, [filters.standard, classesData]);

  const showMessage = useCallback((type, text, duration = 3000) => {
    setToast({ type, text });
    setTimeout(() => setToast({ type: '', text: '' }), duration);
  }, []);

  // Enhanced filters
  const filteredExams = useMemo(() => {
    let filtered = isStudent ? [] : exams;
    
    // Apply search filter
    if (searchTerm && !isStudent) {
      filtered = filtered.filter(exam => 
        exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.standard.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.section.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [exams, searchTerm, isStudent]);

  // Handlers
  const handleCreateExam = useCallback(async (examData) => {
    try {
      await createExamMutation.mutateAsync(examData);
      showMessage('success', 'Exam created successfully!');
      setShowModal({ type: '', open: false, data: null });
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to create exam');
    }
  }, [createExamMutation, showMessage]);

  const handleUpdateExam = useCallback(async (examId, updateData) => {
    try {
      await updateExamMutation.mutateAsync({ examId, updateData });
      showMessage('success', 'Exam updated successfully!');
      setShowModal({ type: '', open: false, data: null });
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to update exam');
    }
  }, [updateExamMutation, showMessage]);

  const handleDeleteExam = useCallback(async (examId) => {
    try {
      await deleteExamMutation.mutateAsync(examId);
      showMessage('success', 'Exam deleted successfully!');
      setShowModal({ type: '', open: false, data: null });
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to delete exam');
    }
  }, [deleteExamMutation, showMessage]);

  const handleStatusUpdate = useCallback(async (examId, newStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ examId, status: newStatus });
      showMessage('success', `Exam status updated to ${newStatus}`);
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to update status');
    }
  }, [updateStatusMutation, showMessage]);

  // Render functions
  const renderExamTable = (examList, showActions = true) => {
    if (examsLoading || myExamsLoading) {
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-4 font-medium text-gray-700">Name</th>
                <th className="text-left p-4 font-medium text-gray-700">Type</th>
                <th className="text-left p-4 font-medium text-gray-700">Class</th>
                <th className="text-left p-4 font-medium text-gray-700">Status</th>
                {showActions && <th className="text-left p-4 font-medium text-gray-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              <SkeletonRow cols={showActions ? 5 : 4} />
              <SkeletonRow cols={showActions ? 5 : 4} />
              <SkeletonRow cols={showActions ? 5 : 4} />
            </tbody>
          </table>
        </div>
      );
    }

    if (examList.length === 0) {
      return (
        <EmptyState
          icon={FaCalendarAlt}
          title={searchTerm ? "No exams found matching your search" : "No exams found"}
          subtitle={searchTerm ? "Try adjusting your search terms" : "Try adjusting your filters or create a new exam"}
        />
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-4 font-medium text-gray-700">Name</th>
              <th className="text-left p-4 font-medium text-gray-700">Type</th>
              <th className="text-left p-4 font-medium text-gray-700">Class</th>
              <th className="text-left p-4 font-medium text-gray-700">Status</th>
              {showActions && <th className="text-left p-4 font-medium text-gray-700">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {examList.map((exam) => (
              <tr key={exam._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div>
                    <div className="font-medium text-gray-900">{exam.name}</div>
                    {exam.description && (
                      <div className="text-sm text-gray-500 mt-1 line-clamp-2">{exam.description}</div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <ExamTypeBadge examType={exam.examType} />
                </td>
                <td className="p-4">
                  <div className="font-medium text-gray-900">
                    {exam.standard}-{exam.section}
                  </div>
                  <div className="text-sm text-gray-500">Year {exam.academicYear}</div>
                </td>
                <td className="p-4">
                  <StatusBadge status={exam.status} />
                </td>
                {showActions && (
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedExam(exam)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View details"
                      >
                        <FaEye size={14} />
                      </button>
                      
                      {(isAdmin || (isTeacher && exam.createdBy === user._id)) && (
                        <>
                          {exam.status === 'DRAFT' && (
                            <button
                              onClick={() => handleStatusUpdate(exam._id, 'PUBLISHED')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Publish exam"
                            >
                              <FaCheckCircle size={14} />
                            </button>
                          )}
                          
                          {exam.status === 'PUBLISHED' && (
                            <button
                              onClick={() => handleStatusUpdate(exam._id, 'COMPLETED')}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Mark as completed"
                            >
                              <FaCheckCircle size={14} />
                            </button>
                          )}
                          
                          {['DRAFT', 'PUBLISHED'].includes(exam.status) && (
                            <>
                              <button
                                onClick={() => setShowModal({ type: 'edit', open: true, data: exam })}
                                className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                title="Edit exam"
                              >
                                <FaEdit size={14} />
                              </button>
                              
                              {exam.status === 'DRAFT' && (
                                <button
                                  onClick={() => setShowModal({ type: 'delete', open: true, data: exam })}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete exam"
                                >
                                  <FaTrash size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Examination</h1>
          <p className="text-gray-600 mt-2">
            {isStudent ? 'View your upcoming and completed exams' : 'Manage term exams and class tests'}
          </p>
        </div>

        {/* Tabs */}
        {!isStudent && (
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('list')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'list'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                All Exams
              </button>
            </nav>
          </div>
        )}

        {/* Filters */}
        {!isStudent && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex flex-wrap gap-6 items-end">
              {/* Search */}
              <div className="flex-1 min-w-[250px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Exams</label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-3.5 text-gray-400" size={14} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, description, class..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
              
              {/* Exam Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
                <select
                  value={filters.examType}
                  onChange={(e) => setFilters(prev => ({ ...prev, examType: e.target.value }))}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white min-w-[140px]"
                >
                  <option value="">All Types</option>
                  <option value="TERM_EXAM">Term Exam</option>
                  <option value="CLASS_TEST">Class Test</option>
                </select>
              </div>
              
              {/* Academic Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                <input
                  type="number"
                  value={filters.academicYear}
                  onChange={(e) => setFilters(prev => ({ ...prev, academicYear: e.target.value }))}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-28"
                  min="2020"
                  max="2030"
                />
              </div>

              {isAdmin && (
                <>
                  {/* Standard */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Standard</label>
                    <select
                      value={filters.standard}
                      onChange={(e) => setFilters(prev => ({ ...prev, standard: e.target.value, section: '' }))}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white min-w-[100px]"
                      disabled={classesLoading}
                    >
                      <option value="">All Standards</option>
                      {availableStandards.map(standard => (
                        <option key={standard} value={standard}>
                          {standard}
                        </option>
                      ))}
                    </select>
                    {classesLoading && <p className="text-gray-500 text-xs mt-1">Loading...</p>}
                  </div>
                  
                  {/* Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                    <select
                      value={filters.section}
                      onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white min-w-[100px]"
                      disabled={!filters.standard || classesLoading}
                    >
                      <option value="">All Sections</option>
                      {availableSections.map(section => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                    {!filters.standard && (
                      <p className="text-gray-500 text-xs mt-1">Select standard first</p>
                    )}
                  </div>
                </>
              )}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white min-w-[120px]"
                >
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isStudent && (
          <div className="flex justify-between items-center mb-6">
            <div className="text-sm text-gray-600">
              {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''} found
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
            <button
              onClick={() => setShowModal({ type: 'create', open: true, data: null })}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-medium shadow-lg hover:shadow-xl"
            >
              <FaPlus size={14} />
              Create Exam
            </button>
          </div>
        )}

        {/* Content */}
        {isStudent ? (
          <div className="space-y-8">
            {/* Term Exams */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Term Exams</h3>
              {renderExamTable(myExams.termExams, false)}
            </div>

            {/* Class Tests */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Tests</h3>
              {renderExamTable(myExams.classTests, false)}
            </div>
          </div>
        ) : (
          renderExamTable(filteredExams, true)
        )}

        {/* Exam Modal */}
        {showModal.open && (
          <ExamModal
            isOpen={showModal.open}
            onClose={() => setShowModal({ type: '', open: false, data: null })}
            onSubmit={showModal.type === 'create' ? handleCreateExam : handleUpdateExam}
            editData={showModal.type === 'edit' ? showModal.data : null}
            isLoading={createExamMutation.isPending || updateExamMutation.isPending}
            userRole={user?.role}
          />
        )}

        {/* Exam Details Modal */}
        {selectedExam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedExam.name}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <ExamTypeBadge examType={selectedExam.examType} />
                      <StatusBadge status={selectedExam.status} />
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedExam(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Class</label>
                    <p className="text-gray-900 mt-1">{selectedExam.standard}-{selectedExam.section}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Academic Year</label>
                    <p className="text-gray-900 mt-1">{selectedExam.academicYear}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Category</label>
                    <p className="text-gray-900 mt-1">{EXAM_CATEGORIES[selectedExam.category] || selectedExam.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created By</label>
                    <p className="text-gray-900 mt-1">
                      {selectedExam.createdBy?.name} ({selectedExam.createdByRole})
                    </p>
                  </div>
                </div>

                {selectedExam.description && (
                  <div className="mb-6">
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <p className="text-gray-900 mt-1">{selectedExam.description}</p>
                  </div>
                )}

                {selectedExam.schedule && selectedExam.schedule.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-3">Schedule</label>
                    <div className="space-y-3">
                      {selectedExam.schedule.map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700">Subject</label>
                              <p className="text-gray-900 mt-1">{item.subject}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">Date</label>
                              <p className="text-gray-900 mt-1">
                                {new Date(item.examDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">Time</label>
                              <p className="text-gray-900 mt-1">
                                {item.startTime} - {item.endTime}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">Marks</label>
                              <p className="text-gray-900 mt-1">
                                {item.totalMarks} (Pass: {item.passingMarks})
                              </p>
                            </div>
                            {item.assignedTeacher && (
                              <div className="col-span-2">
                                <label className="text-sm font-medium text-gray-700">Assigned Teacher</label>
                                <p className="text-gray-900 mt-1">{item.assignedTeacher.name}</p>
                              </div>
                            )}
                            {item.syllabus && (
                              <div className="col-span-2">
                                <label className="text-sm font-medium text-gray-700">Syllabus</label>
                                <p className="text-gray-900 mt-1">{item.syllabus}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast.text && (
          <div
            className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.text}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Examination;
