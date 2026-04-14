import React, { useState, useCallback, useEffect } from 'react';
import { FaTimes, FaCheck, FaPlus, FaSave, FaArrowLeft, FaSearch } from 'react-icons/fa';
import {
    FEE_TYPES, FEE_TYPE_LABELS, FREQUENCY_OPTIONS, FREQUENCY_LABELS,
} from '../../features/fees';
import { useFeeTypes, useFeeStructures } from '../../features/fees/api/queries';
import FeeTypeSideCard from './FeeTypeSideCard';
import { useSchoolClasses } from '../../hooks/useSchoolClasses';

const INITIAL_ACADEMIC_YEAR_START_MONTH = 6; // June

const getAcademicYearOptions = () => {
    const year = new Date().getFullYear();
    const options = [];
    for (let i = -2; i <= 5; i++) {
        const startYear = year + i;
        options.push({
            value: startYear,
            label: `${startYear}-${startYear + 1}`
        });
    }
    return options;
};

const getCurrentAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-indexed
    return month >= INITIAL_ACADEMIC_YEAR_START_MONTH ? year : year - 1;
};

const getMonthsForYear = (startYear) => {
    const months = [];
    for (let i = 0; i < 12; i++) {
        const m = (INITIAL_ACADEMIC_YEAR_START_MONTH + i - 1) % 12 + 1;
        const y = m >= INITIAL_ACADEMIC_YEAR_START_MONTH ? startYear : startYear + 1;
        months.push({
            value: m,
            year: y,
            label: new Date(y, m - 1).toLocaleString('default', { month: 'short' })
        });
    }
    return months;
};

const INITIAL_FORM = {
    academicYear: getCurrentAcademicYear(),
    standards: [],
    sections: [],
    section: '',
    feeType: '',
    name: '',
    amount: '',
    frequency: '',
    dueDay: 10,
    applicableMonths: [],
};

const normalizeStandard = (value) => String(value || '').trim();
const normalizeSection = (value) => String(value || '').trim().toUpperCase();

const MultiSelect = ({ label, options, selected, onToggle, onSelectAll, error, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredOptions = options.filter(opt =>
        String(opt).toLowerCase().includes(searchTerm.toLowerCase())
    );
    return (
        <div className="relative">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{label} *</label>
            <button type="button" onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full px-3 py-1.5 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all flex items-center justify-between bg-white text-left ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/10'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <span className="truncate">
                    {options.length === 0 ? `No ${label}s Available` :
                     selected.length === 0 ? `Select ${label}` : 
                     selected.length === options.length ? `All ${label}s` :
                     selected.sort((a,b) => a.localeCompare(b, undefined, {numeric:true})).join(', ')}
                </span>
                <div className={`p-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
            </button>

            {isOpen && !disabled && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => {
                        setIsOpen(false);
                        setSearchTerm('');
                    }}></div>
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 py-2 max-h-80 flex flex-col animate-fadeIn slide-in-from-top-2 duration-200">
                        <div className="px-3 pb-2 mb-2 border-b border-gray-50 flex items-center justify-between shrink-0">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Select {label}</span>
                             <button type="button" onClick={() => {
                                 // If searching, we pass filtered options back? No, parent doesn't support it.
                                 // For now, keep original Select All behavior or adjust parent.
                                 // Let's keep it simple: Select All works on the original set.
                                 onSelectAll();
                             }} disabled={options.length === 0}
                                className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline disabled:opacity-30 disabled:no-underline">
                                {selected.length > 0 && selected.length === options.length ? "Deselect All" : "Select All"}
                            </button>
                        </div>
                        
                        <div className="px-3 pb-2 mb-2 border-b border-gray-50 shrink-0">
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={10} />
                                <input
                                    type="text"
                                    placeholder={`Search ${label}...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:outline-none focus:border-primary/30 transition-all font-bold"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                {searchTerm && (
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setSearchTerm(''); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                                    >
                                        <FaTimes size={10} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => (
                                    <label key={opt} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors group">
                                        <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)}
                                            className="w-4 h-4 text-primary border-gray-200 rounded focus:ring-primary/20" />
                                        <span className={`text-[13px] font-bold ${selected.includes(opt) ? 'text-primary' : 'text-gray-600 group-hover:text-gray-900'}`}>{opt}</span>
                                    </label>
                                ))
                            ) : (
                                <div className="px-4 py-4 text-center text-[10px] font-bold text-gray-400 italic">
                                    No {label}s Found
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
            {error && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{error}</p>}
        </div>
    );
};

const FeeStructureForm = ({ onCancel, onSubmit, editData, isLoading, isAdmin }) => {
    const isEdit = !!editData;
    const [form, setForm] = useState(() => {
        const initial = editData ? {
            academicYear: editData.academicYear || getCurrentAcademicYear(),
            standard: editData.standard || '', // Single standard for edit
            section: editData.section || '',
            feeType: editData.feeType || '',
            name: editData.name || '',
            amount: editData.amount || '',
            frequency: editData.frequency || '',
            dueDay: editData.dueDay || 10,
            applicableMonths: editData.applicableMonths || [],
            isActive: editData.isActive !== undefined ? editData.isActive : true,
        } : { ...INITIAL_FORM, sections: [] };
        return initial;
    });

    const [isMultiMode, setIsMultiMode] = useState(!isEdit);

    const [showSideCard, setShowSideCard] = useState(false);
    const { data: feeTypesResp } = useFeeTypes({ enabled: isAdmin });
    const { availableStandards, allUniqueSections, getSectionsForStandard } = useSchoolClasses({ enabled: isAdmin });
    
    // Fetch all structures for checking overlap/duplicates
    const { data: allStructuresResp } = useFeeStructures({ 
        academicYear: form.academicYear,
        isActive: true 
    }, isAdmin && !isEdit);
    const allStructures = allStructuresResp?.data?.structures || [];
    
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
        if (isEdit) {
            const current = normalizeSection(form.section);
            return current ? [current] : [];
        }
        
        // Multi-mode: Union of sections for all selected standards
        const selectedStandards = form.standards.length > 0 ? form.standards : [];
        const merged = new Set();
        
        if (selectedStandards.length > 0) {
            selectedStandards.forEach(std => {
                (getSectionsForStandard(std) || []).forEach(sect => merged.add(normalizeSection(sect)));
            });
        } else {
            (allUniqueSections || []).forEach(sect => merged.add(normalizeSection(sect)));
        }

        return Array.from(merged).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }, [allUniqueSections, form.standards, form.section, getSectionsForStandard, isEdit]);

    const [errors, setErrors] = useState({});

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
            setIsMultiMode(false);
        } else {
            setForm({ ...INITIAL_FORM });
            setIsMultiMode(true);
        }
        setErrors({});
    }, [editData]);

    const handleChange = useCallback((field, value) => {
        const nextValue = field === 'section' ? normalizeSection(value) : value;
        setForm(prev => ({ ...prev, [field]: nextValue }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    }, []);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const isPastMonth = useCallback((m, yearOfMonth) => {
        if (yearOfMonth < currentYear) return true;
        if (yearOfMonth > currentYear) return false;
        return m < currentMonth;
    }, [currentYear, currentMonth]);

    const isInvalidQuarterly = useCallback((m) => {
        // Pattern enforcement is disabled to allow manual change (optional)
        return false;
    }, []);

    const isInvalidHalfYearly = useCallback((m) => {
        // Pattern enforcement is disabled to allow manual adjustment
        return false;
    }, []);

    // Auto-select months based on frequency and current month
    useEffect(() => {
        if (isEdit) return;
        
        const m = currentMonth;
        let sequence = [];

        if (form.frequency === 'QUARTERLY') {
            for (let i = 0; i < 4; i++) {
                sequence.push((m + i * 3 - 1) % 12 + 1);
            }
        } else if (form.frequency === 'HALF_YEARLY') {
            for (let i = 0; i < 6; i++) {
                sequence.push((m + i - 1) % 12 + 1);
            }
        } else if (form.frequency === 'MONTHLY' || form.frequency === 'YEARLY' || form.frequency === 'ONE_TIME') {
            sequence = [m];
        }

        // Filter out past months if in current year
        const availableMonths = getMonthsForYear(Number(form.academicYear));
        const validSequence = sequence.filter(month => {
            const yearOfM = availableMonths.find(am => am.value === month)?.year || form.academicYear;
            return !isPastMonth(month, yearOfM);
        });
        
        if (validSequence.length > 0) {
            setForm(prev => ({ ...prev, applicableMonths: validSequence }));
        } else {
            setForm(prev => ({ ...prev, applicableMonths: [] }));
        }
    }, [form.frequency, isEdit, currentMonth, isPastMonth]);

    // Track occupied months to prevent duplicates
    const occupiedMonths = React.useMemo(() => {
        if (isEdit || !form.feeType) return [];
        
        // Only calculate if Standard and Section are selected (avoid disabling everything by default)
        const selectedStds = isMultiMode ? form.standards : (form.standard ? [form.standard] : []);
        const selectedSects = isMultiMode ? form.sections : (form.section ? [form.section] : []);

        if (selectedStds.length === 0 || selectedSects.length === 0) return [];
        
        const occupied = new Set();
        allStructures.forEach(st => {
            if (st.feeType === form.feeType && 
                selectedStds.includes(st.standard) && 
                selectedSects.includes(st.section)) {
                (st.applicableMonths || []).forEach(m => occupied.add(m));
            }
        });
        return Array.from(occupied);
    }, [allStructures, form.feeType, form.standard, form.section, form.standards, form.sections, isMultiMode, isEdit]);

    const isOccupied = (m) => occupiedMonths.includes(m);

    const toggleMonth = useCallback((month, yearOfM) => {
        if (isPastMonth(month, yearOfM) || isInvalidQuarterly(month) || isInvalidHalfYearly(month) || isOccupied(month)) return;

        setForm(prev => {
            const isSelected = prev.applicableMonths.includes(month);
            let nextMonths = isSelected
                ? prev.applicableMonths.filter(m => m !== month)
                : [...prev.applicableMonths, month];

            if (prev.frequency === 'HALF_YEARLY' && nextMonths.length > 6) return prev;
            if (prev.frequency === 'QUARTERLY' && nextMonths.length > 4) return prev;
            if ((prev.frequency === 'YEARLY' || prev.frequency === 'ONE_TIME') && nextMonths.length > 1) {
                if (!isSelected) nextMonths = [month];
                else return prev;
            }

            return { ...prev, applicableMonths: nextMonths };
        });
    }, [isPastMonth, isInvalidQuarterly, isInvalidHalfYearly, isOccupied]);

    useEffect(() => {
        if (isEdit) return;
        setForm(prev => {
            const currentMonthsForYear = getMonthsForYear(Number(prev.academicYear));
            const nextMonths = prev.applicableMonths.filter(m => {
                const y = currentMonthsForYear.find(cm => cm.value === m)?.year || prev.academicYear;
                return !isPastMonth(m, y) && !isInvalidQuarterly(m) && !isOccupied(m);
            });
            if (nextMonths.length !== prev.applicableMonths.length) {
                return { ...prev, applicableMonths: nextMonths };
            }
            return prev;
        });
    }, [form.frequency, form.academicYear, isEdit, isPastMonth, isInvalidQuarterly, occupiedMonths]);

    useEffect(() => {
        if (isEdit) return;

        const selectedStandard = normalizeStandard(form.standard);
        const selectedSection = normalizeSection(form.section);
        if (!selectedStandard || !selectedSection) return;

        const validSections = (getSectionsForStandard(selectedStandard) || []).map(normalizeSection);
        if (validSections.length > 0 && !validSections.includes(selectedSection)) {
            setForm(prev => ({ ...prev, section: '' }));
        }
    }, [form.standard, form.section, getSectionsForStandard, isEdit]);

    const toggleStandard = useCallback((std) => {
        setForm(prev => {
            const nextStandards = prev.standards.includes(std)
                ? prev.standards.filter(s => s !== std)
                : [...prev.standards, std];
            return { ...prev, standards: nextStandards };
        });
    }, []);

    const validate = () => {
        const e = {};
        if (isMultiMode) {
            if (!form.standards || form.standards.length === 0) e.standards = 'Required';
            if (!form.sections || form.sections.length === 0) e.sections = 'Required';
        } else {
            if (!form.standard) e.standard = 'Required';
            if (!form.section) e.section = 'Required';
        }
        if (!form.feeType) e.feeType = 'Required';
        if (!form.name.trim()) e.name = 'Required';
        if (!form.amount || Number(form.amount) < 0) e.amount = 'Valid amount required';
        if (!form.frequency) e.frequency = 'Required';
        if (!form.academicYear || form.academicYear < 2000) e.academicYear = 'Valid year required';
        if (!form.applicableMonths || form.applicableMonths.length === 0) e.applicableMonths = 'Select at least one month';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        
        const payload = {
            ...form,
            standard: isMultiMode 
                ? form.standards.map(String) 
                : String(form.standard),
            section: isMultiMode 
                ? form.sections.map(String) 
                : String(form.section),
            name: form.name.charAt(0).toUpperCase() + form.name.slice(1),
            amount: Number(form.amount || 0),
            academicYear: Number(form.academicYear),
            dueDay: Number(form.dueDay || 10),
            applicableMonths: (form.applicableMonths || []).map(Number).sort((a, b) => a - b),
        };
        delete payload.standards;
        delete payload.sections;

        if (isEdit) {
            const updateData = { ...payload };
            delete updateData.academicYear;
            delete updateData.standard;
            delete updateData.section;
            delete updateData.feeType;
            onSubmit(updateData);
        } else {
            onSubmit(payload);
        }
    };

    const inputCls = (field) =>
        `w-full px-3 py-1.5 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/10'}`;

    return (
        <div className="max-w-6xl mx-auto px-4">
            <div className={`relative w-full max-w-2xl mx-auto transition-transform duration-500 ease-in-out ${showSideCard ? '-translate-x-40 lg:-translate-x-48' : 'translate-x-0'}`}>
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
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
                        <select 
                            value={form.academicYear} 
                            onChange={(e) => handleChange('academicYear', e.target.value)}
                            className={inputCls('academicYear')} 
                            disabled={isEdit}
                        >
                            {getAcademicYearOptions().map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        {errors.academicYear && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{errors.academicYear}</p>}
                    </div>
                    {isEdit ? (
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Standard *</label>
                            <select value={form.standard} onChange={(e) => handleChange('standard', e.target.value)}
                                className={inputCls('standard')} disabled={isEdit}>
                                <option value={form.standard}>{form.standard}</option>
                            </select>
                        </div>
                    ) : (
                        <MultiSelect 
                            label="Standard" 
                            options={standardOptions} 
                            selected={form.standards} 
                            onToggle={toggleStandard} 
                            onSelectAll={() => {
                                const all = form.standards.length === standardOptions.length ? [] : [...standardOptions];
                                setForm(prev => ({ ...prev, standards: all }));
                            }} 
                            error={errors.standards}
                        />
                    )}

                    {isEdit ? (
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Section *</label>
                            <select value={form.section} onChange={(e) => handleChange('section', e.target.value)}
                                className={inputCls('section')} disabled={isEdit}>
                                <option value={form.section}>{form.section}</option>
                            </select>
                        </div>
                    ) : (
                        <MultiSelect 
                            label="Section" 
                            options={sectionOptions} 
                            selected={form.sections} 
                            onToggle={(sect) => {
                                setForm(prev => ({
                                    ...prev,
                                    sections: prev.sections.includes(sect)
                                        ? prev.sections.filter(s => s !== sect)
                                        : [...prev.sections, sect]
                                }));
                            }} 
                            onSelectAll={() => {
                                const all = form.sections.length === sectionOptions.length ? [] : [...sectionOptions];
                                setForm(prev => ({ ...prev, sections: all }));
                            }} 
                            error={errors.sections}
                        />
                    )}
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
                    <div className="flex items-center justify-between mb-4 px-1 min-h-[26px]">
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">Applicable Months</label>
                        {(() => {
                            let hint = null;
                            if (form.frequency === 'QUARTERLY') hint = 'select any 4 month';
                            else if (form.frequency === 'HALF_YEARLY') hint = 'select exactly 6 months';
                            else if (form.frequency === 'YEARLY' || form.frequency === 'ONE_TIME') hint = 'select any 1 month';

                            if (!hint && !errors.applicableMonths) return null;

                            return (
                                <div className="flex items-center gap-2">
                                    {hint && (
                                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                                            {hint}
                                        </span>
                                    )}
                                    {errors.applicableMonths && (
                                        <span className="text-[10px] font-black text-red-600 px-2 py-1 italic">
                                            ({errors.applicableMonths})
                                        </span>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                        {getMonthsForYear(Number(form.academicYear)).map(m => {
                            const occupied = isOccupied(m.value);
                            const past = isPastMonth(m.value, m.year);
                            const invalidQuarterly = isInvalidQuarterly(m.value);
                            const invalidHalfYearly = isInvalidHalfYearly(m.value);
                            const disabled = past || invalidQuarterly || invalidHalfYearly || occupied;
                            const isSelected = form.applicableMonths.includes(m.value);
                            
                            return (
                                <div key={m.value} className="relative group/month">
                                    <button type="button" 
                                        onClick={() => !disabled && toggleMonth(m.value, m.year)}
                                        disabled={disabled}
                                        className={`w-full py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                                            isSelected ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105' : 
                                            occupied ? 'bg-amber-50 border-amber-200 text-amber-600 cursor-not-allowed' :
                                            disabled ? 'bg-gray-50 border-gray-100 text-gray-200 cursor-not-allowed opacity-40' :
                                            'border-gray-200 text-gray-400 hover:bg-gray-50'
                                        }`}>
                                        {m.label}
                                        <div className="text-[7px] mt-0.5 opacity-60 font-black">{m.year}</div>
                                    </button>
                                    {occupied && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[8px] rounded opacity-0 group-hover/month:opacity-100 transition-opacity whitespace-nowrap z-30 pointer-events-none">
                                            Already Created
                                        </div>
                                    )}
                                    {past && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[8px] rounded opacity-0 group-hover/month:opacity-100 transition-opacity whitespace-nowrap z-30 pointer-events-none">
                                            Past Month
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
                <div className="absolute top-0 left-full ml-8 z-20 hidden lg:block">
                    <FeeTypeSideCard 
                        onClose={() => setShowSideCard(false)} 
                        onSuccess={(newType) => {
                            handleChange('feeType', newType);
                        }}
                    />
                </div>
            )}
            {/* Fallback for smaller screens to ensure it's still visible */}
            {showSideCard && (
                <div className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <FeeTypeSideCard 
                        onClose={() => setShowSideCard(false)} 
                        onSuccess={(newType) => {
                            handleChange('feeType', newType);
                        }}
                    />
                </div>
            )}
        </div>
    </div>
    );
};

export default FeeStructureForm;
