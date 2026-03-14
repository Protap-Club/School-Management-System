import React, { useState, useEffect } from 'react';
import { FaTimes, FaBook, FaSave } from 'react-icons/fa';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';
import { useCreateAssignment, useUpdateAssignment } from '../api/queries';

const InputField = ({ label, name, value, onChange, type = "text", required = false, ...props }) => (
    <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input type={type} name={name} value={value}
            onChange={onChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all placeholder:text-gray-400 text-sm"
            required={required} {...props} />
    </div>
);

const TextAreaField = ({ label, name, value, onChange, required = false, rows = 3, ...props }) => (
    <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <textarea name={name} value={value}
            onChange={onChange} rows={rows}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all placeholder:text-gray-400 text-sm"
            required={required} {...props} />
    </div>
);

const SelectField = ({ label, name, value, onChange, options, placeholder, required = false, loading = false }) => (
    <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all bg-white disabled:opacity-60 text-sm"
            disabled={loading}
        >
            <option value="" disabled selected hidden>{loading ? 'Loading...' : placeholder || `Select ${label}`}</option>
            {options.map(opt => (
                <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
            ))}
        </select>
    </div>
);

const INITIAL_FORM = {
    title: '',
    description: '',
    subject: '',
    standard: '',
    section: '',
    dueDate: '',
    status: 'active'
};

export const AssignmentModal = ({ isOpen, onClose, assignmentToEdit = null }) => {
    const createMutation = useCreateAssignment();
    const updateMutation = useUpdateAssignment();

    const [formData, setFormData] = useState({ ...INITIAL_FORM });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { loading: classesLoading, availableStandards: standards, getSectionsForStandard, allUniqueSections } = useSchoolClasses();
    const sections = formData.standard ? getSectionsForStandard(formData.standard) : allUniqueSections;

    useEffect(() => {
        if (!isOpen) return;
        setError('');
        
        if (assignmentToEdit) {
            setFormData({
                title: assignmentToEdit.title || '',
                description: assignmentToEdit.description || '',
                subject: assignmentToEdit.subject || '',
                standard: assignmentToEdit.standard || '',
                section: assignmentToEdit.section || '',
                dueDate: assignmentToEdit.dueDate ? new Date(assignmentToEdit.dueDate).toISOString().split('T')[0] : '',
                status: assignmentToEdit.status || 'active'
            });
        } else {
            setFormData({ ...INITIAL_FORM });
        }
    }, [isOpen, assignmentToEdit]);

    if (!isOpen) return null;

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const payload = { ...formData };
            if (assignmentToEdit) {
                await updateMutation.mutateAsync({ id: assignmentToEdit._id, ...payload });
            } else {
                await createMutation.mutateAsync(payload);
            }
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Failed to save assignment');
        } finally {
            setLoading(false);
        }
    };

    const isEditing = !!assignmentToEdit;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-5 flex items-center justify-between border-b border-gray-100">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                            {isEditing ? 'Edit Assignment' : 'New Assignment'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">Fill in the details below</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all">
                        <FaTimes size={18} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-start gap-3">
                            <span className="mt-0.5">⚠️</span>
                            <p>{error}</p>
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                Assignment Overview
                            </h4>
                            <div className="grid grid-cols-1 gap-6">
                                <InputField label="Title" name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. Chapter 4 Exercises" />
                                <TextAreaField label="Description" name="description" value={formData.description} onChange={handleChange} required placeholder="Detailed instructions for the students..." />
                            </div>
                        </div>

                        {/* Academic Classification */}
                        <div className="space-y-4 pt-2">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                Class & Subject
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <SelectField
                                    label="Class" name="standard" value={formData.standard}
                                    onChange={handleChange} required
                                    options={standards.map(s => ({ label: s, value: s }))} placeholder="Class"
                                    loading={classesLoading}
                                />
                                <SelectField
                                    label="Section" name="section" value={formData.section}
                                    onChange={handleChange} required
                                    options={sections} placeholder="Choose Section"
                                    loading={classesLoading}
                                />
                                <InputField label="Subject" name="subject" value={formData.subject} onChange={handleChange} required placeholder="e.g. Mathematics" />
                            </div>
                        </div>

                        {/* Scheduling & Status */}
                        <div className="space-y-4 pt-2">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                Deadline & Status
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Due Date" type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} required />
                                {isEditing && (
                                    <SelectField
                                        label="Status" name="status" value={formData.status}
                                        onChange={handleChange} required
                                        options={[
                                            { label: 'Active', value: 'active' },
                                            { label: 'Closed', value: 'closed' }
                                        ]}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all font-medium text-sm">Cancel</button>
                            <button type="submit" disabled={loading}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-200 transition-all font-medium text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                                {loading ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>
                                ) : (
                                    <>{isEditing ? 'Save Changes' : 'Create Assignment'}</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
