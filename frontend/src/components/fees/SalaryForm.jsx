import React, { useState, useCallback, useEffect } from 'react';
import { FaTimes, FaPlus, FaArrowLeft } from 'react-icons/fa';
import { MONTH_LABELS } from '../../features/fees';
import { useUsers } from '../../features/users/api/queries';

const INITIAL_FORM = {
    teacherId: '',
    amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
};

const SalaryForm = ({ onCancel, onSubmit, isLoading }) => {
    const [form, setForm] = useState({ ...INITIAL_FORM });
    const [errors, setErrors] = useState({});

    // Fetch teachers for the dropdown
    const { data: teachersData, isLoading: teachersLoading } = useUsers({ role: 'teacher', pageSize: 100 });
    const teachers = teachersData?.data?.users || [];

    const handleChange = useCallback((field, value) => {
        setForm(prev => {
            const next = { ...prev, [field]: value };
            
            // Auto-populate amount if teacher is selected and has expectedSalary
            if (field === 'teacherId' && value) {
                const selectedTeacher = teachers.find(t => String(t._id) === String(value));
                if (selectedTeacher?.profile?.expectedSalary) {
                    next.amount = selectedTeacher.profile.expectedSalary;
                }
            }
            return next;
        });
        setErrors(prev => ({ ...prev, [field]: '' }));
    }, [teachers]);

    const validate = () => {
        const e = {};
        if (!form.teacherId) e.teacherId = 'Required';
        if (!form.amount || Number(form.amount) < 0) e.amount = 'Valid amount required';
        if (!form.month) e.month = 'Required';
        if (!form.year || form.year < 2000) e.year = 'Valid year required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        onSubmit({
            ...form,
            amount: Number(form.amount),
            month: Number(form.month),
            year: Number(form.year),
        });
    };

    const inputCls = (field) =>
        `w-full px-3 py-1.5 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/10'}`;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-fadeIn shadow-sm max-w-md">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                    <button onClick={onCancel} className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-100">
                        <FaArrowLeft size={10} />
                    </button>
                    <h3 className="text-sm font-black text-gray-900 tracking-tight">Add Teacher Salary Entry</h3>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
                {/* Row 1: Teacher Select */}
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Select Teacher *</label>
                    <select 
                        value={form.teacherId} 
                        onChange={(e) => handleChange('teacherId', e.target.value)}
                        className={inputCls('teacherId')}
                        disabled={teachersLoading}
                    >
                        <option value="" disabled hidden>{teachersLoading ? 'Loading teachers...' : 'Select Teacher'}</option>
                        {teachers.map(t => (
                            <option key={t._id} value={t._id}>
                                {t.name} ({t.email})
                            </option>
                        ))}
                    </select>
                    {errors.teacherId && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{errors.teacherId}</p>}
                </div>

                {/* Row 2: Amount, Month, Year */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Salary (₹) *</label>
                        <input 
                            type="number" 
                            value={form.amount} 
                            onChange={(e) => handleChange('amount', e.target.value)}
                            className={inputCls('amount')} 
                            placeholder="0" 
                            min={0} 
                        />
                        {errors.amount && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{errors.amount}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Month *</label>
                        <select 
                            value={form.month} 
                            onChange={(e) => handleChange('month', e.target.value)} 
                            className={inputCls('month')}
                        >
                            <option value="" disabled hidden>Month</option>
                            {MONTH_LABELS.map((label, idx) => idx > 0 && (
                                <option key={idx} value={idx}>{label}</option>
                            ))}
                        </select>
                        {errors.month && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{errors.month}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Year *</label>
                        <input 
                            type="number" 
                            value={form.year} 
                            onChange={(e) => handleChange('year', e.target.value)}
                            className={inputCls('year')} 
                            min={2000} 
                            max={2100} 
                        />
                        {errors.year && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{errors.year}</p>}
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex gap-3">
                    <button 
                        type="button" 
                        onClick={onCancel} 
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 border-2 border-gray-100 text-gray-400 text-[10px] font-black rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 uppercase tracking-widest"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-[10px] font-black rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 group uppercase tracking-widest"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span className="flex items-center gap-1.5">
                                <FaPlus size={12} className="group-hover:rotate-90 transition-transform" />
                                Create Salary
                            </span>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SalaryForm;
