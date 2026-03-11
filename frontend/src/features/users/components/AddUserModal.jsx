import React, { useState, useEffect } from 'react';
import { FaTimes, FaUserPlus, FaBuilding } from 'react-icons/fa';
import api from '../../../lib/axios';
import { useAuth } from '../../../features/auth';
import { useCreateUser } from '../api/queries';

const InputField = ({ label, name, value, onChange, type = "text", required = false, ...props }) => (
    <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input type={type} name={name} value={value} onChange={onChange}
            className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-gray-400"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white disabled:opacity-60"
            disabled={loading}
        >
            <option value="">{loading ? 'Loading...' : placeholder}</option>
            {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    </div>
);

const ROLE_COLORS = {
    student: 'border-emerald-500 text-emerald-600',
    teacher: 'border-blue-500 text-blue-600',
    admin: 'border-purple-500 text-purple-600'
};

const PARENT_SECTIONS = [
    { key: 'father', emoji: '', label: "Father's Details", bg: 'bg-orange-50/50', border: 'border-orange-100/50', textColor: 'text-orange-700', nameField: 'fatherName', contactField: 'fatherContact', namePlaceholder: "Father's Full Name", contactPlaceholder: "Father's Phone Number" },
    { key: 'mother', emoji: '', label: "Mother's Details", bg: 'bg-pink-50/50', border: 'border-pink-100/50', textColor: 'text-pink-700', nameField: 'motherName', contactField: 'motherContact', namePlaceholder: "Mother's Full Name", contactPlaceholder: "Mother's Phone Number" },
];

const INITIAL_FORM = {
    firstName: '', middleName: '', lastName: '', email: '',
    department: '', standard: '', section: '', rollNumber: '',
    contactNo: '', schoolId: '',
    fatherName: '', fatherContact: '', motherName: '', motherContact: ''
};

const AddUserModal = ({ isOpen, onClose, roleToAdd, onSuccess }) => {
    const { user } = useAuth();
    const createUserMutation = useCreateUser();
    const [formData, setFormData] = useState({ ...INITIAL_FORM });
    const [schoolName, setSchoolName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Classes / sections fetched from backend
    const [standards, setStandards] = useState([]);
    const [sections, setSections] = useState([]);
    const [classesLoading, setClassesLoading] = useState(false);

    const roleLabel = roleToAdd?.charAt(0).toUpperCase() + roleToAdd?.slice(1);

    useEffect(() => {
        if (!isOpen) return;
        // Reset form on open
        setFormData({ ...INITIAL_FORM, schoolId: '' });
        setError('');

        const fetchSchoolDetails = async () => {
            if (user?.schoolId) {
                if (typeof user.schoolId === 'object' && user.schoolId.name) {
                    setSchoolName(user.schoolId.name);
                    setFormData(prev => ({ ...prev, schoolId: user.schoolId._id }));
                } else {
                    setFormData(prev => ({ ...prev, schoolId: user.schoolId }));
                    try {
                        const response = await api.get('/school');
                        setSchoolName(response.data?.data?.school?.name || 'School');
                    } catch {
                        setSchoolName('School');
                    }
                }
            }
        };

        const fetchClasses = async () => {
            if (roleToAdd === 'student' || roleToAdd === 'teacher') {
                setClassesLoading(true);
                try {
                    const response = await api.get('/school/classes');
                    const data = response.data?.data;
                    setStandards(data?.standards || []);
                    setSections(data?.sections || []);
                } catch {
                    // fallback — keep empty, user can still type
                    setStandards([]);
                    setSections([]);
                } finally {
                    setClassesLoading(false);
                }
            }
        };

        fetchSchoolDetails();
        fetchClasses();
    }, [isOpen, user, roleToAdd]);

    if (!isOpen) return null;

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const fullName = `${formData.firstName}${formData.middleName ? ' ' + formData.middleName : ''} ${formData.lastName}`.trim();

            const payload = {
                name: fullName,
                role: roleToAdd,
                email: formData.email.trim(),
                schoolId: formData.schoolId || user?.schoolId
            };

            if (roleToAdd === 'admin') {
                if (formData.department) payload.department = formData.department;
            } else if (roleToAdd === 'teacher') {
                if (formData.standard) payload.standard = formData.standard;
                if (formData.section) payload.section = formData.section;
            } else if (roleToAdd === 'student') {
                const studentFields = ['rollNumber', 'standard', 'section', 'fatherName', 'fatherContact', 'motherName', 'motherContact'];
                studentFields.forEach(field => {
                    if (formData[field]) payload[field] = formData[field];
                });
            }

            if (formData.contactNo) payload.contactNo = formData.contactNo;

            await createUserMutation.mutateAsync(payload);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const renderSectionHeader = (dotColor, title) => (
        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>{title}
        </h4>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gray-50 ${ROLE_COLORS[roleToAdd]?.split(' ')[1]}`}><FaUserPlus size={20} /></div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Add New {roleLabel}</h3>
                            <p className="text-xs text-gray-500">Enter details to create a new account</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all"><FaTimes size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-start gap-3">
                            <span className="mt-0.5">⚠️</span>
                            <div><p className="font-semibold">Creation Failed</p><p>{error}</p></div>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* School Banner */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm border border-gray-100"><FaBuilding /></div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Target School</p>
                                <p className="text-sm font-bold text-gray-800">{schoolName || 'Loading...'}</p>
                            </div>
                        </div>

                        {/* Personal Details */}
                        <div className="space-y-4">
                            {renderSectionHeader('bg-blue-500', 'Personal Details')}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <InputField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required placeholder="John" />
                                <InputField label="Middle Name" name="middleName" value={formData.middleName} onChange={handleChange} placeholder="M." />
                                <InputField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required placeholder="Doe" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com" />
                                <InputField label="Contact Number" name="contactNo" value={formData.contactNo} onChange={handleChange} placeholder="+91 98765 43210" />
                            </div>
                        </div>

                        {/* Admin — Department */}
                        {roleToAdd === 'admin' && (
                            <div className="space-y-4">
                                {renderSectionHeader('bg-purple-500', 'Professional Details')}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField label="Department" name="department" value={formData.department} onChange={handleChange} required placeholder="e.g. Administration" />
                                </div>
                            </div>
                        )}

                        {/* Teacher — Class Assignment */}
                        {roleToAdd === 'teacher' && (
                            <div className="space-y-4">
                                {renderSectionHeader('bg-indigo-500', 'Academic Assignment')}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <SelectField
                                        label="Class" name="standard" value={formData.standard}
                                        onChange={handleChange} required
                                        options={standards} placeholder="Select Class"
                                        loading={classesLoading}
                                    />
                                    <SelectField
                                        label="Section" name="section" value={formData.section}
                                        onChange={handleChange} required
                                        options={sections} placeholder="Select Section"
                                        loading={classesLoading}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Student — Academic Details (no Year, no Guardian) */}
                        {roleToAdd === 'student' && (
                            <div className="space-y-4">
                                {renderSectionHeader('bg-emerald-500', 'Student Academic Details')}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <InputField label="Roll Number" name="rollNumber" value={formData.rollNumber} onChange={handleChange} required placeholder="e.g. 101" />
                                    <SelectField
                                        label="Class" name="standard" value={formData.standard}
                                        onChange={handleChange} required
                                        options={standards} placeholder="Select Class"
                                        loading={classesLoading}
                                    />
                                    <SelectField
                                        label="Section" name="section" value={formData.section}
                                        onChange={handleChange} required
                                        options={sections} placeholder="Select Section"
                                        loading={classesLoading}
                                    />
                                </div>

                                {/* Fallback: show text inputs if no classes exist yet */}
                                {!classesLoading && standards.length === 0 && (
                                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                        No classes found. Please create a timetable first, or type directly in the fields below.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Guardian / Parent Details for Student */}
                        {roleToAdd === 'student' && (
                            <div className="space-y-4">
                                {renderSectionHeader('bg-orange-500', 'Parent / Guardian Details')}
                                {PARENT_SECTIONS.map(p => (
                                    <div key={p.key} className={`${p.bg} rounded-lg p-3 border ${p.border} space-y-3`}>
                                        <h5 className={`text-xs font-semibold ${p.textColor} uppercase tracking-wide flex items-center gap-2`}>
                                            <span className="text-lg">{p.emoji}</span> {p.label}
                                        </h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField label="Name" name={p.nameField} value={formData[p.nameField]} onChange={handleChange} placeholder={p.namePlaceholder} />
                                            <InputField label="Contact" name={p.contactField} value={formData[p.contactField]} onChange={handleChange} placeholder={p.contactPlaceholder} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Info */}
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                            <span className="text-blue-500 mt-0.5">ℹ️</span>
                            <p className="text-sm text-blue-700">A secure password will be <strong>auto-generated</strong> and sent to the user's email address.</p>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all font-medium text-sm">Cancel</button>
                            <button type="submit" disabled={loading}
                                className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-lg shadow-lg shadow-gray-200 transition-all font-medium text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                                {loading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Creating...</>) : (<><FaUserPlus />Create {roleLabel}</>)}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddUserModal;
