import React from 'react';
import { FaWallet, FaCheck, FaCalendarCheck, FaFileInvoice, FaReceipt } from 'react-icons/fa';
import { SkeletonRows } from '../../../components/ui/SkeletonRows';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FEE_TYPE_LABELS, MONTH_LABELS, STATUS_COLORS } from '../index';

const StatusBadge = ({ status }) => {
    const c = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>{status}
        </span>
    );
};

const currentYear = new Date().getFullYear();

const StudentFeesTab = ({
    myFees,
    myFeesLoading,
    mySummary,
    summaryYear,
    setSummaryYear,
}) => (
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
                            <SkeletonRows rows={5} columns={5} />
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
);

export default StudentFeesTab;
