import React from 'react';
import { FaWallet, FaDownload, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { SkeletonRows } from '../../../components/ui/SkeletonRows';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MONTH_LABELS } from '../index';
import { generateSalaryReceipt } from '../../../utils/pdfGenerator';

const TeacherSalaryTab = ({
    mySalaryData,
    mySalaryLoading,
    overviewYear,
    setOverviewYear,
    user,
}) => (
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
                <div className="flex items-center gap-2">
                    <button onClick={() => setOverviewYear(y => y - 1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-500 hover:text-gray-800">
                        <FaChevronLeft size={12} />
                    </button>
                    <span className="text-xs font-black text-gray-700 tracking-wide min-w-[90px] text-center">{overviewYear} - {overviewYear + 1}</span>
                    <button onClick={() => setOverviewYear(y => y + 1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-500 hover:text-gray-800">
                        <FaChevronRight size={12} />
                    </button>
                </div>
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
                            <SkeletonRows rows={3} columns={4} />
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
);

export default TeacherSalaryTab;
