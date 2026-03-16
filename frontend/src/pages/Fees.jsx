import React, { useState, useCallback, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import {
    useFeeStructures, useCreateFeeStructure, useUpdateFeeStructure, useDeleteFeeStructure,
    useGenerateAssignments, useAllClassesOverview, useClassOverview, useYearlySummary,
    useMyClassFees, useStudentFeeHistory, useRecordPayment, useUpdateAssignment,
    FEE_TYPES, FEE_TYPE_LABELS, FREQUENCY_LABELS, STATUS_COLORS, MONTH_LABELS,
} from '../features/fees';
import { useAuth } from '../features/auth';
import FeeStructureModal from '../components/fees/FeeStructureModal';
import GenerateAssignmentsModal from '../components/fees/GenerateAssignmentsModal';
import PaymentModal from '../components/fees/PaymentModal';
import {
    FaPlus, FaEdit, FaTrash, FaTrashAlt, FaBolt, FaTimes, FaCheck, FaMoneyBillWave,
    FaChartBar, FaListAlt, FaEye, FaFilter, FaArrowLeft, FaReceipt, FaBan, FaHistory,
} from 'react-icons/fa';

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
    const { user } = useAuth();
    const isAdmin = ['admin', 'super_admin'].includes(user?.role);
    const isTeacher = user?.role === 'teacher';

    const [activeTab, setActiveTab] = useState(isAdmin ? 'structures' : 'overview');
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
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [paymentModal, setPaymentModal] = useState({ open: false, assignment: null });
    const [updateModal, setUpdateModal] = useState({ open: false, assignment: null });

    // Yearly state
    const [summaryYear, setSummaryYear] = useState(currentYear);

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
        isAdmin || isTeacher
    );
    const { data: overviewData, isLoading: overviewLoading } = useAllClassesOverview(overviewYear, overviewMonth, isAdmin);
    const { data: myClassesData, isLoading: myClassesLoading } = useMyClassFees(overviewYear, overviewMonth, isTeacher);

    const { data: classData, isLoading: classLoading } = useClassOverview(
        selectedClass?.standard, selectedClass?.section, overviewYear, overviewMonth
    );
    const { data: yearlyData, isLoading: yearlyLoading } = useYearlySummary(summaryYear, isAdmin);
    const { data: studentData, isLoading: studentLoading } = useStudentFeeHistory(
        selectedStudent?.studentId, overviewYear
    );

    // Mutations
    const createMut = useCreateFeeStructure();
    const updateMut = useUpdateFeeStructure();
    const deleteMut = useDeleteFeeStructure();
    const genMut = useGenerateAssignments();
    const payMut = useRecordPayment();
    const updateAsnMut = useUpdateAssignment();

    const showToast = useCallback((type, text) => {
        setToast({ type, text });
        setTimeout(() => setToast({ type: '', text: '' }), 3500);
    }, []);

    const structures = structData?.data || [];

    const overviewClasses = useMemo(() => {
        if (isAdmin) return overviewData?.data?.classes || [];
        if (isTeacher) {
            return (myClassesData?.data || []).map(c => ({
                standard: c.standard,
                section: c.section,
                totalDue: (c.summary?.totalCollected || 0) + (c.summary?.totalPending || 0) + (c.summary?.totalOverdue || 0),
                totalCollected: c.summary?.totalCollected || 0,
                totalPending: (c.summary?.totalPending || 0) + (c.summary?.totalOverdue || 0),
                studentCount: c.summary?.totalStudents || 0,
            }));
        }
        return [];
    }, [isAdmin, isTeacher, overviewData, myClassesData]);

    const isLoadingOverview = isAdmin ? overviewLoading : myClassesLoading;
    const classStudents = classData?.data?.students || [];
    const classSummary = classData?.data?.summary || {};
    const yearlyBreakdown = yearlyData?.data?.monthlyBreakdown || [];
    const typeBreakdown = yearlyData?.data?.typeBreakdown || [];
    const yearTotal = yearlyData?.data?.yearTotal || {};
    const studentFees = studentData?.data?.fees || [];
    const studentSummary = studentData?.data?.summary || {};

    // Handlers
    const handleCreateStructure = async (data) => {
        try {
            await createMut.mutateAsync(data);
            showToast('success', 'Fee structure created successfully');
            setStructModal({ open: false, editData: null });
        } catch (err) { showToast('error', err?.response?.data?.message || 'Failed to create'); }
    };

    const handleUpdateStructure = async ({ id, data }) => {
        try {
            await updateMut.mutateAsync({ id, data });
            showToast('success', 'Fee structure updated');
            setStructModal({ open: false, editData: null });
        } catch (err) { showToast('error', err?.response?.data?.message || 'Failed to update'); }
    };

    const handleDeleteStructure = async (id) => {
        try {
            await deleteMut.mutateAsync(id);
            showToast('success', 'Fee structure deleted');
            setDeleteConfirm(null);
        } catch (err) { showToast('error', err?.response?.data?.message || 'Failed to delete'); }
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
        <button key={tab} onClick={() => { setActiveTab(tab); setSelectedClass(null); setSelectedStudent(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {icon}{label}
        </button>
    );

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
                    <h1 className="text-3xl font-bold text-gray-900">Fees Management</h1>
                    <p className="text-gray-500 mt-1">Configure fee structures, generate assignments, and track payments</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    {renderTabBtn('structures', <FaListAlt size={12} />, isAdmin ? 'Fee Structures' : 'Assigned Fees')}
                    {renderTabBtn('overview', <FaEye size={12} />, 'Overview')}
                    {isAdmin && renderTabBtn('yearly', <FaChartBar size={12} />, 'Yearly Summary')}
                </div>

                {/* ── TAB: Fee Structures ────────────────────────────── */}
                {activeTab === 'structures' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-gray-200 p-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                </div>
                                {isAdmin && (
                                    <button onClick={() => setStructModal({ open: true, editData: null })}
                                        className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-xl transition-colors shadow-sm">
                                        <FaPlus size={12} />Add Fee Structure
                                    </button>
                                )}
                            </div>
                            {/* Filters */}
                            <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 mb-4">
                                <div className="flex items-center gap-2">
                                    <FaFilter className="text-gray-400" size={11} />
                                    <span className="text-xs font-medium text-gray-500 uppercase">Filters:</span>
                                </div>
                                <input type="number" placeholder="Year" value={structFilters.academicYear}
                                    onChange={(e) => setStructFilters(p => ({ ...p, academicYear: e.target.value }))}
                                    className="px-2 py-1 text-sm border border-gray-200 rounded-lg w-20 focus:ring-primary focus:border-primary" />
                                <input type="text" placeholder="Standard" value={structFilters.standard}
                                    onChange={(e) => setStructFilters(p => ({ ...p, standard: e.target.value }))}
                                    className="px-2 py-1 text-sm border border-gray-200 rounded-lg w-24 focus:ring-primary focus:border-primary" />
                                <input type="text" placeholder="Section" value={structFilters.section}
                                    onChange={(e) => setStructFilters(p => ({ ...p, section: e.target.value }))}
                                    className="px-2 py-1 text-sm border border-gray-200 rounded-lg w-20 focus:ring-primary focus:border-primary" />
                                <select value={structFilters.feeType} onChange={(e) => setStructFilters(p => ({ ...p, feeType: e.target.value }))}
                                    className="px-2 py-1 text-sm border border-gray-200 rounded-lg focus:ring-primary focus:border-primary">
                                    <option value="">All Types</option>
                                    {FEE_TYPES.map(t => <option key={t} value={t}>{FEE_TYPE_LABELS[t]}</option>)}
                                </select>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            {['Fee Type', 'Name', 'Class', 'Amount', 'Frequency', 'Due Day'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {structLoading ? (
                                            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                                        ) : structures.length === 0 ? (
                                            <tr><td colSpan={8}><EmptyState icon={FaListAlt} title="No fee structures found" subtitle="Create a fee structure to get started" /></td></tr>
                                        ) : (
                                            structures.map(st => (
                                                <tr key={st._id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-1 bg-primary/5 text-primary rounded-md text-xs font-medium">{FEE_TYPE_LABELS[st.feeType] || st.feeType}</span>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-gray-900">{st.name}</td>
                                                    <td className="px-4 py-3 text-gray-600">{st.standard}-{st.section}</td>
                                                    <td className="px-4 py-3 font-semibold text-gray-900">₹{st.amount?.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-gray-600">{FREQUENCY_LABELS[st.frequency] || st.frequency}</td>
                                                    <td className="px-4 py-3 text-gray-600">{st.dueDay}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${st.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {st.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {(isAdmin || isTeacher) && (
                                                                <>
                                                                    <button onClick={() => setGenModal({ open: true, structure: st })} title="Generate Assignments"
                                                                        className="p-2 text-violet-500 hover:bg-violet-50 rounded-lg transition-colors"><FaBolt size={13} /></button>
                                                                    <button onClick={() => setStructModal({ open: true, editData: st })} title="Edit Structure"
                                                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><FaEdit size={13} /></button>
                                                                    <button onClick={() => setDeleteConfirm(st._id)} title="Delete Structure"
                                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FaTrashAlt size={13} /></button>
                                                                </>
                                                            )}
                                                        </div>
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

                {/* ── TAB: Overview ──────────────────────────────────── */}
                {activeTab === 'overview' && !selectedClass && !selectedStudent && (
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
                )}

                {/* Class Detail View */}
                {activeTab === 'overview' && selectedClass && !selectedStudent && (
                    <div className="space-y-4">
                        <button onClick={() => setSelectedClass(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                            <FaArrowLeft size={12} />Back to All Classes
                        </button>
                        <div className="bg-white rounded-2xl border border-gray-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Class {selectedClass.standard}-{selectedClass.section}</h2>
                                    <p className="text-sm text-gray-500">{MONTH_LABELS[overviewMonth]} {overviewYear}</p>
                                </div>
                                <div className="flex gap-4 text-sm">
                                    <div className="text-center px-4 py-2 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500">Students</p><p className="text-lg font-bold">{classSummary.totalStudents || 0}</p></div>
                                    <div className="text-center px-4 py-2 bg-emerald-50 rounded-xl"><p className="text-xs text-gray-500">Collected</p><p className="text-lg font-bold text-emerald-600">₹{(classSummary.totalCollected || 0).toLocaleString()}</p></div>
                                    <div className="text-center px-4 py-2 bg-amber-50 rounded-xl"><p className="text-xs text-gray-500">Pending</p><p className="text-lg font-bold text-amber-600">₹{(classSummary.totalPending || 0).toLocaleString()}</p></div>
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
                                        ) : classStudents.length === 0 ? (
                                            <tr><td colSpan={8}><EmptyState icon={FaEye} title="No students" subtitle="No fee assignments for this class/month" /></td></tr>
                                        ) : (
                                            classStudents.flatMap(student =>
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
                                                                {(isAdmin || isTeacher) && fee.status !== 'PAID' && fee.status !== 'WAIVED' && (
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
                )}

                {/* Student History View */}
                {activeTab === 'overview' && selectedStudent && (
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
                                                        {(isAdmin || isTeacher) && fee.status !== 'PAID' && fee.status !== 'WAIVED' && (
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
                )}

                {/* ── TAB: Yearly Summary ────────────────────────────── */}
                {activeTab === 'yearly' && (
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
                        </div>

                        {/* Sidebar: Breakdown by Type */}
                        <div className="space-y-6">
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
                                                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full" style={{ width: `${item.collectionRate}%` }}></div>
                                                </div>
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
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
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modals ────────────────────────────────────────────── */}
            <FeeStructureModal
                isOpen={structModal.open}
                onClose={() => setStructModal({ open: false, editData: null })}
                onSubmit={structModal.editData ? handleUpdateStructure : handleCreateStructure}
                editData={structModal.editData}
                isLoading={createMut.isPending || updateMut.isPending}
            />
            <GenerateAssignmentsModal
                isOpen={genModal.open}
                onClose={() => setGenModal({ open: false, structure: null })}
                onSubmit={handleGenerate}
                structure={genModal.structure}
                isLoading={genMut.isPending}
            />
            <PaymentModal
                isOpen={paymentModal.open}
                onClose={() => setPaymentModal({ open: false, assignment: null })}
                onSubmit={handlePayment}
                assignment={paymentModal.assignment}
                isLoading={payMut.isPending}
            />

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
