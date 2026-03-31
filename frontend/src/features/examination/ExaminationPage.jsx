import React, { useState, useMemo, useEffect, useCallback } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../auth';
import {
  useExams, useCreateExam, useUpdateExam, useDeleteExam, useUpdateExamStatus,
} from './index';
import { useProfile, useStudents } from '../attendance';
import { useSchoolClasses } from '../../hooks/useSchoolClasses';
import ExamModal from '../../components/examination/ExamModal';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCalendarAlt, FaClock,
  FaChalkboardTeacher, FaCheckCircle, FaExclamationTriangle, FaBan, FaSearch, FaTimes, FaInfoCircle, FaLayerGroup, FaCalendarCheck } from 'react-icons/fa';
import { TabButton } from '../../components/ui/NoticeUIComponents';
import { EmptyState } from '../../components/ui/EmptyState';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { useToastMessage } from '../../hooks/useToastMessage';
import { PaginationControls } from '../../components/ui/PaginationControls';

// Constants
const EXAM_TYPES = {
  TERM_EXAM: { label: 'Term Exam', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  CLASS_TEST: { label: 'Class Test', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
};

const STATUS_STYLES = {
  DRAFT: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: FaExclamationTriangle },
  PUBLISHED: { label: 'Published', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', icon: FaCalendarAlt },
  COMPLETED: { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: null },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: null },
};

// Dynamic options for standards and sections are handled by useSchoolClasses

const CustomBadge = ({ styles, icon: Icon, label }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${styles.bg} ${styles.color} ${styles.border}`}>
    {Icon && <Icon size={12} />}
    {label || styles.label}
  </span>
);


const StatsCard = ({ label, value, icon: Icon, colorClass, bgClass }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
    <div className={`w-14 h-14 rounded-2xl ${bgClass} flex items-center justify-center ${colorClass} shadow-inner`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl font-black text-slate-900 leading-tight">{value}</h3>
    </div>
  </div>
);

const ExaminationPage = () => {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const {
    availableStandards: schoolAvailableStandards,
    getSectionsForStandard,
    allUniqueSections,
  } = useSchoolClasses();

  // Queries & Mutations
  const { data: exams = [], isLoading: examsLoading } = useExams(filters);
  const createExamMutation = useCreateExam();
  const updateExamMutation = useUpdateExam();
  const deleteExamMutation = useDeleteExam();
  const updateStatusMutation = useUpdateExamStatus();
  const { data: studentsRes } = useStudents();

  const students = useMemo(() => studentsRes?.data?.users || [], [studentsRes]);

  const getCandidateCount = useCallback((standard, section) => {
    if (!standard) return 0;
    return students.filter(s => 
      String(s.profile?.standard) === String(standard) && 
      (!section || String(s.profile?.section) === String(section))
    ).length;
  }, [students]);


  // Filtered dropdown options
  const availableStandards = useMemo(() => {
    const assignedClasses = teacherProfile?.profile?.assignedClasses || teacherProfile?.assignedClasses || [];
    if (isTeacher) {
      if (assignedClasses.length > 0) {
        return [...new Set(assignedClasses.map(c => String(c.standard)))].sort((a, b) => Number(a) - Number(b));
      }
      return []; // Return empty for teachers with no assignments
    }
    return schoolAvailableStandards;
  }, [isTeacher, teacherProfile, schoolAvailableStandards]);

  const availableSections = useMemo(() => {
    const assignedClasses = teacherProfile?.profile?.assignedClasses || teacherProfile?.assignedClasses || [];
    if (isTeacher) {
      if (assignedClasses.length > 0) {
        if (filters.standard) {
          return [...new Set(assignedClasses
            .filter(c => String(c.standard) === String(filters.standard))
            .map(c => String(c.section)))]
            .sort();
        }
        return [...new Set(assignedClasses.map(c => String(c.section)))].sort();
      }
      return []; // Return empty for teachers with no assignments
    }
    if (filters.standard) {
      return getSectionsForStandard(filters.standard);
    }
    return allUniqueSections;
  }, [isTeacher, teacherProfile, filters.standard, getSectionsForStandard, allUniqueSections]);

  useEffect(() => {
    if (filters.standard && !availableStandards.includes(filters.standard)) {
      setFilters((current) => ({ ...current, standard: '', section: '' }));
      return;
    }

    const sectionOptions = filters.standard ? availableSections : allUniqueSections;
    if (filters.section && !sectionOptions.includes(filters.section)) {
      setFilters((current) => ({ ...current, section: '' }));
    }
    setCurrentPage(0);
  }, [allUniqueSections, availableSections, availableStandards, filters.section, filters.standard, searchTerm, activeTab]);

  const { message, showMessage } = useToastMessage();

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
    if (activeTab === 'upcoming') result = result.filter(e => e.status === 'PUBLISHED');
    if (activeTab === 'drafts') result = result.filter(e => e.status === 'DRAFT');
    if (activeTab === 'completed') result = result.filter(e => e.status === 'COMPLETED');
    return result;
  }, [exams, searchTerm, activeTab]);

  const paginatedExams = useMemo(() => {
    const startIndex = currentPage * pageSize;
    return filteredExams.slice(startIndex, startIndex + pageSize);
  }, [filteredExams, currentPage, pageSize]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: exams.length,
      upcoming: exams.filter(e => e.status === 'PUBLISHED').length,
      ongoing: exams.filter(e => {
        if (e.status !== 'PUBLISHED' || !e.schedule) return false;
        return e.schedule.some(s => {
          const start = new Date(s.examDate);
          const [h1, m1] = (s.startTime || '00:00').split(':').map(Number);
          start.setHours(h1, m1);
          
          const end = new Date(s.examDate);
          const [h2, m2] = (s.endTime || '23:59').split(':').map(Number);
          end.setHours(h2, m2);
          
          return now >= start && now <= end;
        });
      }).length,
      completed: exams.filter(e => e.status === 'COMPLETED').length,
      drafts: exams.filter(e => e.status === 'DRAFT').length,
    };
  }, [exams]);

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
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-700">
        <div className={selectedExam ? "no-print" : ""}>
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-primary transform hover:rotate-6 transition-transform">
                <FaCalendarCheck size={32} />
              </div>
              <div className="space-y-1">
                <h1 className="page-title">Examination Schedules</h1>
                <p className="page-subtitle">Manage and monitor {stats.total} scheduled examination sessions.</p>
              </div>
            </div>
            {(isAdmin || isTeacher) && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowModal({ type: 'create', open: true, data: null })}
                  className="btn-primary px-6 rounded-2xl shadow-lg shadow-primary/20 active:scale-95"
                >
                  <FaPlus size={16} />
                  <span>Create New Exam</span>
                </button>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatsCard 
              label="Total Exams" 
              value={stats.total} 
              icon={FaLayerGroup} 
              colorClass="text-primary" 
              bgClass="bg-primary/10" 
            />
            <StatsCard 
              label="Upcoming" 
              value={stats.upcoming} 
              icon={FaCalendarAlt} 
              colorClass="text-orange-600" 
              bgClass="bg-orange-50" 
            />
            <StatsCard 
              label="Completed" 
              value={stats.completed} 
              icon={FaCheckCircle} 
              colorClass="text-slate-600" 
              bgClass="bg-slate-50" 
            />
          </div>

          {/* Filters and Search */}
          <div className="bg-white p-2 rounded-[32px] border border-slate-100 shadow-sm mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-2">
              <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <TabButton 
                  tab="all" activeTab={activeTab} setActiveTab={setActiveTab} label={`All Exams (${stats.total})`} 
                  className={activeTab === 'all' ? 'bg-white shadow-sm' : ''}
                />
                <TabButton 
                  tab="upcoming" activeTab={activeTab} setActiveTab={setActiveTab} label={`Schedule (${stats.upcoming})`}
                  className={activeTab === 'upcoming' ? 'bg-white shadow-sm' : ''}
                />
                <TabButton 
                  tab="drafts" activeTab={activeTab} setActiveTab={setActiveTab} label={`Drafts (${stats.drafts})`}
                  className={activeTab === 'drafts' ? 'bg-white shadow-sm' : ''}
                />
                <TabButton 
                  tab="completed" activeTab={activeTab} setActiveTab={setActiveTab} label={`Completed (${stats.completed})`}
                  className={activeTab === 'completed' ? 'bg-white shadow-sm' : ''}
                />
              </div>
              
              <div className="flex flex-1 items-center gap-4 max-w-2xl px-2">
                <div className="relative flex-1 group">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
                  <input
                    type="text"
                    placeholder="Search exams, classes or descriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={filters.standard}
                    onChange={(e) => setFilters(f => ({ ...f, standard: e.target.value, section: '' }))}
                    className="px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none hover:bg-slate-100 transition-all cursor-pointer min-w-[130px]"
                  >
                    <option value="">All Classes</option>
                    {availableStandards.map(std => (
                      <option key={std} value={std}>Class {std}</option>
                    ))}
                  </select>
                  <select
                    value={filters.section}
                    onChange={(e) => setFilters(f => ({ ...f, section: e.target.value }))}
                    className="px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none hover:bg-slate-100 transition-all cursor-pointer min-w-[120px]"
                  >
                    <option value="">All Sections</option>
                    {(filters.standard ? availableSections : allUniqueSections).map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
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
              <table className="w-full text-left border-collapse table-fixed">
                <colgroup>
                  <col style={{ width: '14.28%' }} />
                  <col style={{ width: '14.28%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '12.6%' }} />
                  <col style={{ width: '14.28%' }} />
                  <col style={{ width: '14.28%' }} />
                  <col style={{ width: '14.28%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Exam Name & ID</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                    <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                    <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidates</th>
                    <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedExams.map((exam) => {
                    const firstSchedule = exam.schedule?.[0];
                    const subjects = (exam.schedule || []).map(s => s.subject).filter(Boolean);
                    const dates = (exam.schedule || [])
                      .map(s => s.examDate)
                      .filter(Boolean)
                      .sort((a, b) => new Date(a) - new Date(b));
                    
                    const minDate = dates.length > 0 ? new Date(dates[0]) : null;
                    const maxDate = dates.length > 0 ? new Date(dates[dates.length - 1]) : null;

                    const allSameTime = exam.schedule?.length > 1 && 
                      exam.schedule.every(s => s.startTime === exam.schedule[0].startTime && s.endTime === exam.schedule[0].endTime);

                    const durationInMins = firstSchedule ? (() => {
                      const [h1, m1] = (firstSchedule.startTime || '00:00').split(':').map(Number);
                      const [h2, m2] = (firstSchedule.endTime || '00:00').split(':').map(Number);
                      return (h2 * 60 + m2) - (h1 * 60 + m1);
                    })() : 0;

                    return (
                      <tr key={exam._id} className="group hover:bg-slate-50/80 transition-all duration-200">
                        <td className="px-4 py-5">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-sm leading-snug truncate" title={exam.name}>{exam.name}</div>
                            <div className="text-[11px] font-bold text-slate-500 mt-0.5">Class {exam.standard} - {exam.section || 'All'}</div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex flex-wrap gap-1">
                              {subjects.length > 0 ? (
                                <>
                                  {subjects.slice(0, 2).map((sub, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 shadow-sm whitespace-nowrap">
                                      {sub}
                                    </span>
                                  ))}
                                </>
                              ) : (
                                  <span className="text-slate-400 text-xs italic">—</span>
                              )}
                            </div>
                            {subjects.length > 2 && (
                               <span className="text-[9px] font-bold text-slate-400">+{subjects.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex flex-col gap-0.5">
                            <div className="text-sm font-bold text-slate-700 whitespace-nowrap">
                              {minDate ? (
                                minDate.toDateString() === maxDate.toDateString() 
                                  ? minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : `${minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                              ) : 'N/A'}
                            </div>
                            <div className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                              {exam.schedule?.length > 1 
                                ? (allSameTime ? `${exam.schedule[0].startTime} - ${exam.schedule[0].endTime}` : `${exam.schedule.length} Sessions`)
                                : (firstSchedule ? `${firstSchedule.startTime} - ${firstSchedule.endTime || 'N/A'}` : 'No schedule')}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-5">
                          <div className="text-sm font-bold text-slate-700 whitespace-nowrap">{durationInMins > 0 ? (durationInMins >= 60 ? (durationInMins % 60 === 0 ? `${durationInMins / 60}hr${durationInMins / 60 > 1 ? 's' : ''}` : `${(durationInMins / 60).toFixed(1)}hrs`) : `${durationInMins}min`) : 'N/A'}</div>
                        </td>
                        <td className="px-3 py-5">
                          <div className="relative inline-block">
                            <span className="text-sm font-black text-slate-800 tracking-tight">
                              {getCandidateCount(exam.standard, exam.section)}
                            </span>
                            <div className="w-full h-1 bg-orange-500 rounded-full mt-1"></div>
                          </div>
                        </td>
                        <td className="px-3 py-5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${exam.status === 'PUBLISHED' ? 'bg-orange-500 animate-pulse' : exam.status === 'COMPLETED' ? 'bg-slate-400' : 'bg-primary'}`}></div>
                            <span className={`text-[11px] font-black uppercase tracking-widest whitespace-nowrap ${exam.status === 'PUBLISHED' ? 'text-orange-600' : exam.status === 'COMPLETED' ? 'text-slate-500' : 'text-primary'}`}>
                              {exam.status === 'PUBLISHED' ? 'Upcoming' : exam.status === 'COMPLETED' ? 'Completed' : exam.status === 'DRAFT' ? 'Draft' : exam.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-5">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => setSelectedExam(exam)}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                              title="View Details"
                            >
                              <FaEye size={18} />
                            </button>
                            {(isAdmin || (isTeacher && String(exam.createdBy?._id || exam.createdBy) === String(user?._id))) && (
                              <>
                                {exam.status !== 'COMPLETED' && activeTab !== 'all' && (
                                  <button
                                    onClick={() => handleStatusUpdate(exam._id, exam.status === 'DRAFT' ? 'PUBLISHED' : 'COMPLETED')}
                                    className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                    title={exam.status === 'DRAFT' ? "Publish Exam" : "Mark as Completed"}
                                  >
                                    <FaCheckCircle size={18} />
                                  </button>
                                )}
                                <button
                                  onClick={() => setShowModal({ type: 'edit', open: true, data: exam })}
                                  className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                                  title="Edit Exam"
                                >
                                  <FaEdit size={18} />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({ open: true, examId: exam._id })}
                                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Delete Exam"
                                >
                                  <FaTrash size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          ) : (
            <EmptyState
              icon={FaCalendarAlt}
              title="No examinations found"
              subtitle={searchTerm ? `We couldn't find any exams matching "${searchTerm}". Try different keywords.` : "No examination schedules have been created yet for the current academic year."}
            />
          )}
          {filteredExams.length > 25 && (
            <PaginationControls
              currentPage={currentPage}
              totalItems={filteredExams.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(0);
              }}
            />
          )}
        </div>
        )}
      </div>

        {selectedExam && teacherTab === 'schedule' && (
          <div className="modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto animate-in fade-in duration-300 print:static print:bg-transparent print:backdrop-blur-none print:p-0">
          <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl my-auto relative animate-in zoom-in-95 duration-300 printable-content">
              <div className="max-h-[90vh] overflow-y-auto custom-scrollbar print:max-h-none print:overflow-visible no-scrollbar">
                <div className="p-8 md:p-10 bg-white border-b border-slate-100 flex items-center justify-between rounded-t-[32px] sticky top-0 z-10 print:static print:border-none">
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center border border-slate-100 shadow-sm ${EXAM_TYPES[selectedExam.examType]?.bg || 'bg-slate-50'}`}>
                      <FaCalendarAlt className={EXAM_TYPES[selectedExam.examType]?.color} size={28} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{selectedExam.name}</h2>
                      <div className="flex items-center gap-2 mt-1.5 font-medium">
                      <CustomBadge styles={EXAM_TYPES[selectedExam.examType]} />
                      <CustomBadge styles={STATUS_STYLES[selectedExam.status]} icon={STATUS_STYLES[selectedExam.status]?.icon} />
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedExam(null)}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-100 no-print"
                >
                  <FaPlus className="rotate-45" size={24} />
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
                    <div className="text-slate-900 font-bold">
                      {selectedExam.createdBy?.name || 'Admin'} • {selectedExam.createdBy?.isArchived ? `Archived ${selectedExam.createdByRole || 'Staff'}` : (selectedExam.createdByRole || 'Staff')}
                    </div>
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
                            <div className="flex items-center gap-3 text-xs text-slate-600 font-medium pt-1">
                                <FaChalkboardTeacher size={12} className="text-slate-400" />
                                <span>
                                  Invigilator: {slot.assignedTeacher?.name || 'No Assigned Teacher'}
                                  {slot.assignedTeacher?.isArchived ? ' (Archived)' : ''}
                                </span>
                              </div>
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

              <div className="p-6 bg-slate-50 flex justify-center border-t border-slate-100 no-print">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-3 px-10 py-3.5 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 group"
                >
                  <FaCalendarAlt size={18} className="group-hover:scale-110 transition-transform" />
                  <span>Download Schedule</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {showModal.open && (
          <ExamModal
            isOpen={showModal.open}
            user={{ ...user, ...teacherProfile, _id: user?._id }}
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
          <div className="modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
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
                    <ButtonSpinner />
                  ) : (
                    <FaTrash size={14} />
                  )}
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {message?.text && (
          <div className={`fixed top-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${message.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
              {message.type === 'success' ? <FaCheckCircle size={12} /> : <FaTimes size={12} />}
            </div>
            <span className="font-medium">{message.text}</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ExaminationPage;

