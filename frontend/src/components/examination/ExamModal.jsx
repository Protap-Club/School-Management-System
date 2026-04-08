import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { FaTimes, FaPlus, FaTrash, FaCalendarAlt, FaClock, FaBookOpen, FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaSearch, FaChevronDown, FaPaperclip } from 'react-icons/fa';
import { useSchoolClasses } from '../../hooks/useSchoolClasses';
import { useUsers } from '../../features/users/api/queries';
import { ButtonSpinner, PageSpinner } from '../../components/ui/Spinner';
import { createPortal } from 'react-dom';
import { downloadFile } from '../../utils/downloadFile';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
// cspell:ignore msword openxmlformats officedocument wordprocessingml opendocument

const TeacherSelectDropdown = ({ value, onChange, options, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = React.useRef(null);
    const menuRef = React.useRef(null);
    const [rect, setRect] = useState(null);

    const updateRect = useCallback(() => {
        if (dropdownRef.current) {
            setRect(dropdownRef.current.getBoundingClientRect());
        }
    }, []);

    const closeDropdown = useCallback(() => {
        setIsOpen(false);
        setSearch('');
    }, []);

    useEffect(() => {
        if (isOpen) {
            updateRect();
            window.addEventListener('resize', updateRect);
            // Capture scroll events from any scrollable parent to update position on scroll.
            window.addEventListener('scroll', updateRect, true);
        }
        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        };
    }, [isOpen, updateRect]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click was outside both the button and the portal menu
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                menuRef.current && !menuRef.current.contains(event.target)
            ) {
                closeDropdown();
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [closeDropdown, isOpen]);

    const filteredOptions = useMemo(() => {
        return options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
    }, [options, search]);

    const selectedOption = options.find(opt => opt.value === value);

    const menuContent = (
        <div 
            ref={menuRef}
            style={{
                position: 'fixed',
                top: rect ? rect.bottom + 4 : -9999,
                left: rect ? rect.left : -9999,
                width: rect ? rect.width : 'auto',
                zIndex: 999999
            }}
            className={`bg-white rounded-xl shadow-2xl ring-1 ring-black/5 overflow-hidden transition-all duration-200 origin-top transform ${isOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-95'}`}
        >
            <div className="p-2 border-b border-gray-100">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                    <input
                        type="text"
                        placeholder="Search teacher..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>
            <div className="max-h-56 overflow-y-auto custom-scrollbar p-1">
                <button
                    type="button"
                    onClick={() => {
                        onChange('');
                        closeDropdown();
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-gray-50 ${!value ? 'bg-primary/5 text-primary font-bold' : 'text-gray-600'}`}
                >
                    Unassigned (Optional)
                </button>
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                                onChange(opt.value);
                                closeDropdown();
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-gray-50 ${value === opt.value ? 'bg-primary/5 text-primary font-bold' : 'text-gray-700 truncate'}`}
                        >
                            {opt.label}
                        </button>
                    ))
                ) : (
                    <div className="px-3 py-4 text-center text-xs text-gray-500">
                        No teachers found.
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div ref={dropdownRef} className={`relative ${className}`} style={{ padding: 0, border: 'none', background: 'transparent' }}>
            <button
                type="button"
                onClick={() => {
                    if (isOpen) {
                        closeDropdown();
                        return;
                    }
                    setIsOpen(true);
                }}
                className={`flex items-center justify-between w-full text-left focus:outline-none`}
                style={{ padding: '0.625rem 1rem', background: 'transparent' }}
            >
                <span className={selectedOption ? 'text-gray-900 truncate' : 'text-gray-500'}>
                    {selectedOption ? selectedOption.label : 'Unassigned (Optional)'}
                </span>
                <FaChevronDown className={`shrink-0 ml-2 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={12} />
            </button>

            {createPortal(menuContent, document.body)}
        </div>
    );
};

const createEmptyScheduleItem = () => ({
    _id: '',
    subject: '',
    examDate: '',
    startTime: '',
    endTime: '',
    totalMarks: '',
    passingMarks: '',
    assignedTeacher: '',
    syllabus: '',
    attachments: [],
    attachmentFiles: [],
});

const INITIAL_FORM = {
    name: '',
    examType: '',
    category: 'OTHER',
    categoryDescription: '',
    academicYear: new Date().getFullYear(),
    standard: [],
    section: [],
    description: '',
    schoolId: '',
    schedule: [createEmptyScheduleItem()]
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

const SCHEDULE_ATTACHMENT_ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain',
];

const SCHEDULE_ATTACHMENT_ALLOWED_FILE_EXTENSIONS = ['jpg', 'jpeg', 'pdf', 'png', 'doc', 'docx', 'xlsx', 'xls', 'csv', 'txt'];
const SCHEDULE_ATTACHMENT_ACCEPT = '.jpg,.jpeg,.pdf,.png,.doc,.docx,.xlsx,.xls,.csv,.txt';
const SCHEDULE_ATTACHMENT_MAX_FILES = 10;
const SCHEDULE_ATTACHMENT_MAX_FILE_SIZE = 10 * 1024 * 1024;

const ExamModal = ({ isOpen, onClose, onSubmit, editData, isLoading, userRole, user, syllabusOnly = false }) => {
    const isEdit = !!editData;
    const isTeacher = userRole === 'teacher';
    const isAdmin = ['admin', 'super_admin'].includes(userRole);
    const isSuperAdmin = userRole === 'super_admin';
    const [form, setForm] = useState(INITIAL_FORM);
    const [initialFormSnapshot, setInitialFormSnapshot] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState({});
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [submitIntent, setSubmitIntent] = useState('');
    const {
        availableStandards: schoolAvailableStandards,
        getSectionsForStandard,
        allUniqueSections,
    } = useSchoolClasses();

    const { data: teachersData } = useUsers({
        role: 'teacher',
        pageSize: 1500,
        enabled: isOpen && !isTeacher,
    });
    
    const teacherOptions = useMemo(() => {
        if (isTeacher) {
            return user?._id
                ? [{
                    value: user._id,
                    label: user.name || 'You',
                }]
                : [];
        }

        const list = teachersData?.data?.users || teachersData?.users || [];
        return [...list]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(t => ({
                value: t._id,
                label: `${t.name} ${t.staffId ? `(${t.staffId})` : ''}`
            }));
    }, [isTeacher, teachersData, user]);

    const availableStandards = useMemo(() => schoolAvailableStandards, [schoolAvailableStandards]);

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
                    standard: Array.isArray(editData.standard) ? editData.standard : (editData.standard ? [editData.standard] : []),
                    section: Array.isArray(editData.section) ? editData.section : (editData.section ? [editData.section] : []),
                    description: editData.description || '',
                    schoolId: editData.schoolId || '',
                    schedule: editData.schedule?.length > 0 ? editData.schedule.map(s => ({
                        _id: s._id || '',
                        subject: s.subject || '',
                        examDate: s.examDate ? s.examDate.split('T')[0] : '',
                        startTime: s.startTime || '',
                        endTime: s.endTime || '',
                        totalMarks: String(s.totalMarks || ''),
                        passingMarks: String(s.passingMarks || ''),
                        assignedTeacher: s.assignedTeacher?._id || s.assignedTeacher || '',
                        syllabus: s.syllabus || '',
                        attachments: Array.isArray(s.attachments) ? s.attachments : [],
                        attachmentFiles: [],
                    })) : [createEmptyScheduleItem()]
                };
            } else {
                // Role-based default exam type and class
                if (isTeacher) {
                    base.examType = 'CLASS_TEST';
                } else if (isAdmin) {
                    base.examType = 'TERM_EXAM';
                }
                
                if (isSuperAdmin && !base.schoolId && user?.schoolId) {
                    base.schoolId = user.schoolId;
                } else if (!base.schoolId) {
                    base.schoolId = '';
                }
            }
            // eslint-disable-next-line react-hooks/set-state-in-effect -- opening/editing modal intentionally rehydrates local draft form state
            setForm(base);
            setInitialFormSnapshot(base);
            setErrors({});
            setShowDiscardConfirm(false);
            setSubmitIntent('');
        }
    }, [isOpen, editData, isTeacher, isAdmin, isSuperAdmin, user]);

    useEffect(() => {
        if (!isLoading) {
            setSubmitIntent('');
        }
    }, [isLoading]);

    const isDirty = useMemo(() => {
        return JSON.stringify(form) !== JSON.stringify(initialFormSnapshot);
    }, [form, initialFormSnapshot]);

    const handleCloseRequest = useCallback(() => {
        if (isDirty) {
            setShowDiscardConfirm(true);
        } else {
            onClose();
        }
    }, [isDirty, onClose]);

    const handleReset = useCallback(() => {
        setForm(initialFormSnapshot);
        setShowDiscardConfirm(false);
        setErrors({});
    }, [initialFormSnapshot]);

    const handleChange = useCallback((field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
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

    const handleScheduleAttachmentChange = useCallback((index, selectedFiles) => {
        const filesToAdd = Array.isArray(selectedFiles) ? selectedFiles : [];
        if (filesToAdd.length === 0) return;

        let attachmentError = '';

        setForm((prev) => ({
            ...prev,
            schedule: prev.schedule.map((item, i) =>
                i === index
                    ? (() => {
                        const existingAttachments = Array.isArray(item.attachments) ? item.attachments : [];
                        const pendingAttachments = Array.isArray(item.attachmentFiles) ? item.attachmentFiles : [];
                        const remainingSlots = Math.max(
                            0,
                            SCHEDULE_ATTACHMENT_MAX_FILES - existingAttachments.length - pendingAttachments.length
                        );

                        if (remainingSlots === 0) {
                            attachmentError = `Maximum ${SCHEDULE_ATTACHMENT_MAX_FILES} attachments allowed per paper`;
                            return item;
                        }

                        const nextFiles = filesToAdd.slice(0, remainingSlots);
                        if (nextFiles.length < filesToAdd.length) {
                            attachmentError = `Only ${remainingSlots} more attachment${remainingSlots === 1 ? '' : 's'} can be added. Maximum ${SCHEDULE_ATTACHMENT_MAX_FILES} per paper.`;
                        }

                        return {
                            ...item,
                            attachmentFiles: [...pendingAttachments, ...nextFiles],
                        };
                    })()
                    : item
            ),
        }));
        setErrors((prev) => ({ ...prev, [`schedule_${index}_attachmentFiles`]: attachmentError }));
    }, []);

    const removePendingAttachment = useCallback((index, fileIndex) => {
        setForm((prev) => ({
            ...prev,
            schedule: prev.schedule.map((item, i) =>
                i === index
                    ? {
                        ...item,
                        attachmentFiles: (item.attachmentFiles || []).filter((_, currentIndex) => currentIndex !== fileIndex),
                    }
                    : item
            ),
        }));
        setErrors((prev) => ({ ...prev, [`schedule_${index}_attachmentFiles`]: '' }));
    }, []);

    const removeExistingAttachment = useCallback((index, attachmentIndex) => {
        setForm((prev) => ({
            ...prev,
            schedule: prev.schedule.map((item, i) =>
                i === index
                    ? {
                        ...item,
                        attachments: (item.attachments || []).filter((_, currentIndex) => currentIndex !== attachmentIndex),
                    }
                    : item
            ),
        }));
        setErrors((prev) => ({ ...prev, [`schedule_${index}_attachmentFiles`]: '' }));
    }, []);

    const addScheduleItem = useCallback(() => {
        setForm(prev => {
            const lastItem = prev.schedule[prev.schedule.length - 1];
            const newItem = {
                ...createEmptyScheduleItem(),
                // Carry over values from the last item to improve UX
                startTime: lastItem?.startTime || '',
                endTime: lastItem?.endTime || '',
                totalMarks: lastItem?.totalMarks || '',
                passingMarks: lastItem?.passingMarks || '',
                examDate: '',
                attachments: [],
                attachmentFiles: [],
            };
            return {
                ...prev,
                schedule: [...prev.schedule, newItem]
            };
        });
    }, []);

    const removeScheduleItem = useCallback((index) => {
        setForm(prev => ({
            ...prev,
            schedule: prev.schedule.filter((_, i) => i !== index)
        }));
    }, []);

    const validate = () => {
        const e = {};

        if (!syllabusOnly) {
            if (!form.name.trim()) e.name = 'Examination name is required';
            if (!form.examType) e.examType = 'Please select an exam type';
            if (form.category === 'OTHER' && !form.categoryDescription.trim()) {
                e.categoryDescription = 'Please describe the exam category';
            }
            if (!form.standard || form.standard.length === 0) e.standard = 'Please select at least one class';
            if (!form.section || form.section.length === 0) e.section = 'Please select at least one section';
            if (isSuperAdmin && !form.schoolId) e.schoolId = 'School ID is required for Super Admins';
            if (!form.academicYear || form.academicYear < 2000) e.academicYear = 'Enter a valid academic year';
        }

        form.schedule.forEach((item, index) => {
            if (!syllabusOnly) {
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
            }

            const hasInvalidFile = (item.attachmentFiles || []).some((file) => {
                const extension = file.name.includes('.')
                    ? file.name.split('.').pop().toLowerCase()
                    : '';
                const isAllowedMime = SCHEDULE_ATTACHMENT_ALLOWED_MIME_TYPES.includes(file.type);
                const isAllowedExtension = SCHEDULE_ATTACHMENT_ALLOWED_FILE_EXTENSIONS.includes(extension);
                return !isAllowedMime && !isAllowedExtension;
            });

            if (hasInvalidFile) {
                e[`schedule_${index}_attachmentFiles`] =
                    'Supported formats: JPG, JPEG, PDF, PNG, DOC, DOCX, XLSX, XLS, CSV, TXT';
            } else if ((item.attachmentFiles || []).some((file) => file.size > SCHEDULE_ATTACHMENT_MAX_FILE_SIZE)) {
                e[`schedule_${index}_attachmentFiles`] = 'Each file size should be 10MB or less';
            } else if (((item.attachments || []).length + (item.attachmentFiles || []).length) > SCHEDULE_ATTACHMENT_MAX_FILES) {
                e[`schedule_${index}_attachmentFiles`] = `Maximum ${SCHEDULE_ATTACHMENT_MAX_FILES} attachments allowed per paper`;
            }
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleFormSubmit = (targetStatus, nextSubmitIntent = '') => {
        if (!validate()) return;

        setSubmitIntent(nextSubmitIntent);

        if (syllabusOnly) {
            onSubmit({
                schedule: form.schedule.map((item) => ({
                    _id: item._id || undefined,
                    subject: item.subject,
                    syllabus: item.syllabus?.trim() || '',
                    attachments: Array.isArray(item.attachments) ? item.attachments : [],
                    attachmentFiles: Array.isArray(item.attachmentFiles) ? item.attachmentFiles : [],
                })),
            });
            return;
        }

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
                    _id: item._id || undefined,
                    attachments: Array.isArray(item.attachments) ? item.attachments : [],
                    attachmentFiles: Array.isArray(item.attachmentFiles) ? item.attachmentFiles : [],
                };
                return normalized;
            }),
        };
        onSubmit(payload);
    };

    const handleExistingAttachmentDownload = useCallback(async (attachment) => {
        try {
            await downloadFile(
                attachment?.url,
                attachment?.name || attachment?.originalName || 'attachment'
            );
        } catch (error) {
            console.error('Attachment download failed:', error);
        }
    }, []);

    if (!isOpen) return null;

    const loadingOverlayTitle =
        submitIntent === 'draft'
            ? 'Saving draft...'
            : submitIntent === 'save'
            ? 'Saving updates...'
            : submitIntent === 'syllabus'
            ? 'Saving syllabus changes...'
            : 'Saving exam...';

    const loadingOverlayMessage =
        submitIntent === 'draft'
            ? 'Please wait while we save this examination as draft.'
            : submitIntent === 'save'
            ? 'Please wait while we save your latest exam changes.'
            : submitIntent === 'syllabus'
            ? 'Please wait while we save syllabus and attachment changes.'
            : 'Please wait while we process your request.';

    const inputClasses = (field) =>
        `w-full px-4 py-2.5 bg-white border rounded-xl text-sm transition-all outline-none ${
            errors[field] 
            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-50' 
            : 'border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-slate-300'
        }`;

    const labelClasses = "block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider";

    return (
        <div className="modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-60 p-4 sm:p-6 overflow-hidden">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn">
                <div className="px-6 py-5 sm:px-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
                            <FaCalendarAlt className="text-primary text-xl" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                {syllabusOnly
                                    ? 'Edit Exam Syllabus'
                                    : isEdit
                                    ? 'Update Examination'
                                    : 'New Examination'}
                            </h2>
                            <p className="text-gray-500 text-xs sm:text-sm">
                                {syllabusOnly
                                    ? `Update syllabus and attachments for ${form.name}`
                                    : isEdit
                                    ? `Modifying ${form.name}`
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
                        {!syllabusOnly && (
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

                                        <div>
                                            <label className={labelClasses}>Exam Type *</label>
                                            <select
                                                value={form.examType}
                                                onChange={(e) => handleChange('examType', e.target.value)}
                                                className={inputClasses('examType')}
                                                disabled={isEdit}
                                            >
                                                <option value="">Select Type</option>
                                                <option value="TERM_EXAM">Term Exam (Formal)</option>
                                                <option value="CLASS_TEST">Class Test (Informal)</option>
                                            </select>
                                            {errors.examType && <p className="text-red-500 text-[11px] font-medium mt-1.5 ml-1">{errors.examType}</p>}
                                            {isEdit && (
                                                <p className="text-amber-600 text-[10px] mt-1 italic">
                                                    Exam type is fixed for existing records.
                                                </p>
                                            )}
                                        </div>

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

                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-3">
                                            <div className="space-y-1">
                                                <label className={labelClasses}>Class *</label>
                                                <MultiSelectDropdown
                                                    label="Classes"
                                                    placeholder="Select Classes"
                                                    options={(availableStandards || []).map((s) => ({ label: `Class ${s}`, value: s }))}
                                                    selected={form.standard}
                                                    onChange={(vals) => handleChange('standard', vals)}
                                                    className={errors.standard ? 'border-red-400' : ''}
                                                />
                                                {errors.standard && <p className="text-red-500 text-[11px] font-medium mt-1.5 ml-1">{errors.standard}</p>}
                                            </div>

                                            <div className="space-y-1">
                                                <label className={labelClasses}>Section *</label>
                                                <MultiSelectDropdown
                                                    label="Sections"
                                                    placeholder="Select Sections"
                                                    options={(allUniqueSections || []).map((s) => ({ label: `Section ${s}`, value: s }))}
                                                    selected={form.section}
                                                    onChange={(vals) => handleChange('section', vals)}
                                                    className={errors.section ? 'border-red-400' : ''}
                                                />
                                                {errors.section && <p className="text-red-500 text-[11px] font-medium mt-1.5 ml-1">{errors.section}</p>}
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 lg:col-span-3">
                                            <label className={labelClasses}>Description / Notes</label>
                                            <textarea
                                                value={form.description}
                                                onChange={(e) => handleChange('description', e.target.value)}
                                                className={`${inputClasses('description')} min-h-20 py-3`}
                                            />
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                        )}

                        {syllabusOnly && (
                            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm ring-1 ring-slate-100">
                                <div className="text-sm font-semibold text-slate-800">{form.name}</div>
                                <p className="mt-1 text-xs text-slate-500">
                                    Class {form.standard.join(', ')} - Section {form.section.join(', ')} | Academic Year {form.academicYear}
                                </p>
                                <p className="mt-2 text-xs text-slate-500">
                                    You can edit only syllabus text and attachments for each paper.
                                </p>
                            </div>
                        )}

                        <div className="space-y-6 mt-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-1 rounded-full bg-primary"></div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg leading-tight">Exam Schedule</h3>
                                        <p className="text-[11px] text-slate-500 font-medium">Add subjects and time slots for the examination</p>
                                    </div>
                                </div>
                                {!syllabusOnly && (
                                    <button
                                        type="button"
                                        onClick={addScheduleItem}
                                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-2xl hover:bg-primary-hover transition-all font-bold text-sm shadow-md shadow-primary/20 active:scale-95"
                                    >
                                        <FaPlus size={12} />
                                        <span>Add Subject</span>
                                    </button>
                                )}
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
                                                {!syllabusOnly && form.schedule.length > 1 && (
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
                                                {!syllabusOnly && (
                                                <>
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

                                                <div>
                                                    <label className={labelClasses}>Invigilator / Teacher</label>
                                                    <TeacherSelectDropdown
                                                        value={item.assignedTeacher}
                                                        onChange={(val) => handleScheduleChange(index, 'assignedTeacher', val)}
                                                        options={teacherOptions}
                                                        className={`p-0 bg-white border rounded-xl text-sm transition-all outline-none ${
                                                            errors[`schedule_${index}_assignedTeacher`] 
                                                            ? 'border-red-400 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-50' 
                                                            : 'border-slate-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 hover:border-slate-300'
                                                        }`}
                                                    />
                                                </div>
                                                </>
                                                )}

                                                <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                                                    <label className={labelClasses}>Specific Syllabus / Topics</label>
                                                    <textarea
                                                        value={item.syllabus}
                                                        onChange={(e) => handleScheduleChange(index, 'syllabus', e.target.value)}
                                                        className={`${inputClasses(`schedule_${index}_syllabus`)} min-h-15 resize-none py-2.5`}
                                                    />
                                                </div>

                                                <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                                                    <label className={labelClasses}>Syllabus Attachments (Optional)</label>
                                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-primary hover:text-primary">
                                                            <FaPaperclip size={13} />
                                                            <span>Upload Attachment Files</span>
                                                            <input
                                                                type="file"
                                                                multiple
                                                                accept={SCHEDULE_ATTACHMENT_ACCEPT}
                                                                className="hidden"
                                                                onChange={(event) => {
                                                                    handleScheduleAttachmentChange(index, Array.from(event.target.files || []));
                                                                    event.target.value = '';
                                                                }}
                                                            />
                                                        </label>
                                                        <p className="mt-2 text-[11px] text-slate-500">
                                                            Supported: JPG, JPEG, PDF, PNG, DOC, DOCX, XLSX, XLS, CSV, TXT. Max 10 files per paper, 10MB each.
                                                        </p>
                                                        <p className="mt-1 text-[11px] text-slate-400">
                                                            {(item.attachments?.length || 0) + (item.attachmentFiles?.length || 0)} / {SCHEDULE_ATTACHMENT_MAX_FILES} attachment slots used
                                                        </p>

                                                        {item.attachments?.length > 0 && (
                                                            <div className="mt-3">
                                                                <p className="text-[11px] font-semibold text-slate-600 mb-2">Current attachments</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {item.attachments.map((attachment, attachmentIndex) => (
                                                                        <div
                                                                            key={attachment.publicId || attachment.url || `${index}-${attachmentIndex}`}
                                                                            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700"
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleExistingAttachmentDownload(attachment)}
                                                                                className="font-semibold text-primary hover:underline"
                                                                            >
                                                                                {attachment.name || attachment.originalName || `Attachment ${attachmentIndex + 1}`}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removeExistingAttachment(index, attachmentIndex)}
                                                                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition-all hover:bg-red-100 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                                                                                title="Remove attachment"
                                                                                aria-label="Remove attachment"
                                                                            >
                                                                                <FaTimes size={12} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {item.attachmentFiles?.length > 0 && (
                                                            <div className="mt-3">
                                                                <p className="text-[11px] font-semibold text-slate-600 mb-2">New attachments to upload</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {item.attachmentFiles.map((file, fileIndex) => (
                                                                        <div
                                                                            key={`${file.name}-${file.lastModified}-${fileIndex}`}
                                                                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700"
                                                                        >
                                                                            <span className="font-semibold">{file.name}</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removePendingAttachment(index, fileIndex)}
                                                                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition-all hover:bg-red-100 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                                                                                title="Remove file"
                                                                                aria-label="Remove file"
                                                                            >
                                                                                <FaTimes size={12} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {errors[`schedule_${index}_attachmentFiles`] && (
                                                        <p className="text-red-500 text-[11px] font-medium mt-1.5 ml-1">
                                                            {errors[`schedule_${index}_attachmentFiles`]}
                                                        </p>
                                                    )}
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
                        {!isEdit && !syllabusOnly ? (
                            <button
                                type="button"
                                onClick={() => handleFormSubmit('DRAFT', 'draft')}
                                disabled={isLoading}
                                className="px-8 py-3 bg-primary text-white rounded-xl transition-all font-bold text-sm hover:bg-primary-hover shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                <FaPlus />
                                <span>Save Evaluation as Draft</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleFormSubmit(
                                    syllabusOnly
                                        ? (editData?.status || 'DRAFT')
                                        : (editData?.status || 'DRAFT'),
                                    syllabusOnly ? 'syllabus' : 'save'
                                )}
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
                                            {syllabusOnly
                                                ? 'Save Syllabus Changes'
                                                : 'Save Updates'}
                                        </span>
                                    </div>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {isLoading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
                        <div className="mx-6 w-full max-w-sm rounded-3xl border border-slate-200 bg-white px-8 py-10 text-center shadow-2xl">
                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <PageSpinner size="h-8 w-8" className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">{loadingOverlayTitle}</h3>
                            <p className="mt-2 text-sm text-slate-500">{loadingOverlayMessage}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Discard Changes Confirmation */}
            {showDiscardConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-100 p-4 animate-in fade-in duration-300">
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

