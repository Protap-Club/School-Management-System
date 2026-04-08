import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    feeKeys,
    useFeeStructures, useCreateFeeStructure, useUpdateFeeStructure, useDeleteFeeStructure,
    useGenerateAssignments, useAllClassesOverview, useClassOverview, useYearlySummary,
    useStudentFeeHistory, useRecordPayment, useUpdateAssignment,
    useCreateSalary, useSalaries, useUpdateSalaryStatus, useMySalary, useUpdateTeacherProfile,
    useMyFees, useFeeTypes,
    SALARY_LABELS,
    FEE_TYPES, FEE_TYPE_LABELS, FREQUENCY_LABELS, MONTH_LABELS,
} from './index';
import { useAuth } from '../auth';
import { useUsers } from '../users/api/queries';
import FeeStructureModal from '../../components/fees/FeeStructureModal';
import PaymentModal from '../../components/fees/PaymentModal';
import FeeStructureForm from '../../components/fees/FeeStructureForm';
import SalaryForm from '../../components/fees/SalaryForm';
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
    FaMoneyCheckAlt
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
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

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
    const [structFilters, setStructFilters] = useState({ academicYear: currentYear, standard: '', section: '', feeType: '' });
    const [structModal, setStructModal] = useState({ open: false, editData: null });
    const [genModal, setGenModal] = useState({ open: false, structure: null });
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Overview state
    const [overviewYear, setOverviewYear] = useState(currentYear);
    const [overviewMonth, setOverviewMonth] = useState(currentMonth);
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
    const [summaryYear, setSummaryYear] = useState(currentYear);

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

    // Salary Queries
    const { data: feeTypesResp } = useFeeTypes({ enabled: isAdmin });
    const { data: salaryData, isLoading: salariesLoading } = useSalaries({ year: overviewYear }, isAdmin);
    const { data: mySalaryData, isLoading: mySalaryLoading } = useMySalary({ year: overviewYear }, isTeacher);

    // Student Queries
    const { data: myFeesData, isLoading: myFeesLoading } = useMyFees({ academicYear: summaryYear }, isStudent);

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

    const isLoadingOverview = overviewLoading;
    const classStudents = classData?.data?.students || [];
    const classSummary = classData?.data?.summary || {};
    const yearlyBreakdown = yearlyData?.data?.monthlyBreakdown || [];
    const typeBreakdown = yearlyData?.data?.typeBreakdown || [];
    const yearTotal = yearlyData?.data?.yearTotal || {};
    const studentFees = studentData?.data?.fees || [];
    const studentSummary = studentData?.data?.summary || {};

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
                                        <input type="number" placeholder="Year" value={structFilters.academicYear}
                                            onChange={(e) => setStructFilters(p => ({ ...p, academicYear: e.target.value }))}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-24 focus:ring-primary focus:border-primary" 
                                            min={0} />
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
                                                };
                                            });
                                        }}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-32 focus:ring-primary focus:border-primary">
                                            <option value="">Standard</option>
                                            {standardFilterOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <select value={structFilters.section} onChange={(e) => setStructFilters(p => ({ ...p, section: e.target.value }))}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-32 focus:ring-primary focus:border-primary">
                                            <option value="">Section</option>
                                            {sectionFilterOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <select value={structFilters.feeType} onChange={(e) => setStructFilters(p => ({ ...p, feeType: e.target.value }))}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-primary focus:border-primary">
                                            <option value="">All Types</option>
                                            {feeTypesList.map(t => <option key={t.name} value={t.name}>{t.label}</option>)}
                                        </select>
                                    </div>

                                    {/* Table */}
                                    <div className="overflow-x-auto">
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
                                    </div>
                                    {paginationInfo.totalCount > structPageSize && (
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
                                isLoading={createMut.isPending || updateMut.isPending}
                                isAdmin={isAdmin}
                            />
                        )}

                {mgmtView === 'staff' && (
                    <div className="space-y-4 animate-fadeIn">
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
                            {staffSubTab === 'dashboard' && !selectedStaff && (
                                <button onClick={() => setMgmtView('salary_form')}
                                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-primary/20 text-sm">
                                    <FaPlus size={12} /> Add Salary Entry
                                </button>
                            )}
                        </div>

                        {staffSubTab === 'dashboard' && (
                            <>
                                <div className="flex items-center justify-between gap-4">
                                    {!selectedStaff ? (
                                        <button onClick={() => setMgmtView('selection')} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-violet-600 transition-all uppercase tracking-widest">
                                            <FaArrowLeft size={10} /> Back to Management
                                        </button>
                                    ) : <div />}
                                </div>
                                {selectedStaff ? (
                                    <div className="space-y-4">
                                        <button onClick={() => setSelectedStaff(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors px-1 font-bold">
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
                                            </div>

                                            <div className="border border-gray-100 rounded-2xl overflow-hidden mt-8 shadow-sm">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-gray-50/80 border-b border-gray-100">
                                                        <tr>
                                                            {['Month', 'Amount', 'Status', 'Date Paid', 'Actions'].map(h => (
                                                                <th key={h} className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {salariesLoading ? (
                                                            <SkeletonRows rows={3} columns={5} />
                                                        ) : (salaryData?.data || []).filter(s => String(s.teacherId?._id || s.teacherId) === String(selectedStaff._id)).length === 0 ? (
                                                            <tr><td colSpan={6}><EmptyState icon={FaHistory} title="No salary records" subtitle="Create a salary entry to see records here" /></td></tr>
                                                        ) : (
                                                            (salaryData?.data || []).filter(s => String(s.teacherId?._id || s.teacherId) === String(selectedStaff._id)).map(salary => {
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
                                                                        <td className="px-6 py-4">
                                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                                                isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                                                            }`}>
                                                                                {salary.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-gray-500 font-medium">
                                                                            {salary.paidDate ? new Date(salary.paidDate).toLocaleDateString() : '-'}
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            {isPaid ? (
                                                                                <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-1"><FaCheck size={10} /> Completed</span>
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
                                ) : (
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
                                                        {['Teacher Name', 'Email Address', SALARY_LABELS.EXPECTED, 'Latest Status', 'Details'].map(h => (
                                                            <th key={h} className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                                        ))}
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
                                                                    <td className="px-6 py-6">
                                                                        <button onClick={() => setSelectedStaff(staff)}
                                                                            className="px-6 py-2 bg-white text-primary border-2 border-primary/20 hover:bg-primary hover:text-white hover:border-primary rounded-xl text-[10px] font-black transition-all shadow-sm uppercase tracking-widest">View Ledger</button>
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

                        {mgmtView === 'salary_form' && (
                            <SalaryForm
                                onCancel={() => setMgmtView('staff')}
                                isLoading={createSalaryMut.isPending}
                                salaryData={salaryData?.data || []}
                                onSubmit={async (data) => {
                                    try {
                                        await createSalaryMut.mutateAsync(data);
                                        showToast('success', 'Salary entry created successfully');
                                        setMgmtView('staff');
                                    } catch (err) {
                                        showToast('error', err?.response?.data?.message || 'Failed to create salary entry');
                                    }
                                }}
                                isAdmin={isAdmin}
                            />
                                )}
                    </div>
                )}

                {/* ── TAB: Salary (Teacher Only) ────────────────────── */}
                {activeTab === 'salary' && isTeacher && (
                    <TeacherSalaryTab
                        mySalaryData={mySalaryData}
                        mySalaryLoading={mySalaryLoading}
                        overviewYear={overviewYear}
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
                        mySummary={mySummary}
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
        </DashboardLayout>
    );
};

export default FeesPage;
