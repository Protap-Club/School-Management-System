import React, { useState, useEffect, useMemo } from 'react';
import { FaTimes, FaUserPlus, FaBuilding, FaInfoCircle } from 'react-icons/fa';
import api from '../../../lib/axios';
import { useAuth } from '../../../features/auth';
import { useCreateUser, useUsers } from '../api/queries';
import { useProfile } from '../../attendance';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';
import { useNavigate } from 'react-router-dom';
import TeacherConflictModal from './TeacherConflictModal';

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

const SelectField = ({
    label,
    name,
    value,
    onChange,
    options,
    placeholder,
    required = false,
    loading = false,
    disabled = false
}) => (
    <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:opacity-100"
            disabled={disabled}
            style={{ colorScheme: 'light' }}
        >
            <option value="">{loading ? 'Loading...' : (placeholder || `Select ${label}`)}</option>
            {options.map(opt => (
                <option key={opt} value={opt} className="bg-white text-gray-900">{opt}</option>
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

const buildClassKey = ({ standard, section } = {}) =>
    `${String(standard || '').trim()}::${String(section || '').trim().toUpperCase()}`;

const AddUserModal = ({ isOpen, onClose, roleToAdd, onSuccess, initialData }) => {
    const { user } = useAuth();
    const { data: profileData } = useProfile();
    const navigate = useNavigate();
    const isSuperAdmin = user?.role === 'super_admin';
    const isAdmin = user?.role === 'admin';
    const isTeacher = user?.role === 'teacher';
    const rolePrefix = useMemo(
        () => isSuperAdmin ? 'superadmin' : (isAdmin ? 'admin' : (user?.role || 'student')),
        [isSuperAdmin, isAdmin, user?.role]
    );
    const createUserMutation = useCreateUser();
    const teachersQuery = useUsers({ role: 'teacher', pageSize: 5000, enabled: isOpen && roleToAdd === 'teacher' });
    const [formData, setFormData] = useState({ ...INITIAL_FORM });
    const [schoolName, setSchoolName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [conflicts, setConflicts] = useState([]);
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [pendingPayload, setPendingPayload] = useState(null);
    const [activeGuardianTab, setActiveGuardianTab] = useState('parents'); // 'parents' | 'guardian'

    // Get teacher's assigned classes for filtering
    const teacherAssignedClasses = useMemo(() => {
        if (!isTeacher || !profileData?.data?.profile?.assignedClasses) {
            return [];
        }
        return profileData.data.profile.assignedClasses;
    }, [isTeacher, profileData]);

    // Classes / sections fetched from backend via global hook
    const { loading: classesLoading, classSections, availableStandards: standards, getSectionsForStandard, allUniqueSections } = useSchoolClasses();
    const occupiedTeacherMap = useMemo(() => {
        const map = new Map();
        (teachersQuery.data?.data?.users || []).forEach(teacher => {
            const assignedClass = teacher.profile?.assignedClasses?.[0];
            if (assignedClass) {
                map.set(buildClassKey(assignedClass), teacher.name);
            }
        });
        return map;
    }, [teachersQuery.data?.data?.users]);

    const occupiedTeacherName = useMemo(() => {
        if (roleToAdd === 'teacher' && formData.standard && formData.section) {
            return occupiedTeacherMap.get(buildClassKey({ standard: formData.standard, section: formData.section }));
        }
        return null;
    }, [formData.section, formData.standard, occupiedTeacherMap, roleToAdd]);
    const finalStandards = useMemo(() => {
        let baseStandards = standards;
        
        // For teachers creating students, filter to only their assigned classes
        if (isTeacher && roleToAdd === 'student') {
            const teacherStandards = [...new Set(teacherAssignedClasses.map(cls => cls.standard))];
            baseStandards = standards.filter(std => teacherStandards.includes(std));
        }
        
        if (initialData?.isPending && initialData.standard && !baseStandards.includes(initialData.standard)) {
            return [...baseStandards, initialData.standard];
        }
        return baseStandards;
    }, [standards, initialData, isTeacher, roleToAdd, teacherAssignedClasses]);

    const finalSections = useMemo(() => {
        let baseSections = formData.standard ? getSectionsForStandard(formData.standard) : allUniqueSections;
        
        // For teachers creating students, filter sections to only their assigned classes for the selected standard
        if (isTeacher && roleToAdd === 'student' && formData.standard) {
            const teacherSectionsForStandard = teacherAssignedClasses
                .filter(cls => cls.standard === formData.standard)
                .map(cls => cls.section);
            baseSections = baseSections.filter(section => teacherSectionsForStandard.includes(section));
        }
        
        if (initialData?.isPending && formData.standard === initialData.standard && !baseSections.includes(initialData.section)) {
            return [...baseSections, initialData.section];
        }
        return baseSections;
    }, [formData.standard, getSectionsForStandard, allUniqueSections, initialData, isTeacher, roleToAdd, teacherAssignedClasses]);

    const teacherAssignmentLoading = classesLoading || teachersQuery.isLoading;
    const roleLabel = roleToAdd?.charAt(0).toUpperCase() + roleToAdd?.slice(1);

    useEffect(() => {
        if (!isOpen) return;
        // Reset form on open, but preserve initialData if provided (for class/section)
        setFormData({
            ...INITIAL_FORM,
            schoolId: '',
            ...(initialData?.standard ? { standard: initialData.standard } : {}),
            ...(initialData?.section ? { section: initialData.section } : {})
        });
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
            // DEFERRED CLASS CREATION: If this class doesn't exist yet, create it now!
            if (initialData?.isPending && formData.standard === initialData.standard && formData.section === initialData.section) {
                try {
                    await api.post('/school/classes', {
                        standard: formData.standard,
                        section: formData.section
                    });
                    // Note: We don't necessarily need to refresh the global list here 
                    // because we are navigating away or the student creation will trigger a refresh.
                } catch (err) {
                    // If it already exists (e.g. concurrent action), we can ignore and proceed
                    if (err.response?.status !== 400 && err.response?.status !== 409) {
                        throw new Error(err.response?.data?.message || 'Failed to initialize class');
                    }
                }
            }

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
                if (formData.standard && formData.section && occupiedTeacherName) {
                    setError(`Class ${formData.standard} ${formData.section} is already assigned to teacher named ${occupiedTeacherName}.`);
                    setLoading(false);
                    return;
                }
                if (formData.standard) payload.standard = formData.standard;
                if (formData.section) payload.section = formData.section;
                if (formData.expectedSalary !== '') {
                    const expectedSalary = Number(formData.expectedSalary);
                    if (!Number.isFinite(expectedSalary) || expectedSalary <= 100) {
                        setError('Expected / Desired Salary must be more than 100');
                        setLoading(false);
                        return;
                    }
                    payload.expectedSalary = expectedSalary;
                }
                // Note: assignedClasses will be constructed on backend from standard/section if provided
            } else if (roleToAdd === 'student') {
                // Validation: Roll number must be positive
                const rollNum = Number(formData.rollNumber);
                if (!rollNum || rollNum <= 0) {
                    setError('Roll Number must be a positive number (greater than 0)');
                    setLoading(false);
                    return;
                }

                // Validation: At least one parent or guardian name is required
                const hasParentInfo = formData.fatherName?.trim() || formData.motherName?.trim();
                const hasGuardianInfo = formData.guardianName?.trim();

                if (!hasParentInfo && !hasGuardianInfo) {
                    setError('A student must have at least one parent or guardian detail provided');
                    setLoading(false);
                    return;
                }

                // New: Requirement for Admin/Super Admin to provide contact number if name is provided
                if (!isTeacher) {
                    if (formData.fatherName?.trim() && !formData.fatherContact?.trim()) {
                        setError("Father's contact number is required.");
                        setLoading(false);
                        return;
                    }
                    if (formData.motherName?.trim() && !formData.motherContact?.trim()) {
                        setError("Mother's contact number is required.");
                        setLoading(false);
                        return;
                    }
                    if (formData.guardianName?.trim() && !formData.guardianContact?.trim()) {
                        setError("Guardian's contact number is required.");
                        setLoading(false);
                        return;
                    }
                }

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
            if (err.response?.status === 409 && err.response?.data?.code === 'CLASS_TEACHER_ALREADY_ASSIGNED') {
                setConflicts(err.response.data.conflicts || []);
                setPendingPayload(payload);
                setShowConflictModal(true);
                return;
            }
            setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmConflict = async () => {
        if (!pendingPayload) return;
        setLoading(true);
        setShowConflictModal(false);
        try {
            await createUserMutation.mutateAsync({ ...pendingPayload, forceOverride: true });
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create user after override');
        } finally {
            setLoading(false);
            setPendingPayload(null);
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
                                        options={finalStandards} placeholder="Choose Standard"
                                        loading={classesLoading}
                                        disabled={classesLoading}
                                    />
                                    <SelectField
                                        label="Primary Section" name="section" value={formData.section}
                                        onChange={handleChange} required
                                        options={finalSections} placeholder="Choose Section"
                                        loading={classesLoading}
                                        disabled={classesLoading || !formData.standard}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Expected / Desired Salary" name="expectedSalary" type="text"
                                        value={formData.expectedSalary} onChange={handleChange}
                                        placeholder="e.g. 45000" isNumeric />
                                </div>
                                {occupiedTeacherName ? (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm transition-all duration-300 transform scale-100">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xl">🎓</span>
                                            </div>
                                            <div className="space-y-1 mt-0.5">
                                                <p className="font-semibold text-amber-900 leading-tight">
                                                    Quick Head's up!
                                                </p>
                                                <p className="font-medium text-amber-700/90 text-xs">
                                                    Class <strong className="text-amber-900">{formData.standard} {formData.section}</strong> is already assigned to our teacher named <strong className="text-amber-900">{occupiedTeacherName}</strong>.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-amber-200/50 flex flex-col space-y-3">
                                            <p className="text-xs text-amber-700/80 font-bold uppercase tracking-wide flex items-center gap-1.5">
                                                🏫 Add new class and section directly from settings 🏛️
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onClose();
                                                    navigate(`/${rolePrefix}/settings#academic-management`, { state: { fromAddTeacherWarning: true } });
                                                }}
                                                className="self-start bg-white border border-amber-300 text-amber-700 px-4 py-2.5 rounded-xl font-bold hover:bg-amber-100 hover:scale-[1.02] transition-all flex items-center gap-2"
                                            >
                                                Create a new class and section
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                        {teacherAssignmentLoading
                                            ? 'Checking current class-teacher assignments...'
                                            : 'All configured classes are visible here. If a class already has a class teacher, saving will show a clear message.'}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Student — Academic Details */}
                        {roleToAdd === 'student' && (
                            <div className="space-y-6">
                                {renderSectionHeader('bg-emerald-500', 'Academic Details')}
                                
                                {/* Teacher restriction notice */}
                                {isTeacher && (
                                    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800 shadow-sm">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                <FaInfoCircle className="text-blue-600" size={20} />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="font-semibold text-blue-900 leading-tight">
                                                    Class Assignment Notice
                                                </p>
                                                <p className="font-medium text-blue-700/90 text-xs">
                                                    As a teacher, you can only create students for your assigned classes:
                                                </p>
                                                {teacherAssignedClasses.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {teacherAssignedClasses.map((cls, index) => (
                                                            <span key={index} className="inline-block bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-200">
                                                                {cls.standard}-{cls.section.toUpperCase()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-amber-700 font-medium text-xs mt-2">
                                                        You have no assigned classes. Please contact your administrator.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <InputField label="Roll Number" name="rollNumber" value={formData.rollNumber} onChange={handleChange} required isNumeric />
                                    <SelectField
                                        label="Standard" name="standard" value={formData.standard}
                                        onChange={handleChange} required
                                        options={finalStandards}
                                        loading={classesLoading}
                                        disabled={classesLoading || (isTeacher && teacherAssignedClasses.length === 0)}
                                    />
                                    <SelectField
                                        label="Section" name="section" value={formData.section}
                                        onChange={handleChange} required
                                        options={finalSections}
                                        loading={classesLoading}
                                        disabled={classesLoading || !formData.standard || (isTeacher && teacherAssignedClasses.length === 0)}
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
                                                    <InputField
                                                        label={`Contact No. ${isTeacher ? '(optional)' : ''}`}
                                                        name={p.contactField}
                                                        value={formData[p.contactField]}
                                                        onChange={handleChange}
                                                        isNumeric
                                                        maxLength={10}
                                                        required={!isTeacher && Boolean(formData[p.nameField]?.trim())}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={`${GUARDIAN_SECTION.bg} rounded-3xl p-6 border ${GUARDIAN_SECTION.border} space-y-6`}>
                                        <h5 className={`text-[10px] font-black ${GUARDIAN_SECTION.textColor} uppercase tracking-widest`}>{GUARDIAN_SECTION.label}</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputField label="Full Name" name={GUARDIAN_SECTION.nameField} value={formData[GUARDIAN_SECTION.nameField]} onChange={handleChange} />
                                            <InputField
                                                label={`Contact No. ${isTeacher ? '(optional)' : ''}`}
                                                name={GUARDIAN_SECTION.contactField}
                                                value={formData[GUARDIAN_SECTION.contactField]}
                                                onChange={handleChange}
                                                isNumeric
                                                maxLength={10}
                                                required={!isTeacher && Boolean(formData[GUARDIAN_SECTION.nameField]?.trim())}
                                            />
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

            <TeacherConflictModal
                isOpen={showConflictModal}
                onClose={() => setShowConflictModal(false)}
                onConfirm={handleConfirmConflict}
                conflicts={conflicts}
            />
        </div>
    );
};

export default AddUserModal;
