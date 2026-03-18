import React, { useState } from 'react';
import { FaTimes, FaMoneyBillWave } from 'react-icons/fa';
import { PAYMENT_MODES, PAYMENT_MODE_LABELS } from '../../features/fees';

const PaymentModal = ({ isOpen, onClose, onSubmit, assignment, isLoading }) => {
    const [form, setForm] = useState({ amount: '', paymentMode: '', transactionRef: '', remarks: '' });
    const [errors, setErrors] = useState({});

    if (!isOpen || !assignment) return null;

    const remaining = assignment.netAmount - assignment.paidAmount;

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = {};
        if (!form.amount || Number(form.amount) < 1) errs.amount = 'Minimum ₹1';
        if (Number(form.amount) > remaining) errs.amount = `Max ₹${remaining}`;
        if (!form.paymentMode) errs.paymentMode = 'Required';
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        onSubmit({
            assignmentId: assignment._id,
            data: {
                amount: Number(form.amount),
                paymentMode: form.paymentMode,
                transactionRef: form.transactionRef || undefined,
                remarks: form.remarks || undefined,
            },
        });
    };

    const inputCls = (field) =>
        `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200'}`;

    return (
        <div className="modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <FaMoneyBillWave className="text-emerald-600" size={16} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
                            <p className="text-xs text-gray-500">Remaining: ₹{remaining.toLocaleString()}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><FaTimes className="text-gray-400" size={16} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Total Fee</span><span className="font-medium">₹{assignment.netAmount?.toLocaleString()}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Paid</span><span className="font-medium text-emerald-600">₹{assignment.paidAmount?.toLocaleString()}</span></div>
                        <div className="flex justify-between text-sm border-t border-gray-200 pt-1 mt-1"><span className="text-gray-500 font-medium">Remaining</span><span className="font-bold text-primary">₹{remaining.toLocaleString()}</span></div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
                        <input type="number" value={form.amount} onChange={(e) => handleChange('amount', e.target.value)}
                            className={inputCls('amount')} placeholder="Enter amount" min={1} max={remaining} />
                        {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode *</label>
                        <select value={form.paymentMode} onChange={(e) => handleChange('paymentMode', e.target.value)} className={inputCls('paymentMode')}>
                            <option value="">Select mode</option>
                            {PAYMENT_MODES.map(m => <option key={m} value={m}>{PAYMENT_MODE_LABELS[m]}</option>)}
                        </select>
                        {errors.paymentMode && <p className="text-xs text-red-500 mt-1">{errors.paymentMode}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Ref</label>
                        <input type="text" value={form.transactionRef} onChange={(e) => handleChange('transactionRef', e.target.value)}
                            className={inputCls('transactionRef')} placeholder="Optional reference" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                        <textarea value={form.remarks} onChange={(e) => handleChange('remarks', e.target.value)}
                            className={inputCls('remarks')} placeholder="Optional notes" rows={2} />
                    </div>
                </form>
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} disabled={isLoading}
                        className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                    <button onClick={handleSubmit} disabled={isLoading}
                        className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                        {isLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Processing...</>
                            : <><FaMoneyBillWave size={12} />Record Payment</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
