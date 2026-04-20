import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    feeKeys,
    useFeeStructures, useCreateFeeStructure, useUpdateFeeStructure, useDeleteFeeStructure,
    useGenerateAssignments, useAllClassesOverview, useClassOverview, useYearlySummary,
    useStudentFeeHistory, useRecordPayment, useUpdateAssignment,
    useCreateSalary, useSalaries, useUpdateSalaryStatus, useMySalary, useUpdateTeacherProfile,
    useMyFees, useFeeTypes, usePenaltyTypes, usePenaltyStudentsByClass, useStudentPenalties, useCreateStudentPenalty,
    useUpdatePenaltyStatus, useDeleteStudentPenalty, useAllClassesPenaltyOverview, useClassPenaltyOverview, useYearlyPenaltySummary, useMyPenalties,
    SALARY_LABELS,
    FEE_TYPES, FEE_TYPE_LABELS, FREQUENCY_LABELS, MONTH_LABELS, PENALTY_TYPE_LABELS,
} from './index';
import { useAuth } from '../auth';
import { useUsers } from '../users/api/queries';
import FeeStructureModal from '../../components/fees/FeeStructureModal';
import PaymentModal from '../../components/fees/PaymentModal';
import FeeStructureForm from '../../components/fees/FeeStructureForm';
// SalaryForm import removed - Pay Salary is now inline inside View Ledger
import TeacherSalaryTab from './components/TeacherSalaryTab';
import StudentStructuresTab from './components/StudentStructuresTab';
import StudentFeesTab from './components/StudentFeesTab';
import FeeStatusBadge from './components/FeeStatusBadge';
import { StudentOverviewPanel, StudentYearlySummaryPanel } from './components/AdminStudentOverviewTab';
import { StaffOverviewPanel, StaffYearlySummaryPanel } from './components/AdminStaffOverviewTab';
import {
    FaPlus, FaEdit, FaTrash, FaTrashAlt, FaBolt, FaTimes, FaCheck, FaMoneyBillWave,
    FaChartBar, FaListAlt, FaEye, FaFilter, FaArrowLeft, FaArrowRight, FaReceipt, FaBan, FaHistory,
    FaWallet, FaCalendarCheck, FaSearch, FaUser, FaFileInvoice, FaCalendarAlt, FaDownload, FaEllipsisV,
    FaMoneyCheckAlt, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { generateFeeReport, generateSalaryReceipt } from '../../utils/pdfGenerator';
import { generateFeeExcel } from '../../utils/excelGenerator';
import { SkeletonRows } from '../../components/ui/SkeletonRows';
import { EmptyState } from '../../components/ui/EmptyState';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { useToastMessage } from '../../hooks/useToastMessage';
import { useSchoolClasses } from '../../hooks/useSchoolClasses';
import { makeClassKey, sortClassSections } from '../../utils/classSection';
import useDebounce from '../../hooks/useDebounce';

const MODAL_OVERLAY = 'modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4';
const INITIAL_ACADEMIC_YEAR_START_MONTH = 6;
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const getCurrentAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= INITIAL_ACADEMIC_YEAR_START_MONTH ? year : year - 1;
};

/**
 * Given the academic-year start (e.g. 2025 for "2025-2026") and a calendar
 * month (1-12), return the actual calendar year the month falls in.
 * Months >= INITIAL_ACADEMIC_YEAR_START_MONTH belong to the start year,
 * months < INITIAL_ACADEMIC_YEAR_START_MONTH belong to start year + 1.
 */
const getCalendarYearForMonth = (academicYearStart, month) => {
    return month >= INITIAL_ACADEMIC_YEAR_START_MONTH
        ? Number(academicYearStart)
        : Number(academicYearStart) + 1;
};

/**
 * Check if a salary record (with year & month) belongs to a given academic year.
 * Academic year 2025-2026 = Jun 2025 – May 2026.
 */
const salaryBelongsToAcademicYear = (salaryYear, salaryMonth, academicYearStart) => {
    const y = Number(salaryYear);
    const m = Number(salaryMonth);
    const s = Number(academicYearStart);
    if (m >= INITIAL_ACADEMIC_YEAR_START_MONTH) return y === s;
    return y === s + 1;
};

const getAcademicYearOptions = () => {
    const year = new Date().getFullYear();
    const options = [];
    for (let i = -2; i <= 5; i++) {
        const startYear = year + i;
        options.push({
            value: startYear,
            label: `${startYear} - ${startYear + 1}`,
        });
    }
    return options;
};

// StatusBadge extracted to ./components/FeeStatusBadge.jsx

// SkeletonRow & EmptyState moved to shared components


const FeesPage = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isAdmin = ['admin', 'super_admin'].includes(user?.role);
    const isTeacher = user?.role === 'teacher';
    const isStudent = user?.role === 'student';

    const [activeTab, setActiveTab] = useState(
        isAdmin ? 'management' : isTeacher ? 'salary' : 'student_fees'
    );
    const [mgmtView, setMgmtView] = useState('selection'); // selection, student_list, student_form, staff
    const [studentSubTab, setStudentSubTab] = useState('structures'); // structures, overview, yearly
    const [staffSubTab, setStaffSubTab] = useState('dashboard'); // dashboard, overview, yearly
    const { message: toast, showMessage: showToast } = useToastMessage(3500);

    // Structures state
    const [structFilters, setStructFilters] = useState({ academicYear: getCurrentAcademicYear(), standard: '', section: '', studentId: '', feeType: '' });
    const [structModal, setStructModal] = useState({ open: false, editData: null });
    const [genModal, setGenModal] = useState({ open: false, structure: null });
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Overview state
    const [overviewYear, setOverviewYear] = useState(getCurrentAcademicYear());
    const [overviewMonth, setOverviewMonth] = useState(currentMonth);
    const [overviewMode, setOverviewMode] = useState('fee'); // 'fee' | 'penalty'
    const [selectedClass, setSelectedClass] = useState(null);
    const [overviewType, setOverviewType] = useState('');
    const [overviewStatus, setOverviewStatus] = useState('all');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [overviewPage, setOverviewPage] = useState(1);
    const OVERVIEW_PER_PAGE = 15;
    const [paymentModal, setPaymentModal] = useState({ open: false, assignment: null });
    const [updateModal, setUpdateModal] = useState({ open: false, assignment: null });

    // Yearly state
    const [summaryYear, setSummaryYear] = useState(getCurrentAcademicYear());

    // Staff Salary state
    const [staffSearch, setStaffSearch] = useState('');
    const debouncedStaffSearch = useDebounce(staffSearch, 300);
    const [staffStatusFilter, setStaffStatusFilter] = useState('all');
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [baseSalaryModal, setBaseSalaryModal] = useState({ open: false, staff: null, amount: '' });
    const [payoutConfirmModal, setPayoutConfirmModal] = useState({ open: false, salary: null, remarks: '' });
    const [staffDashboardPage, setStaffDashboardPage] = useState(1);
    const STAFF_DASHBOARD_PER_PAGE = 15;
    const [editingSalaryId, setEditingSalaryId] = useState(null);
    const [editingAmount, setEditingAmount] = useState('');
    // Pay Salary inline form state (inside View Ledger)
    const [showPayForm, setShowPayForm] = useState(false);
    const [payForm, setPayForm] = useState({ month: currentMonth, year: getCurrentAcademicYear(), amount: '' });
    const [payFormErrors, setPayFormErrors] = useState({});

    const [penaltyDeleteConfirm, setPenaltyDeleteConfirm] = useState(null);

    // Filter logic
    useEffect(() => {
        setOverviewPage(1);
    }, [overviewStatus, overviewType, selectedClass]);

    useEffect(() => {
        setStaffDashboardPage(1);
    }, [debouncedStaffSearch]);

    const { availableStandards, allUniqueSections, getSectionsForStandard, classSections } = useSchoolClasses({ enabled: isAdmin });

    const standardFilterOptions = useMemo(() => {
        const merged = new Set((availableStandards || []).map((value) => String(value || '').trim()).filter(Boolean));
        const current = String(structFilters.standard || '').trim();
        if (current) merged.add(current);
        return Array.from(merged).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [availableStandards, structFilters.standard]);

    const sectionFilterOptions = useMemo(() => {
        const selectedStandard = String(structFilters.standard || '').trim();
        const source = selectedStandard ? getSectionsForStandard(selectedStandard) : allUniqueSections;
        const merged = new Set((source || []).map((value) => String(value || '').trim().toUpperCase()).filter(Boolean));
        const current = String(structFilters.section || '').trim().toUpperCase();
        if (current) merged.add(current);
        return Array.from(merged).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }, [allUniqueSections, getSectionsForStandard, structFilters.standard, structFilters.section]);

    const penaltyStudentFilters = useMemo(() => ({
        academicYear: structFilters.academicYear,
        standard: String(structFilters.standard || '').trim(),
        section: String(structFilters.section || '').trim().toUpperCase(),
    }), [structFilters.academicYear, structFilters.standard, structFilters.section]);

    // Queries
    // Pagination state for structures
    const [structPage, setStructPage] = useState(0);
    const [structPageSize, setStructPageSize] = useState(25);

    const cleanFilters = useMemo(() => {
        const f = {
            page: structPage,
            pageSize: structPageSize
        };
        if (structFilters.academicYear) f.academicYear = structFilters.academicYear;
        if (structFilters.standard) f.standard = structFilters.standard;
        if (structFilters.section) f.section = structFilters.section;
        if (structFilters.feeType) f.feeType = structFilters.feeType;
        return f;
    }, [structFilters, structPage, structPageSize]);

    // Reset page on filter changes
    useEffect(() => {
        setStructPage(0);
    }, [structFilters]);

    const { data: structData, isLoading: structLoading } = useFeeStructures(
        cleanFilters,
        isAdmin
    );
    const { data: overviewData, isLoading: overviewLoading } = useAllClassesOverview(overviewYear, overviewMonth, isAdmin);
    const { data: teachersData, isLoading: teachersLoading } = useUsers({ role: 'teacher', pageSize: 100, enabled: isAdmin });

    const { data: classData, isLoading: classLoading } = useClassOverview(
        selectedClass?.standard, selectedClass?.section, overviewYear, overviewMonth
    );
    const { data: yearlyData, isLoading: yearlyLoading } = useYearlySummary(summaryYear, isAdmin);
    const { data: studentData, isLoading: studentLoading } = useStudentFeeHistory(
        selectedStudent?.studentId, overviewYear
    );

    // Penalty Overview Queries
    const { data: penaltyOverviewData, isLoading: penaltyOverviewLoading } = useAllClassesPenaltyOverview(
        overviewYear, isAdmin && overviewMode === 'penalty'
    );
    const { data: classPenaltyData, isLoading: classPenaltyLoading } = useClassPenaltyOverview(
        selectedClass?.standard, selectedClass?.section,
        overviewYear
    );
    const { data: yearlyPenaltyData, isLoading: yearlyPenaltyLoading } = useYearlyPenaltySummary(summaryYear, isAdmin);

    // Salary Queries
    const { data: feeTypesResp } = useFeeTypes({ enabled: isAdmin });
    const { data: penaltyTypesResp } = usePenaltyTypes({ enabled: isAdmin });
    // Fetch salaries for BOTH calendar years that make up the academic year
    // (e.g. academic year 2025-2026 needs year=2025 AND year=2026)
    const { data: salaryDataYear1, isLoading: salariesLoadingY1 } = useSalaries({ year: overviewYear }, isAdmin);
    const { data: salaryDataYear2, isLoading: salariesLoadingY2 } = useSalaries({ year: overviewYear + 1 }, isAdmin);
    const salaryData = useMemo(() => {
        const y1 = salaryDataYear1?.data || [];
        const y2 = salaryDataYear2?.data || [];
        const all = [...y1, ...y2].filter(s => salaryBelongsToAcademicYear(s.year, s.month, overviewYear));
        return { data: all };
    }, [salaryDataYear1, salaryDataYear2, overviewYear]);
    const salariesLoading = salariesLoadingY1 || salariesLoadingY2;
    // Teacher salary: fetch both calendar years of the academic year
    const { data: mySalaryYear1, isLoading: mySalaryLoadingY1 } = useMySalary({ year: overviewYear }, isTeacher);
    const { data: mySalaryYear2, isLoading: mySalaryLoadingY2 } = useMySalary({ year: overviewYear + 1 }, isTeacher);
    const mySalaryData = useMemo(() => {
        if (!mySalaryYear1 && !mySalaryYear2) return undefined;
        const s1 = mySalaryYear1?.data?.salaries || [];
        const s2 = mySalaryYear2?.data?.salaries || [];
        const allSalaries = [...s1, ...s2].filter(s => salaryBelongsToAcademicYear(s.year, s.month, overviewYear));
        const summary = {
            totalRecords: allSalaries.length,
            totalAmount: allSalaries.reduce((s, r) => s + r.amount, 0),
            totalPaid: allSalaries.filter(r => r.status === 'PAID').reduce((s, r) => s + r.amount, 0),
            totalPending: allSalaries.filter(r => r.status === 'PENDING').reduce((s, r) => s + r.amount, 0),
            expectedMonthlySalary: mySalaryYear1?.data?.summary?.expectedMonthlySalary || mySalaryYear2?.data?.summary?.expectedMonthlySalary || 0,
        };
        return { data: { summary, salaries: allSalaries } };
    }, [mySalaryYear1, mySalaryYear2, overviewYear]);
    const mySalaryLoading = mySalaryLoadingY1 || mySalaryLoadingY2;

    // Student Queries
    const { data: myFeesData, isLoading: myFeesLoading } = useMyFees({ academicYear: summaryYear }, isStudent);
    const { data: myPenaltiesData, isLoading: myPenaltiesLoading } = useMyPenalties({ academicYear: summaryYear }, isStudent);
    const { data: penaltyStudentsResp, isLoading: penaltyStudentsLoading } = usePenaltyStudentsByClass(
        penaltyStudentFilters,
        isAdmin && !!penaltyStudentFilters.standard && !!penaltyStudentFilters.section
    );
    const { data: penaltyRecordsResp, isLoading: penaltyRecordsLoading } = useStudentPenalties(
        {
            academicYear: structFilters.academicYear,
            standard: String(structFilters.standard || '').trim(),
            section: String(structFilters.section || '').trim().toUpperCase(),
            studentId: structFilters.studentId,
        },
        isAdmin && !!structFilters.standard && !!structFilters.section && !!structFilters.studentId
    );

    // Mutations
    const createMut = useCreateFeeStructure();
    const updateMut = useUpdateFeeStructure();
    const deleteMut = useDeleteFeeStructure();
    const genMut = useGenerateAssignments();
    const payMut = useRecordPayment();
    const updateAsnMut = useUpdateAssignment();
    const createSalaryMut = useCreateSalary();
    const updateSalaryStatusMut = useUpdateSalaryStatus();
    const updateTeacherProfileMut = useUpdateTeacherProfile();
    const penaltyMut = useCreateStudentPenalty();
    const penaltyStatusMut = useUpdatePenaltyStatus();
    const deletePenaltyMut = useDeleteStudentPenalty();

    // showToast provided by useToastMessage hook

    const structures = useMemo(
        () => sortClassSections(structData?.data?.structures || []),
        [structData]
    );

    const paginationInfo = structData?.data?.pagination || { page: 0, pageSize: 25, totalCount: 0, totalPages: 0 };

    const overviewClasses = useMemo(() => {
        if (!isAdmin) return [];
        return sortClassSections(overviewData?.data?.classes || []);
    }, [isAdmin, overviewData]);

    useEffect(() => {
        if (!selectedClass) return;

        const isStillAvailable = classSections.some((item) => makeClassKey(item) === makeClassKey(selectedClass));
        if (!isStillAvailable) {
            setSelectedClass(null);
        }
    }, [classSections, selectedClass]);

    const isLoadingOverview = overviewMode === 'penalty' ? penaltyOverviewLoading : overviewLoading;
    const classStudents = classData?.data?.students || [];
    const classSummary = classData?.data?.summary || {};
    const yearlyBreakdown = yearlyData?.data?.monthlyBreakdown || [];
    const typeBreakdown = yearlyData?.data?.typeBreakdown || [];
    const yearTotal = yearlyData?.data?.yearTotal || {};
    const studentFees = studentData?.data?.fees || [];
    const studentSummary = studentData?.data?.summary || {};

    // Penalty overview derived data
    const penaltyOverviewClasses = useMemo(() => {
        if (!isAdmin) return [];
        return penaltyOverviewData?.data?.classes || [];
    }, [isAdmin, penaltyOverviewData]);
    const classPenaltyStudents = classPenaltyData?.data?.students || [];
    const classPenaltySummary = classPenaltyData?.data?.summary || {};
    const yearlyPenaltyBreakdown = yearlyPenaltyData?.data?.monthlyBreakdown || [];
    const yearlyPenaltyTotal = yearlyPenaltyData?.data?.yearTotal || {};

    const feeTypesList = useMemo(() => {
        const backendTypes = feeTypesResp?.data || [];
        const defaults = FEE_TYPES.map(name => ({
            name,
            label: FEE_TYPE_LABELS[name],
            isDefault: true
        }));
        const combined = [...defaults];
        backendTypes.forEach(bt => {
            if (!combined.find(c => c.name === bt.name)) {
                combined.push(bt);
            }
        });
        return combined;
    }, [feeTypesResp]);

    const penaltyTypeLabels = useMemo(() => {
        const labels = { ...PENALTY_TYPE_LABELS };
        const backendTypes = penaltyTypesResp?.data || [];
        backendTypes.forEach((type) => {
            if (type?.name && type?.label) {
                labels[type.name] = type.label;
            }
        });
        return labels;
    }, [penaltyTypesResp]);

    const penaltyStudentOptions = useMemo(() => {
        const students = penaltyStudentsResp?.data;
        if (!Array.isArray(students)) return [];
        return [...students].sort((a, b) =>
            String(a.name || '').localeCompare(String(b.name || ''), undefined, {
                sensitivity: 'base',
            })
        );
    }, [penaltyStudentsResp]);
    const selectedPenaltyStudentId = useMemo(() => {
        if (!structFilters.studentId) return '';
        const isValidStudent = penaltyStudentOptions.some(
            (student) => String(student._id) === String(structFilters.studentId)
        );
        return isValidStudent ? structFilters.studentId : '';
    }, [penaltyStudentOptions, structFilters.studentId]);
    const penaltyRecords = useMemo(() => (
        Array.isArray(penaltyRecordsResp?.data) ? penaltyRecordsResp.data : []
    ), [penaltyRecordsResp]);

    const { filteredClassStudents, filteredClassSummary } = useMemo(() => {
        if (!overviewType && overviewStatus === 'all') return { 
            filteredClassStudents: classStudents, 
            filteredClassSummary: classSummary 
        };

        const students = classStudents.map(student => {
            const filteredFees = student.fees.filter(f => {
                const matchesType = !overviewType || f.feeType === overviewType || f.name === overviewType;
                
                let matchesStatus = true;
                if (overviewStatus === 'paid') {
                    matchesStatus = f.status === 'PAID';
                } else if (overviewStatus === 'pending') {
                    matchesStatus = f.status === 'PENDING' || f.status === 'PARTIAL' || f.status === 'OVERDUE';
                }
                
                return matchesType && matchesStatus;
            });
            
            if (filteredFees.length === 0) return null;
            return { ...student, fees: filteredFees };
        }).filter(Boolean);

        const allFilteredFees = students.flatMap(s => s.fees);
        const summary = {
            totalStudents: students.length,
            totalCollected: allFilteredFees.reduce((sum, f) => sum + (f.paid || 0), 0),
            totalPending: allFilteredFees.reduce((sum, f) => sum + ((f.amount || 0) - (f.paid || 0)), 0),
        };

        return { filteredClassStudents: students, filteredClassSummary: summary };
    }, [classStudents, classSummary, overviewType, overviewStatus]);

    // Handlers
    const handleCreateStructure = async (data) => {
        try {
            const result = await createMut.mutateAsync(data);
            const responseData = result?.data || result;
            
            // Check if it's a multi-class creation (has summary and structures array)
            const isMulti = responseData.summary && Array.isArray(responseData.structures);
            const structuresToProcess = isMulti ? responseData.structures : [responseData];
            
            let totalAssignedMonths = 0;
            let totalCreated = isMulti ? responseData.summary.created : (responseData._id ? 1 : 0);

            for (const created of structuresToProcess) {
                const createdId = created?._id;
                if (createdId) {
                    const months = created.applicableMonths || data.applicableMonths || [];
                    const year = Number(created.academicYear || data.academicYear || currentYear);
                    for (const month of months) {
                        try {
                            await genMut.mutateAsync({ structureId: createdId, month, year });
                            totalAssignedMonths++;
                        } catch (err) { /* skip months that fail */ }
                    }
                }
            }

            queryClient.invalidateQueries({ queryKey: feeKeys.all });

            if (isMulti) {
                const { created: sc, skipped: ss, total: st } = responseData.summary;
                let msg = `Created structures for ${sc}/${st} classes`;
                if (ss > 0) msg += ` (${ss} already existed)`;
                if (totalAssignedMonths > 0) msg += ` & assigned for total ${totalAssignedMonths} month(s)`;
                showToast('success', msg);
            } else {
                showToast('success', totalAssignedMonths > 0 
                    ? `Fee structure created & assigned for ${totalAssignedMonths} month(s)` 
                    : 'Fee structure created');
            }
            
            setMgmtView('student_list');
            setStructModal({ open: false, editData: null });
        } catch (err) { 
            const errorDetails = err?.response?.data?.error?.details;
            const detailMsg = Array.isArray(errorDetails) ? errorDetails.map(d => d.message).join(', ') : '';
            showToast('error', detailMsg || err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to create'); 
        }
    };

    const handleUpdateStructure = async ({ id, data }) => {
        try {
            const result = await updateMut.mutateAsync({ id, data });
            const updated = result?.data || result;
            const months = updated?.applicableMonths || data.applicableMonths || [];
            const year = Number(updated?.academicYear || data.academicYear || currentYear);
            let assignedCount = 0;
            for (const month of months) {
                try {
                    await genMut.mutateAsync({ structureId: id, month, year });
                    assignedCount++;
                } catch (err) { /* skip months that fail */ }
            }
            queryClient.invalidateQueries({ queryKey: feeKeys.all });
            showToast('success', assignedCount > 0
                ? `Fee structure updated & assigned for ${assignedCount} month(s)`
                : 'Fee structure updated');
            setStructModal({ open: false, editData: null });
        } catch (err) { showToast('error', err?.response?.data?.message || 'Failed to update'); }
    };

    const handleDeleteStructure = async (id) => {
        try {
            await deleteMut.mutateAsync(id);
            queryClient.invalidateQueries({ queryKey: feeKeys.all });
            showToast('success', 'Fee structure deleted');
            setDeleteConfirm(null);
        } catch (err) {
            setDeleteConfirm(null);
            showToast('error', err?.response?.data?.message || 'Failed to delete');
        }
    };

    const handleGenerate = async (data) => {
        try {
            const result = await genMut.mutateAsync(data);
            queryClient.invalidateQueries({ queryKey: feeKeys.all });
            showToast('success', result.message || 'Assignments generated');
            setGenModal({ open: false, structure: null });
        } catch (err) { showToast('error', err?.response?.data?.message || 'Failed to generate'); }
    };

    const handlePayment = async (data) => {
        try {
            await payMut.mutateAsync(data);
            showToast('success', 'Payment recorded successfully');
            setPaymentModal({ open: false, assignment: null });
        } catch (err) { showToast('error', err?.response?.data?.message || 'Failed to record payment'); }
    };

    const handleWaive = async (assignmentId) => {
        try {
            await updateAsnMut.mutateAsync({ id: assignmentId, data: { status: 'WAIVED' } });
            showToast('success', 'Fee waived');
        } catch (err) { showToast('error', err?.response?.data?.message || 'Failed to waive'); }
    };

    const handlePenaltyStatusUpdate = async (penaltyId, status) => {
        try {
            await penaltyStatusMut.mutateAsync({ penaltyId, status });
            showToast('success', `Penalty marked as ${status}`);
        } catch (err) { showToast('error', err?.response?.data?.message || 'Failed to update penalty status'); }
    };

    const handleDeletePenalty = async (id) => {
        try {
            await deletePenaltyMut.mutateAsync(id);
            showToast('success', 'Penalty deleted successfully');
            setPenaltyDeleteConfirm(null);
        } catch (err) { 
            showToast('error', err?.response?.data?.message || 'Failed to delete'); 
            setPenaltyDeleteConfirm(null);
        }
    };

    const renderTabBtn = (tab, icon, label) => (
        <button key={tab} onClick={() => {
            setActiveTab(tab);
            setSelectedClass(null);
            setSelectedStudent(null);
            if (tab === 'management') setMgmtView('selection');
        }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {icon}{label}
        </button>
    );

    const renderSubTabBtn = (active, current, label, onClick) => (
        <button onClick={onClick}
            className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${active === current ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {label}
        </button>
    );

    const myFees = myFeesData?.data?.fees || [];
    const mySummary = myFeesData?.data?.summary || {};
    const myPenalties = myPenaltiesData?.data?.penalties || [];
    const myPenaltySummary = myPenaltiesData?.data?.summary || {};



    const handleUpdateBaseSalary = async (e) => {
        e.preventDefault();
        const amount = Number(baseSalaryModal.amount);
        if (amount < 0) {
            showToast('error', 'Salary cannot be negative');
            return;
        }
        try {
            await updateTeacherProfileMut.mutateAsync({ 
                id: baseSalaryModal.staff._id, 
                data: { expectedSalary: amount } 
            });
            showToast('success', 'Base salary updated successfully');
            setBaseSalaryModal({ open: false, staff: null, amount: '' });
        } catch (err) { 
            showToast('error', err?.response?.data?.message || 'Failed to update base salary'); 
        }
    };

    const handleProcessPayout = async (e) => {
        e.preventDefault();
        try {
            await updateSalaryStatusMut.mutateAsync({ 
                id: payoutConfirmModal.salary._id, 
                data: { status: 'PAID', remarks: payoutConfirmModal.remarks } 
            });
            showToast('success', `Payout processed for ${MONTH_LABELS[payoutConfirmModal.salary.month]} ${payoutConfirmModal.salary.year}`);
            setPayoutConfirmModal({ open: false, salary: null, remarks: '' });
        } catch (err) { 
            showToast('error', err?.response?.data?.message || 'Failed to update status'); 
        }
    };

    const handleSaveSalaryAmount = async (salaryId) => {
        const amount = Number(editingAmount);
        if (isNaN(amount) || amount < 0) {
            showToast('error', 'Please enter a valid salary amount');
            return;
        }
        try {
            await updateSalaryStatusMut.mutateAsync({ 
                id: salaryId, 
                data: { amount } 
            });
            showToast('success', 'Salary amount updated successfully');
            setEditingSalaryId(null);
            setEditingAmount('');
        } catch (err) {
            showToast('error', err?.response?.data?.message || 'Failed to update amount');
        }
    };

    // renderStudentOverview → AdminStudentOverviewTab.jsx (StudentOverviewPanel)
    // renderStudentYearlySummary → AdminStudentOverviewTab.jsx (StudentYearlySummaryPanel)
    // renderStaffOverview → AdminStaffOverviewTab.jsx (StaffOverviewPanel)
    // renderStaffYearlySummary → AdminStaffOverviewTab.jsx (StaffYearlySummaryPanel)


    return (
        <DashboardLayout>
            {toast?.text && (
                <div className={`fixed top-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${toast?.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
                        {toast?.type === 'success' ? <FaCheck size={12} /> : <FaTimes size={12} />}
                    </div>
                    <span className="font-medium">{toast?.text}</span>
                </div>
            )}

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-primary transform hover:rotate-6 transition-transform">
                        <FaMoneyCheckAlt size={32} />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-gray-900">Fee Management</h1>
                        <p className="text-gray-500 mt-1">Configure structures, track collections, and manage staff payouts</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    {isAdmin && renderTabBtn('management', <FaListAlt size={12} />, 'Fee Structure')}
                    {(!isAdmin && !isTeacher) && renderTabBtn('structures', <FaListAlt size={12} />, 'Assigned Fees')}
                    {isTeacher && renderTabBtn('salary', <FaWallet size={12} />, 'My Salary')}
                </div>

                {/* ── TAB: Management (Unified) ────────────────────────── */}
                {isAdmin && activeTab === 'management' && (
                    <div className="space-y-6">
                        {mgmtView === 'selection' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                                <button onClick={() => setMgmtView('student_list')}
                                    className="group relative bg-white p-8 rounded-3xl border-2 border-transparent hover:border-primary/20 shadow-xl shadow-gray-200/50 transition-all hover:-translate-y-1 text-left overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 bg-primary/5 rounded-bl-3xl group-hover:bg-primary group-hover:text-white transition-all text-primary/40">
                                        <FaListAlt size={24} />
                                    </div>
                                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                        <FaReceipt size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Student Fees</h3>
                                    <p className="text-gray-500 leading-relaxed">Configure fee structures, generate assignments, and track class-wise collections.</p>
                                    <div className="mt-6 flex items-center gap-2 text-primary font-bold text-sm">
                                        Manage Structures <FaArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </button>

                                <button onClick={() => setMgmtView('staff')}
                                    className="group relative bg-white p-8 rounded-3xl border-2 border-transparent hover:border-primary/20 shadow-xl shadow-gray-200/50 transition-all hover:-translate-y-1 text-left overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 bg-violet-50 rounded-bl-3xl group-hover:bg-violet-500 group-hover:text-white transition-all text-violet-400">
                                        <FaWallet size={24} />
                                    </div>
                                    <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-500 mb-6 group-hover:scale-110 transition-transform">
                                        <FaMoneyBillWave size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Staff Salaries</h3>
                                    <p className="text-gray-500 leading-relaxed">Manage teacher salary structures, process monthly payouts, and view history.</p>
                                    <div className="mt-6 flex items-center gap-2 text-violet-600 font-bold text-sm">
                                        Payroll Overview <FaArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </button>
                            </div>
                        )}

                        {mgmtView === 'student_list' && (
                            <div className="space-y-4 animate-fadeIn">
                                <button onClick={() => setMgmtView('selection')} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-primary transition-all uppercase tracking-widest">
                                    <FaArrowLeft size={10} /> Back to Management
                                </button>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 font-display">Student Fee Management</h2>
                                        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mt-3">
                                            {[
                                                { id: 'structures', label: 'Structures', icon: <FaListAlt size={10} /> },
                                                { id: 'overview', label: 'Overview', icon: <FaChartBar size={10} /> },
                                                { id: 'yearly', label: 'Yearly Summary', icon: <FaCalendarAlt size={10} /> }
                                            ].map(tab => (
                                                <button key={tab.id} onClick={() => setStudentSubTab(tab.id)}
                                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                                        studentSubTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                                    }`}>
                                                    {tab.icon} {tab.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {studentSubTab === 'structures' && (
                                        <button onClick={() => { setStructModal({ open: false, editData: null }); setMgmtView('student_form'); }}
                                            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-primary/20">
                                            <FaPlus size={12} /> Add Fee Structure
                                        </button>
                                    )}
                                </div>

                                {studentSubTab === 'structures' && (
                                    <>
                                    {/* Filters */}
                                    <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 mb-6">
                                        <div className="flex items-center gap-2 px-2">
                                            <FaFilter className="text-gray-400" size={11} />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Filters</span>
                                        </div>
                                        <select value={structFilters.academicYear}
                                            onChange={(e) => setStructFilters(p => ({ ...p, academicYear: e.target.value }))}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-32 focus:ring-primary focus:border-primary">
                                            {getAcademicYearOptions().map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                        <select value={structFilters.standard} onChange={(e) => {
                                            const nextStandard = e.target.value;
                                            const validSections = (nextStandard ? getSectionsForStandard(nextStandard) : allUniqueSections)
                                                .map((value) => String(value || '').trim().toUpperCase());
                                            setStructFilters((prev) => {
                                                const currentSection = String(prev.section || '').trim().toUpperCase();
                                                const shouldResetSection = currentSection && validSections.length > 0 && !validSections.includes(currentSection);
                                                return {
                                                    ...prev,
                                                    standard: nextStandard,
                                                    section: shouldResetSection ? '' : prev.section,
                                                    studentId: '',
                                                };
                                            });
                                        }}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-32 focus:ring-primary focus:border-primary">
                                            <option value="">Standard</option>
                                            {standardFilterOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <select value={structFilters.section} onChange={(e) => setStructFilters(p => ({ ...p, section: e.target.value, studentId: '' }))}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-32 focus:ring-primary focus:border-primary">
                                            <option value="">Section</option>
                                            {sectionFilterOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <select
                                            value={selectedPenaltyStudentId}
                                            onChange={(e) => setStructFilters((prev) => ({ ...prev, studentId: e.target.value }))}
                                            disabled={!structFilters.standard || !structFilters.section || penaltyStudentsLoading || penaltyStudentOptions.length === 0}
                                            className="px-3 py-1.5 pr-10 text-sm border border-gray-200 rounded-lg w-48 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                        >
                                            <option value="">
                                                {!structFilters.standard || !structFilters.section
                                                    ? 'Student'
                                                    : penaltyStudentsLoading
                                                        ? 'Loading Students...'
                                                        : penaltyStudentOptions.length === 0
                                                            ? 'No Students'
                                                            : 'Student'}
                                            </option>
                                            {penaltyStudentOptions.map((student) => (
                                                <option key={student._id} value={student._id}>
                                                    {student.name}
                                                </option>
                                            ))}
                                        </select>
                                        <select value={structFilters.feeType} onChange={(e) => setStructFilters(p => ({ ...p, feeType: e.target.value }))}
                                            disabled={!!selectedPenaltyStudentId}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">
                                            <option value="">All Types</option>
                                            {feeTypesList.map(t => <option key={t.name} value={t.name}>{t.label}</option>)}
                                        </select>
                                    </div>

                                    {/* Table */}
                                    <div className="overflow-x-auto">
                                        {selectedPenaltyStudentId ? (
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-100 uppercase">
                                                        {['Student', 'Class', 'Penalty Type', 'Reason', 'Amount', 'Occurrence Date', 'Status', 'Actions'].map(h => (
                                                            <th
                                                                key={h}
                                                                className={`px-4 py-4 text-[10px] font-black text-gray-400 tracking-widest ${
                                                                    h === 'Status' || h === 'Actions' ? 'text-center' : 'text-left'
                                                                }`}
                                                            >
                                                                {h}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {penaltyRecordsLoading ? (
                                                        <SkeletonRows rows={4} columns={8} />
                                                    ) : penaltyRecords.length === 0 ? (
                                                        <tr><td colSpan={8}><EmptyState icon={FaListAlt} title="No student penalties found" subtitle="This student has no penalty records for the selected class and year." /></td></tr>
                                                    ) : (
                                                        penaltyRecords.map((penalty) => (
                                                            <tr key={penalty._id} className="hover:bg-gray-50/25 transition-colors">
                                                                <td className="px-4 py-4">
                                                                    <div className="font-bold text-gray-900">{penalty.studentName}</div>
                                                                    <div className="text-xs text-gray-500">{penalty.studentEmail || '-'}</div>
                                                                </td>
                                                                <td className="px-4 py-4 text-gray-600 font-medium">Std {penalty.standard}-{penalty.section}</td>
                                                                <td className="px-4 py-4">
                                                                    <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-lg text-[10px] font-bold uppercase">
                                                                        {penaltyTypeLabels[penalty.penaltyType] || String(penalty.penaltyType || '').replaceAll('_', ' ')}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-4 font-medium text-gray-700">{penalty.reason}</td>
                                                                <td className="px-4 py-4 font-black text-gray-900">₹{Number(penalty.amount || 0).toLocaleString()}</td>
                                                                <td className="px-4 py-4 text-gray-600 font-medium">{penalty.occurrenceDate ? new Date(penalty.occurrenceDate).toLocaleDateString() : '-'}</td>
                                                                <td className="px-4 py-4 text-center">
                                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                        penalty.status === 'PAID'
                                                                            ? 'bg-emerald-50 text-emerald-700'
                                                                            : penalty.status === 'WAIVED'
                                                                                ? 'bg-gray-100 text-gray-500'
                                                                                : 'bg-amber-50 text-amber-700'
                                                                    }`}>
                                                                        {penalty.status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-4 text-center">
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <button onClick={() => setPenaltyDeleteConfirm(penalty.penaltyId || penalty._id)}
                                                                            title="Delete Penalty" className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                                                                            <FaTrash size={12} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        ) : (
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-100 uppercase">
                                                    {['Fee Type', 'Name', 'Class', 'Amount', 'Frequency', 'Due Date'].map(h => (
                                                        <th key={h} className="px-4 py-4 text-left text-[10px] font-black text-gray-400 tracking-widest">{h}</th>
                                                    ))}
                                                    <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 tracking-widest">Status</th>
                                                    <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 tracking-widest">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {structLoading ? (
                                                    <SkeletonRows rows={5} columns={8} />
                                                ) : structures.length === 0 ? (
                                                    <tr><td colSpan={8}><EmptyState icon={FaListAlt} title="No fee structures found" subtitle="Create a fee structure to get started" /></td></tr>
                                                ) : (
                                                    structures.map(st => (
                                                        <tr key={st._id} className="hover:bg-gray-50/25 transition-colors group">
                                                            <td className="px-4 py-4">
                                                                <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-lg text-[10px] font-bold uppercase">
                                                                    {feeTypesList.find(t => t.name === st.feeType)?.label || st.feeType}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 font-bold text-gray-900">{st.name}</td>
                                                            <td className="px-4 py-4 text-gray-600 font-medium">Std {st.standard}-{st.section}</td>
                                                            <td className="px-4 py-4 font-black text-gray-900">₹{st.amount?.toLocaleString()}</td>
                                                            <td className="px-4 py-4 text-gray-600 font-medium">{FREQUENCY_LABELS[st.frequency] || st.frequency}</td>
                                                            <td className="px-4 py-4 text-gray-600 font-medium">{st.dueDay}</td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                    {st.isActive ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <div className="flex items-center justify-center gap-1 transition-opacity">
                                                                    <button onClick={() => { setStructModal({ open: false, editData: st }); setMgmtView('student_form'); }} title="Edit Structure"
                                                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><FaEdit size={14} /></button>
                                                                    <button onClick={() => setDeleteConfirm(st._id)} title="Delete Structure"
                                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><FaTrashAlt size={14} /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                        )}
                                    </div>
                                    {!selectedPenaltyStudentId && paginationInfo.totalCount > structPageSize && (
                                        <div className="border-t border-gray-100 bg-white rounded-b-3xl">
                                            <PaginationControls
                                                currentPage={structPage}
                                                totalItems={paginationInfo.totalCount}
                                                pageSize={structPageSize}
                                                onPageChange={setStructPage}
                                                onPageSizeChange={(newSize) => {
                                                    setStructPageSize(newSize);
                                                    setStructPage(0);
                                                }}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                            {studentSubTab === 'overview' && (
                                <StudentOverviewPanel
                                    selectedStudent={selectedStudent}
                                    setSelectedStudent={setSelectedStudent}
                                    studentSummary={studentSummary}
                                    studentFees={studentFees}
                                    studentLoading={studentLoading}
                                    overviewYear={overviewYear}
                                    isAdmin={isAdmin}
                                    setPaymentModal={setPaymentModal}
                                    selectedClass={selectedClass}
                                    setSelectedClass={setSelectedClass}
                                    classLoading={classLoading}
                                    filteredClassStudents={filteredClassStudents}
                                    filteredClassSummary={filteredClassSummary}
                                    feeTypesList={feeTypesList}
                                    overviewType={overviewType}
                                    setOverviewType={setOverviewType}
                                    overviewStatus={overviewStatus}
                                    setOverviewStatus={setOverviewStatus}
                                    overviewPage={overviewPage}
                                    setOverviewPage={setOverviewPage}
                                    OVERVIEW_PER_PAGE={OVERVIEW_PER_PAGE}
                                    overviewMonth={overviewMonth}
                                    exportMenuOpen={exportMenuOpen}
                                    setExportMenuOpen={setExportMenuOpen}
                                    handleWaive={handleWaive}
                                    isLoadingOverview={isLoadingOverview}
                                    overviewClasses={overviewClasses}
                                    setOverviewYear={setOverviewYear}
                                    setOverviewMonth={setOverviewMonth}
                                    overviewMode={overviewMode}
                                    setOverviewMode={setOverviewMode}
                                    penaltyOverviewClasses={penaltyOverviewClasses}
                                    classPenaltyStudents={classPenaltyStudents}
                                    classPenaltySummary={classPenaltySummary}
                                    classPenaltyLoading={classPenaltyLoading}
                                    handlePenaltyStatusUpdate={handlePenaltyStatusUpdate}
                                    penaltyTypeLabels={penaltyTypeLabels}
                                    overviewData={overviewData}
                                />
                            )}
                            {studentSubTab === 'yearly' && (
                                <StudentYearlySummaryPanel
                                    yearlyLoading={yearlyLoading}
                                    yearlyBreakdown={yearlyBreakdown}
                                    typeBreakdown={typeBreakdown}
                                    yearTotal={yearTotal}
                                    summaryYear={summaryYear}
                                    setSummaryYear={setSummaryYear}
                                    yearlyPenaltyLoading={yearlyPenaltyLoading}
                                    yearlyPenaltyBreakdown={yearlyPenaltyBreakdown}
                                    yearlyPenaltyTotal={yearlyPenaltyTotal}
                                />
                            )}
                        </div>
                    )}

                        {mgmtView === 'student_form' && (
                            <FeeStructureForm
                                key={structModal.editData?._id || 'new'}
                                editData={structModal.editData}
                                onCancel={() => { setMgmtView('student_list'); setStructModal({ open: false, editData: null }); }}
                                onSubmit={async (data) => {
                                    if (structModal.editData) {
                                        await handleUpdateStructure({ id: structModal.editData._id, data });
                                    } else {
                                        await handleCreateStructure(data);
                                    }
                                    setMgmtView('student_list');
                                }}
                                onSubmitPenalty={async (data) => {
                                    try {
                                        await penaltyMut.mutateAsync(data);
                                        showToast('success', 'Student penalty assigned successfully');
                                        setMgmtView('student_list');
                                    } catch (err) {
                                        showToast('error', err?.response?.data?.message || err?.response?.data?.error?.message || 'Failed to assign penalty');
                                    }
                                }}
                                isLoading={createMut.isPending || updateMut.isPending}
                                isPenaltyLoading={penaltyMut.isPending}
                                isAdmin={isAdmin}
                            />
                        )}

                {mgmtView === 'staff' && (
                    <div className="space-y-4 animate-fadeIn">
                        {!selectedStaff && (
                            <button onClick={() => setMgmtView('selection')} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-violet-600 transition-all uppercase tracking-widest">
                                <FaArrowLeft size={10} /> Back to Management
                            </button>
                        )}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 font-display">Staff Payroll Management</h2>
                                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mt-3">
                                    {[
                                        { id: 'dashboard', label: 'Dashboard', icon: <FaListAlt size={10} /> },
                                        { id: 'overview', label: 'Overview', icon: <FaChartBar size={10} /> },
                                        { id: 'yearly', label: 'Yearly Summary', icon: <FaCalendarAlt size={10} /> }
                                    ].map(tab => (
                                        <button key={tab.id} onClick={() => setStaffSubTab(tab.id)}
                                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                                staffSubTab === tab.id ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}>
                                            {tab.icon} {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {staffSubTab === 'dashboard' && (
                            <>
                                {selectedStaff ? (() => {
                                    // Compute staff salaries for duplicate check
                                    const staffSalariesForLedger = (salaryData?.data || []).filter(s => String(s.teacherId?._id || s.teacherId) === String(selectedStaff._id));
                                    const payFormCalendarYear = getCalendarYearForMonth(payForm.year, Number(payForm.month));
                                    const payFormDuplicate = staffSalariesForLedger.find(s => Number(s.month) === Number(payForm.month) && Number(s.year) === payFormCalendarYear);
                                    const payFormIsPaid = payFormDuplicate?.status === 'PAID';
                                    const payFormIsDuplicate = !!payFormDuplicate;

                                    const handlePayFormSubmit = async (e) => {
                                        e.preventDefault();
                                        const errs = {};
                                        if (!payForm.amount || Number(payForm.amount) < 0) errs.amount = 'Valid amount required';
                                        if (!payForm.month) errs.month = 'Required';
                                        if (!payForm.year || payForm.year < 2000) errs.year = 'Valid year required';
                                        setPayFormErrors(errs);
                                        if (Object.keys(errs).length > 0) return;

                                        try {
                                            await createSalaryMut.mutateAsync({
                                                teacherId: selectedStaff._id,
                                                amount: Number(payForm.amount),
                                                month: Number(payForm.month),
                                                year: payFormCalendarYear,
                                            });
                                            
                                            showToast('success', `Salary record created for ${MONTH_LABELS[payForm.month]} ${payForm.year}`);
                                            setShowPayForm(false);
                                            setPayForm({ month: currentMonth, year: getCurrentAcademicYear(), amount: selectedStaff.profile?.expectedSalary || '' });
                                            setPayFormErrors({});
                                        } catch (err) {
                                            showToast('error', err?.response?.data?.message || 'Failed to create salary entry');
                                        }
                                    };

                                    return (
                                    <div className="space-y-4">
                                        <button onClick={() => { setSelectedStaff(null); setShowPayForm(false); }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors px-1 font-bold">
                                            <FaArrowLeft size={12} /> Back to Staff List
                                        </button>
                                        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                                            <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                                                <div className="flex gap-6">
                                                    <div className="w-20 h-20 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-500 shadow-inner">
                                                        <FaUser size={40} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-3xl font-black text-gray-900">{selectedStaff.name}</h2>
                                                        <p className="text-gray-500 font-medium">{selectedStaff.email}</p>
                                                        <div className="flex gap-2 mt-3">
                                                            <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-lg text-[10px] font-black uppercase tracking-wider">Teacher Account</span>
                                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider">Active Status</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {!showPayForm && (
                                                    <button
                                                        onClick={() => {
                                                            setShowPayForm(true);
                                                            setPayForm({ month: currentMonth, year: getCurrentAcademicYear(), amount: selectedStaff.profile?.expectedSalary || '' });
                                                        }}
                                                        className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-primary/20 text-sm"
                                                    >
                                                        <FaPlus size={12} /> Pay Salary
                                                    </button>
                                                )}
                                            </div>

                                            {/* Inline Pay Salary Form */}
                                            {showPayForm && (
                                                <div className="mb-4 p-4 bg-violet-50/50 border border-violet-100 rounded-2xl animate-fadeIn w-fit">
                                                    <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                                                        <FaMoneyBillWave size={14} className="text-violet-500" />
                                                        Pay Salary — {selectedStaff.name}
                                                    </h3>
                                                    <form onSubmit={handlePayFormSubmit} className="space-y-4">
                                                        <div className="flex flex-col md:flex-row items-start gap-5">
                                                            {/* Calendar-style Month-Year Picker */}
                                                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{ minWidth: 260, maxWidth: 280 }}>
                                                                {/* Year Header with Nav */}
                                                                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                                                                    <button type="button" onClick={() => { setPayForm(p => ({ ...p, year: Number(p.year) - 1 })); setPayFormErrors(p => ({ ...p, year: '' })); }}
                                                                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-all text-gray-500 hover:text-gray-800"><FaChevronLeft size={12} /></button>
                                                                                                                                         <span className="text-sm font-black text-gray-900 tracking-wide">{payForm.year} - {Number(payForm.year) + 1}</span>
                                                                    <button type="button" onClick={() => { setPayForm(p => ({ ...p, year: Number(p.year) + 1 })); setPayFormErrors(p => ({ ...p, year: '' })); }}
                                                                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-all text-gray-500 hover:text-gray-800"><FaChevronRight size={12} /></button>
                                                                </div>
                                                                {/* Months Grid */}
                                                                <div className="grid grid-cols-4 gap-1 p-3">
                                                                    {MONTH_LABELS.slice(1).map((label, idx) => {
                                                                        const monthNum = idx + 1;
                                                                        const isSelected = Number(payForm.month) === monthNum;
                                                                        const calYearForMonth = getCalendarYearForMonth(payForm.year, monthNum);
                                                                        const existsForMonth = staffSalariesForLedger.find(s => Number(s.month) === monthNum && Number(s.year) === calYearForMonth);
                                                                        const isPaidMonth = existsForMonth?.status === 'PAID';
                                                                        return (
                                                                            <button
                                                                                key={monthNum}
                                                                                type="button"
                                                                                onClick={() => { setPayForm(p => ({ ...p, month: monthNum })); setPayFormErrors(p => ({ ...p, month: '' })); }}
                                                                                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all relative ${
                                                                                    isSelected
                                                                                        ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                                                                                        : isPaidMonth
                                                                                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                                                            : existsForMonth
                                                                                                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                                                                                : 'text-gray-700 hover:bg-gray-100'
                                                                                }`}
                                                                            >
                                                                                {label.slice(0, 3)}
                                                                                {isPaidMonth && !isSelected && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full"></span>}
                                                                                {existsForMonth && !isPaidMonth && !isSelected && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full"></span>}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {/* Today shortcut */}
                                                                <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50/30">
                                                                    <div className="flex gap-3">
                                                                        <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold"><span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>Paid</span>
                                                                        <span className="flex items-center gap-1 text-[9px] text-amber-600 font-bold"><span className="w-2 h-2 bg-amber-500 rounded-full inline-block"></span>Pending</span>
                                                                    </div>
                                                                    <button type="button" onClick={() => { setPayForm(p => ({ ...p, month: currentMonth, year: getCurrentAcademicYear() })); }}
                                                                        className="text-[10px] font-black text-primary hover:text-primary-hover uppercase tracking-widest transition-colors">Today</button>
                                                                </div>
                                                                {(payFormErrors.month || payFormErrors.year) && <p className="text-[10px] text-red-500 px-4 pb-2 font-bold">{payFormErrors.month || payFormErrors.year}</p>}
                                                            </div>

                                                            {/* Amount Input */}
                                                            <div style={{ width: 200 }} className="flex flex-col justify-start">
                                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Salary Amount (₹) *</label>
                                                                <input
                                                                    type="number"
                                                                    value={payForm.amount}
                                                                    onChange={(e) => { setPayForm(p => ({ ...p, amount: e.target.value })); setPayFormErrors(p => ({ ...p, amount: '' })); }}
                                                                    className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm bg-white text-gray-900 ${payFormErrors.amount ? 'border-red-300 ring-2 ring-red-50' : 'border-gray-200 hover:border-primary/40'}`}
                                                                    placeholder="0"
                                                                    min={0}
                                                                />
                                                                {payFormErrors.amount && <p className="text-[10px] text-red-500 mt-1.5 ml-1 font-bold">{payFormErrors.amount}</p>}
                                                                <p className="text-[10px] text-gray-400 mt-2 ml-1 font-medium">Selected: <span className="font-black text-gray-700">{MONTH_LABELS[payForm.month]} {payForm.year} - {Number(payForm.year) + 1}</span></p>
                                                            </div>
                                                        </div>

                                                        {/* Duplicate / Paid Warning */}
                                                        {payFormIsDuplicate && (
                                                            <div className={`p-3 rounded-xl border flex items-start gap-3 animate-fadeIn max-w-lg ${
                                                                payFormIsPaid ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'
                                                            }`}>
                                                                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                                                                    payFormIsPaid ? 'bg-emerald-200/50 text-emerald-600' : 'bg-amber-200/50 text-amber-600'
                                                                }`}>
                                                                    {payFormIsPaid ? <FaCheck size={10} /> : <FaSearch size={10} />}
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-[10px] uppercase tracking-[0.15em] mb-0.5">
                                                                        {payFormIsPaid ? 'Payout Already Processed' : 'Existing record found'}
                                                                    </p>
                                                                    <p className="text-[10px] font-medium leading-relaxed opacity-90">
                                                                        {payFormIsPaid
                                                                            ? `Salary for ${MONTH_LABELS[payFormDuplicate.month]} ${payFormDuplicate.year} is already PAID.`
                                                                            : `A PENDING record exists for ${MONTH_LABELS[payFormDuplicate.month]} ${payFormDuplicate.year}.`
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Buttons — centered below calendar */}
                                                        <div className="flex justify-center gap-3 pt-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPayForm(false)}
                                                                className="px-6 py-2.5 bg-gray-100 text-gray-600 border-2 border-gray-200 text-[11px] font-black rounded-xl hover:bg-gray-200 transition-all uppercase tracking-widest shadow-sm"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="submit"
                                                                disabled={createSalaryMut.isPending || payFormIsDuplicate}
                                                                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-[11px] font-black rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-70 uppercase tracking-widest"
                                                            >
                                                                {createSalaryMut.isPending ? (
                                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <>
                                                                        <FaMoneyBillWave size={12} />
                                                                        {payFormIsDuplicate ? (payFormIsPaid ? 'Already Paid' : 'Exists') : 'Create Salary'}
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            )}

                                            <div className="border border-gray-100 rounded-2xl overflow-hidden mt-8 shadow-sm">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-gray-50/80 border-b border-gray-100">
                                                        <tr>
                                                            {['Month', 'Amount'].map(h => (
                                                                <th key={h} className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                                            ))}
                                                            {['Status', 'Date Paid', 'Actions'].map(h => (
                                                                <th key={h} className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {salariesLoading ? (
                                                            <SkeletonRows rows={3} columns={5} />
                                                        ) : staffSalariesForLedger.length === 0 ? (
                                                            <tr><td colSpan={6}><EmptyState icon={FaHistory} title="No salary records" subtitle="Use 'Pay Salary' above to create the first entry" /></td></tr>
                                                        ) : (
                                                            staffSalariesForLedger.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month).map(salary => {
                                                                const isPaid = salary.status === 'PAID';
                                                                const isPending = salary.status === 'PENDING';

                                                                return (
                                                                    <tr key={salary._id} className="hover:bg-gray-50/50 transition-colors">
                                                                        <td className="px-6 py-4 font-bold text-gray-900">{MONTH_LABELS[salary.month]} {salary.year}</td>
                                                                        <td className="px-6 py-4 font-black text-gray-900">
                                                                            {editingSalaryId === salary._id ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <input 
                                                                                        type="number" 
                                                                                        min="0"
                                                                                        value={editingAmount} 
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value;
                                                                                            if (val === '' || Number(val) >= 0) {
                                                                                                setEditingAmount(val);
                                                                                            }
                                                                                        }}
                                                                                        className="w-24 px-2 py-1 text-sm border border-violet-200 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                                                                                        autoFocus
                                                                                    />
                                                                                    <button 
                                                                                        onClick={() => handleSaveSalaryAmount(salary._id)}
                                                                                        title="Save" 
                                                                                        className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                                                                    ><FaCheck size={12} /></button>
                                                                                    <button 
                                                                                        onClick={() => { setEditingSalaryId(null); setEditingAmount(''); }}
                                                                                        title="Cancel" 
                                                                                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                                                                                    ><FaTimes size={12} /></button>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center gap-2 group/amount">
                                                                                    ₹{salary.amount?.toLocaleString()}
                                                                                    {isPending && (
                                                                                        <button 
                                                                                            onClick={() => { setEditingSalaryId(salary._id); setEditingAmount(salary.amount); }}
                                                                                            className="p-1 text-violet-500 hover:text-violet-600 transition-all"
                                                                                            title="Edit Amount"
                                                                                        >
                                                                                            <FaEdit size={12} />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-6 py-4 text-center">
                                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                                                isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                                                            }`}>
                                                                                {salary.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-gray-500 font-medium text-center">
                                                                            {salary.paidDate ? new Date(salary.paidDate).toLocaleDateString() : '-'}
                                                                        </td>
                                                                        <td className="px-6 py-4 text-center">
                                                                            {isPaid ? (
                                                                                <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest flex items-center justify-center gap-1"><FaCheck size={10} /> Completed</span>
                                                                            ) : isPending ? (
                                                                                <button onClick={() => setPayoutConfirmModal({ open: true, salary, remarks: salary.remarks || '' })}
                                                                                    className="px-4 py-1.5 bg-primary text-white text-[10px] font-black rounded-lg hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all uppercase tracking-widest">
                                                                                    Proceed
                                                                                </button>
                                                                            ) : null}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })() : (
                                    <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                            <div>
                                                <h2 className="text-2xl font-black text-gray-900 font-display">Staff Salary Dashboard</h2>
                                                <p className="text-gray-500 font-medium">Review and process teacher payouts for the current cycle.</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="relative group">
                                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-violet-500 transition-colors" size={14} />
                                                    <input type="text" placeholder="Search staff..." value={staffSearch}
                                                        onChange={(e) => setStaffSearch(e.target.value)}
                                                        className="pl-11 pr-6 py-3 text-sm border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 w-72 shadow-inner bg-gray-50/50 transition-all" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                            <table className="w-full text-sm text-left">
                                                <thead>
                                                    <tr className="bg-gray-50/50 border-b border-gray-100 shadow-sm">
                                                        {['Teacher Name', 'Email Address', SALARY_LABELS.EXPECTED, 'Latest Status'].map(h => (
                                                            <th key={h} className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                                        ))}
                                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Details</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {teachersLoading || salariesLoading ? (
                                                        <SkeletonRows rows={5} columns={5} />
                                                    ) : (() => {
                                                        const filteredStaffDashboard = (teachersData?.data?.users || []).filter(t => t.name.toLowerCase().includes(debouncedStaffSearch.toLowerCase()));
                                                        if (filteredStaffDashboard.length === 0) {
                                                            return <tr><td colSpan={5}><EmptyState icon={FaUser} title="No staff records" subtitle="We couldn't find any staff matching your search." /></td></tr>;
                                                        }
                                                        
                                                        return filteredStaffDashboard
                                                            .slice((staffDashboardPage - 1) * STAFF_DASHBOARD_PER_PAGE, staffDashboardPage * STAFF_DASHBOARD_PER_PAGE)
                                                            .map(staff => {
                                                            const staffSalaries = (salaryData?.data || []).filter(s => String(s.teacherId?._id || s.teacherId) === String(staff._id));
                                                            const latestSalary = staffSalaries.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)[0];
                                                            
                                                            const isPaid = latestSalary?.status === 'PAID';
                                                            const isPending = latestSalary?.status === 'PENDING';

                                                            return (
                                                                <tr key={staff._id} className="hover:bg-violet-50/20 transition-all group cursor-default">
                                                                    <td className="px-6 py-6 font-black text-gray-900">{staff.name}</td>
                                                                    <td className="px-6 py-6 text-gray-500 font-medium">{staff.email}</td>
                                                                    <td className="px-6 py-6 font-black text-gray-900 uppercase text-xs flex items-center gap-2 group/base">
                                                                        ₹{(staff.profile?.expectedSalary || 0).toLocaleString()}
                                                                        <button 
                                                                            onClick={() => setBaseSalaryModal({ open: true, staff, amount: staff.profile?.expectedSalary || 0 })}
                                                                            className="p-1.5 text-violet-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all opacity-100 group-hover/base:opacity-100"
                                                                        ><FaEdit size={12} /></button>
                                                                    </td>
                                                                    <td className="px-6 py-6">
                                                                        {latestSalary ? (
                                                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${
                                                                                isPaid ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                                                            }`}>
                                                                                {latestSalary.status} ({MONTH_LABELS[latestSalary.month]})
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">No Records</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-6 text-center">
                                                                        <button onClick={() => setSelectedStaff(staff)}
                                                                            className="px-6 py-2 bg-white text-primary border-2 border-primary/20 hover:bg-primary hover:text-white hover:border-primary rounded-xl text-[10px] font-black transition-all shadow-sm uppercase tracking-widest">View Salary</button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    })()}
                                                </tbody>
                                            </table>
                                            
                                            {/* Pagination Controls */}
                                            {(() => {
                                                const filteredStaffDashboardCount = (teachersData?.data?.users || []).filter(t => t.name.toLowerCase().includes(debouncedStaffSearch.toLowerCase())).length;
                                                if (filteredStaffDashboardCount > STAFF_DASHBOARD_PER_PAGE) {
                                                    const totalPages = Math.ceil(filteredStaffDashboardCount / STAFF_DASHBOARD_PER_PAGE);
                                                    return (
                                                        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30 rounded-b-2xl">
                                                            <p className="text-sm text-gray-500">
                                                                Showing <span className="font-medium text-gray-900">{(staffDashboardPage - 1) * STAFF_DASHBOARD_PER_PAGE + 1}</span> to <span className="font-medium text-gray-900">{Math.min(staffDashboardPage * STAFF_DASHBOARD_PER_PAGE, filteredStaffDashboardCount)}</span> of <span className="font-medium text-gray-900">{filteredStaffDashboardCount}</span> staff
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={() => setStaffDashboardPage(p => Math.max(1, p - 1))}
                                                                    disabled={staffDashboardPage === 1}
                                                                    className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                >
                                                                    <FaArrowLeft size={12} />
                                                                </button>
                                                                <div className="flex gap-1">
                                                                    {Array.from({ length: totalPages }).map((_, i) => (
                                                                        <button
                                                                            key={i}
                                                                            onClick={() => setStaffDashboardPage(i + 1)}
                                                                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${staffDashboardPage === i + 1 ? 'bg-primary text-white' : 'text-gray-600 hover:bg-white border border-transparent hover:border-gray-200'}`}
                                                                        >
                                                                            {i + 1}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <button 
                                                                    onClick={() => setStaffDashboardPage(p => Math.min(totalPages, p + 1))}
                                                                    disabled={staffDashboardPage === totalPages}
                                                                    className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                >
                                                                    <FaArrowRight size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                            {staffSubTab === 'overview' && (
                                <StaffOverviewPanel
                                    salaryData={salaryData}
                                    salariesLoading={salariesLoading}
                                    overviewYear={overviewYear}
                                />
                            )}
                            {staffSubTab === 'yearly' && (
                                <StaffYearlySummaryPanel
                                    salaryData={salaryData}
                                    salariesLoading={salariesLoading}
                                    teachersData={teachersData}
                                    teachersLoading={teachersLoading}
                                    setActiveTab={setActiveTab}
                                    setMgmtView={setMgmtView}
                                    setStaffSubTab={setStaffSubTab}
                                />
                            )}
                        </div>
                    )}


                    </div>
                )}

                {/* ── TAB: Salary (Teacher Only) ────────────────────── */}
                {activeTab === 'salary' && isTeacher && (
                    <TeacherSalaryTab
                        mySalaryData={mySalaryData}
                        mySalaryLoading={mySalaryLoading}
                        overviewYear={overviewYear}
                        setOverviewYear={setOverviewYear}
                        user={user}
                    />
                )}

                {/* ── TAB: Assigned Fees (Student Only) ─────────────── */}
                {activeTab === 'structures' && isStudent && (
                    <StudentStructuresTab
                        structModal={structModal}
                        setStructModal={setStructModal}
                        structures={structures}
                        structLoading={structLoading}
                        handleUpdateStructure={handleUpdateStructure}
                        updateMut={updateMut}
                        isAdmin={isAdmin}
                        setDeleteConfirm={setDeleteConfirm}
                    />
                )}

                {/* ── TAB: Student Fees ────────────────────────────── */}
                {activeTab === 'student_fees' && isStudent && (
                    <StudentFeesTab
                        myFees={myFees}
                        myFeesLoading={myFeesLoading}
                        myPenalties={myPenalties}
                        myPenaltiesLoading={myPenaltiesLoading}
                        mySummary={mySummary}
                        myPenaltySummary={myPenaltySummary}
                        summaryYear={summaryYear}
                        setSummaryYear={setSummaryYear}
                    />
                )}

            </div>

            {/* ── Modals ────────────────────────────────────────────── */}
            <PaymentModal
                isOpen={paymentModal.open}
                onClose={() => setPaymentModal({ open: false, assignment: null })}
                onSubmit={handlePayment}
                assignment={paymentModal.assignment}
                isLoading={payMut.isPending}
            />



            {/* Base Salary Edit Modal */}
            {baseSalaryModal.open && (
                <div className={MODAL_OVERLAY}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn border border-gray-100">
                        <div className="p-8">
                            <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-500 mb-6 mx-auto">
                                <FaEdit size={24} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 text-center mb-2">{SALARY_LABELS.UPDATE_EXPECTED}</h3>
                            <p className="text-sm text-gray-500 text-center mb-8">Set the expected monthly salary for <b>{baseSalaryModal.staff?.name}</b>.</p>
                            
                            <form onSubmit={handleUpdateBaseSalary} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Monthly Amount (₹)</label>
                                    <input 
                                        type="number" 
                                        required 
                                        autoFocus
                                        min="0"
                                        value={baseSalaryModal.amount} 
                                        onChange={(e) => setBaseSalaryModal(prev => ({ ...prev, amount: e.target.value }))}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-bold text-lg transition-all shadow-inner"
                                        placeholder="e.g. 45000"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setBaseSalaryModal({ open: false, staff: null, amount: '' })}
                                        className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-600 font-black rounded-2xl hover:bg-gray-50 transition-all uppercase tracking-widest text-xs">Cancel</button>
                                    <button type="submit" disabled={updateTeacherProfileMut.isPending}
                                        className="flex-1 px-6 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover shadow-xl shadow-primary/20 transition-all uppercase tracking-widest text-xs disabled:opacity-50">
                                        {updateTeacherProfileMut.isPending ? 'Updating...' : 'Save Change'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Payout Confirmation Modal */}
            {payoutConfirmModal.open && (
                <div className={MODAL_OVERLAY}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn border border-gray-100">
                        <div className="p-8">
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 mx-auto">
                                <FaCheck size={24} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 text-center mb-2">Confirm Payout</h3>
                            <p className="text-sm text-gray-500 text-center mb-8">Processing payout of <b>₹{payoutConfirmModal.salary?.amount?.toLocaleString()}</b> for {MONTH_LABELS[payoutConfirmModal.salary?.month]} {payoutConfirmModal.salary?.year}.</p>
                            
                            <form onSubmit={handleProcessPayout} className="space-y-6">

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setPayoutConfirmModal({ open: false, salary: null, remarks: '' })}
                                        className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-600 font-black rounded-2xl hover:bg-gray-50 transition-all uppercase tracking-widest text-xs">Go Back</button>
                                    <button type="submit" disabled={updateSalaryStatusMut.isPending}
                                        className="flex-1 px-6 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all uppercase tracking-widest text-xs disabled:opacity-50">
                                        {updateSalaryStatusMut.isPending ? 'Processing...' : 'Confirm & Pay'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className={MODAL_OVERLAY}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <FaTrash className="text-red-500" size={20} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Fee Structure?</h3>
                            <p className="text-sm text-gray-500">This action cannot be undone. The structure will be permanently removed.</p>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={() => handleDeleteStructure(deleteConfirm)} disabled={deleteMut.isPending}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                                {deleteMut.isPending ? <ButtonSpinner /> : <FaTrash size={12} />}Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Penalty Delete Confirmation */}
            {penaltyDeleteConfirm && (
                <div className={MODAL_OVERLAY}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <FaTrash className="text-red-500" size={20} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Student Penalty?</h3>
                            <p className="text-sm text-gray-500 px-4">This will permanently remove the penalty record for everyone (Super Admin, Admins, and the Student app).</p>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setPenaltyDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={() => handleDeletePenalty(penaltyDeleteConfirm)} disabled={deletePenaltyMut.isPending}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                                {deletePenaltyMut.isPending ? <ButtonSpinner /> : <FaTrash size={12} />}Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default FeesPage;
