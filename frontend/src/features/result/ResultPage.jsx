import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
  useCompletedResultExams,
  usePublishExamResults,
  useResultExamResults,
  useResultExamStudents,
  useSaveResult,
} from './index';
import { TabButton } from '../../components/ui/NoticeUIComponents';
import ResultEntryModal from './components/ResultEntryModal';
import ResultDetailModal from './components/ResultDetailModal';
import { readError, formatValue } from '../../utils';
import { SkeletonRows } from '../../components/ui/SkeletonRows';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToastMessage } from '../../hooks/useToastMessage';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { StatusBadge, OutcomeBadge } from './components/ResultStatusBadge';
import { useSchoolClasses } from '../../hooks/useSchoolClasses';
import { makeClassKey } from '../../utils/classSection';
import {
  FaArrowLeft,
  FaBookOpen,
  FaCheckCircle,
  FaClipboardList,
  FaEdit,
  FaEye,
  FaFilter,
  FaGraduationCap,
  FaLock,
  FaPlus,
  FaSearch,
  FaTimes,
  FaUpload,
  FaUserGraduate,
} from 'react-icons/fa';

// SkeletonRows moved to shared components/ui/SkeletonRows.jsx
// StatusBadge and OutcomeBadge moved to components/ResultStatusBadge.jsx
// EmptyState moved to shared components/ui/EmptyState.jsx

const RESULT_SKELETON_CELL = 'px-5 py-4';
const RESULT_SKELETON_BAR = 'h-4 bg-slate-100 rounded-lg animate-pulse';

const SummaryCard = ({ icon: Icon, title, value, accent = 'text-slate-700', bg = 'bg-white' }) => (
  <div className={`${bg} rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4`}>
    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
      <Icon size={18} />
    </div>
    <div>
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{title}</p>
      <p className={`text-2xl font-bold mt-0.5 ${accent}`}>{value}</p>
    </div>
  </div>
);

const ResultPage = () => {
  const [selectedExam, setSelectedExam] = useState(null);
  const [examTab, setExamTab] = useState('students');
  const [searchTerm, setSearchTerm] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [resultSearch, setResultSearch] = useState('');
  const [filters, setFilters] = useState({ standard: '', section: '' });
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const { message: toast, showMessage } = useToastMessage(3200);
  const [entryModal, setEntryModal] = useState({ open: false, student: null, result: null });
  const [detailModal, setDetailModal] = useState({ open: false, result: null });

  const queryFilters = useMemo(() => ({
    ...filters,
    page: currentPage,
    pageSize: pageSize
  }), [filters, currentPage, pageSize]);

  const completedExamsQuery = useCompletedResultExams(queryFilters);
  const examStudentsQuery = useResultExamStudents(selectedExam?._id);
  const examResultsQuery = useResultExamResults(selectedExam?._id);
  const saveResultMutation = useSaveResult();
  const publishResultsMutation = usePublishExamResults();

  const completedExams = useMemo(() => completedExamsQuery.data?.exams || [], [completedExamsQuery.data]);
  const examPagination = useMemo(() => completedExamsQuery.data?.pagination || { page: 0, pageSize: 25, totalCount: 0, totalPages: 0 }, [completedExamsQuery.data]);
  const { classSections } = useSchoolClasses();
  const configuredClassKeySet = useMemo(
    () => new Set(classSections.map((item) => makeClassKey(item))),
    [classSections]
  );
  const activeCompletedExams = useMemo(
    () => completedExams.filter((item) => configuredClassKeySet.has(makeClassKey(item))),
    [completedExams, configuredClassKeySet]
  );
  const examStudentsData = examStudentsQuery.data;
  const examResultsData = examResultsQuery.data;
  const currentExam = examStudentsData?.exam || examResultsData?.exam || selectedExam;
  const currentCounts = examStudentsData?.counts || examResultsData?.counts || selectedExam?.counts || {};
  const examStudents = useMemo(() => examStudentsData?.students || [], [examStudentsData]);
  const examResults = useMemo(() => examResultsData?.results || [], [examResultsData]);

  const examResultMap = useMemo(
    () => new Map(examResults.map((item) => [String(item.student?._id), item])),
    [examResults]
  );

  const availableStandards = useMemo(
    () => [...new Set(activeCompletedExams.map((item) => String(item.standard)))].sort((a, b) => Number(a) - Number(b)),
    [activeCompletedExams]
  );

  const availableSections = useMemo(() => {
    const filteredByStandard = filters.standard
      ? activeCompletedExams.filter((item) => String(item.standard) === String(filters.standard))
      : activeCompletedExams;

    return [...new Set(filteredByStandard.map((item) => String(item.section)))].sort();
  }, [activeCompletedExams, filters.standard]);

  const filteredExams = useMemo(() => {
    return activeCompletedExams.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.standard).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.section).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStandard = !filters.standard || String(item.standard) === String(filters.standard);
      const matchesSection = !filters.section || String(item.section) === String(filters.section);
      return matchesSearch && matchesStandard && matchesSection;
    });
  }, [activeCompletedExams, filters.section, filters.standard, searchTerm]);

  const filteredStudents = useMemo(() => {
    return examStudents.filter((item) => {
      if (item.result) {
        return false;
      }

      const source = `${item.name} ${item.rollNumber || ''}`;
      return source.toLowerCase().includes(studentSearch.toLowerCase());
    });
  }, [examStudents, studentSearch]);

  const filteredResults = useMemo(() => {
    return examResults.filter((item) => {
      const source = `${item.student?.name || ''} ${item.student?.rollNumber || ''} ${item.summary?.grade || ''} ${item.summary?.status || ''}`;
      return source.toLowerCase().includes(resultSearch.toLowerCase());
    });
  }, [examResults, resultSearch]);

  const paginatedExams = filteredExams; // Server-side paginated

  const paginatedStudents = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const paginatedResults = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredResults.slice(start, start + pageSize);
  }, [filteredResults, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedExam?._id, examTab, searchTerm, studentSearch, resultSearch, filters.standard, filters.section]);

  const examOverview = useMemo(() => {
    return activeCompletedExams.reduce(
      (acc, item) => {
        acc.totalExams += 1;
        acc.totalStudents += item.counts?.totalStudents || 0;
        acc.enteredResults += item.counts?.enteredResults || 0;
        acc.pendingResults += item.counts?.pendingResults || 0;
        return acc;
      },
      {
        totalExams: 0,
        totalStudents: 0,
        enteredResults: 0,
        pendingResults: 0,
      }
    );
  }, [activeCompletedExams]);

  // showMessage provided by useToastMessage hook

  const handleOpenExam = (exam) => {
    setSelectedExam(exam);
    setExamTab('students');
    setStudentSearch('');
    setResultSearch('');
  };

  const handleBackToList = () => {
    setSelectedExam(null);
    setEntryModal({ open: false, student: null, result: null });
    setDetailModal({ open: false, result: null });
  };

  const handleOpenEntry = useCallback(
    (studentRow) => {
      const fullResult = examResultMap.get(String(studentRow.studentId)) || null;
      if (studentRow.result && !fullResult && examResultsQuery.isLoading) {
        showMessage('error', 'Result details are still loading. Please try again.');
        return false;
      }

      setEntryModal({
        open: true,
        student: studentRow,
        result: fullResult,
      });

      return true;
    },
    [examResultMap, examResultsQuery.isLoading, showMessage]
  );

  const findNextEditableStudent = useCallback(
    (studentId) => {
      const currentIndex = filteredStudents.findIndex(
        (item) => String(item.studentId) === String(studentId)
      );

      if (currentIndex === -1) {
        return null;
      }

      for (let index = currentIndex + 1; index < filteredStudents.length; index += 1) {
        const candidate = filteredStudents[index];
        if (!candidate.result || candidate.result.canEdit !== false) {
          return candidate;
        }
      }

      return null;
    },
    [filteredStudents]
  );

  const currentEntryPosition = useMemo(() => {
    if (!entryModal.student?.studentId) {
      return '';
    }

    const index = filteredStudents.findIndex(
      (item) => String(item.studentId) === String(entryModal.student.studentId)
    );

    if (index === -1) {
      return '';
    }

    return `${index + 1} of ${filteredStudents.length} students`;
  }, [entryModal.student, filteredStudents]);

  const handleSaveResult = useCallback(
    async (payload, options = {}) => {
      try {
        await saveResultMutation.mutateAsync(payload);
        if (options.moveToNext) {
          const upcomingStudent = findNextEditableStudent(payload.studentId);
          showMessage(
            'success',
            upcomingStudent
              ? 'Result saved. Moved to the next student.'
              : 'Result saved successfully'
          );

          if (upcomingStudent && handleOpenEntry(upcomingStudent)) {
            return;
          }
        } else {
          showMessage('success', 'Result saved successfully');
        }

        setExamTab('results');
        setEntryModal({ open: false, student: null, result: null });
      } catch (error) {
        showMessage('error', readError(error, 'Failed to save result'));
      }
    },
    [findNextEditableStudent, handleOpenEntry, saveResultMutation, showMessage]
  );

  const handlePublishResults = async () => {
    if (!selectedExam?._id) return;
    try {
      const response = await publishResultsMutation.mutateAsync(selectedExam._id);
      const publishedCount = response?.data?.publishedCount ?? 0;
      showMessage('success', `${publishedCount} result${publishedCount === 1 ? '' : 's'} published successfully`);
    } catch (error) {
      showMessage('error', readError(error, 'Failed to publish results'));
    }
  };

  return (
    <DashboardLayout>
      {toast?.text && (
        <div className={`fixed top-6 right-6 z-100 px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${toast?.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
            {toast?.type === 'success' ? <FaCheckCircle size={12} /> : <FaTimes size={12} />}
          </div>
          <span className="font-medium">{toast?.text}</span>
        </div>
      )}

      <div className="max-w-1600px mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-700">
        {!selectedExam ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-primary transform hover:rotate-6 transition-transform">
                <FaGraduationCap size={32} />
              </div>
              <div className="space-y-1">
                <h1 className="page-title">Result Management</h1>
                <p className="page-subtitle">
                  Manage marks entry, result generation, and publishing for all completed exams
                </p>
              </div>
            </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <SummaryCard icon={FaGraduationCap} title="Completed Exams" value={examOverview.totalExams} />
              <SummaryCard icon={FaUserGraduate} title="Students Covered" value={examOverview.totalStudents} accent="text-primary" />
              <SummaryCard icon={FaCheckCircle} title="Results Entered" value={examOverview.enteredResults} accent="text-emerald-600" bg="bg-emerald-50/40" />
              <SummaryCard icon={FaClipboardList} title="Pending Results" value={examOverview.pendingResults} accent="text-amber-600" bg="bg-amber-50/40" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 bg-slate-50/60 border-b border-slate-100">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search by exam name, class, or section..."
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 px-2">
                      <FaFilter size={11} />
                      Filters
                    </div>
                    <select
                      value={filters.standard}
                      onChange={(event) => setFilters((current) => ({ ...current, standard: event.target.value, section: '' }))}
                      className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary transition-all min-w-120px shadow-sm cursor-pointer"
                    >
                      <option value="">All Classes</option>
                      {availableStandards.map((standard) => (
                        <option key={standard} value={standard}>
                          Class {standard}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filters.section}
                      onChange={(event) => setFilters((current) => ({ ...current, section: event.target.value }))}
                      className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary transition-all min-w-120px shadow-sm cursor-pointer"
                    >
                      <option value="">All Sections</option>
                      {availableSections.map((section) => (
                        <option key={section} value={section}>
                          Section {section}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/40">
                      <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Exam</th>
                      <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Class</th>
                      <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subjects</th>
                      <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Counts</th>
                      <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completedExamsQuery.isLoading ? (
                      <SkeletonRows rows={5} columns={5} cellClass={RESULT_SKELETON_CELL} barClass={RESULT_SKELETON_BAR} />
                    ) : filteredExams.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10">
                          <EmptyState
                            icon={FaBookOpen}
                            title="No completed exams found"
                            subtitle="Once an exam reaches completed status, it will appear here for marks entry and result publishing."
                          />
                        </td>
                      </tr>
                    ) : (
                      paginatedExams.map((exam) => (
                        <tr key={exam._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-5">
                            <div>
                              <div className="font-bold text-slate-900">{exam.name}</div>
                              <div className="text-xs text-slate-500 mt-1">
                                AY {exam.academicYear} · {exam.examType?.replace('_', ' ')}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-5">
                            <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                              <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200">
                                {exam.standard}
                              </span>
                              <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200">
                                {exam.section}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-5 text-sm text-slate-600">{exam.subjectsCount || 0} subjects</td>
                          <td className="px-5 py-5">
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
                                Entered {exam.counts?.enteredResults || 0}
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold">
                                Pending {exam.counts?.pendingResults || 0}
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                                Published {exam.counts?.published || 0}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-5 text-center">
                            <button
                              onClick={() => handleOpenExam(exam)}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                            >
                              <FaEye size={12} />
                              <span>Open Results</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {examPagination.totalCount > 25 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalItems={examPagination.totalCount}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(0);
                  }}
                />
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <button
                  onClick={handleBackToList}
                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center shadow-sm"
                >
                  <FaArrowLeft size={16} />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{currentExam?.name}</h1>
                  <p className="text-slate-500 mt-1">
                    Class {currentExam?.standard} - {currentExam?.section} · AY {currentExam?.academicYear}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handlePublishResults}
                  disabled={publishResultsMutation.isPending || !currentCounts.draft}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white font-semibold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {publishResultsMutation.isPending ? (
                    <ButtonSpinner />
                  ) : (
                    <FaUpload size={13} />
                  )}
                  <span>{currentCounts.draft ? 'Publish Draft Results' : 'Nothing To Publish'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              <SummaryCard icon={FaUserGraduate} title="Total Students" value={currentCounts.totalStudents || 0} />
              <SummaryCard icon={FaCheckCircle} title="Entered" value={currentCounts.enteredResults || 0} accent="text-emerald-600" bg="bg-emerald-50/40" />
              <SummaryCard icon={FaClipboardList} title="Pending" value={currentCounts.pendingResults || 0} accent="text-amber-600" bg="bg-amber-50/40" />
              <SummaryCard icon={FaUpload} title="Published" value={currentCounts.published || 0} accent="text-blue-600" bg="bg-blue-50/40" />
              <SummaryCard icon={FaLock} title="Locked" value={currentCounts.locked || 0} accent="text-rose-600" bg="bg-rose-50/40" />
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
              <TabButton
                tab="students"
                activeTab={examTab}
                setActiveTab={setExamTab}
                icon={<FaUserGraduate />}
                label="Students"
                count={filteredStudents.length}
              />
              <TabButton
                tab="results"
                activeTab={examTab}
                setActiveTab={setExamTab}
                icon={<FaBookOpen />}
                label="Saved Results"
                count={examResults.length}
              />
            </div>

            {examTab === 'students' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Student Result Entry</h2>
                    <p className="text-sm text-slate-500 mt-1">Students leave this list once their result is saved.</p>
                  </div>
                  <div className="relative w-full lg:w-80">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                      placeholder="Search student or roll number..."
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/40">
                        <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Student</th>
                        <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Roll</th>
                        <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {examStudentsQuery.isLoading ? (
                        <SkeletonRows rows={6} columns={3} cellClass={RESULT_SKELETON_CELL} barClass={RESULT_SKELETON_BAR} />
                      ) : filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-5 py-10">
                            <EmptyState
                              icon={FaUserGraduate}
                              title="No pending result entries"
                              subtitle="Saved students are now available in the Saved Results tab."
                            />
                          </td>
                        </tr>
                      ) : (
                        paginatedStudents.map((student) => {
                          return (
                            <tr key={student.studentId} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-5 py-4">
                                <div>
                                  <div className="font-semibold text-slate-900">{student.name}</div>
                                  {student.email ? (
                                    <div className="text-xs text-slate-500 mt-1">{student.email}</div>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-slate-700 font-medium">{formatValue(student.rollNumber)}</td>
                              <td className="px-5 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleOpenEntry(student)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    <FaPlus size={12} />
                                    <span>Add Result</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredStudents.length > pageSize && (
                  <PaginationControls
                    currentPage={currentPage}
                    totalItems={filteredStudents.length}
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

            {examTab === 'results' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Saved Results</h2>
                    <p className="text-sm text-slate-500 mt-1">Review saved marks, grades, and publish status.</p>
                  </div>
                  <div className="relative w-full lg:w-80">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={resultSearch}
                      onChange={(event) => setResultSearch(event.target.value)}
                      placeholder="Search by student, roll number, or status..."
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="px-5 py-4 border-b border-slate-100 bg-blue-50/80 text-sm text-blue-800">
                  Publishing only affects saved draft results. Students with pending results can still be completed later, and published results stay editable for 7 days from the publish date before they lock automatically.
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/40">
                        <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Student</th>
                        <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Percentage</th>
                        <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Grade</th>
                        <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Outcome</th>
                        <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {examResultsQuery.isLoading ? (
                        <SkeletonRows rows={5} columns={6} cellClass={RESULT_SKELETON_CELL} barClass={RESULT_SKELETON_BAR} />
                      ) : filteredResults.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-10">
                            <EmptyState
                              icon={FaBookOpen}
                              title="No results saved yet"
                              subtitle="Use the student roster tab to enter marks and generate results."
                            />
                          </td>
                        </tr>
                      ) : (
                        paginatedResults.map((item) => (
                          <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-4">
                              <div>
                                <div className="font-semibold text-slate-900">{item.student?.name}</div>
                                <div className="text-xs text-slate-500 mt-1">Roll {formatValue(item.student?.rollNumber)}</div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge status={item.summary?.status} />
                            </td>
                            <td className="px-5 py-4 text-slate-700 font-semibold">{item.summary?.percentage}%</td>
                            <td className="px-5 py-4 text-slate-700 font-semibold">{item.summary?.grade}</td>
                            <td className="px-5 py-4">
                              <OutcomeBadge outcome={item.summary?.resultStatus} />
                            </td>
                            <td className="px-5 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setDetailModal({ open: true, result: item })}
                                  className="p-2.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-xl transition-all"
                                  title="View Result"
                                >
                                  <FaEye size={15} />
                                </button>
                                <button
                                  onClick={() =>
                                    setEntryModal({
                                      open: true,
                                      student: {
                                        studentId: item.student?._id,
                                        name: item.student?.name,
                                        rollNumber: item.student?.rollNumber,
                                        email: item.student?.email,
                                      },
                                      result: item,
                                    })
                                  }
                                  disabled={!item.summary?.canEdit}
                                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  <FaEdit size={12} />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredResults.length > pageSize && (
                  <PaginationControls
                    currentPage={currentPage}
                    totalItems={filteredResults.length}
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
          </>
        )}
      </div>

      <ResultEntryModal
        key={`${currentExam?._id || 'exam'}-${entryModal.student?.studentId || 'student'}-${entryModal.result?._id || 'new'}`}
        isOpen={entryModal.open}
        exam={currentExam}
        student={entryModal.student}
        currentResult={entryModal.result}
        onClose={() => setEntryModal({ open: false, student: null, result: null })}
        onSubmit={handleSaveResult}
        isSaving={saveResultMutation.isPending}
        studentPositionLabel={currentEntryPosition}
      />

      <ResultDetailModal
        isOpen={detailModal.open}
        result={detailModal.result}
        onClose={() => setDetailModal({ open: false, result: null })}
        onEdit={() => {
          const result = detailModal.result;
          setDetailModal({ open: false, result: null });
          setEntryModal({
            open: true,
            student: {
              studentId: result?.student?._id,
              name: result?.student?.name,
              rollNumber: result?.student?.rollNumber,
              email: result?.student?.email,
            },
            result,
          });
        }}
      />
    </DashboardLayout>
  );
};

export default ResultPage;
