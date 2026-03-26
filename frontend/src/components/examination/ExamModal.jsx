import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
    FaTimes, FaPlus, FaTrash, FaCalendarAlt, FaClock, 
    FaBookOpen, FaInfoCircle, FaCheckCircle, FaExclamationTriangle
} from 'react-icons/fa';
import { useSchoolClasses } from '../../hooks/useSchoolClasses';
import { ButtonSpinner } from '../../components/ui/Spinner';

const INITIAL_FORM = {
    name: '',
    examType: '',
    category: 'OTHER',
    categoryDescription: '',
    academicYear: new Date().getFullYear(),
    standard: '',
    section: '',
    description: '',
    schoolId: '',
    schedule: [
        {
            subject: '',
            examDate: '',
            startTime: '',
            endTime: '',
            totalMarks: '',
            passingMarks: '',
            assignedTeacher: '',
            syllabus: ''
        }
    ]
};

const EXAM_CATEGORIES = [
    { value: 'MIDTERM', label: 'Midterm' },
    { value: 'FINAL', label: 'Final' },
    { value: 'SEMESTER', label: 'Semester' },
    { value: 'UNIT_TEST', label: 'Unit Test' },
    { value: 'CLASS_TEST', label: 'Class Test' },
    { value: 'SURPRISE_TEST', label: 'Surprise Test' },
    { value: 'WEEKLY_QUIZ', label: 'Weekly Quiz' },
    { value: 'OTHER', label: 'Other' },
];

const ExamModal = ({ isOpen, onClose, onSubmit, editData, isLoading, userRole, user }) => {
    const isEdit = !!editData;
    const isTeacher = userRole === 'teacher';
    const isAdmin = ['admin', 'super_admin'].includes(userRole);
    const isSuperAdmin = userRole === 'super_admin';
    const [form, setForm] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState({});
    const initialFormRef = React.useRef(INITIAL_FORM);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const {
        availableStandards: schoolAvailableStandards,
        getSectionsForStandard,
        allUniqueSections,
    } = useSchoolClasses();

    // Filtered options based on teacher assignments
    const availableStandards = useMemo(() => {
        const classes = user?.profile?.assignedClasses || user?.assignedClasses || [];
        if (isTeacher) {
            if (classes.length) {
                return [...new Set(classes.map(c => String(c.standard)))].sort((a, b) => Number(a) - Number(b));
            }
            return []; // Return empty for teachers with no assignments
        }
        return schoolAvailableStandards;
    }, [isTeacher, user, schoolAvailableStandards]);

    const availableSections = useMemo(() => {
        const classes = user?.profile?.assignedClasses || user?.assignedClasses || [];
        if (isTeacher) {
            if (classes.length) {
                // If a standard is selected, only show sections for that standard
                if (form.standard) {
                    return [...new Set(classes
                        .filter(c => String(c.standard) === String(form.standard))
                        .map(c => String(c.section)))]
                        .sort();
                }
                return [...new Set(classes.map(c => String(c.section)))].sort();
            }
            return []; // Return empty for teachers with no assignments
        }
        if (form.standard) {
            return getSectionsForStandard(form.standard);
        }
        return allUniqueSections;
    }, [isTeacher, user, form.standard, getSectionsForStandard, allUniqueSections]);

    useEffect(() => {
        if (form.standard && !availableStandards.includes(form.standard)) {
            setForm((prev) => ({ ...prev, standard: '', section: '' }));
            return;
        }

        if (form.section && !availableSections.includes(form.section)) {
            setForm((prev) => ({ ...prev, section: '' }));
        }
    }, [availableSections, availableStandards, form.section, form.standard]);

    // Initialize form with edit data or reset to initial
    useEffect(() => {
        if (isOpen) {
            let base = { ...INITIAL_FORM };
            if (editData) {
                base = {
                    name: editData.name || '',
                    examType: editData.examType || '',
                    category: editData.category || 'OTHER',
                    categoryDescription: editData.categoryDescription || '',
                    academicYear: editData.academicYear || new Date().getFullYear(),
                    standard: editData.standard || '',
                    section: editData.section || '',
                    description: editData.description || '',
                    schoolId: editData.schoolId || '',
                    schedule: editData.schedule?.length > 0 ? editData.schedule.map(s => ({
                        subject: s.subject || '',
                        examDate: s.examDate ? s.examDate.split('T')[0] : '',
                        startTime: s.startTime || '',
                        endTime: s.endTime || '',
                        totalMarks: String(s.totalMarks || ''),
                        passingMarks: String(s.passingMarks || ''),
                        assignedTeacher: s.assignedTeacher || '',
                        syllabus: s.syllabus || ''
                    })) : [{ ...INITIAL_FORM.schedule[0] }]
                };
            } else {
                // Role-based default exam type and class
                if (isTeacher) {
                    base.examType = 'CLASS_TEST';
                    base.standard = '';
                    base.section = '';
                } else if (isAdmin) {
                    base.examType = 'TERM_EXAM';
                }
                
                if (isSuperAdmin && !base.schoolId && user?.schoolId) {
                    base.schoolId = user.schoolId;
                } else if (!base.schoolId) {
                    base.schoolId = '';
                }
            }
            setForm(base);
            initialFormRef.current = base;
            setErrors({});
            setShowDiscardConfirm(false);
        }
    }, [isOpen, editData, isTeacher, isAdmin, isSuperAdmin, user]);

    const isDirty = useMemo(() => {
        return JSON.stringify(form) !== JSON.stringify(initialFormRef.current);
    }, [form]);

    const handleCloseRequest = useCallback(() => {
        if (isDirty) {
            setShowDiscardConfirm(true);
        } else {
            onClose();
        }
    }, [isDirty, onClose]);

    const handleReset = useCallback(() => {
        setForm(initialFormRef.current);
        setShowDiscardConfirm(false);
        setErrors({});
    }, []);

    const handleChange = useCallback((field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    }, []);

    const handleScheduleChange = useCallback((index, field, value) => {
        let finalValue = value;
        let errorMessage = '';

        if (field === 'examDate' && value) {
            const selectedDay = new Date(value + 'T00:00:00').getDay();
            if (selectedDay === 0) {
                errorMessage = 'Sundays are not allowed.';
                finalValue = ''; // Block Sunday selection
            }
        }

        setForm(prev => ({
            ...prev,
            schedule: prev.schedule.map((item, i) => 
                i === index ? { ...item, [field]: finalValue } : item
            )
        }));
        
        const errorKey = `schedule_${index}_${field}`;
        setErrors(prev => ({ ...prev, [errorKey]: errorMessage }));
    }, []);

    const addScheduleItem = useCallback(() => {
        setForm(prev => {
            const lastItem = prev.schedule[prev.schedule.length - 1];
            const newItem = {
                ...INITIAL_FORM.schedule[0],
                // Carry over values from the last item to improve UX
                startTime: lastItem?.startTime || '',
                endTime: lastItem?.endTime || '',
                totalMarks: lastItem?.totalMarks || '',
                passingMarks: lastItem?.passingMarks || '',
                examDate: ''
            };
            return {
                ...prev,
                schedule: [...prev.schedule, newItem]
            };
        });
    }, [INITIAL_FORM.schedule]);

    const removeScheduleItem = useCallback((index) => {
        setForm(prev => ({
            ...prev,
            schedule: prev.schedule.filter((_, i) => i !== index)
        }));
    }, []);

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Examination name is required';
        if (!form.examType) e.examType = 'Please select an exam type';
        if (form.category === 'OTHER' && !form.categoryDescription.trim()) {
            e.categoryDescription = 'Please describe the exam category';
        }
        if (!form.standard) e.standard = 'Please select a class';
        if (!form.section) e.section = 'Please select a section';
        if (isSuperAdmin && !form.schoolId) e.schoolId = 'School ID is required for Super Admins';
        if (!form.academicYear || form.academicYear < 2000) e.academicYear = 'Enter a valid academic year';
        
        form.schedule.forEach((item, index) => {
            if (!item.subject.trim()) e[`schedule_${index}_subject`] = 'Subject name required';
            if (!item.examDate) {
                e[`schedule_${index}_examDate`] = 'Date is required';
            } else {
                const selectedDay = new Date(item.examDate + 'T00:00:00').getDay();
                if (selectedDay === 0) e[`schedule_${index}_examDate`] = 'Sundays are not allowed.';
            }
            
            const total = Number(item.totalMarks);
            const pass = Number(item.passingMarks);

            if (isNaN(total) || total <= 0) {
                e[`schedule_${index}_totalMarks`] = 'Valid total marks required';
            }
            if (isNaN(pass) || pass < 0) {
                e[`schedule_${index}_passingMarks`] = 'Valid passing marks required';
            }
            if (!isNaN(total) && !isNaN(pass) && pass > total) {
                e[`schedule_${index}_passingMarks`] = 'Cannot exceed total marks';
            }
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleFormSubmit = (targetStatus) => {
        if (!validate()) return;

        const payload = {
            ...form,
            status: targetStatus || (isEdit ? editData.status : 'DRAFT'),
            academicYear: Number(form.academicYear),
            // Prune empty optional fields from main form
            categoryDescription: form.categoryDescription?.trim() || undefined,
            description: form.description?.trim() || undefined,
            schoolId: form.schoolId || undefined,
            schedule: form.schedule.map(item => {
                const normalized = {
                    ...item,
                    totalMarks: Number(item.totalMarks),
                    passingMarks: Number(item.passingMarks),
                    // Prune empty optional fields from schedule item
                    startTime: item.startTime || undefined,
                    endTime: item.endTime || undefined,
                    assignedTeacher: item.assignedTeacher?._id || item.assignedTeacher || undefined,
                    syllabus: item.syllabus?.trim() || undefined,
                };
                return normalized;
            }),
        };
        onSubmit(payload);
    };

    if (!isOpen) return null;

    const inputClasses = (field) =>
        `w-full px-4 py-2.5 bg-white border rounded-xl text-sm transition-all outline-none ${
            errors[field] 
            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-50' 
            : 'border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-slate-300'
        }`;

    const labelClasses = "block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider";

    return (
        <div className="modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 sm:p-6 overflow-hidden">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn">
                <div className="px-6 py-5 sm:px-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
                            <FaCalendarAlt className="text-primary text-xl" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                {isEdit
                                    ? 'Update Examination'
                                    : isTeacher
                                        ? 'Create Class Test'
                                        : 'New Examination'}
                            </h2>
                            <p className="text-gray-500 text-xs sm:text-sm">
                                {isEdit
                                    ? `Modifying ${form.name}`
                                    : isTeacher
                                        ? 'Setup schedule and details for your class test'
                                        : 'Setup schedule and details for the upcoming exam'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleCloseRequest}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
                    <form className="p-6 sm:p-8 space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            <div className="lg:col-span-12">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="h-6 w-1 rounded-full bg-primary"></div>
                                    <h3 className="font-bold text-slate-800 text-lg">General Information</h3>
                                </div>
                                
                                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm ring-1 ring-slate-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2">
                                            <label className={labelClasses}>Examination Name *</label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={form.name}
                                                    onChange={(e) => handleChange('name', e.target.value)}
                                                    className={inputClasses('name')}
                                                />
                                                <FaInfoCircle className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${errors.name ? 'text-red-400' : 'text-slate-300 group-hover:text-slate-400'}`} size={14} />
                                            </div>
                                            {errors.name && <p className="text-red-500 text-[11px] font-medium mt-1.5 ml-1">{errors.name}</p>}
                                        </div>

                                        <div>
                                            <label className={labelClasses}>Academic Year *</label>
                                            <input
                                                type="number"
                                                value={form.academicYear}
                                                onChange={(e) => handleChange('academicYear', e.target.value)}
                                                className={inputClasses('academicYear')}
                                                min="2020"
                                                placeholder="2024"
                                            />
                                            {errors.academicYear && <p className="text-red-500 text-[11px] font-medium mt-1.5 ml-1">{errors.academicYear}</p>}
                                        </div>

                                        {!isTeacher && (
                                            <div>
                                                <label className={labelClasses}>Exam Type *</label>
                                                <select
                                                    value={form.examType}
                                                    onChange={(e) => handleChange('examType', e.target.value)}
                                                    className={inputClasses('examType')}
                                                    disabled={isEdit || isAdmin}
                                                >
                                                    <option value="">Select Type</option>
                                                    <option value="TERM_EXAM">Term Exam (Formal)</option>
                                                    <option value="CLASS_TEST">Class Test (Informal)</option>
                                                </select>
                                                {errors.examType && <p className="text-red-500 text-[11px] font-medium mt-1.5 ml-1">{errors.examType}</p>}
                                                {(isEdit || isAdmin) && (
                                                    <p className="text-amber-600 text-[10px] mt-1 italic">
                                                        Exam type is fixed for existing records and admins.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {isTeacher && (
                                            <div>
                                                <label className={labelClasses}>Exam Type</label>
                                                <div className={`${inputClasses('examType')} flex items-center bg-slate-50 text-slate-700`}>
                                                    <span className="text-[11px] font-semibold text-slate-500 mr-2">Fixed:</span>
                                                    <span className="text-sm font-medium">Class Test (your class only)</span>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className={labelClasses}>Category</label>
                                            <select
                                                value={form.category}
                                                onChange={(e) => handleChange('category', e.target.value)}
                                                className={inputClasses('category')}
                                            >
                                                {EXAM_CATEGORIES.map(cat => (
                                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                ))}
                                            </select>
                                            {form.category === 'OTHER' && (
                                                <div className="mt-3">
                                                    <label className={labelClasses}>Describe Category *</label>
                                                    <input
                                                        type="text"
                                                        value={form.categoryDescription}
                                                        onChange={(e) => handleChange('categoryDescription', e.target.value)}
                                                        className={inputClasses('categoryDescription')}
                                                    />
                                                    {errors.categoryDescription && (
                                                        <p className="text-red-500 text-[11px] font-medium mt-1.5 ml-1">
                                                            {errors.categoryDescription}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Target School ID removed as requested (background handles single school) */}

                                        <div>
                                            <label className={labelClasses}>Class *</label>
                                            <select
                                                value={form.standard}
                                                onChange={(e) => handleChange('standard', e.target.value)}
                                                className={inputClasses('standard')}
                                            >
                                                <option value="">Choose Class</option>
                                                {availableStandards.map(standard => (
                                                    <option key={standard} value={standard}>Class {standard}</option>
                                                ))}
                                            </select>
                                            {errors.standard && <p className="text-red-500 text-[11px] font-medium mt-1.5 ml-1">{errors.standard}</p>}
                                        </div>

                                        <div>
                                            <label className={labelClasses}>Section *</label>
                                            <select
                                                value={form.section}
                                                onChange={(e) => handleChange('section', e.target.value)}
                                                className={inputClasses('section')}
                                            >
                                                <option value="">Choose Section</option>
                                                {availableSections.map(section => (
                                                    <option key={section} value={section}>Section {section}</option>
                                                ))}
                                            </select>
                                            {errors.section && <p className="text-red-500 text-[11px] font-medium mt-1.5 ml-1">{errors.section}</p>}
                                        </div>

                                        <div className="md:col-span-2 lg:col-span-3">
                                            <label className={labelClasses}>Description / Notes</label>
                                            <textarea
                                                value={form.description}
                                                onChange={(e) => handleChange('description', e.target.value)}
                                                className={`${inputClasses('description')} min-h-[80px] py-3`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 mt-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-1 rounded-full bg-primary"></div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg leading-tight">Exam Schedule</h3>
                                        <p className="text-[11px] text-slate-500 font-medium">Add subjects and time slots for the examination</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={addScheduleItem}
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-2xl hover:bg-primary-hover transition-all font-bold text-sm shadow-md shadow-primary/20 active:scale-95"
                                >
                                    <FaPlus size={12} />
                                    <span>Add Subject</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {form.schedule.map((item, index) => (
                                    <div key={index} className="group relative bg-white border border-slate-200 rounded-[28px] p-1 sm:p-2 shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-all duration-300 overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/10 group-hover:bg-primary transition-colors"></div>
                                        
                                        <div className="p-4 sm:p-6">
                                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                                                        {index + 1}
                                                    </div>
                                                    <h4 className="font-bold text-slate-700 tracking-tight">Paper Configuration</h4>
                                                </div>
                                                {form.schedule.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeScheduleItem(index)}
                                                        className="flex items-center gap-2 p-2 px-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-semibold text-xs border border-transparent hover:border-red-100 active:scale-95"
                                                    >
                                                        <FaTrash size={12} />
                                                        <span className="hidden sm:inline">Remove</span>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                <div>
                                                    <label className={labelClasses}>Subject Name *</label>
                                                    <div className="relative group/input">
                                                        <FaBookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/input:text-primary" size={14} />
                                                        <input
                                                            type="text"
                                                            value={item.subject}
                                                            onChange={(e) => handleScheduleChange(index, 'subject', e.target.value)}
                                                            className={`${inputClasses(`schedule_${index}_subject`)} pl-10`}
                                                        />
                                                    </div>
                                                    {errors[`schedule_${index}_subject`] && <p className="text-red-500 text-[10px] mt-1.5 ml-1">{errors[`schedule_${index}_subject`]}</p>}
                                                </div>

                                                <div>
                                                    <label className={labelClasses}>Exam Date *</label>
                                                    <div className="relative">
                                                        <input
                                                            type="date"
                                                            value={item.examDate}
                                                            onChange={(e) => handleScheduleChange(index, 'examDate', e.target.value)}
                                                            className={inputClasses(`schedule_${index}_examDate`)}
                                                            min={new Date().toISOString().split('T')[0]}
                                                        />
                                                    </div>
                                                    {errors[`schedule_${index}_examDate`] && <p className="text-red-500 text-[10px] mt-1.5 ml-1">{errors[`schedule_${index}_examDate`]}</p>}
                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className={labelClasses}>Timing Range</label>
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative flex-1 group/input">
                                                            <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-primary" size={12} />
                                                            <input
                                                                type="time"
                                                                value={item.startTime}
                                                                onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                                                                className={`${inputClasses(`schedule_${index}_startTime`)} pl-9 py-2 text-xs`}
                                                            />
                                                        </div>
                                                        <span className="text-slate-400 font-bold">to</span>
                                                        <div className="relative flex-1 group/input">
                                                            <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-primary" size={12} />
                                                            <input
                                                                type="time"
                                                                value={item.endTime}
                                                                onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                                                                className={`${inputClasses(`schedule_${index}_endTime`)} pl-9 py-2 text-xs`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4">
                                                    <div className="flex-1">
                                                        <label className={labelClasses}>Total *</label>
                                                        <input
                                                            type="text"
                                                            onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
                                                            value={item.totalMarks}
                                                            onChange={(e) => handleScheduleChange(index, 'totalMarks', e.target.value)}
                                                            className={inputClasses(`schedule_${index}_totalMarks`)}
                                                            min="0"
                                                        />
                                                        {errors[`schedule_${index}_totalMarks`] && <p className="text-red-500 text-[10px] mt-1.5 ml-1">{errors[`schedule_${index}_totalMarks`]}</p>}
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className={labelClasses}>Pass *</label>
                                                        <input
                                                            type="text"
                                                            onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
                                                            value={item.passingMarks}
                                                            onChange={(e) => handleScheduleChange(index, 'passingMarks', e.target.value)}
                                                            className={inputClasses(`schedule_${index}_passingMarks`)}
                                                            min="0"
                                                        />
                                                        {errors[`schedule_${index}_passingMarks`] && <p className="text-red-500 text-[10px] mt-1.5 ml-1">{errors[`schedule_${index}_passingMarks`]}</p>}
                                                    </div>
                                                </div>

                                                <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                                                    <label className={labelClasses}>Specific Syllabus / Topics</label>
                                                    <textarea
                                                        value={item.syllabus}
                                                        onChange={(e) => handleScheduleChange(index, 'syllabus', e.target.value)}
                                                        className={`${inputClasses(`schedule_${index}_syllabus`)} min-h-[60px] resize-none py-2.5`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between bg-white overflow-hidden relative">
                    <button
                        type="button"
                        onClick={handleCloseRequest}
                        className="px-6 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all font-bold text-sm"
                    >
                        Discard Changes
                    </button>
                    
                    <div className="flex gap-3">
                        {!isEdit ? (
                            <button
                                type="button"
                                onClick={() => handleFormSubmit('DRAFT')}
                                disabled={isLoading}
                                className="px-8 py-3 bg-primary text-white rounded-xl transition-all font-bold text-sm hover:bg-primary-hover shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                <FaPlus />
                                <span>Save Evaluation as Draft</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleFormSubmit(editData.status === 'DRAFT' ? 'PUBLISHED' : editData.status)}
                                disabled={isLoading}
                                className={`px-8 py-3 text-white rounded-xl transition-all font-bold text-sm shadow-lg disabled:opacity-50 disabled:grayscale ${
                                    'bg-primary hover:bg-primary-hover shadow-primary/20'
                                }`}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-3">
                                        <ButtonSpinner />
                                        <span>Processing...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <FaCheckCircle />
                                        <span>
                                            {editData.status === 'DRAFT' ? 'Publish Now' : 'Update Examination'}
                                        </span>
                                    </div>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Discard Changes Confirmation */}
            {showDiscardConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-6 mx-auto border border-amber-100">
                            <FaExclamationTriangle size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Unsaved Changes</h3>
                        <p className="text-slate-500 text-center mb-8">
                            You have unsaved changes. Are you sure you want to discard them? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDiscardConfirm(false)}
                                className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Keep Editing
                            </button>
                            <button
                                onClick={handleReset}
                                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-200 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <FaTrash size={14} />
                                <span>Discard Changes</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamModal;

