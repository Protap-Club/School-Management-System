import React, { useState, useCallback, useEffect } from 'react';
import { FaTimes, FaPlus, FaTrash, FaSave, FaCalendarAlt, FaClock, FaUserGraduate } from 'react-icons/fa';
import { getSchoolClasses } from '../../api/school';

const INITIAL_FORM = {
    name: '',
    examType: '',
    category: 'OTHER',
    academicYear: new Date().getFullYear(),
    standard: '',
    section: '',
    description: '',
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

const ExamModal = ({ isOpen, onClose, onSubmit, editData, isLoading, userRole }) => {
    const isEdit = !!editData;
    const [form, setForm] = useState(() => {
        if (editData) {
            return {
                name: editData.name || '',
                examType: editData.examType || '',
                category: editData.category || 'OTHER',
                academicYear: editData.academicYear || new Date().getFullYear(),
                standard: editData.standard || '',
                section: editData.section || '',
                description: editData.description || '',
                schedule: editData.schedule?.length > 0 ? editData.schedule : [{ ...INITIAL_FORM.schedule[0] }]
            };
        }
        return { ...INITIAL_FORM };
    });
    
    const [errors, setErrors] = useState({});
    const [classesData, setClassesData] = useState([]);
    const [classesLoading, setClassesLoading] = useState(false);
    const [availableStandards, setAvailableStandards] = useState(() => {
    // Initialize with default standards 1-12
    const standards = [];
    for (let i = 1; i <= 12; i++) {
      standards.push(i.toString());
    }
    return standards;
  });
    const [availableSections, setAvailableSections] = useState(['A', 'B', 'C']); // Initialize with default sections

    // Fetch classes data on mount
    useEffect(() => {
        const fetchClasses = async () => {
            setClassesLoading(true);
            try {
                const response = await getSchoolClasses();
                if (response.success && response.data?.classes) {
                    setClassesData(response.data.classes);
                    
                    // Extract unique standards and sections
                    const standards = [];
                    
                    // Add default standards 1-12
                    for (let i = 1; i <= 12; i++) {
                        standards.push(i.toString());
                    }
                    
                    // Add standards from backend if they don't exist
                    response.data.classes.forEach(c => {
                        if (!standards.includes(c.standard)) {
                            standards.push(c.standard);
                        }
                    });
                    
                    // Sort standards numerically
                    setAvailableStandards(standards.sort((a, b) => {
                        const numA = parseInt(a) || 0;
                        const numB = parseInt(b) || 0;
                        return numA - numB;
                    }));
                }
            } catch (error) {
                console.error('Failed to fetch classes:', error);
            } finally {
                setClassesLoading(false);
            }
        };
        
        if (isOpen) {
            fetchClasses();
        }
    }, [isOpen]);

    // Update sections when standard changes
    useEffect(() => {
        if (form.standard) {
            const sections = ['A', 'B', 'C']; // Default sections
            
            // Add sections from backend if they don't exist
            classesData
                .filter(c => c.standard === form.standard)
                .forEach(c => {
                    if (!sections.includes(c.section)) {
                        sections.push(c.section);
                    }
                });
            
            setAvailableSections(sections.sort());
        } else {
            setAvailableSections(['A', 'B', 'C']); // Always show default sections
        }
    }, [form.standard, classesData]);

    const handleChange = useCallback((field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    }, []);

    const handleScheduleChange = useCallback((index, field, value) => {
        setForm(prev => ({
            ...prev,
            schedule: prev.schedule.map((item, i) => 
                i === index ? { ...item, [field]: value } : item
            )
        }));
    }, []);

    const addScheduleItem = useCallback(() => {
        setForm(prev => ({
            ...prev,
            schedule: [...prev.schedule, { ...INITIAL_FORM.schedule[0] }]
        }));
    }, []);

    const removeScheduleItem = useCallback((index) => {
        setForm(prev => ({
            ...prev,
            schedule: prev.schedule.filter((_, i) => i !== index)
        }));
    }, []);

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Required';
        if (!form.examType) e.examType = 'Required';
        if (!form.standard) e.standard = 'Required';
        if (!form.section) e.section = 'Required';
        if (!form.academicYear || form.academicYear < 2000) e.academicYear = 'Valid year required';
        
        // Validate schedule items
        form.schedule.forEach((item, index) => {
            if (!item.subject.trim()) e[`schedule_${index}_subject`] = 'Required';
            if (!item.examDate) e[`schedule_${index}_examDate`] = 'Required';
            if (!item.totalMarks || Number(item.totalMarks) < 0) e[`schedule_${index}_totalMarks`] = 'Valid marks required';
            if (!item.passingMarks || Number(item.passingMarks) < 0) e[`schedule_${index}_passingMarks`] = 'Valid passing marks required';
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        
        const payload = {
            ...form,
            academicYear: Number(form.academicYear),
            schedule: form.schedule.map(item => ({
                ...item,
                totalMarks: Number(item.totalMarks),
                passingMarks: Number(item.passingMarks)
            }))
        };
        
        onSubmit(payload);
    };

    if (!isOpen) return null;

    const inputCls = (field) =>
        `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
            errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200'
        }`;

    const selectCls = (field) =>
        `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none bg-white ${
            errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200'
        }`;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fadeIn flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {isEdit ? 'Edit Exam' : 'Create New Exam'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {userRole === 'admin' ? 'Create term exam for any class' : 'Create class test for your assigned classes'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Basic Information */}
                        <div className="bg-gray-50 rounded-xl p-5">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FaCalendarAlt className="text-primary" />
                                Basic Information
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Exam Name *</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        className={inputCls('name')}
                                        placeholder="e.g., Midterm Examination 2024"
                                    />
                                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type *</label>
                                    <select
                                        value={form.examType}
                                        onChange={(e) => handleChange('examType', e.target.value)}
                                        className={selectCls('examType')}
                                        disabled={isEdit} // Can't change exam type after creation
                                    >
                                        <option value="">Select Type</option>
                                        <option value="TERM_EXAM">Term Exam</option>
                                        <option value="CLASS_TEST">Class Test</option>
                                    </select>
                                    {errors.examType && <p className="text-red-500 text-xs mt-1">{errors.examType}</p>}
                                    {isEdit && (
                                        <p className="text-amber-600 text-xs mt-1">Exam type cannot be changed after creation</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => handleChange('category', e.target.value)}
                                        className={selectCls('category')}
                                    >
                                        {EXAM_CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year *</label>
                                    <input
                                        type="number"
                                        value={form.academicYear}
                                        onChange={(e) => handleChange('academicYear', e.target.value)}
                                        className={inputCls('academicYear')}
                                        min="2020"
                                        max="2030"
                                    />
                                    {errors.academicYear && <p className="text-red-500 text-xs mt-1">{errors.academicYear}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Standard *</label>
                                    <select
                                        value={form.standard}
                                        onChange={(e) => handleChange('standard', e.target.value)}
                                        className={selectCls('standard')}
                                        disabled={classesLoading}
                                    >
                                        <option value="">Select Standard</option>
                                        {availableStandards.map(standard => (
                                            <option key={standard} value={standard}>
                                                {standard}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.standard && <p className="text-red-500 text-xs mt-1">{errors.standard}</p>}
                                    {classesLoading && <p className="text-gray-500 text-xs mt-1">Loading classes...</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Section *</label>
                                    <select
                                        value={form.section}
                                        onChange={(e) => handleChange('section', e.target.value)}
                                        className={selectCls('section')}
                                        disabled={!form.standard || classesLoading}
                                    >
                                        <option value="">Select Section</option>
                                        {availableSections.map(section => (
                                            <option key={section} value={section}>
                                                {section}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.section && <p className="text-red-500 text-xs mt-1">{errors.section}</p>}
                                    {!form.standard && (
                                        <p className="text-gray-500 text-xs mt-1">Select standard first</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    className={`${inputCls('description')} resize-none`}
                                    rows={3}
                                    placeholder="Optional description about the exam..."
                                />
                            </div>
                        </div>

                        {/* Schedule */}
                        <div className="bg-gray-50 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <FaClock className="text-primary" />
                                    Exam Schedule
                                </h3>
                                <button
                                    type="button"
                                    onClick={addScheduleItem}
                                    className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
                                >
                                    <FaPlus size={12} />
                                    Add Subject
                                </button>
                            </div>

                            <div className="space-y-4">
                                {form.schedule.map((item, index) => (
                                    <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium text-gray-900">Subject {index + 1}</h4>
                                            {form.schedule.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeScheduleItem(index)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <FaTrash size={14} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name *</label>
                                                <input
                                                    type="text"
                                                    value={item.subject}
                                                    onChange={(e) => handleScheduleChange(index, 'subject', e.target.value)}
                                                    className={inputCls(`schedule_${index}_subject`)}
                                                    placeholder="e.g., Mathematics"
                                                />
                                                {errors[`schedule_${index}_subject`] && (
                                                    <p className="text-red-500 text-xs mt-1">{errors[`schedule_${index}_subject`]}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Exam Date *</label>
                                                <input
                                                    type="date"
                                                    value={item.examDate}
                                                    onChange={(e) => handleScheduleChange(index, 'examDate', e.target.value)}
                                                    className={inputCls(`schedule_${index}_examDate`)}
                                                />
                                                {errors[`schedule_${index}_examDate`] && (
                                                    <p className="text-red-500 text-xs mt-1">{errors[`schedule_${index}_examDate`]}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                                                <input
                                                    type="time"
                                                    value={item.startTime}
                                                    onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                                                    className={inputCls('startTime')}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                                                <input
                                                    type="time"
                                                    value={item.endTime}
                                                    onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                                                    className={inputCls('endTime')}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks *</label>
                                                <input
                                                    type="number"
                                                    value={item.totalMarks}
                                                    onChange={(e) => handleScheduleChange(index, 'totalMarks', e.target.value)}
                                                    className={inputCls(`schedule_${index}_totalMarks`)}
                                                    placeholder="100"
                                                    min="1"
                                                />
                                                {errors[`schedule_${index}_totalMarks`] && (
                                                    <p className="text-red-500 text-xs mt-1">{errors[`schedule_${index}_totalMarks`]}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Passing Marks *</label>
                                                <input
                                                    type="number"
                                                    value={item.passingMarks}
                                                    onChange={(e) => handleScheduleChange(index, 'passingMarks', e.target.value)}
                                                    className={inputCls(`schedule_${index}_passingMarks`)}
                                                    placeholder="35"
                                                    min="0"
                                                />
                                                {errors[`schedule_${index}_passingMarks`] && (
                                                    <p className="text-red-500 text-xs mt-1">{errors[`schedule_${index}_passingMarks`]}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Syllabus</label>
                                            <textarea
                                                value={item.syllabus}
                                                onChange={(e) => handleScheduleChange(index, 'syllabus', e.target.value)}
                                                className={`${inputCls('syllabus')} resize-none`}
                                                rows={2}
                                                placeholder="Topics covered in this exam..."
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                            <FaSave size={14} />
                        )}
                        {isEdit ? 'Update Exam' : 'Create Exam'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExamModal;
