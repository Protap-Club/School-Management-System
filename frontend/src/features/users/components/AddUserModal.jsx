import React, { useState, useEffect } from 'react';
import { FaTimes, FaUserPlus, FaBuilding } from 'react-icons/fa';
import api from '../../../lib/axios';
import { useAuth } from '../../../features/auth';
import { useCreateUser } from '../api/queries';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';

const InputField = ({ label, name, value, onChange, type = "text", required = false, isNumeric = false, ...props }) => (
    <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input type={type} name={name} value={value}
            onChange={(e) => {
                if (isNumeric) {
                    const val = e.target.value.replace(/\D/g, '');
                    onChange({ target: { name, value: val } });
                } else {
                    onChange(e);
                }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400"
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
            <option value="" disabled hidden>{loading ? 'Loading...' : `Select ${label}`}</option>
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
    { key: 'father', label: "Father's Details", bg: 'bg-blue-50/30', border: 'border-blue-100/50', textColor: 'text-blue-700', nameField: 'fatherName', contactField: 'fatherContact', namePlaceholder: "Full Name", contactPlaceholder: "Phone Number" },
    { key: 'mother', label: "Mother's Details", bg: 'bg-pink-50/30', border: 'border-pink-100/50', textColor: 'text-pink-700', nameField: 'motherName', contactField: 'motherContact', namePlaceholder: "Full Name", contactPlaceholder: "Phone Number" },
];

const GUARDIAN_SECTION = { key: 'guardian', label: "Guardian's Details", bg: 'bg-purple-50/30', border: 'border-purple-100/50', textColor: 'text-purple-700', nameField: 'guardianName', contactField: 'guardianContact', namePlaceholder: "Full Name", contactPlaceholder: "Phone Number" };

const INITIAL_FORM = {
    firstName: '', middleName: '', lastName: '', email: '',
    department: '', standard: '', section: '', rollNumber: '',
    contactNo: '', schoolId: '',
    fatherName: '', fatherContact: '', motherName: '', motherContact: '',
    guardianName: '', guardianContact: '', address: '',
    expectedSalary: ''
};

const AddUserModal = ({ isOpen, onClose, roleToAdd, onSuccess }) => {
    const { user } = useAuth();
    const createUserMutation = useCreateUser();
    const [formData, setFormData] = useState({ ...INITIAL_FORM });
    const [schoolName, setSchoolName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeGuardianTab, setActiveGuardianTab] = useState('parents'); // 'parents' | 'guardian'

    // Classes / sections fetched from backend via global hook
    const { loading: classesLoading, availableStandards: standards, getSectionsForStandard, allUniqueSections } = useSchoolClasses();
    const sections = formData.standard ? getSectionsForStandard(formData.standard) : allUniqueSections;

    const roleLabel = roleToAdd?.charAt(0).toUpperCase() + roleToAdd?.slice(1);

    useEffect(() => {
        if (!isOpen) return;
        // Reset form on open
        setFormData({ ...INITIAL_FORM, schoolId: '' });
        setError('');
        setActiveGuardianTab('parents');

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

        fetchSchoolDetails();
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
                if (formData.expectedSalary) payload.expectedSalary = Number(formData.expectedSalary);
                // Note: assignedClasses will be constructed on backend from standard/section if provided
            } else if (roleToAdd === 'student') {
                const studentFields = [
                    'rollNumber', 'standard', 'section',
                    'fatherName', 'fatherContact', 'motherName', 'motherContact',
                    'guardianName', 'guardianContact', 'address'
                ];
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
        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-2 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>{title}
        </h4>
    );

    return (
        <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-6 flex items-center justify-between bg-white border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shadow-sm ${ROLE_COLORS[roleToAdd]?.split(' ')[1]}`}><FaUserPlus size={24} /></div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Add {roleLabel}</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Registration Console</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2.5 rounded-full transition-all"><FaTimes size={20} /></button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 flex items-start gap-3 animate-shake">
                            <span className="mt-0.5">⚠️</span>
                            <div><p className="font-black uppercase tracking-wider text-xs">Error Detected</p><p className="font-medium mt-1">{error}</p></div>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Personal Details */}
                        <div className="space-y-6">
                            {renderSectionHeader('bg-blue-500', 'Identity & Contact')}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <InputField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
                                <InputField label="Middle Name" name="middleName" value={formData.middleName} onChange={handleChange} />
                                <InputField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} required />
                                <InputField label="Contact Number" name="contactNo" value={formData.contactNo} onChange={handleChange} isNumeric maxLength={10} />
                            </div>
                        </div>

                        {/* Admin — Department */}
                        {roleToAdd === 'admin' && (
                            <div className="space-y-6">
                                {renderSectionHeader('bg-purple-500', 'Organizational Role')}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Department" name="department" value={formData.department} onChange={handleChange} required />
                                </div>
                            </div>
                        )}

                        {/* Teacher — Class Assignment */}
                        {roleToAdd === 'teacher' && (
                            <div className="space-y-6">
                                {renderSectionHeader('bg-indigo-500', 'Academic Assignment')}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <SelectField
                                        label="Primary Standard" name="standard" value={formData.standard}
                                        onChange={handleChange} required
                                        options={standards} placeholder="Choose Class"
                                        loading={classesLoading}
                                    />
                                    <SelectField
                                        label="Primary Section" name="section" value={formData.section}
                                        onChange={handleChange} required
                                        options={sections} placeholder="Choose Section"
                                        loading={classesLoading}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Expected / Desired Salary" name="expectedSalary" type="text"
                                        value={formData.expectedSalary} onChange={handleChange}
                                        placeholder="e.g. 45000" isNumeric />
                                </div>
                            </div>
                        )}

                        {/* Student — Academic Details */}
                        {roleToAdd === 'student' && (
                            <div className="space-y-6">
                                {renderSectionHeader('bg-emerald-500', 'Academic Details')}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <InputField label="Roll Number" name="rollNumber" value={formData.rollNumber} onChange={handleChange} required isNumeric />
                                    <SelectField
                                        label="Standard" name="standard" value={formData.standard}
                                        onChange={handleChange} required
                                        options={standards}
                                        loading={classesLoading}
                                    />
                                    <SelectField
                                        label="Section" name="section" value={formData.section}
                                        onChange={handleChange} required
                                        options={sections}
                                        loading={classesLoading}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Guardian / Parent Details for Student */}
                        {roleToAdd === 'student' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                    {renderSectionHeader('bg-orange-500', 'Family & Guardian Matrix')}
                                    <div className="flex bg-gray-100 p-1 rounded-xl">
                                        <button type="button" onClick={() => setActiveGuardianTab('parents')}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeGuardianTab === 'parents' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                            PARENTS
                                        </button>
                                        <button type="button" onClick={() => setActiveGuardianTab('guardian')}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeGuardianTab === 'guardian' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                            GUARDIAN
                                        </button>
                                    </div>
                                </div>

                                {activeGuardianTab === 'parents' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {PARENT_SECTIONS.map(p => (
                                            <div key={p.key} className={`${p.bg} rounded-3xl p-5 border ${p.border} space-y-4`}>
                                                <h5 className={`text-[10px] font-black ${p.textColor} uppercase tracking-widest`}>{p.label}</h5>
                                                <div className="space-y-4">
                                                    <InputField label="Full Name" name={p.nameField} value={formData[p.nameField]} onChange={handleChange} />
                                                    <InputField label="Contact No." name={p.contactField} value={formData[p.contactField]} onChange={handleChange} isNumeric maxLength={10} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={`${GUARDIAN_SECTION.bg} rounded-3xl p-6 border ${GUARDIAN_SECTION.border} space-y-6`}>
                                        <h5 className={`text-[10px] font-black ${GUARDIAN_SECTION.textColor} uppercase tracking-widest`}>{GUARDIAN_SECTION.label}</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputField label="Full Name" name={GUARDIAN_SECTION.nameField} value={formData[GUARDIAN_SECTION.nameField]} onChange={handleChange} />
                                            <InputField label="Contact No." name={GUARDIAN_SECTION.contactField} value={formData[GUARDIAN_SECTION.contactField]} onChange={handleChange} isNumeric maxLength={10} />
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}



                        {/* Actions */}
                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all font-medium text-sm">Cancel</button>
                            <button type="submit" disabled={loading}
                                className="btn-primary px-6 rounded-lg shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed">
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
