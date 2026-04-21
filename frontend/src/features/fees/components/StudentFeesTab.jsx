import React from 'react';
import { FaWallet, FaCheck, FaCalendarCheck, FaFileInvoice, FaReceipt } from 'react-icons/fa';
import { SkeletonRows } from '../../../components/ui/SkeletonRows';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FEE_TYPE_LABELS, MONTH_LABELS } from '../index';
import FeeStatusBadge from './FeeStatusBadge';
import { generateFeeReceipt, generateWaiverNote, generatePenaltyReceipt, generatePenaltyWaiver } from '../../../utils/pdfGenerator';



const currentYear = new Date().getFullYear();

const StudentFeesTab = ({
    myFees = [],
    myFeesLoading = false,
    myPenalties = [],
    myPenaltiesLoading = false,
    mySummary = {},
    myPenaltySummary = {},
    summaryYear,
    setSummaryYear,
}) => (
    <div className="space-y-6 animate-fadeIn pb-12">
        {/* Highlights Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
                { label: 'Total Fees', val: mySummary.totalDue || 0, icon: <FaWallet />, color: 'blue' },
                { label: 'Penalties', val: myPenaltySummary.totalAssigned || 0, icon: <FaWallet />, color: 'red' },
                { label: 'Balance Paid', val: (mySummary.totalPaid || 0) + (myPenaltySummary.totalCollected || 0), icon: <FaCheck />, color: 'emerald' },
                { label: 'Net Pending', val: (mySummary.totalPending || 0) + (myPenaltySummary.totalPending || 0), icon: <FaCalendarCheck />, color: 'amber' },
            ].map((h, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-${h.color}-50 text-${h.color}-600 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            {h.icon}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{h.label}</p>
                            <p className="text-xl font-black text-gray-900">₹{h.val.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Fees Section */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 font-display">My Fee Records</h2>
                    <p className="text-gray-500 text-sm mt-1 font-medium">Detailed history of your fee assignments and payments.</p>
                </div>
                <select 
                    value={summaryYear}
                    onChange={(e) => setSummaryYear(Number(e.target.value))}
                    className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-700 focus:ring-2 focus:ring-primary/20 cursor-pointer uppercase tracking-widest"
                >
                    {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y} value={y}>{y} - {y + 1}</option>)}
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="border-b border-gray-100 italic">
                            {['Month', 'Fee Name', 'Amount', 'Status', 'Payments', 'Actions'].map(h => (
                                <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {myFeesLoading ? (
                            <SkeletonRows rows={3} columns={5} />
                        ) : myFees.length === 0 ? (
                            <tr><td colSpan={5}><EmptyState icon={FaFileInvoice} title="No fee records" subtitle="No fees assigned for this period." /></td></tr>
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
                                        <FeeStatusBadge status={f.status} />
                                    </td>
                                    <td className="px-6 py-5">
                                        {f.payments?.length > 0 ? (
                                            <div className="space-y-1">
                                                {f.payments.map((p, pi) => (
                                                    <div key={pi} className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md w-fit">
                                                        <FaReceipt size={10} />
                                                        <span>₹{p.amount.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-bold text-gray-400 italic font-medium">No payments</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            {f.status === 'PAID' && (
                                                <button onClick={() => generateFeeReceipt(f, { name: 'Student' })} 
                                                    title="Download Receipt" className="p-2 text-primary hover:bg-primary/5 rounded-xl transition-all"><FaFileInvoice size={14} /></button>
                                            )}
                                            {f.status === 'WAIVED' && (
                                                <button onClick={() => generateWaiverNote(f, { name: 'Student' })} 
                                                    title="Download Waiver Note" className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"><FaFileInvoice size={14} /></button>
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

        {/* Penalties Section */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm border-l-[6px] border-l-red-500">
            <div className="mb-8">
                <h2 className="text-2xl font-black text-gray-900 font-display">My Penalties</h2>
                <p className="text-gray-500 text-sm mt-1 font-medium">History of assigned penalties, fines and their status.</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="border-b border-gray-100 italic">
                            {['Reason', 'Type', 'Amount', 'Date', 'Status', 'Actions'].map(h => (
                                <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {myPenaltiesLoading ? (
                            <SkeletonRows rows={3} columns={5} />
                        ) : myPenalties.length === 0 ? (
                            <tr><td colSpan={5}><EmptyState icon={FaReceipt} title="No penalties" subtitle="You have no penalty records for this year." /></td></tr>
                        ) : (
                            myPenalties.map((p, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="font-bold text-gray-900">{p.reason}</div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm border border-amber-100">
                                            {String(p.penaltyType).replaceAll('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 font-black text-red-600 font-display text-lg">₹{p.amount.toLocaleString()}</td>
                                    <td className="px-6 py-5 text-gray-500 font-bold text-xs">
                                        {new Date(p.occurrenceDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-5">
                                        <FeeStatusBadge status={p.status} />
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            {p.status === 'PAID' && (
                                                <button onClick={() => generatePenaltyReceipt(p, { name: 'Student' })} 
                                                    title="Download Receipt" className="p-2 text-primary hover:bg-primary/5 rounded-xl transition-all"><FaFileInvoice size={14} /></button>
                                            )}
                                            {p.status === 'WAIVED' && (
                                                <button onClick={() => generatePenaltyWaiver(p, { name: 'Student' })} 
                                                    title="Download Waiver Note" className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"><FaFileInvoice size={14} /></button>
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

export default StudentFeesTab;
