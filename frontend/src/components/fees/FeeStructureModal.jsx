import React, { useState, useCallback } from 'react';
import { FaTimes, FaCheck, FaPlus, FaSave } from 'react-icons/fa';
import {
    FEE_TYPES, FEE_TYPE_LABELS, FREQUENCY_OPTIONS, FREQUENCY_LABELS,
} from '../../features/fees';
import { useFeeTypes } from '../../features/fees/api/queries';
import { useSchoolClasses } from '../../hooks/useSchoolClasses';

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

const normalizeStandard = (value) => String(value || '').trim();
const normalizeSection = (value) => String(value || '').trim().toUpperCase();

const FeeStructureModal = ({ isOpen, onClose, onSubmit, editData, isLoading, isAdmin }) => {
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

    const { data: feeTypesResp } = useFeeTypes({ enabled: isAdmin && isOpen });
    const { availableStandards, allUniqueSections, getSectionsForStandard } = useSchoolClasses({ enabled: isAdmin && isOpen });
    
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

    const standardOptions = React.useMemo(() => {
        const merged = new Set((availableStandards || []).map(normalizeStandard).filter(Boolean));
        const current = normalizeStandard(form.standard);
        if (current) merged.add(current);
        return Array.from(merged).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [availableStandards, form.standard]);

    const sectionOptions = React.useMemo(() => {
        const selectedStandard = normalizeStandard(form.standard);
        const source = selectedStandard ? getSectionsForStandard(selectedStandard) : allUniqueSections;
        const merged = new Set((source || []).map(normalizeSection).filter(Boolean));
        const current = normalizeSection(form.section);
        if (current) merged.add(current);
        return Array.from(merged).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }, [allUniqueSections, form.standard, form.section, getSectionsForStandard]);
    const [errors, setErrors] = useState({});

    const handleChange = useCallback((field, value) => {
        const nextValue = field === 'section' ? normalizeSection(value) : value;
        setForm(prev => ({ ...prev, [field]: nextValue }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    }, []);

    const toggleMonth = useCallback((month) => {
        setForm(prev => {
            const isSelected = prev.applicableMonths.includes(month);
            let nextMonths = isSelected
                ? prev.applicableMonths.filter(m => m !== month)
                : [...prev.applicableMonths, month];

            // Enforce limits based on frequency
            if (prev.frequency === 'QUARTERLY' && nextMonths.length > 4) return prev;
            if ((prev.frequency === 'YEARLY' || prev.frequency === 'ONE_TIME') && nextMonths.length > 1) {
                // If selecting a new one, replace the old one
                if (!isSelected) nextMonths = [month];
                else return prev;
            }

            return { ...prev, applicableMonths: nextMonths };
        });
    }, []);

    // Effect to truncate months when frequency changes
    React.useEffect(() => {
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

    React.useEffect(() => {
        if (isEdit) return;

        const selectedStandard = normalizeStandard(form.standard);
        const selectedSection = normalizeSection(form.section);
        if (!selectedStandard || !selectedSection) return;

        const validSections = (getSectionsForStandard(selectedStandard) || []).map(normalizeSection);
        if (validSections.length > 0 && !validSections.includes(selectedSection)) {
            setForm(prev => ({ ...prev, section: '' }));
        }
    }, [form.standard, form.section, getSectionsForStandard, isEdit]);

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
            name: form.name.charAt(0).toUpperCase() + form.name.slice(1),
            amount: Number(form.amount),
            academicYear: Number(form.academicYear),
            dueDay: Number(form.dueDay),
        };
        if (isEdit) {
            // Only send updatable fields
            const updateData = { ...payload };
            delete updateData.academicYear;
            delete updateData.standard;
            delete updateData.section;
            delete updateData.feeType;
            onSubmit({ id: editData._id, data: updateData });
        } else {
            onSubmit(payload);
        }
    };

    if (!isOpen) return null;

    const inputCls = (field) =>
        `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200'}`;

    return (
        <div className="modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            {isEdit ? <FaSave className="text-primary" size={16} /> : <FaPlus className="text-primary" size={16} />}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Fee Structure' : 'Add Fee Structure'}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><FaTimes className="text-gray-400" size={16} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year *</label>
                            <input type="number" value={form.academicYear} onChange={(e) => handleChange('academicYear', e.target.value)}
                                className={inputCls('academicYear')} disabled={isEdit} min={2000} max={2100} />
                            {errors.academicYear && <p className="text-xs text-red-500 mt-1">{errors.academicYear}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Standard *</label>
                            <select value={form.standard} onChange={(e) => handleChange('standard', e.target.value)}
                                className={inputCls('standard')} disabled={isEdit}>
                                <option value="">Select</option>
                                {standardOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {errors.standard && <p className="text-xs text-red-500 mt-1">{errors.standard}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Section *</label>
                            <select value={form.section} onChange={(e) => handleChange('section', e.target.value)}
                                className={inputCls('section')} disabled={isEdit}>
                                <option value="">Select</option>
                                {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {errors.section && <p className="text-xs text-red-500 mt-1">{errors.section}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Fee Type *</label>
                            <select
                                value={form.feeType}
                                onChange={(e) => handleChange('feeType', e.target.value)}
                                className={inputCls('feeType')}
                                disabled={isEdit}
                            >
                                <option value="">Select type</option>
                                {feeTypes.map(t => (
                                    <option key={t.name} value={t.name}>{t.label}</option>
                                ))}
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
                            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                            <input type="number" value={form.dueDay} onChange={(e) => handleChange('dueDay', e.target.value)}
                                className={inputCls('dueDay')} min={1} max={28} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-medium text-gray-600">Applicable Months</label>
                            {form.frequency === 'QUARTERLY' && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                    select any 4 month
                                </span>
                            )}
                            {(form.frequency === 'YEARLY' || form.frequency === 'ONE_TIME') && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                    select any 1 month
                                </span>
                            )}
                        </div>
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
                <div className="px-6 py-5 border-t border-gray-100 flex gap-4 flex-shrink-0">
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
