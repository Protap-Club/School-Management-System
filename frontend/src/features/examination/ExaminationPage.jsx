import React, { useState, useMemo, useCallback } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../auth';
import { useHasFeature } from '../../state/features';
import {
  useExams, useCreateExam, useUpdateExam, useUploadScheduleAttachments, usePatchScheduleSyllabus, useDeleteExam, useUpdateExamStatus,
} from './index';
import { useProfile, useStudents } from '../attendance';
import { useSchoolClasses } from '../../hooks/useSchoolClasses';
import ExamModal from './components/ExamModal';
import { FaPlus, FaEdit, FaTrash, FaCalendarAlt, FaClock,
  FaChalkboardTeacher, FaCheckCircle, FaExclamationTriangle, FaBan, FaSearch, FaTimes, FaInfoCircle, FaLayerGroup, FaCalendarCheck, FaPaperclip, FaUsers, FaLock } from 'react-icons/fa';
import { TabButton } from '../../components/ui/NoticeUIComponents';
import { EmptyState } from '../../components/ui/EmptyState';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { useToastMessage } from '../../hooks/useToastMessage';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { generateTimetablePDF, generateExamSchedulePDF } from '@/utils/pdfGenerator';
import { downloadFile } from '../../utils/downloadFile';
import { useExamSubmit } from './useExamSubmit';

// Constants
const EXAM_TYPES = {
  TERM_EXAM: { label: 'Term Exam', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  CLASS_TEST: { label: 'Class Test', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
};

const STATUS_STYLES = {
  DRAFT: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: FaExclamationTriangle },
  PUBLISHED: { label: 'Upcoming', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: FaCalendarAlt },
  COMPLETED: { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: null },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: null },
};

const STATUS_DOT_STYLES = {
  DRAFT: 'bg-slate-400',
  PUBLISHED: 'bg-amber-500 animate-pulse',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-rose-500',
};

// sanitizeAttachmentForApi has been moved to useExamSubmit.js

const resolveEntityId = (entity) =>
  String(entity?._id || entity?.id || entity?.userId || '');

const normalizeSearch = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/\bclass\b/g, "")
    .replace(/\s+/g, "")
    .trim();
};

const formatCreatorRoleLabel = (role) => {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  if (role === 'teacher') return 'Teacher';
  return 'Staff';
};

const ACTIVE_TAB_STATUS_MAP = {
  all: '',
  upcoming: 'PUBLISHED',
  drafts: 'DRAFT',
  completed: 'COMPLETED',
};

const getScheduleDurationInMinutes = (slot = {}) => {
  if (!slot.startTime || !slot.endTime) return 0;

  const [startHours, startMinutes] = String(slot.startTime).split(':').map(Number);
  const [endHours, endMinutes] = String(slot.endTime).split(':').map(Number);

  if (
    Number.isNaN(startHours) ||
    Number.isNaN(startMinutes) ||
    Number.isNaN(endHours) ||
    Number.isNaN(endMinutes)
  ) {
    return 0;
  }

  const durationInMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  return durationInMinutes > 0 ? durationInMinutes : 0;
};

const formatDurationLabel = (durationInMinutes) => {
  if (!durationInMinutes) return 'N/A';

  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;

  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr${hours > 1 ? 's' : ''}`;
  return `${hours} hr ${minutes} min`;
};

const formatDateRangeLabel = (minDate, maxDate) => {
  if (!minDate) return 'N/A';

  if (!maxDate || minDate.toDateString() === maxDate.toDateString()) {
    return minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return `${minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

const getExamPresentation = (exam = {}) => {
  const schedule = Array.isArray(exam.schedule) ? exam.schedule.filter(Boolean) : [];
  const subjects = schedule.map((item) => item.subject).filter(Boolean);
  const dates = schedule
    .map((item) => item.examDate)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));
  const minDate = dates.length > 0 ? new Date(dates[0]) : null;
  const maxDate = dates.length > 0 ? new Date(dates[dates.length - 1]) : null;
  const firstSchedule = schedule[0] || null;
  const allSameTime = schedule.length > 1 && schedule.every(
    (item) => item.startTime === firstSchedule?.startTime && item.endTime === firstSchedule?.endTime
  );
  const totalDurationMinutes = schedule.reduce(
    (sum, item) => sum + getScheduleDurationInMinutes(item),
    0
  );

  let timeLabel = 'No schedule';
  if (schedule.length === 1 && firstSchedule) {
    timeLabel = `${firstSchedule.startTime || 'N/A'} - ${firstSchedule.endTime || 'N/A'}`;
  } else if (schedule.length > 1) {
    if (allSameTime && firstSchedule?.startTime && firstSchedule?.endTime) {
      timeLabel = `${firstSchedule.startTime} - ${firstSchedule.endTime} each day`;
    } else {
      timeLabel = `${schedule.length} sessions`;
    }
  }

  return {
    subjects,
    dateLabel: formatDateRangeLabel(minDate, maxDate),
    timeLabel,
    sessionCount: schedule.length,
    totalDurationLabel: formatDurationLabel(totalDurationMinutes),
  };
};

// Dynamic options for standards and sections are handled by useSchoolClasses

const CustomBadge = ({ styles, icon: Icon, label }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${styles.bg} ${styles.color} ${styles.border}`}>
    {Icon && <Icon size={12} />}
    {label || styles.label}
  </span>
);


const StatsCard = ({ label, value, icon, colorClass, bgClass }) => {
  const IconComponent = icon;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
      <div className={`w-14 h-14 rounded-2xl ${bgClass} flex items-center justify-center ${colorClass} shadow-inner`}>
        {IconComponent ? <IconComponent size={24} /> : null}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 leading-tight">{value}</h3>
      </div>
    </div>
  );
};

const ExaminationPage = () => {
  const { user } = useAuth();
  const examinationEnabled = useHasFeature('examination');
  const { data: profileRes } = useProfile();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);
  const isTeacher = user?.role === 'teacher';
  const showCandidatesInList = isAdmin;
  const showSubjectsInList = !showCandidatesInList;

  // Retrieve school name from cached branding if available
  const schoolName = useMemo(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem('schoolBranding'));
      return (cached?.name || cached?.school?.name) || (user?.role === 'super_admin' ? 'Protap' : 'School Management System');
    } catch {
      return 'School Management System';
    }
  }, [user]);

  // Page-level guard: show disabled placeholder if feature is off
  if (examinationEnabled === false) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-5 p-8">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
            <FaLock size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Examination Disabled</h2>
            <p className="text-sm text-gray-400 mt-2 max-w-sm">
              The Examination &amp; Results module has been turned off for this school. Contact your Super Admin to re-enable it.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const teacherProfile = useMemo(() => {
    if (!isTeacher || !profileRes?.data) return null;
    return profileRes.data.data || profileRes.data;
  }, [isTeacher, profileRes]);

  const currentUserId = useMemo(() => {
    return (
      resolveEntityId(user) ||
      resolveEntityId(teacherProfile?.userId) ||
      resolveEntityId(teacherProfile)
    );
  }, [teacherProfile, user]);

  const [activeTab, setActiveTab] = useState('all');
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

  const handleActiveTabChange = useCallback((nextTab) => {
    setActiveTab(nextTab);
    setCurrentPage(0);
  }, []);

  const queryFilters = useMemo(() => {
    return {
      ...filters,
      status: ACTIVE_TAB_STATUS_MAP[activeTab] || filters.status,
      page: currentPage,
      pageSize: pageSize
    };
  }, [filters, activeTab, currentPage, pageSize]);

  const { data: examsData, isLoading: examsLoading } = useExams(queryFilters);
  const exams = useMemo(() => examsData?.exams ?? [], [examsData]);
  const paginationInfo = useMemo(
    () => examsData?.pagination ?? { page: 0, pageSize: 25, totalCount: 0, totalPages: 0 },
    [examsData]
  );
  const examSummary = useMemo(
    () => examsData?.summary ?? null,
    [examsData]
  );
  const createExamMutation = useCreateExam();
  const updateExamMutation = useUpdateExam();
  const uploadScheduleAttachmentsMutation = useUploadScheduleAttachments();
  const patchScheduleSyllabusMutation = usePatchScheduleSyllabus();
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
    if (isTeacher) {
      const assigned = user?.profile?.assignedClasses || [];
      const classTeacherOf = user?.profile?.classTeacherOf;
      const standards = new Set();
      assigned.forEach(c => { if (c.standard) standards.add(String(c.standard)); });
      if (classTeacherOf?.standard) standards.add(String(classTeacherOf.standard));
      return Array.from(standards).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    return schoolAvailableStandards;
  }, [isTeacher, schoolAvailableStandards, user]);

  const getSectionsForSelectedStandard = useCallback((standardValue) => {
    if (!standardValue) return allUniqueSections;
    return getSectionsForStandard(standardValue);
  }, [allUniqueSections, getSectionsForStandard]);

  const availableSections = useMemo(() => {
    if (isTeacher) {
      const assigned = user?.profile?.assignedClasses || [];
      const classTeacherOf = user?.profile?.classTeacherOf;
      const sections = new Set();
      const selectedStandard = filters.standard;

      assigned.forEach(c => {
        if (!selectedStandard || String(c.standard) === String(selectedStandard)) {
          if (c.section) sections.add(String(c.section).toUpperCase());
        }
      });

      if (classTeacherOf?.standard && (!selectedStandard || String(classTeacherOf.standard) === String(selectedStandard))) {
        if (classTeacherOf.section) sections.add(String(classTeacherOf.section).toUpperCase());
      }

      return Array.from(sections).sort();
    }
    return getSectionsForSelectedStandard(filters.standard);
  }, [filters.standard, getSectionsForSelectedStandard, isTeacher, user]);

  const handleStandardFilterChange = useCallback((standardValue) => {
    setFilters((current) => {
      const nextStandard = availableStandards.includes(standardValue) ? standardValue : '';
      const nextSections = getSectionsForSelectedStandard(nextStandard);
      const nextSection = nextSections.includes(current.section) ? current.section : '';
      return { ...current, standard: nextStandard, section: nextSection };
    });
    setCurrentPage(0);
  }, [availableStandards, getSectionsForSelectedStandard]);

  const handleSectionFilterChange = useCallback((sectionValue) => {
    setFilters((current) => {
      const allowedSections = getSectionsForSelectedStandard(current.standard);
      const nextSection = sectionValue && !allowedSections.includes(sectionValue) ? '' : sectionValue;
      return { ...current, section: nextSection };
    });
    setCurrentPage(0);
  }, [getSectionsForSelectedStandard]);

  const { message, showMessage } = useToastMessage();

  const filteredExams = useMemo(() => {
    let result = exams;
    
    // Frontend search within the current paginated results
    if (searchTerm) {
      const normalizedTerm = normalizeSearch(searchTerm);
      const term = searchTerm.toLowerCase();

      result = result.filter(e => {
        const nameMatch = e.name.toLowerCase().includes(term);
        const descMatch = e.description && e.description.toLowerCase().includes(term);
        
        // Normalized class matching (Standard + Section)
        const standardNormalized = normalizeSearch(e.standard || '');
        const combinedNormalized = normalizeSearch(`${e.standard || ''}${e.section || ''}`);
        
        const classMatch = (standardNormalized && normalizedTerm && standardNormalized.includes(normalizedTerm)) ||
                          (combinedNormalized && normalizedTerm && combinedNormalized.includes(normalizedTerm));

        return nameMatch || descMatch || classMatch;
      });
    }
    return result;
  }, [exams, searchTerm]);

  const stats = useMemo(() => {
    if (examSummary) {
      return {
        total: examSummary.total ?? 0,
        upcoming: examSummary.upcoming ?? 0,
        completed: examSummary.completed ?? 0,
      };
    }

    return {
      total: paginationInfo.totalCount || exams.length,
      upcoming: exams.filter(e => e.status === 'PUBLISHED').length,
      completed: exams.filter(e => e.status === 'COMPLETED').length,
    };
  }, [examSummary, exams, paginationInfo.totalCount]);

  const selectedExamCreatorText = useMemo(() => {
    if (!selectedExam) return '';

    const snapshot = selectedExam.creatorSnapshot || {};
    const creatorName = snapshot.name || selectedExam.createdBy?.name || 'Staff';
    const creatorRole = snapshot.role || selectedExam.createdByRole || 'staff';
    const roleLabel = formatCreatorRoleLabel(creatorRole);
    const classLabel =
      snapshot.classLabel || (creatorRole === 'teacher' ? `Class ${selectedExam.standard}-${selectedExam.section}` : '');
    const archivedPrefix = selectedExam.createdBy?.isArchived ? 'Archived ' : '';

    return classLabel
      ? `${creatorName} • ${archivedPrefix}${roleLabel} • ${classLabel}`
      : `${creatorName} • ${archivedPrefix}${roleLabel}`;
  }, [selectedExam]);

  const selectedExamMeta = useMemo(() => {
    if (!selectedExam) return null;

    return {
      ...getExamPresentation(selectedExam),
      candidateCount: getCandidateCount(selectedExam.standard, selectedExam.section),
    };
  }, [getCandidateCount, selectedExam]);

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

  const handleAttachmentDownload = useCallback(async (url, filename) => {
    try {
      await downloadFile(url, filename || 'attachment');
      showMessage('success', 'Download starting...');
    } catch (error) {
      console.error('Attachment download failed:', error);
      showMessage('error', 'Download failed');
    }
  }, [showMessage]);

  const { handleExamSubmit } = useExamSubmit({
    showModal,
    setShowModal,
    createExamMutation,
    updateExamMutation,
    patchScheduleSyllabusMutation,
    uploadScheduleAttachmentsMutation,
    showMessage,
  });

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1400px] animate-in fade-in duration-700">
        <div className={selectedExam ? "no-print" : ""}>
          {/* Header Section */}
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 sm:items-center sm:gap-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-lg transition-transform hover:rotate-6 sm:h-16 sm:w-16">
                <FaCalendarCheck size={32} />
              </div>
              <div className="min-w-0 space-y-1">
                <h1 className="page-title">Examination Schedules</h1>
                <p className="page-subtitle">Manage and monitor your examination sessions.</p>
              </div>
            </div>
            {(isAdmin || isTeacher) && (
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <button 
                  onClick={() => setShowModal({ type: 'create', open: true, data: null })}
                  className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 shadow-lg shadow-primary/20 active:scale-95 sm:w-auto sm:px-6"
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
            <div className="flex flex-col gap-4 p-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-stretch gap-1 rounded-2xl border border-slate-100 bg-slate-50 p-1.5">
                <TabButton 
                  tab="all" activeTab={activeTab} setActiveTab={handleActiveTabChange} label={`All Exams`} 
                  className={`flex-1 sm:flex-none ${activeTab === 'all' ? 'bg-white shadow-sm' : ''}`}
                />
                <TabButton 
                  tab="upcoming" activeTab={activeTab} setActiveTab={handleActiveTabChange} label={`Schedule`}
                  className={`flex-1 sm:flex-none ${activeTab === 'upcoming' ? 'bg-white shadow-sm' : ''}`}
                />
                <TabButton 
                  tab="drafts" activeTab={activeTab} setActiveTab={handleActiveTabChange} label={`Drafts`}
                  className={`flex-1 sm:flex-none ${activeTab === 'drafts' ? 'bg-white shadow-sm' : ''}`}
                />
                <TabButton 
                  tab="completed" activeTab={activeTab} setActiveTab={handleActiveTabChange} label={`Completed`}
                  className={`flex-1 sm:flex-none ${activeTab === 'completed' ? 'bg-white shadow-sm' : ''}`}
                />
              </div>
              
              <div className="flex w-full min-w-0 flex-col gap-3 px-0 sm:px-2 lg:flex-row lg:items-center lg:gap-3 xl:flex-1">
                <div className="relative group w-full min-w-0 lg:flex-1">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
                  <input
                    type="text"
                    placeholder="Search exams, classes or descriptions..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(0);
                    }}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:shrink-0 lg:items-center lg:gap-3">
                  <select
                    value={filters.standard}
                    onChange={(e) => handleStandardFilterChange(e.target.value)}
                    className="w-full cursor-pointer rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100 focus:outline-none lg:min-w-[150px] xl:min-w-[160px]"
                  >
                    <option value="">All Classes</option>
                    {availableStandards.map(std => (
                      <option key={std} value={std}>Class {std}</option>
                    ))}
                  </select>
                  <select
                    value={filters.section}
                    onChange={(e) => handleSectionFilterChange(e.target.value)}
                    className="w-full cursor-pointer rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100 focus:outline-none lg:min-w-[150px] xl:min-w-[160px]"
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

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          {examsLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton-shimmer h-20 rounded-xl" style={{ animationDelay: `${(i - 1) * 0.1}s` }} />
              ))}
            </div>
          ) : filteredExams.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Exam</th>
                    {showSubjectsInList && (
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</th>
                    )}
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">When</th>
                    {showCandidatesInList && (
                      <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidates</th>
                    )}
                    <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExams.map((exam) => {
                    const examMeta = getExamPresentation(exam);
                    const canFullEdit =
                      isAdmin || (
                        !!currentUserId &&
                        resolveEntityId(exam.createdBy) === currentUserId
                      );
                    const statusStyle = STATUS_STYLES[exam.status] || STATUS_STYLES.DRAFT;

                    return (
                      <tr key={exam._id} onClick={() => setSelectedExam(exam)} className="group cursor-pointer hover:bg-slate-50/80 transition-all duration-200">
                        <td className="px-4 py-5">
                          <div className="min-w-0 space-y-1">
                            <div className="font-bold text-slate-900 text-sm leading-snug truncate" title={exam.name}>{exam.name}</div>
                            <div className="text-[11px] font-bold text-slate-500">Class {exam.standard} - {exam.section || 'All'}</div>
                            <div className="text-[11px] text-slate-400">{EXAM_TYPES[exam.examType]?.label || 'Exam Plan'}</div>
                          </div>
                        </td>
                        {showSubjectsInList && (
                          <td className="px-4 py-5">
                            <div className="flex flex-col items-start gap-1">
                              <div className="flex flex-wrap gap-1">
                                {examMeta.subjects.length > 0 ? (
                                  <>
                                    {examMeta.subjects.slice(0, 2).map((subject, index) => (
                                      <span key={`${subject}-${index}`} className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 shadow-sm whitespace-nowrap">
                                        {subject}
                                      </span>
                                    ))}
                                  </>
                                ) : (
                                  <span className="text-slate-400 text-xs italic">No subjects</span>
                                )}
                              </div>
                              {examMeta.subjects.length > 2 && (
                                <span className="text-[10px] font-bold text-slate-400">+{examMeta.subjects.length - 2} more</span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-5">
                          <div className="flex flex-col gap-0.5">
                            <div className="text-sm font-bold text-slate-700 whitespace-nowrap">
                              {examMeta.dateLabel}
                            </div>
                            <div className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                              {examMeta.timeLabel}
                            </div>
                          </div>
                        </td>
                        {showCandidatesInList && (
                          <td className="px-3 py-5">
                            <div className="inline-flex flex-col rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2 min-w-[92px]">
                              <span className="text-sm font-black text-slate-800 tracking-tight">
                                {getCandidateCount(exam.standard, exam.section)}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">students</span>
                            </div>
                          </td>
                        )}
                        <td className="px-3 py-5">
                          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-widest whitespace-nowrap ${statusStyle.bg} ${statusStyle.border} ${statusStyle.color}`}>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT_STYLES[exam.status] || 'bg-slate-400'}`}></div>
                            <span>{statusStyle.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-5">
                          <div className="flex items-center justify-center gap-2">
                            {canFullEdit && (
                              <>
                                {canFullEdit && exam.status !== 'COMPLETED' && activeTab !== 'all' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusUpdate(exam._id, exam.status === 'DRAFT' ? 'PUBLISHED' : 'COMPLETED'); }}
                                    className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                    title={exam.status === 'DRAFT' ? "Publish Exam" : "Mark as Completed"}
                                  >
                                    <FaCheckCircle size={18} />
                                  </button>
                                )}
                                {exam.status !== 'COMPLETED' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setShowModal({ type: 'edit', open: true, data: exam }); }}
                                    className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                                    title="Edit Exam"
                                  >
                                    <FaEdit size={18} />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, examId: exam._id }); }}
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
            </div>
          ) : (
            <EmptyState
              icon={FaCalendarAlt}
              title="No examinations found"
              subtitle={searchTerm ? `We couldn't find any exams matching "${searchTerm}". Try different keywords.` : "No examination schedules have been created yet for the current academic year."}
            />
          )}
          {paginationInfo.totalCount > 25 && (
            <PaginationControls
              currentPage={currentPage}
              totalItems={paginationInfo.totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(0);
              }}
            />
          )}
        </div>
      </div>

        {selectedExam && (
          <div className="modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-60 p-4 overflow-y-auto animate-in fade-in duration-300 print:static print:bg-transparent print:backdrop-blur-none print:p-0">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary">
                        <FaLayerGroup size={16} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sessions</div>
                        <div className="text-lg font-black text-slate-900">{selectedExamMeta?.sessionCount || 0}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      {selectedExamMeta?.subjects.length ? `${selectedExamMeta.subjects.length} subject entries planned` : 'No subject schedule yet'}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-amber-600">
                        <FaUsers size={16} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidates</div>
                        <div className="text-lg font-black text-slate-900">{selectedExamMeta?.candidateCount || 0}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">Students from the assigned class and section</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-emerald-600">
                        <FaClock size={16} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Duration</div>
                        <div className="text-lg font-black text-slate-900">{selectedExamMeta?.totalDurationLabel || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">Combined time across all scheduled sessions</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary">
                        <FaCalendarCheck size={16} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Schedule</div>
                        <div className="text-sm font-black text-slate-900">{selectedExamMeta?.dateLabel || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">{selectedExamMeta?.timeLabel || 'No schedule'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Audience</div>
                    <div className="text-slate-900 font-bold">Class {selectedExam.standard} • Section {selectedExam.section || 'All'}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Timing & Period</div>
                    <div className="text-slate-900 font-bold">AY {selectedExam.academicYear} • Category {selectedExam.category}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Creation Details</div>
                    <div className="text-slate-900 font-bold">
                      {selectedExamCreatorText}
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
                          {slot.attachments?.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-50">
                              <div className="text-[10px] font-bold text-slate-400 mb-2">ATTACHMENTS</div>
                              <div className="flex flex-wrap gap-2">
                                {slot.attachments.map((attachment, attachmentIndex) => (
                                  <button
                                    type="button"
                                    key={attachment.publicId || attachment.url || `${idx}-${attachmentIndex}`}
                                    onClick={() =>
                                      handleAttachmentDownload(
                                        attachment.url,
                                        attachment.name || attachment.originalName || `Attachment ${attachmentIndex + 1}`
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/10"
                                  >
                                    <FaPaperclip size={9} />
                                    <span>{attachment.name || attachment.originalName || `Attachment ${attachmentIndex + 1}`}</span>
                                  </button>
                                ))}
                              </div>
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
                  onClick={() => generateExamSchedulePDF(selectedExam, selectedExamMeta, schoolName)}
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
            }}
            onSubmit={handleExamSubmit}
            editData={showModal.type === 'edit' || showModal.type === 'editSyllabus' ? showModal.data : null}
            syllabusOnly={showModal.type === 'editSyllabus'}
            isLoading={
              createExamMutation.isPending ||
              updateExamMutation.isPending ||
              patchScheduleSyllabusMutation.isPending ||
              uploadScheduleAttachmentsMutation.isPending
            }
            userRole={user?.role}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.open && (
          <div className="modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-100 p-4 animate-in fade-in duration-300">
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
          <div className={`fixed top-6 left-4 right-4 sm:left-auto sm:right-6 z-[100] px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${message.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
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

