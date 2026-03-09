import React, { useState, useCallback } from 'react';
import { FaTimes, FaCheck, FaPlus, FaSave } from 'react-icons/fa';
import {
    FEE_TYPES, FEE_TYPE_LABELS, FREQUENCY_OPTIONS, FREQUENCY_LABELS,
} from '../../features/fees';

const INITIAL_FORM = {
    academicYear: new Date().getFullYear(),
    standard: '',
    section: '',
    feeType: '',
    name: '',
    amount: '',
    frequency: '',
    dueDay: 10,
    applicableMonths: [],
};

const MONTHS = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
];

const FeeStructureModal = ({ isOpen, onClose, onSubmit, editData, isLoading }) => {
    const isEdit = !!editData;
    const [form, setForm] = useState(() => {
        if (editData) {
            return {
                academicYear: editData.academicYear || new Date().getFullYear(),
                standard: editData.standard || '',
                section: editData.section || '',
                feeType: editData.feeType || '',
                name: editData.name || '',
                amount: editData.amount || '',
                frequency: editData.frequency || '',
                dueDay: editData.dueDay || 10,
                applicableMonths: editData.applicableMonths || [],
                isActive: editData.isActive !== undefined ? editData.isActive : true,
            };
        }
        return { ...INITIAL_FORM };
    });
    const [errors, setErrors] = useState({});

    const handleChange = useCallback((field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    }, []);

    const toggleMonth = useCallback((month) => {
        setForm(prev => ({
            ...prev,
            applicableMonths: prev.applicableMonths.includes(month)
                ? prev.applicableMonths.filter(m => m !== month)
                : [...prev.applicableMonths, month],
        }));
    }, []);

    const validate = () => {
        const e = {};
        if (!form.standard.trim()) e.standard = 'Required';
        if (!form.section.trim()) e.section = 'Required';
        if (!form.feeType) e.feeType = 'Required';
        if (!form.name.trim()) e.name = 'Required';
        if (!form.amount || Number(form.amount) < 0) e.amount = 'Valid amount required';
        if (!form.frequency) e.frequency = 'Required';
        if (!form.academicYear || form.academicYear < 2000) e.academicYear = 'Valid year required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        const payload = {
            ...form,
            amount: Number(form.amount),
            academicYear: Number(form.academicYear),
            dueDay: Number(form.dueDay),
        };
        if (isEdit) {
            // Only send updatable fields
            const { academicYear, standard, section, feeType, ...updateData } = payload;
            onSubmit({ id: editData._id, data: updateData });
        } else {
            onSubmit(payload);
        }
    };

    if (!isOpen) return null;

    const inputCls = (field) =>
        `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200'}`;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            {isEdit ? <FaSave className="text-primary" size={16} /> : <FaPlus className="text-primary" size={16} />}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Fee Structure' : 'Add Fee Structure'}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><FaTimes className="text-gray-400" size={16} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year *</label>
                            <input type="number" value={form.academicYear} onChange={(e) => handleChange('academicYear', e.target.value)}
                                className={inputCls('academicYear')} disabled={isEdit} min={2000} max={2100} />
                            {errors.academicYear && <p className="text-xs text-red-500 mt-1">{errors.academicYear}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Standard *</label>
                            <input type="text" value={form.standard} onChange={(e) => handleChange('standard', e.target.value)}
                                className={inputCls('standard')} placeholder="e.g. 10" disabled={isEdit} />
                            {errors.standard && <p className="text-xs text-red-500 mt-1">{errors.standard}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Section *</label>
                            <input type="text" value={form.section} onChange={(e) => handleChange('section', e.target.value)}
                                className={inputCls('section')} placeholder="e.g. A" disabled={isEdit} />
                            {errors.section && <p className="text-xs text-red-500 mt-1">{errors.section}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Fee Type *</label>
                            <select value={form.feeType} onChange={(e) => handleChange('feeType', e.target.value)}
                                className={inputCls('feeType')} disabled={isEdit}>
                                <option value="">Select type</option>
                                {FEE_TYPES.map(t => <option key={t} value={t}>{FEE_TYPE_LABELS[t]}</option>)}
                            </select>
                            {errors.feeType && <p className="text-xs text-red-500 mt-1">{errors.feeType}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Fee Name *</label>
                            <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)}
                                className={inputCls('name')} placeholder="e.g. Monthly Tuition" />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
                            <input type="number" value={form.amount} onChange={(e) => handleChange('amount', e.target.value)}
                                className={inputCls('amount')} placeholder="0" min={0} />
                            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Frequency *</label>
                            <select value={form.frequency} onChange={(e) => handleChange('frequency', e.target.value)} className={inputCls('frequency')}>
                                <option value="">Select</option>
                                {FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}
                            </select>
                            {errors.frequency && <p className="text-xs text-red-500 mt-1">{errors.frequency}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Due Day</label>
                            <input type="number" value={form.dueDay} onChange={(e) => handleChange('dueDay', e.target.value)}
                                className={inputCls('dueDay')} min={1} max={28} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Applicable Months</label>
                        <div className="flex flex-wrap gap-2">
                            {MONTHS.map(m => (
                                <button key={m.value} type="button" onClick={() => toggleMonth(m.value)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${form.applicableMonths.includes(m.value) ? 'bg-primary/10 border-primary/30 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {isEdit && (
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => handleChange('isActive', e.target.checked)}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
                            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
                        </div>
                    )}
                </form>
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                    <button onClick={onClose} disabled={isLoading}
                        className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                    <button onClick={handleSubmit} disabled={isLoading}
                        className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                        {isLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>
                            : <>{isEdit ? <FaSave size={12} /> : <FaPlus size={12} />}{isEdit ? 'Update' : 'Create'}</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeeStructureModal;
