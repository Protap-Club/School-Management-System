import React from 'react';
import {
    FaArrowLeft, FaArrowRight, FaHistory, FaMoneyBillWave, FaBan,
    FaFilter, FaDownload, FaFileInvoice, FaListAlt, FaEye, FaChartBar, FaInfoCircle
} from 'react-icons/fa';
import { MONTH_LABELS, FEE_TYPE_LABELS } from '../index';
import { SkeletonRows } from '../../../components/ui/SkeletonRows';
import { EmptyState } from '../../../components/ui/EmptyState';
import FeeStatusBadge from './FeeStatusBadge';
import { generateFeeReport, generateFeeReceipt, generateWaiverNote } from '../../../utils/pdfGenerator';
import { generateFeeExcel } from '../../../utils/excelGenerator';

// ── Student Overview Sub-Tab ─────────────────────────────────────────────────
export const StudentOverviewPanel = ({
    selectedStudent,
    setSelectedStudent,
    studentSummary,
    studentFees,
    studentLoading,
    overviewYear,
    isAdmin,
    setPaymentModal,
    // class-level
    selectedClass,
    setSelectedClass,
    classLoading,
    filteredClassStudents,
    filteredClassSummary,
    feeTypesList,
    overviewType,
    setOverviewType,
    overviewStatus,
    setOverviewStatus,
    overviewPage,
    setOverviewPage,
    OVERVIEW_PER_PAGE,
    overviewMonth,
    exportMenuOpen,
    setExportMenuOpen,
    handleWaive,
    // all-classes level
    isLoadingOverview,
    overviewClasses,
    overviewData,
    setOverviewYear,
    setOverviewMonth,
}) => {
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
                                    <SkeletonRows rows={4} columns={8} />
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
                                            <td className="px-4 py-3"><FeeStatusBadge status={fee.status} /></td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '-'}</td>
                                            <td className="px-4 py-3">
                                                {fee.payments?.length > 0 ? (
                                                    <span className="text-xs text-gray-500">{fee.payments.length} payment{fee.payments.length > 1 ? 's' : ''}</span>
                                                ) : <span className="text-xs text-gray-400">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    {isAdmin && fee.status !== 'PAID' && fee.status !== 'WAIVED' && (
                                                        <button onClick={() => setPaymentModal({ open: true, assignment: { _id: fee.assignmentId, netAmount: fee.amount, paidAmount: fee.paid } })}
                                                            title="Record Payment" className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"><FaMoneyBillWave size={12} /></button>
                                                    )}
                                                    {fee.status === 'PAID' && (
                                                        <button onClick={() => generateFeeReceipt(fee, selectedStudent || { name: selectedStudent.name, email: selectedStudent.email })}
                                                            title="Download Receipt" className="p-1.5 text-primary hover:bg-primary/5 rounded-lg transition-colors"><FaFileInvoice size={12} /></button>
                                                    )}
                                                    {fee.status === 'WAIVED' && (
                                                        <button onClick={() => generateWaiverNote(fee, selectedStudent || { name: selectedStudent.name, email: selectedStudent.email })}
                                                            title="Download Waiver Note" className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"><FaFileInvoice size={12} /></button>
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
                                <select value={overviewType} onChange={(e) => setOverviewType(e.target.value)}
                                    className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 min-w-[100px]">
                                    <option value="">Filter</option>
                                    {feeTypesList.map(t => (
                                        <option key={t.name} value={t.name}>{t.label}</option>
                                    ))}
                                </select>
                                <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
                                <select value={overviewStatus} onChange={(e) => setOverviewStatus(e.target.value)}
                                    className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0">
                                    <option value="all">All Status</option>
                                    <option value="paid">Paid</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                            <div className="relative">
                                <button onClick={() => setExportMenuOpen(!exportMenuOpen)}
                                    className="flex items-center justify-center bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-primary w-10 h-10 rounded-xl transition-all shadow-sm"
                                    title="Download Options">
                                    <FaDownload size={14} />
                                </button>
                                {exportMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)}></div>
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                                            <button onClick={() => { generateFeeReport(filteredClassStudents, filteredClassSummary, selectedClass, overviewMonth, overviewYear); setExportMenuOpen(false); }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors flex items-center gap-2">
                                                <FaFileInvoice size={12} /> Download PDF
                                            </button>
                                            <button onClick={() => { generateFeeExcel(filteredClassStudents, filteredClassSummary, selectedClass, overviewMonth, overviewYear); setExportMenuOpen(false); }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-emerald-600 transition-colors flex items-center gap-2">
                                                <FaListAlt size={12} /> Download XLSX
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
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
                                    <SkeletonRows rows={5} columns={8} />
                                ) : filteredClassStudents.length === 0 ? (
                                    <tr><td colSpan={8}><EmptyState icon={FaEye} title="No students" subtitle="No fee assignments for this class/month" /></td></tr>
                                ) : (
                                    filteredClassStudents
                                        .slice((overviewPage - 1) * OVERVIEW_PER_PAGE, overviewPage * OVERVIEW_PER_PAGE)
                                        .flatMap(student =>
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
                                                    <td className="px-4 py-3"><FeeStatusBadge status={fee.status} /></td>
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
                                                            {fee.status === 'PAID' && (
                                                                <button onClick={() => generateFeeReceipt({ ...fee, standard: selectedClass.standard, section: selectedClass.section }, student)}
                                                                    title="Download Receipt" className="p-1.5 text-primary hover:bg-primary/5 rounded-lg transition-colors"><FaFileInvoice size={12} /></button>
                                                            )}
                                                            {fee.status === 'WAIVED' && (
                                                                <button onClick={() => generateWaiverNote({ ...fee, standard: selectedClass.standard, section: selectedClass.section }, student)}
                                                                    title="Download Waiver Note" className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"><FaFileInvoice size={12} /></button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )
                                )}
                            </tbody>
                        </table>
                        {filteredClassStudents.length > OVERVIEW_PER_PAGE && (
                            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30 rounded-b-2xl">
                                <p className="text-sm text-gray-500">
                                    Showing <span className="font-medium text-gray-900">{(overviewPage - 1) * OVERVIEW_PER_PAGE + 1}</span> to <span className="font-medium text-gray-900">{Math.min(overviewPage * OVERVIEW_PER_PAGE, filteredClassStudents.length)}</span> of <span className="font-medium text-gray-900">{filteredClassStudents.length}</span> students
                                </p>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setOverviewPage(p => Math.max(1, p - 1))} disabled={overviewPage === 1}
                                        className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                        <FaArrowLeft size={12} />
                                    </button>
                                    <div className="flex gap-1">
                                        {Array.from({ length: Math.ceil(filteredClassStudents.length / OVERVIEW_PER_PAGE) }).map((_, i) => (
                                            <button key={i} onClick={() => setOverviewPage(i + 1)}
                                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${overviewPage === i + 1 ? 'bg-primary text-white' : 'text-gray-600 hover:bg-white border border-transparent hover:border-gray-200'}`}>
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => setOverviewPage(p => Math.min(Math.ceil(filteredClassStudents.length / OVERVIEW_PER_PAGE), p + 1))}
                                        disabled={overviewPage === Math.ceil(filteredClassStudents.length / OVERVIEW_PER_PAGE)}
                                        className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                        <FaArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        )}
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
                                <SkeletonRows rows={4} columns={8} />
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
                                                <button onClick={() => setSelectedClass(cls)} className="text-primary hover:underline text-sm font-medium">View Details</button>
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

// ── Student Yearly Summary Sub-Tab ───────────────────────────────────────────
export const StudentYearlySummaryPanel = ({
    yearlyLoading,
    yearlyBreakdown,
    typeBreakdown,
    yearTotal,
    summaryYear,
    setSummaryYear,
}) => {
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
                                    <SkeletonRows rows={6} columns={6} />
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
