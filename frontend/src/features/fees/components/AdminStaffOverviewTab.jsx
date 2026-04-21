import React from 'react';
import { FaArrowLeft, FaArrowRight, FaChartBar } from 'react-icons/fa';
import { MONTH_LABELS } from '../index';
import { SkeletonRows } from '../../../components/ui/SkeletonRows';
import { EmptyState } from '../../../components/ui/EmptyState';

// ── Staff Overview Sub-Tab ───────────────────────────────────────────────────
export const StaffOverviewPanel = ({
    salaryData,
    salariesLoading,
    overviewYear,
}) => {
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
                        <p className="text-xs text-gray-500 font-medium">Aggregated salary data for {overviewYear} - {overviewYear + 1}</p>
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
                                <SkeletonRows rows={4} columns={4} />
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

// ── Staff Yearly Summary Sub-Tab ─────────────────────────────────────────────
export const StaffYearlySummaryPanel = ({
    salaryData,
    salariesLoading,
    teachersData,
    teachersLoading,
    setActiveTab,
    setMgmtView,
    setStaffSubTab,
}) => {
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
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
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
                                <button onClick={() => { setActiveTab('management'); setMgmtView('staff'); setStaffSubTab('dashboard'); }}
                                    className="w-full mt-2 py-4 bg-primary/10 hover:bg-primary hover:text-white text-primary font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all border border-primary/20 flex items-center justify-center gap-2 shadow-sm">
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
