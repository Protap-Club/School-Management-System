import React, { useState, useEffect, useRef } from 'react';
import { FaBook, FaChevronDown, FaPaperclip, FaSave, FaTimes, FaTrash } from 'react-icons/fa';
import { useAssignmentOptions } from '../hooks/useAssignmentOptions';
import { useAssignmentById, useCreateAssignment, useRemoveAssignmentAttachment, useUpdateAssignment } from '../api/queries';
import { useAuth } from '../../auth';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select";

const getApiErrorMessage = (err) =>
    err.response?.data?.error?.message ||
    err.response?.data?.message ||
    err.response?.data?.errors?.[0]?.message ||
    err.message ||
    'Failed to save assignment';

const InputField = ({ label, name, value, onChange, type = "text", required = false, error, ...props }) => (
    <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <input type={type} name={name} value={value}
                onChange={onChange}
                className={`w-full px-4 py-2 border ${error ? 'border-red-400 focus:ring-red-500/10 focus:border-red-600' : 'border-gray-200 focus:ring-indigo-500/10 focus:border-indigo-600'} rounded-lg outline-none transition-all placeholder:text-gray-400 text-sm shadow-sm`}
                required={required} {...props} />
        </div>
        {error && <p className="text-red-500 text-[11px] font-medium mt-1 ml-1 leading-none">{error}</p>}
    </div>
);

const TextAreaField = ({ label, name, value, onChange, required = false, rows = 3, ...props }) => (
    <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <textarea name={name} value={value}
            onChange={onChange} rows={rows}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all placeholder:text-gray-400 text-sm shadow-sm"
            required={required} {...props} />
    </div>
);

const SelectField = ({ label, name, value, onChange, options, placeholder, required = false, loading = false, disabled = false }) => (
    <div className="space-y-1.5 min-w-[140px]">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-tight ml-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <Select 
            value={value?.toString() || ""} 
            onValueChange={(val) => onChange({ target: { name, value: val } })}
            disabled={loading || disabled}
        >
            <SelectTrigger className="h-13 w-full rounded-xl border-gray-200 bg-white px-4 shadow-sm transition-all hover:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-600 text-sm font-semibold text-gray-700">
                <SelectValue placeholder={loading ? 'Loading...' : placeholder || `Select ${label}`} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-gray-100 shadow-xl z-[150] overflow-hidden">
                {options.map((opt, idx) => (
                    <SelectItem key={idx} value={opt.value.toString()} className="text-sm py-2.5 px-4 cursor-pointer focus:bg-primary/10 focus:text-primary rounded-lg mx-1 my-0.5 transition-colors">
                        {opt.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
);

const INITIAL_FORM = {
    title: '',
    description: '',
    subject: '',
    standard: '',
    section: '',
    dueDate: '',
    requiresSubmission: false,
    status: 'active'
};

export const AssignmentModal = ({ isOpen, onClose, assignmentToEdit = null }) => {
    const { user } = useAuth();
    const isAdmin = ['admin', 'super_admin'].includes(user?.role);
    const createMutation = useCreateAssignment();
    const updateMutation = useUpdateAssignment();
    const removeAttachmentMutation = useRemoveAssignmentAttachment();
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({ ...INITIAL_FORM });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [currentAttachments, setCurrentAttachments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const { data: detailResponse, isLoading: detailLoading } = useAssignmentById(assignmentToEdit?._id, isOpen && Boolean(assignmentToEdit));

    const { 
        loading: optionsLoading, 
        availableStandards, 
        getSectionsForStandard, 
        getSubjectsForClass 
    } = useAssignmentOptions();

    const sections = getSectionsForStandard(formData.standard);
    const subjects = getSubjectsForClass(formData.standard, formData.section);
    const detailedAssignment = detailResponse?.data;

    useEffect(() => {
        if (!isOpen) return;
        setError('');
        setSelectedFiles([]);
        setCurrentAttachments(assignmentToEdit?.attachments || []);

        if (assignmentToEdit) {
            setFormData({
                title: assignmentToEdit.title || '',
                description: assignmentToEdit.description || '',
                subject: assignmentToEdit.subject || '',
                standard: assignmentToEdit.standard || '',
                section: assignmentToEdit.section || '',
                dueDate: assignmentToEdit.dueDate ? new Date(assignmentToEdit.dueDate).toISOString().split('T')[0] : '',
                requiresSubmission: Boolean(assignmentToEdit.requiresSubmission),
                status: assignmentToEdit.status || 'active'
            });
        } else {
            setFormData({ ...INITIAL_FORM });
        }
    }, [isOpen, assignmentToEdit]);

    useEffect(() => {
        if (!detailedAssignment?.attachments) return;
        setCurrentAttachments(detailedAssignment.attachments);
    }, [detailedAssignment]);

    if (!isOpen) return null;

    const todayStr = new Date().toISOString().split('T')[0];

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        // Reject Sundays for dueDate
        if (name === 'dueDate' && value) {
            const selectedDay = new Date(value + 'T00:00:00').getDay();
            if (selectedDay === 0) {
                setFieldErrors(prev => ({ ...prev, [name]: 'Sundays are not allowed.' }));
                setFormData(prev => ({ ...prev, [name]: '' }));
                return;
            } else {
                setFieldErrors(prev => ({ ...prev, [name]: '' }));
            }
        }
        setFormData(prev => {
            const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
            // Clear downstream selections if standard/section change
            if (name === 'standard') {
                next.section = '';
                next.subject = '';
            }
            if (name === 'section') {
                next.subject = '';
            }
            return next;
        });
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files].slice(0, 5)); // Limit to 5 files
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleRemoveExistingAttachment = async (publicId) => {
        if (!assignmentToEdit?._id) return;

        try {
            await removeAttachmentMutation.mutateAsync({ id: assignmentToEdit._id, publicId });
            setCurrentAttachments(prev => prev.filter(file => file.publicId !== publicId));
        } catch (err) {
            setError(getApiErrorMessage(err));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });
            
            selectedFiles.forEach(file => {
                data.append('attachments', file);
            });

            if (assignmentToEdit) {
                await updateMutation.mutateAsync({ id: assignmentToEdit._id, formData: data });
            } else {
                await createMutation.mutateAsync(data);
            }
            onClose();
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const isEditing = !!assignmentToEdit;
    const isTeacher = user?.role === 'teacher';
    const canEditClassification = !isEditing || isAdmin || isTeacher;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[95vh]">
                {/* Header */}
                <div className="px-8 py-5 flex items-center justify-between border-b border-gray-100">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                            {isEditing ? 'Edit Assignment' : 'New Assignment'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">Fill in the details and attach any supporting documents</p>
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

                    <form id="assignment-form" onSubmit={handleSubmit} className="space-y-6">
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
                                    options={availableStandards.map(s => ({ 
                                        label: `Class ${s}`, 
                                        value: s 
                                    }))} 
                                    placeholder="Select Class"
                                    loading={optionsLoading}
                                    disabled={!canEditClassification}
                                />
                                <SelectField
                                    label="Section" name="section" value={formData.section}
                                    onChange={handleChange} required
                                    options={sections.map(s => ({ label: `Section ${s}`, value: s }))} 
                                    placeholder="Choose Section"
                                    loading={optionsLoading}
                                    disabled={!formData.standard || !canEditClassification}
                                />
                                <SelectField
                                    label="Subject" name="subject" value={formData.subject}
                                    onChange={handleChange} required
                                    options={subjects.map(s => ({ label: s, value: s }))} 
                                    placeholder="Select Subject"
                                    loading={optionsLoading}
                                    disabled={!formData.section || !canEditClassification}
                                />
                            </div>
                        </div>

                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="requiresSubmission"
                                    checked={formData.requiresSubmission}
                                    onChange={handleChange}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">Require student submission</p>
                                    <p className="text-xs text-gray-500">Turn this on when students must upload a PDF or JPG/JPEG file.</p>
                                </div>
                            </label>
                        </div>

                        {/* Attachments */}
                        <div className="space-y-4 pt-2">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                Attachments (Optional)
                            </h4>
                            <div className="space-y-3">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                                >
                                    <div className="p-3 bg-white shadow-sm rounded-full text-gray-400 group-hover:text-indigo-600 transition-colors">
                                        <FaPaperclip size={20} />
                                    </div>
                                    <p className="text-sm font-medium text-gray-600">Click to upload documents</p>
                                    <p className="text-[10px] text-gray-400">Attach any supporting files up to 10MB each (Max 5 files)</p>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileChange} 
                                        multiple 
                                        className="hidden" 
                                    />
                                </div>

                                {isEditing && currentAttachments.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Existing attachments</p>
                                        {currentAttachments.map((file) => (
                                            <div key={file.publicId} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
                                                        <FaBook size={12} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-700 truncate">{file.originalName || file.name}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase">{file.fileType || 'file'}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveExistingAttachment(file.publicId)}
                                                    disabled={removeAttachmentMutation.isPending}
                                                    className="text-gray-400 hover:text-red-500 transition-colors p-1 disabled:opacity-50"
                                                >
                                                    <FaTrash size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {selectedFiles.length > 0 && (
                                    <div className="grid grid-cols-1 gap-2">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
                                                        <FaBook size={12} />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{file.name}</span>
                                                    <span className="text-[10px] text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                                </div>
                                                <button type="button" onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                                    <FaTrash size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Scheduling */}
                        <div className="space-y-4 pt-2 pb-2">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                Deadline & Status
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Due Date" type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} required min={todayStr} error={fieldErrors.dueDate} />
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

                        {isEditing && (
                            <div className="space-y-4 pt-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    Submission Snapshot
                                </h4>
                                {detailLoading ? (
                                    <div className="rounded-xl border border-gray-100 bg-white px-4 py-4 text-sm text-gray-500">
                                        Loading submission details...
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Required</p>
                                                <p className="mt-1 text-sm font-semibold text-emerald-900">
                                                    {formData.requiresSubmission ? 'Yes' : 'No'}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Submissions</p>
                                                <p className="mt-1 text-sm font-semibold text-indigo-900">
                                                    {detailedAssignment?.submissions?.length || 0}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</p>
                                                <p className="mt-1 text-sm font-semibold text-slate-900 capitalize">
                                                    {formData.status}
                                                </p>
                                            </div>
                                        </div>

                                        {detailedAssignment?.submissions?.length > 0 ? (
                                            <div className="space-y-2">
                                                {detailedAssignment.submissions.map((submission) => (
                                                    <div key={submission._id} className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-800">{submission.student?.name || 'Student'}</p>
                                                                <p className="text-xs text-gray-500">{submission.student?.email || 'No email available'}</p>
                                                            </div>
                                                            <p className="text-xs text-gray-400">
                                                                {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'Submitted'}
                                                            </p>
                                                        </div>
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {(submission.files || []).map((file, index) => (
                                                                <span key={`${submission._id}-${index}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                                                    {file.originalName || file.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-4 text-sm text-gray-500">
                                                No student submissions yet.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                </div>

                {/* Actions */}
                <div className="px-8 py-5 bg-white border-t border-gray-100 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all font-medium text-sm">Cancel</button>
                    <button 
                        form="assignment-form"
                        type="submit" 
                        disabled={loading}
                        className="px-8 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg shadow-lg shadow-primary/20 transition-all font-medium text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>
                        ) : (
                            <><FaSave size={14} /> <span>{isEditing ? 'Save Changes' : 'Create Assignment'}</span></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
