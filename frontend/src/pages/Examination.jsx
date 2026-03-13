import React, { useState, useCallback, useMemo, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import {
  useExams, useCreateExam, useUpdateExam, useDeleteExam, useUpdateExamStatus,
} from '../features/examination';
import { useProfile } from '../features/attendance';
import ExamModal from '../components/examination/ExamModal';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCalendarAlt, FaClock,
  FaChalkboardTeacher, FaCheckCircle, FaExclamationTriangle, FaBan, FaFilter, FaSearch, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { TabButton } from '../components/ui/NoticeUIComponents';

// Constants
const EXAM_TYPES = {
  TERM_EXAM: { label: 'Term Exam', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  CLASS_TEST: { label: 'Class Test', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
};

const STATUS_STYLES = {
  DRAFT: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: FaExclamationTriangle },
  PUBLISHED: { label: 'Published', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: FaCalendarAlt },
  COMPLETED: { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: FaCheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: FaBan },
};

const currentYear = new Date().getFullYear();

// Static options for standards and sections (no backend dependency for now)
const STANDARD_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SECTION_OPTIONS = ['A', 'B', 'C'];

const CustomBadge = ({ styles, icon: Icon, label }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${styles.bg} ${styles.color} ${styles.border}`}>
    {Icon && <Icon size={12} />}
    {label || styles.label}
  </span>
);

const EmptyState = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
      <Icon size={24} />
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
    <p className="text-slate-500 text-center max-w-sm mb-6 text-sm">{subtitle}</p>
    {action}
  </div>
);

const Examination = () => {
  const { user } = useAuth();
  const { data: profileRes } = useProfile();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);
  const isTeacher = user?.role === 'teacher';

  const teacherProfile = useMemo(() => {
    if (!isTeacher || !profileRes?.data) return null;
    return profileRes.data.data || profileRes.data;
  }, [isTeacher, profileRes]);

  const [activeTab, setActiveTab] = useState('all');
  const [teacherTab, setTeacherTab] = useState('schedule'); // 'schedule' | 'create'
  const [filters, setFilters] = useState({
    examType: '',
    // Leave academicYear empty so backend returns all years by default
    academicYear: '',
    standard: '',
    section: '',
    status: '',
  });
  const [selectedExam, setSelectedExam] = useState(null);
  const [showModal, setShowModal] = useState({ type: '', open: false, data: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, examId: null });
  const [toast, setToast] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // Queries & Mutations
  const { data: exams = [], isLoading: examsLoading } = useExams(filters);
  const createExamMutation = useCreateExam();
  const updateExamMutation = useUpdateExam();
  const deleteExamMutation = useDeleteExam();
  const updateStatusMutation = useUpdateExamStatus();

  // Filtered dropdown options
  const availableStandards = useMemo(() => {
    const assignedClasses = teacherProfile?.profile?.assignedClasses || teacherProfile?.assignedClasses || [];
    if (isTeacher) {
      if (assignedClasses.length > 0) {
        return [...new Set(assignedClasses.map(c => String(c.standard)))].sort((a, b) => Number(a) - Number(b));
      }
      return []; // Return empty for teachers with no assignments
    }
    return STANDARD_OPTIONS;
  }, [isTeacher, teacherProfile]);

  const availableSections = useMemo(() => {
    const assignedClasses = teacherProfile?.profile?.assignedClasses || teacherProfile?.assignedClasses || [];
    if (isTeacher) {
      if (assignedClasses.length > 0) {
        if (filters.standard) {
          return assignedClasses
            .filter(c => String(c.standard) === String(filters.standard))
            .map(c => String(c.section))
            .sort();
        }
        return [...new Set(assignedClasses.map(c => String(c.section)))].sort();
      }
      return []; // Return empty for teachers with no assignments
    }
    return SECTION_OPTIONS;
  }, [isTeacher, teacherProfile, filters.standard]);

  const showMessage = useCallback((type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast({ type: '', text: '' }), 3000);
  }, []);

  const filteredExams = useMemo(() => {
    let result = exams;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.name.toLowerCase().includes(term) ||
        e.standard.toLowerCase().includes(term) ||
        (e.description && e.description.toLowerCase().includes(term))
      );
    }
    // Admin can slice by status using tabs; teachers always see their full class list.
    if (!isTeacher) {
      if (activeTab === 'upcoming') result = result.filter(e => e.status === 'PUBLISHED');
      if (activeTab === 'drafts') result = result.filter(e => e.status === 'DRAFT');
    }
    return result;
  }, [exams, searchTerm, activeTab, isTeacher]);

  const handleStatusUpdate = async (examId, status) => {
    try {
      await updateStatusMutation.mutateAsync({ examId, status });
      showMessage('success', `Exam status updated to ${status}`);
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Update failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.examId) return;
    try {
      await deleteExamMutation.mutateAsync(deleteConfirm.examId);
      showMessage('success', 'Exam deleted successfully');
      setDeleteConfirm({ open: false, examId: null });
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Delete failed');
    }
  };

  // When teacher switches to "Create Exam" tab, open the create modal
  useEffect(() => {
    if (isTeacher && teacherTab === 'create') {
      setShowModal({ type: 'create', open: true, data: null });
    }
  }, [isTeacher, teacherTab]);

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isTeacher ? 'My Class Exams' : 'Examination Management'}
            </h1>
            <p className="text-gray-500 mt-1">
              {isTeacher
                ? 'View and manage exams scheduled for your assigned classes'
                : 'Plan, schedule and manage academic assessments across all classes'}
            </p>
          </div>
          {(isAdmin || isTeacher) && (
            <button
              onClick={() => setShowModal({ type: 'create', open: true, data: null })}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-all font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5"
            >
              <FaPlus size={14} />
              <span>Create Exam</span>
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
          <TabButton 
            tab="all"
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            label="All Exams" 
            count={exams.length}
            icon={<FaFilter />}
          />
          <TabButton 
            tab="upcoming"
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            label="Scheduled" 
            count={exams.filter(e => e.status === 'PUBLISHED').length}
            icon={<FaCalendarAlt />}
          />
          <TabButton 
            tab="drafts"
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            label="Drafts" 
            count={exams.filter(e => e.status === 'DRAFT').length}
            icon={<FaExclamationTriangle />}
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
          <div className="p-5 bg-slate-50/50 border-b border-slate-100">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1 group">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search by exam name, class or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={filters.examType}
                  onChange={(e) => setFilters(f => ({ ...f, examType: e.target.value }))}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary transition-all outline-none min-w-[140px] shadow-sm cursor-pointer"
                >
                  <option value="">All Types</option>
                  <option value="TERM_EXAM">Term Exam</option>
                  <option value="CLASS_TEST">Class Test</option>
                </select>
                <select
                  value={filters.standard}
                  onChange={(e) => setFilters(f => ({ ...f, standard: e.target.value, section: '' }))}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary transition-all outline-none min-w-[120px] shadow-sm cursor-pointer"
                >
                  <option value="">All Classes</option>
                  {availableStandards.map(s => <option key={s} value={s}>Class {s}</option>)}
                </select>
                <select
                  value={filters.section}
                  onChange={(e) => setFilters(f => ({ ...f, section: e.target.value }))}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary transition-all outline-none min-w-[110px] shadow-sm cursor-pointer"
                >
                  <option value="">All Sections</option>
                  {availableSections.map(s => <option key={s} value={s}>Section {s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {(!isTeacher || teacherTab === 'schedule') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          {examsLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-20 bg-slate-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredExams.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Exam Information</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Classification</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Schedule</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExams.map((exam) => (
                    <tr key={exam._id} className="group hover:bg-slate-50/80 transition-all duration-200">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-sm ${EXAM_TYPES[exam.examType]?.bg || 'bg-slate-50'} ${EXAM_TYPES[exam.examType]?.color || 'text-slate-500'}`}>
                            {exam.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-primary transition-colors">{exam.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{exam.description || 'No description provided'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <CustomBadge styles={EXAM_TYPES[exam.examType]} />
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">C-{exam.standard}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">S-{exam.section}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <CustomBadge styles={STATUS_STYLES[exam.status]} icon={STATUS_STYLES[exam.status]?.icon} />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                            <FaCalendarAlt size={12} className="text-slate-400" />
                            <span>{exam.schedule?.length || 0} subjects</span>
                          </div>
                          <div className="text-[11px] text-slate-500 ml-5 font-medium">AY {exam.academicYear}</div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <button
                            onClick={() => setSelectedExam(exam)}
                            className="p-2.5 text-slate-500 hover:text-primary hover:bg-white rounded-xl border border-transparent hover:border-slate-200 hover:shadow-sm transition-all"
                            title="View Details"
                          >
                            <FaEye size={16} />
                          </button>
                          
                          {(isAdmin || (isTeacher && exam.createdBy === user._id)) && (
                            <>
                              {exam.status === 'DRAFT' && (
                                <button
                                  onClick={() => handleStatusUpdate(exam._id, 'PUBLISHED')}
                                  className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl border border-transparent hover:border-emerald-100 transition-all"
                                  title="Publish Exam"
                                >
                                  <FaCheckCircle size={16} />
                                </button>
                              )}
                              {exam.status === 'PUBLISHED' && activeTab === 'upcoming' && (
                                <button
                                  onClick={() => handleStatusUpdate(exam._id, 'COMPLETED')}
                                  className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl border border-transparent hover:border-emerald-100 transition-all"
                                  title="Mark as Completed"
                                >
                                  <FaCheckCircle size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => setShowModal({ type: 'edit', open: true, data: exam })}
                                className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100 transition-all"
                                title="Edit Exam"
                              >
                                <FaEdit size={16} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ open: true, examId: exam._id })}
                                className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition-all"
                                title="Delete Exam"
                              >
                                <FaTrash size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={FaCalendarAlt}
              title="No examinations found"
              subtitle={searchTerm ? `We couldn't find any exams matching "${searchTerm}". Try different keywords.` : "Get started by creating your first examination schedule for the current academic year."}
              action={
                isAdmin && (
                  <button
                    onClick={() => setShowModal({ type: 'create', open: true, data: null })}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20"
                  >
                    <FaPlus size={14} />
                    <span>Create Your First Exam</span>
                  </button>
                )
              }
            />
          )}
        </div>
        )}

        {selectedExam && teacherTab === 'schedule' && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl my-auto">
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-white shadow-sm ${EXAM_TYPES[selectedExam.examType]?.bg || 'bg-white'}`}>
                    <FaCalendarAlt className={EXAM_TYPES[selectedExam.examType]?.color} size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 leading-tight">{selectedExam.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <CustomBadge styles={EXAM_TYPES[selectedExam.examType]} />
                      <CustomBadge styles={STATUS_STYLES[selectedExam.status]} icon={STATUS_STYLES[selectedExam.status]?.icon} />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedExam(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm"
                >
                  <FaPlus className="rotate-45" size={20} />
                </button>
              </div>

              <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Audience</div>
                    <div className="text-slate-900 font-bold">Class {selectedExam.standard} • Section {selectedExam.section}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Timing & Period</div>
                    <div className="text-slate-900 font-bold">AY {selectedExam.academicYear} • Category {selectedExam.category}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Creation Details</div>
                    <div className="text-slate-900 font-bold">{selectedExam.createdBy?.name || 'Admin'} • {selectedExam.createdByRole || 'Staff'}</div>
                  </div>
                </div>

                {selectedExam.description && (
                  <div className="mb-10">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3 px-1">
                      <FaInfoCircle className="text-primary" size={14} />
                      Overview & Instructions
                    </h4>
                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 text-slate-700 leading-relaxed italic">
                      "{selectedExam.description}"
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <FaClock className="text-primary" size={14} />
                      Examination Timetable
                    </h4>
                    <span className="text-xs font-bold text-slate-400 italic">Total {selectedExam.schedule?.length || 0} Sessions</span>
                  </div>
                  
                  {selectedExam.schedule?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedExam.schedule.map((slot, idx) => (
                        <div key={idx} className="group relative p-5 bg-white border border-slate-200 rounded-2xl hover:border-primary/30 hover:shadow-lg transition-all">
                          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-50">
                            <span className="font-bold text-slate-900">{slot.subject}</span>
                            <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/5 rounded-full">{slot.totalMarks} Marks</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                              <FaCalendarAlt size={12} className="text-slate-400" />
                              <span>{new Date(slot.examDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                              <FaClock size={12} className="text-slate-400" />
                              <span>{slot.startTime} — {slot.endTime}</span>
                            </div>
                            {slot.assignedTeacher && (
                              <div className="flex items-center gap-3 text-xs text-slate-600 font-medium pt-1">
                                <FaChalkboardTeacher size={12} className="text-slate-400" />
                                <span>Invigilator: {slot.assignedTeacher.name}</span>
                              </div>
                            )}
                          </div>
                          {slot.syllabus && (
                            <div className="mt-4 pt-3 border-t border-slate-50">
                              <div className="text-[10px] font-bold text-slate-400 mb-1">SYLLABUS</div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-normal">{slot.syllabus}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center">
                      <FaBan size={24} className="text-slate-300 mb-2" />
                      <p className="text-slate-500 font-medium text-sm">No schedule information available</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-b-3xl flex justify-end gap-3 border-t border-slate-100">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
                >
                  <FaCalendarAlt size={14} />
                  <span>Download Schedule</span>
                </button>
                <button
                  onClick={() => setSelectedExam(null)}
                  className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showModal.open && (
          <ExamModal
            isOpen={showModal.open}
            user={{ ...user, ...teacherProfile }}
            onClose={() => {
              setShowModal({ type: '', open: false, data: null });
              if (isTeacher) setTeacherTab('schedule');
            }}
            onSubmit={async (data) => {
              try {
                if (showModal.type === 'create') await createExamMutation.mutateAsync(data);
                else await updateExamMutation.mutateAsync({ examId: showModal.data._id, updateData: data });
                showMessage('success', `Exam ${showModal.type === 'create' ? 'created' : 'updated'} successfully`);
                setShowModal({ type: '', open: false, data: null });
              } catch (error) {
                console.error('Failed to save exam:', error);
                let message = error.response?.data?.message || error.message || 'Operation failed';
                
                // Detailed Zod error reporting for 422
                if (error.response?.status === 422 && error.response.data.errors) {
                  const fieldErrors = error.response.data.errors;
                  if (Array.isArray(fieldErrors)) {
                    const detail = fieldErrors.map(e => `${e.path.split('.').pop()}: ${e.message}`).join(', ');
                    message = `Validation Error: ${detail}`;
                  }
                }
                
                showMessage('error', message);
              }
            }}
            editData={showModal.type === 'edit' ? showModal.data : null}
            isLoading={createExamMutation.isPending || updateExamMutation.isPending}
            userRole={user?.role}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.open && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6 mx-auto border border-rose-100">
                <FaTrash size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Confirm Deletion</h3>
              <p className="text-slate-500 text-center mb-8">
                Are you sure you want to delete this examination? This action is permanent and cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm({ open: false, examId: null })}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteExamMutation.isPending}
                  className="flex-1 px-6 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleteExamMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FaTrash size={14} />
                  )}
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {toast.text && (
          <div className={`fixed top-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
              {toast.type === 'success' ? <FaCheckCircle size={12} /> : <FaTimes size={12} />}
            </div>
            <span className="font-medium">{toast.text}</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Examination;

