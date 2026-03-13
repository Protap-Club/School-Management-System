import React, { useState, useCallback, useEffect } from 'react';
import { FaTimes, FaCheck, FaPlus, FaSave, FaArrowLeft } from 'react-icons/fa';
import {
    FEE_TYPES, FEE_TYPE_LABELS, FREQUENCY_OPTIONS, FREQUENCY_LABELS,
} from '../../features/fees';
import { useFeeStructures, useCreateFeeStructure, useUpdateFeeStructure, useFeeTypes } from '../../features/fees/api/queries';
import FeeTypeSideCard from './FeeTypeSideCard';

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

const FeeStructureForm = ({ onCancel, onSubmit, editData, isLoading }) => {
    const isEdit = !!editData;
    const [form, setForm] = useState(() => {
        const initial = editData ? {
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
        } : { ...INITIAL_FORM };
        return initial;
    });

    const [showSideCard, setShowSideCard] = useState(false);
    const { data: feeTypesResp } = useFeeTypes();
    
    // Combine hardcoded defaults with backend types
    const feeTypes = React.useMemo(() => {
        const backendTypes = feeTypesResp?.data || [];
        const defaults = FEE_TYPES.map(name => ({
            name,
            label: FEE_TYPE_LABELS[name],
            isDefault: true
        }));

        // Merge and remove duplicates by name
        const combined = [...defaults];
        backendTypes.forEach(bt => {
            if (!combined.find(c => c.name === bt.name)) {
                combined.push(bt);
            }
        });

        // Ensure currently selected but unsaved type is visible
        if (form.feeType && !combined.find(c => c.name === form.feeType)) {
            combined.push({
                name: form.feeType,
                label: form.feeType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
                isTemp: true
            });
        }

        return combined;
    }, [feeTypesResp, form.feeType]);

    useEffect(() => {
        if (editData) {
            setForm({
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
            });
        } else {
            setForm({ ...INITIAL_FORM });
        }
        setErrors({});
    }, [editData]);
    const [errors, setErrors] = useState({});

    const handleChange = useCallback((field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    }, []);

    const toggleMonth = useCallback((month) => {
        setForm(prev => {
            const isSelected = prev.applicableMonths.includes(month);
            let nextMonths = isSelected
                ? prev.applicableMonths.filter(m => m !== month)
                : [...prev.applicableMonths, month];

            if (prev.frequency === 'QUARTERLY' && nextMonths.length > 4) return prev;
            if ((prev.frequency === 'YEARLY' || prev.frequency === 'ONE_TIME') && nextMonths.length > 1) {
                if (!isSelected) nextMonths = [month];
                else return prev;
            }

            return { ...prev, applicableMonths: nextMonths };
        });
    }, []);

    useEffect(() => {
        setForm(prev => {
            let nextMonths = [...prev.applicableMonths];
            if (prev.frequency === 'QUARTERLY' && nextMonths.length > 4) {
                nextMonths = nextMonths.slice(0, 4);
            } else if ((prev.frequency === 'YEARLY' || prev.frequency === 'ONE_TIME') && nextMonths.length > 1) {
                nextMonths = nextMonths.slice(0, 1);
            }
            if (nextMonths.length !== prev.applicableMonths.length) {
                return { ...prev, applicableMonths: nextMonths };
            }
            return prev;
        });
    }, [form.frequency]);

    const validate = () => {
        const e = {};
        if (!form.standard) e.standard = 'Required';
        if (!form.section) e.section = 'Required';
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
            name: form.name.charAt(0).toUpperCase() + form.name.slice(1),
            amount: Number(form.amount),
            academicYear: Number(form.academicYear),
            dueDay: Number(form.dueDay),
        };
        if (isEdit) {
            const { academicYear, standard, section, feeType, ...updateData } = payload;
            onSubmit(updateData);
        } else {
            onSubmit(payload);
        }
    };

    const inputCls = (field) =>
        `w-full px-3 py-1.5 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/10'}`;

    return (
        <div className="flex items-start gap-6 max-w-6xl mx-auto">
            <div className={`bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden transition-all duration-500 ${showSideCard ? 'w-[700px]' : 'w-full max-w-2xl mx-auto'}`}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                    <button onClick={onCancel} className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-100">
                        <FaArrowLeft size={10} />
                    </button>
                    <h3 className="text-sm font-black text-gray-900 tracking-tight">{isEdit ? 'Edit Fee Structure' : 'Add Fee Structure'}</h3>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* Row 1: Academic, Std, Sect */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Academic Year *</label>
                        <input type="number" value={form.academicYear} onChange={(e) => handleChange('academicYear', e.target.value)}
                            className={inputCls('academicYear')} disabled={isEdit} min={2000} max={2100} />
                        {errors.academicYear && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{errors.academicYear}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Standard *</label>
                        <select value={form.standard} onChange={(e) => handleChange('standard', e.target.value)}
                            className={inputCls('standard')} disabled={isEdit}>
                            <option value="" disabled hidden></option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {errors.standard && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{errors.standard}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Section *</label>
                        <select value={form.section} onChange={(e) => handleChange('section', e.target.value)}
                            className={inputCls('section')} disabled={isEdit}>
                            <option value="" disabled hidden></option>
                            {['A', 'B', 'C'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {errors.section && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{errors.section}</p>}
                    </div>
                </div>

                {/* Row 2: Type, Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Fee Type *</label>
                        <div>
                            <select
                                value={form.feeType}
                                onChange={(e) => {
                                    if (e.target.value === 'ADD_NEW') {
                                        setShowSideCard(true);
                                    } else {
                                        handleChange('feeType', e.target.value);
                                    }
                                }}
                                className={inputCls('feeType')}
                                disabled={isEdit}
                            >
                                <option value="" disabled hidden>Select Type</option>
                                <option value="ADD_NEW" className="text-primary font-bold tracking-tight">+ Add Fee Type</option>
                                {feeTypes.map(t => (
                                    <option key={t.name} value={t.name}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        {errors.feeType && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{errors.feeType}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Fee Name *</label>
                        <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)}
                            className={inputCls('name')} placeholder="e.g. Monthly Tuition" />
                        {errors.name && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{errors.name}</p>}
                    </div>
                </div>

                {/* Row 3: Amount, Frequency, DueDay */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Amount (₹) *</label>
                        <input type="number" value={form.amount} onChange={(e) => handleChange('amount', e.target.value)}
                            className={inputCls('amount')} placeholder="0" min={0} />
                        {errors.amount && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{errors.amount}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Frequency *</label>
                        <select value={form.frequency} onChange={(e) => handleChange('frequency', e.target.value)} className={inputCls('frequency')}>
                            <option value="" disabled hidden></option>
                            {FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}
                        </select>
                        {errors.frequency && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{errors.frequency}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Due Date</label>
                        <input type="number" value={form.dueDay} onChange={(e) => handleChange('dueDay', e.target.value)}
                            className={inputCls('dueDay')} min={1} max={28} />
                    </div>
                </div>

                <div className="pt-2">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">Applicable Months</label>
                        {form.frequency === 'QUARTERLY' && (
                            <span className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100 animate-pulse">
                                select any 4 month
                            </span>
                        )}
                        {(form.frequency === 'YEARLY' || form.frequency === 'ONE_TIME') && (
                            <span className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100 animate-pulse">
                                select any 1 month
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                        {MONTHS.map(m => (
                            <button key={m.value} type="button" onClick={() => toggleMonth(m.value)}
                                className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${form.applicableMonths.includes(m.value) ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {isEdit && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 mx-0.5">
                        <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => handleChange('isActive', e.target.checked)}
                            className="w-5 h-5 text-primary border-gray-300 rounded-lg focus:ring-primary cursor-pointer" />
                        <label htmlFor="isActive" className="text-xs font-black text-gray-600 cursor-pointer uppercase tracking-widest">Enable fee structure status</label>
                    </div>
                )}

                <div className="pt-6 border-t border-gray-100 flex gap-4">
                    <button type="button" onClick={onCancel} disabled={isLoading}
                        className="flex-1 px-8 py-3.5 border-2 border-gray-100 text-gray-500 text-xs font-black rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 uppercase tracking-widest">Cancel</button>
                    <button type="submit" disabled={isLoading}
                        className="flex-1 px-8 py-3.5 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 group uppercase tracking-widest">
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span className="flex items-center gap-2">
                                <FaPlus size={12} className="group-hover:rotate-90 transition-transform" />
                                {isEdit ? 'Update Structure' : 'Create Structure'}
                            </span>
                        )}
                    </button>
                </div>
                </form>
            </div>

            {showSideCard && (
                <div className="mt-20">
                    <FeeTypeSideCard 
                        onClose={() => setShowSideCard(false)} 
                        onSuccess={(newType) => {
                            handleChange('feeType', newType);
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default FeeStructureForm;
