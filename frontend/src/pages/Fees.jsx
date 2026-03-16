import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../layouts/DashboardLayout';
import {
    feeKeys,
    useFeeStructures, useCreateFeeStructure, useUpdateFeeStructure, useDeleteFeeStructure,
    useGenerateAssignments, useAllClassesOverview, useClassOverview, useYearlySummary,
    useMyClassFees, useStudentFeeHistory, useRecordPayment, useUpdateAssignment,
    useCreateSalary, useSalaries, useUpdateSalaryStatus, useMySalary, useUpdateTeacherProfile,
    useMyFees, useFeeTypes,
    FEE_TYPES, FEE_TYPE_LABELS, FREQUENCY_LABELS, STATUS_COLORS, MONTH_LABELS,
} from '../features/fees';
import { useAuth } from '../features/auth';
import { useUsers } from '../features/users/api/queries';
import FeeStructureModal from '../components/fees/FeeStructureModal';
import PaymentModal from '../components/fees/PaymentModal';
import FeeStructureForm from '../components/fees/FeeStructureForm';
import SalaryForm from '../components/fees/SalaryForm';
import {
    FaPlus, FaEdit, FaTrash, FaTrashAlt, FaBolt, FaTimes, FaCheck, FaMoneyBillWave,
    FaChartBar, FaListAlt, FaEye, FaFilter, FaArrowLeft, FaArrowRight, FaReceipt, FaBan, FaHistory,
    FaWallet, FaCalendarCheck, FaSearch, FaUser, FaFileInvoice, FaCalendarAlt, FaDownload,
} from 'react-icons/fa';
import { generateFeeReport, generateSalaryReceipt } from '../utils/pdfGenerator';

const MODAL_OVERLAY = 'fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4';
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const StatusBadge = ({ status }) => {
    const c = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>{status}
        </span>
    );
};

const SkeletonRow = ({ cols }) => (
    <tr className="animate-pulse">
        {Array.from({ length: cols }).map((_, i) => (
            <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded-lg w-3/4"></div></td>
        ))}
    </tr>
);

const EmptyState = ({ icon: Icon, title, subtitle }) => (
    <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon className="text-gray-300" size={24} />
        </div>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
    </div>
);

const Fees = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const isTeacher = user?.role === 'teacher';
    const isStudent = user?.role === 'student';

    const [activeTab, setActiveTab] = useState(
        isAdmin ? 'management' : isTeacher ? 'salary' : 'student_fees'
    );
    const [mgmtView, setMgmtView] = useState('selection'); // selection, student_list, student_form, staff
    const [studentSubTab, setStudentSubTab] = useState('structures'); // structures, overview, yearly
    const [staffSubTab, setStaffSubTab] = useState('dashboard'); // dashboard, overview, yearly
    const [toast, setToast] = useState({ type: '', text: '' });

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
    const [paymentModal, setPaymentModal] = useState({ open: false, assignment: null });
    const [updateModal, setUpdateModal] = useState({ open: false, assignment: null });

    // Yearly state
    const [summaryYear, setSummaryYear] = useState(currentYear);

    // Staff Salary state
    const [staffSearch, setStaffSearch] = useState('');
    const [staffStatusFilter, setStaffStatusFilter] = useState('all');
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [baseSalaryModal, setBaseSalaryModal] = useState({ open: false, staff: null, amount: '' });
    const [payoutConfirmModal, setPayoutConfirmModal] = useState({ open: false, salary: null, remarks: '' });

    // Queries
    const cleanFilters = useMemo(() => {
        const f = {};
        if (structFilters.academicYear) f.academicYear = structFilters.academicYear;
        if (structFilters.standard) f.standard = structFilters.standard;
        if (structFilters.section) f.section = structFilters.section;
        if (structFilters.feeType) f.feeType = structFilters.feeType;
        return f;
    }, [structFilters]);

    const { data: structData, isLoading: structLoading } = useFeeStructures(
        cleanFilters,
        isAdmin
    );
    const { data: overviewData, isLoading: overviewLoading } = useAllClassesOverview(overviewYear, overviewMonth, isAdmin);
    const { data: teachersData, isLoading: teachersLoading } = useUsers({ role: 'teacher', pageSize: 100 });

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

    const showToast = useCallback((type, text) => {
        setToast({ type, text });
        setTimeout(() => setToast({ type: '', text: '' }), 3500);
    }, []);

    const structures = structData?.data || [];

    const overviewClasses = useMemo(() => {
        if (isAdmin) return overviewData?.data?.classes || [];
        return [];
    }, [isAdmin, overviewData]);

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
            const created = result?.data || result;
            const createdId = created?._id;
            if (createdId) {
                const months = created.applicableMonths || data.applicableMonths || [];
                const year = Number(created.academicYear || data.academicYear || currentYear);
                let assignedCount = 0;
                for (const month of months) {
                    try {
                        await genMut.mutateAsync({ structureId: createdId, month, year });
                        assignedCount++;
                    } catch (err) { /* skip months that fail (e.g., already assigned) */ }
                }
                queryClient.invalidateQueries({ queryKey: feeKeys.all });
                if (assignedCount > 0) {
                    showToast('success', `Fee structure created & assigned for ${assignedCount} month(s)`);
                } else {
                    showToast('success', 'Fee structure created');
                }
            } else {
                showToast('success', 'Fee structure created');
                queryClient.invalidateQueries({ queryKey: feeKeys.all });
            }
            setStructModal({ open: false, editData: null });
        } catch (err) { showToast('error', err?.response?.data?.message || 'Failed to create'); }
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
        } catch (err) { showToast('error', 'Failed to update status'); }
    };

    const renderStudentOverview = () => {
        if (selectedStudent) {
            return (
                <div className="space-y-4">
                    <button onClick={() => setSelectedStudent(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                        <FaArrowLeft size={12} />Back to Class
                    </button>
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{selectedStudent.name}</h2>
                                <p className="text-sm text-gray-500">Fee History — {overviewYear}</p>
                            </div>
                            <div className="flex gap-4 text-sm">
                                <div className="text-center px-4 py-2 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500">Total Due</p><p className="text-lg font-bold">₹{(studentSummary.totalDue || 0).toLocaleString()}</p></div>
                                <div className="text-center px-4 py-2 bg-emerald-50 rounded-xl"><p className="text-xs text-gray-500">Paid</p><p className="text-lg font-bold text-emerald-600">₹{(studentSummary.totalPaid || 0).toLocaleString()}</p></div>
                                <div className="text-center px-4 py-2 bg-red-50 rounded-xl"><p className="text-xs text-gray-500">Waived</p><p className="text-lg font-bold text-red-600">₹{(studentSummary.totalWaived || 0).toLocaleString()}</p></div>
                                <div className="text-center px-4 py-2 bg-amber-50 rounded-xl"><p className="text-xs text-gray-500">Pending</p><p className="text-lg font-bold text-amber-600">₹{(studentSummary.totalPending || 0).toLocaleString()}</p></div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        {['Month', 'Fee Type', 'Amount', 'Paid', 'Waived', 'Status', 'Due Date', 'Payments', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {studentLoading ? (
                                        Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                                    ) : studentFees.length === 0 ? (
                                        <tr><td colSpan={8}><EmptyState icon={FaHistory} title="No fee history" subtitle="No fees assigned to this student" /></td></tr>
                                    ) : (
                                        studentFees.map(fee => (
                                            <tr key={fee.assignmentId} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 font-medium">{MONTH_LABELS[fee.month]}</td>
                                                <td className="px-4 py-3 text-gray-600">{fee.name || fee.feeType}</td>
                                                <td className="px-4 py-3 font-medium">₹{fee.amount?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-emerald-600">₹{fee.paid?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-red-600">₹{Math.max(0, (fee.amount || 0) - (fee.paid || 0) * (['PAID', 'WAIVED'].includes((fee.status || '').toUpperCase()) ? 1 : 0)).toLocaleString()}</td>
                                                <td className="px-4 py-3"><StatusBadge status={fee.status} /></td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '-'}</td>
                                                <td className="px-4 py-3">
                                                    {fee.payments?.length > 0 ? (
                                                        <span className="text-xs text-gray-500">{fee.payments.length} payment{fee.payments.length > 1 ? 's' : ''}</span>
                                                    ) : <span className="text-xs text-gray-400">—</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isAdmin && fee.status !== 'PAID' && fee.status !== 'WAIVED' && (
                                                        <button onClick={() => setPaymentModal({ open: true, assignment: { _id: fee.assignmentId, netAmount: fee.amount, paidAmount: fee.paid } })}
                                                            className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"><FaMoneyBillWave size={12} /></button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        if (selectedClass) {
            return (
                <div className="space-y-4">
                    <button onClick={() => setSelectedClass(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                        <FaArrowLeft size={12} />Back to All Classes
                    </button>
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Class {selectedClass.standard}-{selectedClass.section}</h2>
                                    <p className="text-sm text-gray-500">{MONTH_LABELS[overviewMonth]} {overviewYear}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                                    <FaFilter className="text-gray-400 ml-2" size={12} />
                                    <select 
                                        value={overviewType} 
                                        onChange={(e) => setOverviewType(e.target.value)}
                                        className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 min-w-[100px]"
                                    >
                                        <option value="">Filter</option>
                                        {feeTypesList.map(t => (
                                            <option key={t.name} value={t.name}>{t.label}</option>
                                        ))}
                                    </select>
                                    <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
                                    <select 
                                        value={overviewStatus} 
                                        onChange={(e) => setOverviewStatus(e.target.value)}
                                        className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="paid">Paid</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4 text-sm">
                                <button 
                                    onClick={() => generateFeeReport(filteredClassStudents, filteredClassSummary, selectedClass, overviewMonth, overviewYear)}
                                    className="flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-xl font-bold transition-all"
                                    title="Download PDF Report"
                                >
                                    <FaDownload size={14} /> Download PDF
                                </button>
                                <div className="text-center px-4 py-2 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 font-medium">Students</p><p className="text-lg font-bold">{filteredClassSummary.totalStudents || 0}</p></div>
                                <div className="text-center px-4 py-2 bg-emerald-50 rounded-xl"><p className="text-xs text-gray-500 font-medium">Collected</p><p className="text-lg font-bold text-emerald-600">₹{(filteredClassSummary.totalCollected || 0).toLocaleString()}</p></div>
                                <div className="text-center px-4 py-2 bg-amber-50 rounded-xl"><p className="text-xs text-gray-500 font-medium">Pending</p><p className="text-lg font-bold text-amber-600">₹{(filteredClassSummary.totalPending || 0).toLocaleString()}</p></div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        {['Student', 'Fee Type', 'Amount', 'Paid', 'Status', 'Due Date', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {classLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                                    ) : filteredClassStudents.length === 0 ? (
                                        <tr><td colSpan={8}><EmptyState icon={FaEye} title="No students" subtitle="No fee assignments for this class/month" /></td></tr>
                                    ) : (
                                        filteredClassStudents.flatMap(student =>
                                            student.fees.map((fee, idx) => (
                                                <tr key={`${student.studentId}-${fee.assignmentId}`} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        {idx === 0 ? (
                                                            <button onClick={() => setSelectedStudent(student)} className="font-medium text-gray-900 hover:text-primary transition-colors">{student.name}</button>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">{fee.name || fee.feeType}</td>
                                                    <td className="px-4 py-3 font-medium">₹{fee.amount?.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-emerald-600">₹{fee.paid?.toLocaleString()}</td>
                                                    <td className="px-4 py-3"><StatusBadge status={fee.status} /></td>
                                                    <td className="px-4 py-3 text-gray-500 text-xs">{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '-'}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1">
                                                            {isAdmin && fee.status !== 'PAID' && fee.status !== 'WAIVED' && (
                                                                <>
                                                                    <button onClick={() => setPaymentModal({ open: true, assignment: { _id: fee.assignmentId, netAmount: fee.amount, paidAmount: fee.paid } })}
                                                                        title="Record Payment" className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"><FaMoneyBillWave size={12} /></button>
                                                                    <button onClick={() => handleWaive(fee.assignmentId)}
                                                                        title="Waive Fee" className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"><FaBan size={12} /></button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <h2 className="text-xl font-bold text-gray-900">All Classes Fee Overview</h2>
                        <div className="flex items-center gap-3">
                            <select value={overviewMonth} onChange={(e) => setOverviewMonth(Number(e.target.value))}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-primary focus:border-primary">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{MONTH_LABELS[m]}</option>
                                ))}
                            </select>
                            <input type="number" value={overviewYear} onChange={(e) => setOverviewYear(Number(e.target.value))}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg w-24 focus:ring-primary focus:border-primary" min={2000} max={2100} />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    {['Class', 'Students', 'Total Due', 'Collected', 'Waived', 'Pending', 'Collection %', 'Action'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoadingOverview ? (
                                    Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                                ) : overviewClasses.length === 0 ? (
                                    <tr><td colSpan={8}><EmptyState icon={FaEye} title="No fee data" subtitle="Generate assignments first to see overview" /></td></tr>
                                ) : (
                                    overviewClasses.map(cls => {
                                        const pct = cls.totalDue > 0 ? Math.round((cls.totalCollected / cls.totalDue) * 100) : 0;
                                        return (
                                            <tr key={`${cls.standard}-${cls.section}`} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-900">{cls.standard}-{cls.section}</td>
                                                <td className="px-4 py-3 text-gray-600">{cls.studentCount}</td>
                                                <td className="px-4 py-3 font-medium">₹{cls.totalDue?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-emerald-600 font-medium">₹{cls.totalCollected?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-red-600 font-medium">₹{cls.totalWaived?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-amber-600 font-medium">₹{cls.totalPending?.toLocaleString()}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div></div>
                                                        <span className="text-xs font-medium text-gray-600">{pct}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button onClick={() => setSelectedClass(cls)}
                                                        className="text-primary hover:underline text-sm font-medium">View Details</button>
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
    };

    const renderStudentYearlySummary = () => {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Yearly Collection Breakdown</h2>
                                <p className="text-sm text-gray-500">Monthly breakdown of fee collection</p>
                            </div>
                            <input type="number" value={summaryYear} onChange={(e) => setSummaryYear(Number(e.target.value))}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg w-28 focus:ring-primary focus:border-primary font-medium" min={2000} max={2100} />
                        </div>

                        {/* Year totals */}
                        {yearTotal.totalDue > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                                    <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Total Due</p>
                                    <p className="text-xl font-bold text-gray-900">₹{(yearTotal.totalDue || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                                    <p className="text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wider">Collected</p>
                                    <p className="text-xl font-bold text-emerald-700">₹{(yearTotal.totalCollected || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
                                    <p className="text-xs font-semibold text-red-600 mb-1 uppercase tracking-wider">Waived</p>
                                    <p className="text-xl font-bold text-red-700">₹{(yearTotal.totalWaived || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                                    <p className="text-xs font-semibold text-amber-600 mb-1 uppercase tracking-wider">Pending</p>
                                    <p className="text-xl font-bold text-amber-700">₹{(yearTotal.totalPending || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center col-span-2 sm:col-span-1">
                                    <p className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Rate</p>
                                    <p className="text-xl font-bold text-primary">{yearTotal.collectionRate || 0}%</p>
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        {['Month', 'Due', 'Collected', 'Waived', 'Pending', 'Collection Rate'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {yearlyLoading ? (
                                        Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                                    ) : yearlyBreakdown.length === 0 ? (
                                        <tr><td colSpan={6}><EmptyState icon={FaChartBar} title="No data" subtitle="No fee data for this year" /></td></tr>
                                    ) : (
                                        yearlyBreakdown.map(m => (
                                            <tr key={m.month} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-gray-900">{m.label}</td>
                                                <td className="px-4 py-3 text-gray-600">₹{(m.totalDue || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-emerald-600 font-medium">₹{(m.totalCollected || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-red-600">₹{(m.totalWaived || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-amber-600">₹{(m.totalPending || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${m.collectionRate}%` }}></div>
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-700">{m.collectionRate}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Breakdown by Fee Type */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                            Breakdown by Fee Type
                        </h3>
                        <div className="space-y-3">
                            {yearlyLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
                                ))
                            ) : typeBreakdown.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No type data available</p>
                            ) : (
                                typeBreakdown.map(item => (
                                    <div key={item.type} className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl hover:shadow-sm transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{item.type}</p>
                                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Rate: {item.collectionRate}%</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-emerald-600">₹{(item.totalCollected || 0).toLocaleString()}</p>
                                                <p className="text-[10px] text-gray-400">of ₹{(item.totalDue || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${item.collectionRate}%` }}></div>
                                        </div>
                                        <div className="flex justify-between items-center mt-3">
                                            <div className="flex gap-4">
                                                {(item.totalPending || 0) > 0 && (
                                                    <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                                                        <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                                                        Pending: ₹{(item.totalPending || 0).toLocaleString()}
                                                    </p>
                                                )}
                                                {(item.totalWaived || 0) > 0 && (
                                                    <p className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
                                                        <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                                                        Waived: ₹{(item.totalWaived || 0).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderStaffOverview = () => {
        const salaries = salaryData?.data || [];
        const monthlyStats = Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            const monthSalaries = salaries.filter(s => s.month === month);
            return {
                month,
                label: MONTH_LABELS[month],
                totalPaid: monthSalaries.filter(s => s.status === 'PAID').reduce((sum, s) => sum + (Number(s.amount) || 0), 0),
                totalPending: monthSalaries.filter(s => s.status === 'PENDING').reduce((sum, s) => sum + (Number(s.amount) || 0), 0),
                count: monthSalaries.length
            };
        });

        const yearPaid = monthlyStats.reduce((sum, m) => sum + m.totalPaid, 0);
        const yearPending = monthlyStats.reduce((sum, m) => sum + m.totalPending, 0);

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Paid (Yearly)</p>
                        <h3 className="text-3xl font-black text-emerald-600">₹{yearPaid.toLocaleString()}</h3>
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Pending (Yearly)</p>
                        <h3 className="text-3xl font-black text-amber-600">₹{yearPending.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                        <div>
                            <h3 className="text-lg font-black text-gray-900 font-display">Monthly Payout Summary</h3>
                            <p className="text-xs text-gray-500 font-medium">Aggregated salary data for {overviewYear}</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    {['Month', 'Total Paid', 'Total Pending', 'Total Staff'].map(h => (
                                        <th key={h} className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {salariesLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                                ) : (
                                    monthlyStats.filter(m => m.count > 0).length === 0 ? (
                                        <tr><td colSpan={4}><EmptyState icon={FaChartBar} title="No payroll data" subtitle="No salary entries found for this year" /></td></tr>
                                    ) : (
                                        monthlyStats.map(m => (
                                            <tr key={m.month} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-5 font-black text-gray-900">{m.label}</td>
                                                <td className="px-8 py-5 text-emerald-600 font-bold">₹{m.totalPaid.toLocaleString()}</td>
                                                <td className="px-8 py-5 text-amber-600 font-bold">₹{m.totalPending.toLocaleString()}</td>
                                                <td className="px-8 py-5 text-gray-500 font-medium">{m.count} Staff</td>
                                            </tr>
                                        ))
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderStaffYearlySummary = () => {
        const salaries = salaryData?.data || [];
        const yearTotal = salaries.reduce((acc, s) => {
            if (s.status === 'PAID') acc.paid += (Number(s.amount) || 0);
            if (s.status === 'PENDING') acc.pending += (Number(s.amount) || 0);
            return acc;
        }, { paid: 0, pending: 0 });

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="text-lg font-black text-gray-900 font-display leading-none">Yearly Payroll Projection</h3>
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Full calendar year summary</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Payout</p>
                            <p className="text-lg font-black text-violet-600">₹{(yearTotal.paid + yearTotal.pending).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[11px] font-bold text-gray-700">Fulfillment Rate</span>
                                <span className="text-[11px] font-black text-emerald-600">
                                    {Math.round((yearTotal.paid / (yearTotal.paid + yearTotal.pending || 1)) * 100)}%
                                </span>
                            </div>
                            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                                    style={{ width: `${(yearTotal.paid / (yearTotal.paid + yearTotal.pending || 1)) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Fulfilled</p>
                                <p className="text-[13px] font-black text-emerald-700">₹{yearTotal.paid.toLocaleString()}</p>
                            </div>
                            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Pending</p>
                                <p className="text-[13px] font-black text-amber-700">₹{yearTotal.pending.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                    <h3 className="text-lg font-black text-gray-900 font-display mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-violet-500 rounded-full"></span>
                        Staff Salaries History
                    </h3>
                    <div className="space-y-4">
                        {teachersLoading || salariesLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse" />
                            ))
                        ) : (teachersData?.data?.users || []).length === 0 ? (
                            <p className="text-sm text-gray-500 font-medium text-center py-4">No staff data available</p>
                        ) : (
                            <>
                                {(teachersData?.data?.users || []).slice(0, 4).map(staff => {
                                    const staffId = String(staff._id);
                                    const staffSalaries = (salaryData?.data || []).filter(s => {
                                        const sId = s.teacherId?._id ? String(s.teacherId._id) : String(s.teacherId);
                                        return sId === staffId;
                                    });
                                    const totalPaid = staffSalaries.filter(s => s.status === 'PAID').reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                                    const totalPending = staffSalaries.filter(s => s.status === 'PENDING').reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                                    
                                    return (
                                        <div key={staff._id} className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl hover:shadow-md hover:bg-white transition-all group">
                                            <div className="flex flex-col">
                                                <div className="mb-3">
                                                    <p className="text-sm font-black text-gray-900 group-hover:text-violet-600 transition-colors line-clamp-1">{staff.name}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest italic truncate">{staff.email}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100 shadow-sm text-center">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center">Paid</p>
                                                        <p className="text-xs font-black text-emerald-600">₹{(totalPaid || 0).toLocaleString()}</p>
                                                    </div>
                                                    <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100 shadow-sm text-center">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center font-display">Pending</p>
                                                        <p className="text-xs font-black text-amber-600">₹{(totalPending || 0).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {(teachersData?.data?.users || []).length > 4 && (
                                    <button 
                                        onClick={() => {
                                            setActiveTab('management');
                                            setMgmtView('staff');
                                            setStaffSubTab('dashboard');
                                        }}
                                        className="w-full mt-2 py-4 bg-violet-50 hover:bg-violet-600 hover:text-white text-violet-700 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all border border-violet-100 flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        Manage Salary History <FaArrowRight size={10} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout>
            {toast.text && (
                <div className={`fixed top-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
                        {toast.type === 'success' ? <FaCheck size={12} /> : <FaTimes size={12} />}
                    </div>
                    <span className="font-medium">{toast.text}</span>
                </div>
            )}

            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Fee Hub</h1>
                    <p className="text-gray-500 mt-1">Configure structures, track collections, and manage staff payouts</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    {isAdmin && renderTabBtn('management', <FaListAlt size={12} />, 'Fee Hub')}
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
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-24 focus:ring-primary focus:border-primary" />
                                        <select value={structFilters.standard} onChange={(e) => setStructFilters(p => ({ ...p, standard: e.target.value }))}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-32 focus:ring-primary focus:border-primary">
                                            <option value="">Standard</option>
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <select value={structFilters.section} onChange={(e) => setStructFilters(p => ({ ...p, section: e.target.value }))}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-32 focus:ring-primary focus:border-primary">
                                            <option value="">Section</option>
                                            {['A', 'B', 'C'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <select value={structFilters.feeType} onChange={(e) => setStructFilters(p => ({ ...p, feeType: e.target.value }))}
                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-primary focus:border-primary">
                                            <option value="">All Types</option>
                                            {FEE_TYPES.map(t => <option key={t} value={t}>{FEE_TYPE_LABELS[t]}</option>)}
                                        </select>
                                    </div>

                                    {/* Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-100 uppercase">
                                                    {['Fee Type', 'Name', 'Class', 'Amount', 'Frequency', 'Due Day'].map(h => (
                                                        <th key={h} className="px-4 py-4 text-left text-[10px] font-black text-gray-400 tracking-widest">{h}</th>
                                                    ))}
                                                    <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 tracking-widest">Status</th>
                                                    <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 tracking-widest">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {structLoading ? (
                                                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                                                ) : structures.length === 0 ? (
                                                    <tr><td colSpan={8}><EmptyState icon={FaListAlt} title="No fee structures found" subtitle="Create a fee structure to get started" /></td></tr>
                                                ) : (
                                                    structures.map(st => (
                                                        <tr key={st._id} className="hover:bg-gray-50/25 transition-colors group">
                                                            <td className="px-4 py-4">
                                                                <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-lg text-[10px] font-bold uppercase">{FEE_TYPE_LABELS[st.feeType] || st.feeType}</span>
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
                                </>
                            )}
                            {studentSubTab === 'overview' && renderStudentOverview()}
                            {studentSubTab === 'yearly' && renderStudentYearlySummary()}
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
                                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-violet-200 text-sm">
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
                                                            Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                                                        ) : (salaryData?.data || []).filter(s => String(s.teacherId?._id || s.teacherId) === String(selectedStaff._id)).length === 0 ? (
                                                            <tr><td colSpan={6}><EmptyState icon={FaHistory} title="No salary records" subtitle="Create a salary entry to see records here" /></td></tr>
                                                        ) : (
                                                            (salaryData?.data || []).filter(s => String(s.teacherId?._id || s.teacherId) === String(selectedStaff._id)).map(salary => {
                                                                const isPaid = salary.status === 'PAID';
                                                                const isPending = salary.status === 'PENDING';

                                                                return (
                                                                    <tr key={salary._id} className="hover:bg-gray-50/50 transition-colors">
                                                                        <td className="px-6 py-4 font-bold text-gray-900">{MONTH_LABELS[salary.month]} {salary.year}</td>
                                                                        <td className="px-6 py-4 font-black text-gray-900">₹{salary.amount?.toLocaleString()}</td>
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
                                                        {['Teacher Name', 'Email Address', 'Base Salary', 'Latest Status', 'Details'].map(h => (
                                                            <th key={h} className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {teachersLoading || salariesLoading ? (
                                                        Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                                                    ) : (teachersData?.data?.users || []).filter(t => t.name.toLowerCase().includes(staffSearch.toLowerCase())).length === 0 ? (
                                                        <tr><td colSpan={5}><EmptyState icon={FaUser} title="No staff records" subtitle="We couldn't find any staff matching your search." /></td></tr>
                                                    ) : (
                                                        (teachersData?.data?.users || []).filter(t => t.name.toLowerCase().includes(staffSearch.toLowerCase())).map(staff => {
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
                                                                            className="p-1.5 text-violet-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all opacity-0 group-hover/base:opacity-100"
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
                                                                            className="px-6 py-2 bg-white text-violet-600 border-2 border-violet-100 hover:bg-violet-600 hover:text-white hover:border-violet-600 rounded-xl text-[10px] font-black transition-all shadow-sm uppercase tracking-widest">View Ledger</button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                            {staffSubTab === 'overview' && renderStaffOverview()}
                            {staffSubTab === 'yearly' && renderStaffYearlySummary()}
                        </div>
                    )}

                        {mgmtView === 'salary_form' && (
                            <SalaryForm
                                onCancel={() => setMgmtView('staff')}
                                isLoading={createSalaryMut.isPending}
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
                    <div className="space-y-6 animate-fadeIn">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Paid (Year)</p>
                                <h3 className="text-2xl font-bold text-gray-900">
                                    ₹{(mySalaryData?.data?.summary?.totalPaid || 0).toLocaleString()}
                                </h3>
                            </div>
                            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
                                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Pending Amount</p>
                                <h3 className="text-2xl font-bold text-amber-700">
                                    ₹{(mySalaryData?.data?.summary?.totalPending || 0).toLocaleString()}
                                </h3>
                            </div>
                        </div>

                        {/* Salary Breakdown Table */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900 font-display">Salary Payout History</h2>
                                <p className="text-xs font-medium text-gray-500">{overviewYear}</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            {['Month', 'Amount', 'Status', 'Paid Date', 'Receipt'].map(h => (
                                                <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {mySalaryLoading ? (
                                            Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                                        ) : (mySalaryData?.data?.salaries || []).length === 0 ? (
                                            <tr><td colSpan={5}><EmptyState icon={FaWallet} title="No salary records" subtitle="Salary records created by admin will appear here." /></td></tr>
                                        ) : (
                                            (mySalaryData?.data?.salaries || []).sort((a, b) => b.month - a.month).map((salary) => {
                                                const isPaid = salary.status === 'PAID';
                                                return (
                                                    <tr key={salary._id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-gray-900">{MONTH_LABELS[salary.month]} {salary.year}</td>
                                                        <td className="px-6 py-4 font-black text-gray-900">₹{salary.amount?.toLocaleString()}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                                isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                                            }`}>
                                                                {salary.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-medium text-gray-500">
                                                            {salary.paidDate ? new Date(salary.paidDate).toLocaleDateString() : '--'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {isPaid ? (
                                                                <button 
                                                                    onClick={() => generateSalaryReceipt(salary, user)}
                                                                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                                    title="Download Receipt"
                                                                >
                                                                    <FaDownload size={14} />
                                                                </button>
                                                            ) : (
                                                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic">Pending</span>
                                                            )}
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
                )}

                {/* ── TAB: Assigned Fees (Student Only) ─────────────── */}
                {activeTab === 'structures' && isStudent && (
                    <div className="space-y-4 animate-fadeIn">
                        {structModal.editData && activeTab === 'structures' ? (
                            <>
                                <button onClick={() => setStructModal({ open: false, editData: null })} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-primary transition-all uppercase tracking-widest">
                                    <FaArrowLeft size={10} /> Back to Assigned Fees
                                </button>
                                <FeeStructureForm
                                    key={structModal.editData._id}
                                    editData={structModal.editData}
                                    onCancel={() => setStructModal({ open: false, editData: null })}
                                    onSubmit={async (data) => {
                                        await handleUpdateStructure({ id: structModal.editData._id, data });
                                        setStructModal({ open: false, editData: null });
                                    }}
                                    isLoading={updateMut.isPending}
                                    isAdmin={isAdmin}
                                />
                            </>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-gray-900 font-display">Assigned Fee Structures</h2>
                                    <p className="text-sm text-gray-500">Overview of fee schemes applicable to your assigned classes.</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="border-b border-gray-100 font-display">
                                                {['Fee Type', 'Structure Name', 'Class', 'Amount', 'Frequency', 'Due Date'].map(h => (
                                                    <th key={h} className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                                ))}
                                                <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 tracking-widest">Status</th>
                                                <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 tracking-widest">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {structLoading ? (
                                                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                                            ) : structures.length === 0 ? (
                                                <tr><td colSpan={8}><EmptyState icon={FaListAlt} title="No fee structures" subtitle="Your classes have no assigned fee structures yet." /></td></tr>
                                            ) : (
                                                structures.map(st => (
                                                    <tr key={st._id} className="hover:bg-gray-50/25 transition-colors group">
                                                        <td className="px-4 py-4">
                                                            <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-lg text-[10px] font-bold uppercase">{FEE_TYPE_LABELS[st.feeType] || st.feeType}</span>
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
                                                                <button onClick={() => setStructModal({ open: false, editData: st })} title="Edit Structure"
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
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: Student Fees ────────────────────────────── */}
                {activeTab === 'student_fees' && isStudent && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Highlights Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: 'Total Payable', val: mySummary.totalDue || 0, icon: <FaWallet />, color: 'blue' },
                                { label: 'Amount Paid', val: mySummary.totalPaid || 0, icon: <FaCheck />, color: 'emerald' },
                                { label: 'Pending Balance', val: mySummary.totalPending || 0, icon: <FaCalendarCheck />, color: 'amber' },
                            ].map((h, i) => (
                                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm group hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl bg-${h.color}-50 text-${h.color}-600 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            {h.icon}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{h.label}</p>
                                            <p className="text-2xl font-black text-gray-900 mt-0.5">₹{h.val.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 font-display">My Fee Records</h2>
                                    <p className="text-gray-500 mt-1">Detailed history of your fee assignments and payments.</p>
                                </div>
                                <select 
                                    value={summaryYear}
                                    onChange={(e) => setSummaryYear(Number(e.target.value))}
                                    className="px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary/20 cursor-pointer"
                                >
                                    {[currentYear, currentYear - 1].map(y => <option key={y} value={y}>Academic Year {y}</option>)}
                                </select>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 italic">
                                            {['Month', 'Fee Name', 'Amount', 'Status', 'Payments'].map(h => (
                                                <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {myFeesLoading ? (
                                            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                                        ) : myFees.length === 0 ? (
                                            <tr><td colSpan={5}><EmptyState icon={FaFileInvoice} title="No fee records" subtitle="No fees have been assigned to you for this period." /></td></tr>
                                        ) : (
                                            myFees.map((f, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-6 py-5 font-bold text-gray-900">{MONTH_LABELS[f.month]}</td>
                                                    <td className="px-6 py-5">
                                                        <div className="font-bold text-gray-900">{f.name}</div>
                                                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{FEE_TYPE_LABELS[f.feeType]}</div>
                                                    </td>
                                                    <td className="px-6 py-5 font-black text-gray-900">₹{f.amount.toLocaleString()}</td>
                                                    <td className="px-6 py-5">
                                                        <StatusBadge status={f.status} />
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        {f.payments?.length > 0 ? (
                                                            <div className="space-y-1">
                                                                {f.payments.map((p, pi) => (
                                                                    <div key={pi} className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md w-fit">
                                                                        <FaReceipt size={10} />
                                                                        <span>₹{p.amount.toLocaleString()} on {new Date(p.date).toLocaleDateString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-gray-400 italic">No payments</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
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
                            <h3 className="text-2xl font-black text-gray-900 text-center mb-2">Update Base Salary</h3>
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
                                        className="flex-1 px-6 py-4 bg-violet-600 text-white font-black rounded-2xl hover:bg-violet-700 shadow-xl shadow-violet-200 transition-all uppercase tracking-widest text-xs disabled:opacity-50">
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
                                {deleteMut.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FaTrash size={12} />}Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Fees;
