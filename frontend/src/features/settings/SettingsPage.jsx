import React, { useState, useEffect, useRef, useCallback } from 'react';
import CreatableSelect from 'react-select/creatable';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useAuth } from '@/features/auth';
import { useTheme, useFeatures } from '@/state';
import api from '@/lib/axios';
import { ButtonSpinner, PageSpinner } from '@/components/ui/Spinner';
import { useToastMessage } from '@/hooks/useToastMessage';
import { settingsKeys } from './api/queries';
import AddUserModal from '@/features/users/components/AddUserModal';
import {
    getSchoolClassesQueryKey,
    makeSchoolClassesQueryData,
    useSchoolClasses,
} from '@/hooks/useSchoolClasses';
import {
    makeClassKey,
    normalizeClassSection,
} from '@/utils/classSection';
import {FaPalette,FaImage,FaCheck,FaUpload,FaToggleOn,FaBuilding,FaGraduationCap,FaPlus,FaTrash,FaCog,FaTimes,FaLayerGroup,FaUserGraduate,FaChalkboardTeacher,FaArrowRight} from 'react-icons/fa';
import { DEFAULT_ACCENT_COLOR } from '@/state/themeSlice';

const THEME_COLORS = [
    { name: 'Royal Blue', value: '#2563eb' },
    { name: 'Purple', value: '#7c3aed' },
    { name: 'Emerald', value: '#059669' },
    { name: 'Rose', value: '#e11d48' },
    { name: 'Amber', value: '#d97706' },
];

const FEATURE_META = {
    attendance: { label: 'Attendance', description: 'Track student attendance via NFC', color: 'from-blue-100 to-cyan-100', iconColor: 'text-blue-500' },
    notice: { label: 'Notice Board', description: 'School announcements and notifications', color: 'from-indigo-100 to-purple-100', iconColor: 'text-indigo-500' },
    fees: { label: 'Payment', description: 'Manage school fee structures and student payments', color: 'from-emerald-100 to-green-100', iconColor: 'text-emerald-500' },
    timetable: { label: 'Timetable', description: 'Class and exam schedules', color: 'from-violet-100 to-purple-100', iconColor: 'text-violet-500' },
    library: { label: 'Library', description: 'Book inventory and borrowing', color: 'from-amber-100 to-orange-100', iconColor: 'text-amber-500' },
    transport: { label: 'Transport', description: 'Bus routes and tracking', color: 'from-rose-100 to-pink-100', iconColor: 'text-rose-500' },
    calendar: { label: 'Calendar', description: 'Academic calendar and holidays', color: 'from-pink-100 to-rose-100', iconColor: 'text-rose-500' },
    // Combined module: examination flag controls both Examination and Results pages
    examination: { label: 'Examination & Results', description: 'Manage term exams, tests, and publish student results', color: 'from-purple-100 to-indigo-100', iconColor: 'text-purple-500', syncs: ['result'] },
    assignment: { label: 'Assignment', description: 'Student assignments and submissions', color: 'from-blue-100 to-indigo-100', iconColor: 'text-blue-600' },
};

const CLASS_STANDARD_REGEX = /^[A-Za-z0-9_]+$/;
const CLASS_SECTION_REGEX =  /^[A-Za-z0-9_]+$/;
const sanitizeStandardInput = (value) => value.replace(/[^A-Za-z0-9_]/g, '');
const sanitizeSectionInput = (value) => value.replace(/[^A-Za-z0-9_]/g, '');

const REACT_SELECT_STYLES = {
    control: (base, state) => ({
        ...base,
        minHeight: '44px',
        borderRadius: '0.75rem',
        borderColor: state.isFocused ? '#2563eb' : '#e5e7eb',
        boxShadow: state.isFocused ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
        '&:hover': {
            borderColor: state.isFocused ? '#2563eb' : '#d1d5db',
        },
        backgroundColor: '#ffffff',
    }),
    valueContainer: (base) => ({
        ...base,
        padding: '0.25rem 0.75rem',
    }),
    multiValue: (base) => ({
        ...base,
        backgroundColor: '#f3f4f6',
        borderRadius: '0.375rem',
        margin: '0.125rem 0.25rem 0.125rem 0',
    }),
    multiValueLabel: (base) => ({
        ...base,
        color: '#374151',
        fontSize: '0.875rem',
        fontWeight: '500',
        padding: '2px 6px',
    }),
    multiValueRemove: (base) => ({
        ...base,
        color: '#6b7280',
        '&:hover': {
            backgroundColor: '#fee2e2',
            color: '#ef4444',
        },
    }),
    menu: (base) => ({
        ...base,
        borderRadius: '0.75rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
        zIndex: 50,
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isFocused ? '#eff6ff' : 'transparent',
        color: state.isFocused ? '#1d4ed8' : '#374151',
        cursor: 'pointer',
        '&:active': {
            backgroundColor: '#dbeafe',
        },
    }),
};

const mergeSchoolProfileCache = (prev, school) => ({
    ...(prev || {}),
    success: true,
    data: {
        ...(prev?.data || {}),
        school: {
            ...(prev?.data?.school || {}),
            ...school,
            theme: {
                ...(prev?.data?.school?.theme || {}),
                ...(school.theme || {}),
            },
        },
    },
});
    
const Settings = () => {
    const queryClient = useQueryClient();
    const location = useLocation();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { branding, updateTheme, fetchBranding, applyBrandingSnapshot } = useTheme();
    const { refreshFeatures } = useFeatures();
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const canManageAcademic = ['super_admin', 'admin'].includes(currentUser?.role);
    const currentSchoolId = currentUser?.schoolId?._id || currentUser?.schoolId;
    const fileInputRef = useRef(null);

    const [settings, setSettings] = useState({ logoUrl: '', logoPublicId: '', updatedAt: '', theme: { accentColor: DEFAULT_ACCENT_COLOR } });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [savingTheme, setSavingTheme] = useState(false);
    const { message, showMessage } = useToastMessage();

    const [features, setFeatures] = useState({});
    const [featuresLoading, setFeaturesLoading] = useState(false);
    const [togglingFeature, setTogglingFeature] = useState(null);

    const [savingClass, setSavingClass] = useState(false);
    const [newStandard, setNewStandard] = useState('');
    const [newSection, setNewSection] = useState('');
    const [newSubjects, setNewSubjects] = useState([]);
    const [createError, setCreateError] = useState('');
    const [newlyCreatedKeys, setNewlyCreatedKeys] = useState(() => new Set());
    const [showPostCreateModal, setShowPostCreateModal] = useState(false);
    const [createdClassInfo, setCreatedClassInfo] = useState(null);
    const [addStudentForClass, setAddStudentForClass] = useState(null);
    const [deletePrompt, setDeletePrompt] = useState(null);
    const [transferTarget, setTransferTarget] = useState({ standard: '', section: '' });
    const [teacherTransferTarget, setTeacherTransferTarget] = useState({ standard: '', section: '' });
    const [teacherAction, setTeacherAction] = useState('unassign');

    const hasShownToastRef = useRef(false);

    // Shared hook — provides classSections + real-time socket sync
    const { classSections, loading: classesLoading } = useSchoolClasses({ enabled: canManageAcademic });

    const applySchoolSettings = useCallback((school) => {
        if (!school) return;

        setSettings((prev) => ({
            ...prev,
            logoUrl: school.logoUrl || '',
            logoPublicId: school.logoPublicId || '',
            updatedAt: school.updatedAt || '',
            theme: school.theme || prev.theme || { accentColor: DEFAULT_ACCENT_COLOR },
        }));

        if (isSuperAdmin && school.features) {
            setFeatures(school.features || {});
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        const fetchSchoolData = async () => {
            try {
                if (isSuperAdmin) setFeaturesLoading(true);
                const response = await api.get('/school/');
                if (response.data.success && response.data.data?.school) {
                    applySchoolSettings(response.data.data.school);
                }
            } catch (error) {
                console.error('Failed to fetch settings', error);
            } finally {
                setLoading(false);
                setFeaturesLoading(false);
            }
        };

        fetchSchoolData();
    }, [applySchoolSettings, currentSchoolId, isSuperAdmin]);

    useEffect(() => {
        if (!branding) return;
        applySchoolSettings(branding);
    }, [applySchoolSettings, branding]);

    useEffect(() => {
        if (!loading && location.hash === '#academic-management') {
            setTimeout(() => {
                const el = document.getElementById('academic-management');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);

            if (location.state?.fromAddTeacherWarning && !hasShownToastRef.current) {
                showMessage('success', 'Please create and add new class and section here in Academic Management');
                hasShownToastRef.current = true;
                window.history.replaceState({}, document.title);
            }
        }
    }, [loading, location.hash, location.state, showMessage]);

    const handleToggleFeature = useCallback(async (featureKey) => {
        if (!currentSchoolId || togglingFeature) return;
        setTogglingFeature(featureKey);
        const newValue = !features[featureKey];

        // Build payload — if this feature syncs to others (e.g. examination → result), update them too
        const syncedKeys = FEATURE_META[featureKey]?.syncs || [];
        const updatedFeatures = { ...features, [featureKey]: newValue };
        syncedKeys.forEach((syncKey) => { updatedFeatures[syncKey] = newValue; });

        try {
            const response = await api.patch('/school/features', { features: updatedFeatures });
            if (response.data.success) {
                setFeatures(response.data.data.features);
                refreshFeatures();
                showMessage('success', `${FEATURE_META[featureKey]?.label || featureKey} ${newValue ? 'enabled' : 'disabled'}`);
            }
        } catch {
            showMessage('error', 'Internal Server Error');
        } finally {
            setTogglingFeature(null);
        }
    }, [currentSchoolId, togglingFeature, features, refreshFeatures, showMessage]);

    const handleColorSelect = useCallback(async (colorValue) => {
        const previousColor = settings.theme?.accentColor || DEFAULT_ACCENT_COLOR;
        if (savingTheme || colorValue === previousColor) return;

        setSavingTheme(true);
        setSettings((prev) => ({ ...prev, theme: { ...prev.theme, accentColor: colorValue } }));
        updateTheme(colorValue);
        queryClient.setQueryData(settingsKeys.profile(), (prev) =>
            mergeSchoolProfileCache(prev, { theme: { accentColor: colorValue } })
        );

        try {
            const response = await api.put('/school/', { theme: { accentColor: colorValue } });
            const updatedSchool = response.data?.data?.school;
            if (updatedSchool) {
                applySchoolSettings(updatedSchool);
                applyBrandingSnapshot(updatedSchool);
                queryClient.setQueryData(settingsKeys.profile(), (prev) => mergeSchoolProfileCache(prev, updatedSchool));
                window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { school: updatedSchool } }));
            } else {
                fetchBranding();
                queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
            }
            showMessage('success', 'Theme updated successfully');
        } catch (error) {
            console.error('Failed to save theme', error);
            setSettings((prev) => ({ ...prev, theme: { ...prev.theme, accentColor: previousColor } }));
            updateTheme(previousColor);
            queryClient.setQueryData(settingsKeys.profile(), (prev) =>
                mergeSchoolProfileCache(prev, { theme: { accentColor: previousColor } })
            );
            fetchBranding();
            showMessage('error', 'Failed to save theme');
        } finally {
            setSavingTheme(false);
        }
    }, [applyBrandingSnapshot, applySchoolSettings, fetchBranding, queryClient, savingTheme, settings.theme?.accentColor, showMessage, updateTheme]);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showMessage('error', 'Please select an image file');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showMessage('error', 'Only JPG, PNG, and WEBP are allowed');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showMessage('error', 'File is too large. Max size is 2MB');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('logo', file);
            if (settings._id) formData.append('schoolId', settings._id);

            const response = await api.put('/school/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                const updatedSchool = response.data?.data?.school;
                if (updatedSchool) {
                    applySchoolSettings(updatedSchool);
                    applyBrandingSnapshot(updatedSchool);
                    queryClient.setQueryData(settingsKeys.profile(), (prev) => mergeSchoolProfileCache(prev, updatedSchool));
                    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { school: updatedSchool } }));
                }
                queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
                showMessage('success', 'Logo uploaded successfully');
            }
        } catch (error) {
            showMessage('error', error?.response?.data?.message || 'Failed to upload logo');
        } finally {
            setUploading(false);
        }
    };

    const handleCreateClassSection = async () => {
        if (savingClass) return;
        setCreateError('');

        const subjects = newSubjects?.map((s) => s.value) || [];
        const normalized = normalizeClassSection({ standard: newStandard, section: newSection, subjects });

        if (!normalized.standard || !normalized.section) {
            setCreateError('Please enter both class and section.');
            return;
        }
        if (!CLASS_STANDARD_REGEX.test(normalized.standard)) {
            setCreateError('Class can contain only letters, numbers, and underscore.');
            return;
        }
        if (!CLASS_SECTION_REGEX.test(normalized.section)) {
            setCreateError('Section can contain only letters, numbers, and underscore.');
            return;
        }
        if (normalized.subjects.length === 0) {
            setCreateError('Add at least one subject to continue.');
            return;
        }

        setSavingClass(true);
        try {
            const response = await api.post('/school/classes', {
                standard: normalized.standard,
                section: normalized.section,
                subjects: normalized.subjects,
            });

            const snapshot = response.data?.data;
            if (snapshot) {
                queryClient.setQueryData(
                    getSchoolClassesQueryKey(currentSchoolId),
                    makeSchoolClassesQueryData(snapshot)
                );
            }

            const classKey = makeClassKey(normalized);
            setNewlyCreatedKeys((current) => new Set([...current, classKey]));

            setCreatedClassInfo({ ...normalized });
            setShowPostCreateModal(true);
            setNewStandard('');
            setNewSection('');
            setNewSubjects([]);
            setCreateError('');

            window.dispatchEvent(new CustomEvent('customClassesUpdated', { detail: snapshot }));
        } catch (error) {
            const apiMsg = error?.response?.data?.message || error?.response?.data?.errors?.[0]?.message;
            const status = error?.response?.status;
            if (status === 409) {
                setCreateError(`Class ${normalized.standard} - ${normalized.section} already exists.`);
            } else {
                setCreateError(apiMsg || 'Failed to create class. Please try again.');
            }
        } finally {
            setSavingClass(false);
        }
    };

    const handleRemoveClassSection = async (pair) => {
        if (savingClass) return;
        const normalized = normalizeClassSection(pair);
        setSavingClass(true);
        try {
            const response = await api.delete('/school/classes', { data: normalized });
            const snapshot = response.data?.data;

            if (snapshot) {
                queryClient.setQueryData(
                    getSchoolClassesQueryKey(currentSchoolId),
                    makeSchoolClassesQueryData(snapshot)
                );
            }

            setNewlyCreatedKeys((current) => {
                const next = new Set(current);
                next.delete(makeClassKey(normalized));
                return next;
            });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            showMessage('success', `Class ${normalized.standard} - ${normalized.section} removed`);
            window.dispatchEvent(new CustomEvent('customClassesUpdated', { detail: snapshot }));
        } catch (error) {
            const errorCode = error?.response?.data?.error?.code;
            if (errorCode === 'CLASS_NOT_EMPTY' || errorCode === 'CLASS_HAS_TEACHERS') {
                const studentCount = error?.response?.data?.error?.details?.studentCount || 0;
                const teacherCount = error?.response?.data?.error?.details?.teacherCount || 0;
                const otherClasses = classSections.filter(
                    (item) => makeClassKey(item) !== makeClassKey(normalized)
                );
                const defaultTarget = otherClasses[0] ? normalizeClassSection(otherClasses[0]) : { standard: '', section: '' };
                setDeletePrompt({ pair: normalized, studentCount, teacherCount });
                setTransferTarget(defaultTarget);
                setTeacherTransferTarget(defaultTarget);
                setTeacherAction('unassign');
                return;
            }
            showMessage('error', error?.response?.data?.message || 'Failed to remove class-section');
        } finally {
            setSavingClass(false);
        }
    };

    const handleConfirmTransferDelete = async () => {
        if (savingClass || !deletePrompt?.pair) return;
        const hasStudents = (deletePrompt?.studentCount || 0) > 0;
        const hasTeachers = (deletePrompt?.teacherCount || 0) > 0;

        if (hasStudents && (!transferTarget.standard || !transferTarget.section)) {
            showMessage('error', 'Please select a temporary class-section');
            return;
        }
        if (hasTeachers && teacherAction === 'transfer' && (!teacherTransferTarget.standard || !teacherTransferTarget.section)) {
            showMessage('error', 'Please select a teacher reassignment class-section');
            return;
        }

        setSavingClass(true);
        try {
            const payload = { ...deletePrompt.pair };
            if (hasStudents) {
                payload.transferTo = transferTarget;
            }
            if (hasTeachers) {
                if (teacherAction === 'transfer') {
                    payload.teacherTransferTo = teacherTransferTarget;
                } else {
                    payload.teacherAction = 'unassign';
                }
            }

            const response = await api.delete('/school/classes', {
                data: payload
            });
            const snapshot = response.data?.data;

            if (snapshot) {
                queryClient.setQueryData(
                    getSchoolClassesQueryKey(currentSchoolId),
                    makeSchoolClassesQueryData(snapshot)
                );
            }

            setNewlyCreatedKeys((current) => {
                const next = new Set(current);
                next.delete(makeClassKey(deletePrompt.pair));
                return next;
            });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            showMessage('success', `Class ${deletePrompt.pair.standard} - ${deletePrompt.pair.section} removed`);
            window.dispatchEvent(new CustomEvent('customClassesUpdated', { detail: snapshot }));
            clearDeletePrompt();
        } catch (error) {
            showMessage('error', error?.response?.data?.message || 'Failed to remove class-section');
        } finally {
            setSavingClass(false);
        }
    };

    const clearDeletePrompt = () => {
        setDeletePrompt(null);
        setTransferTarget({ standard: '', section: '' });
        setTeacherTransferTarget({ standard: '', section: '' });
        setTeacherAction('unassign');
    };


    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <PageSpinner />
                </div>
            </DashboardLayout>
        );
    }

    const accentColor = settings.theme?.accentColor || DEFAULT_ACCENT_COLOR;
    const hasStudentsToMove = (deletePrompt?.studentCount || 0) > 0;
    const hasTeachersToMove = (deletePrompt?.teacherCount || 0) > 0;
    const deleteActionLabel = hasStudentsToMove
        ? 'Reassign Students & Delete'
        : hasTeachersToMove && teacherAction === 'transfer'
            ? 'Reassign Teachers & Delete'
            : hasTeachersToMove
                ? 'Delete & Unassign'
                : 'Delete Class';
    const transferSelectionKey = transferTarget.standard && transferTarget.section
        ? makeClassKey(transferTarget)
        : '';
    const teacherTransferSelectionKey = teacherTransferTarget.standard && teacherTransferTarget.section
        ? makeClassKey(teacherTransferTarget)
        : '';
    const deletePromptTitle = hasStudentsToMove
        ? 'Reassign Students Before Deleting'
        : hasTeachersToMove
            ? 'Update Teacher Assignments Before Deleting'
            : 'Delete Class';
    const deletePromptDescription = hasStudentsToMove
        ? 'Keep every student safely assigned to a class'
        : hasTeachersToMove
            ? 'Choose how assigned teachers should be handled'
            : 'Confirm class deletion';
    const transferOptions = deletePrompt
        ? classSections
            .filter((item) => makeClassKey(item) !== makeClassKey(deletePrompt.pair))
            .map((item) => ({
                key: makeClassKey(item),
                label: `${item.standard} - ${item.section}`,
                pair: normalizeClassSection(item),
            }))
        : [];

    const renderFeatureToggle = (key, meta) => (
        <div key={key} className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${features[key] ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center`}>
                    <FaBuilding className={meta.iconColor} size={14} />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                    <p className="text-xs text-gray-500">{meta.description}</p>
                </div>
            </div>
            <button
                onClick={() => handleToggleFeature(key)}
                disabled={togglingFeature === key}
                className={`relative w-12 h-7 rounded-full transition-colors ${features[key] ? 'bg-emerald-500' : 'bg-gray-200'} ${togglingFeature === key ? 'opacity-60' : ''}`}
            >
                <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${features[key] ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
    );

    return (
        <DashboardLayout>
            {message?.text && (
                <div className={`fixed top-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${message.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
                        {message.type === 'success' ? <FaCheck size={12} /> : <FaTimes size={12} />}
                    </div>
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            {deletePrompt && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={clearDeletePrompt}
                    />
                    <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl p-6 md:p-7">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}1A` }}>
                                <FaGraduationCap style={{ color: accentColor }} size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{deletePromptTitle}</h3>
                                <p className="text-sm text-gray-500">{deletePromptDescription}</p>
                            </div>
                        </div>

                        {hasStudentsToMove && (
                            <>
                                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    {deletePrompt.studentCount
                                        ? `This class currently has ${deletePrompt.studentCount} student${deletePrompt.studentCount === 1 ? '' : 's'}.`
                                        : 'This class still has students.'}
                                    {' '}Before deleting, please choose a temporary class for them.
                                </div>

                                <div className="mt-5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Temporary Class</label>
                                    <select
                                        value={transferSelectionKey}
                                        onChange={(e) => {
                                            const key = e.target.value;
                                            const selected = transferOptions.find((option) => option.key === key);
                                            setTransferTarget(selected?.pair || { standard: '', section: '' });
                                        }}
                                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                        <option value="">Select a temporary class</option>
                                        {transferOptions.map((option) => (
                                            <option key={option.key} value={option.key}>{option.label}</option>
                                        ))}
                                    </select>
                                    {transferOptions.length === 0 && (
                                        <p className="mt-2 text-xs text-gray-500">No other classes are available. Please create a class first.</p>
                                    )}
                                </div>
                            </>
                        )}

                        {hasTeachersToMove && (
                            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                <p className="text-sm text-slate-700 font-semibold">
                                    {deletePrompt.teacherCount
                                        ? `This class has ${deletePrompt.teacherCount} assigned teacher${deletePrompt.teacherCount === 1 ? '' : 's'}.`
                                        : 'This class has assigned teachers.'}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    You can reassign them to another class or continue to mark them as unassigned.
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTeacherAction('transfer')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${teacherAction === 'transfer'
                                            ? 'border-primary text-primary bg-primary/10'
                                            : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'}`}
                                    >
                                        Reassign Teachers
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTeacherAction('unassign')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${teacherAction === 'unassign'
                                            ? 'border-amber-300 text-amber-700 bg-amber-50'
                                            : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'}`}
                                    >
                                        Mark Unassigned
                                    </button>
                                </div>

                                {teacherAction === 'transfer' && (
                                    <div className="mt-4">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Teacher Reassignment Class</label>
                                        <select
                                            value={teacherTransferSelectionKey}
                                            onChange={(e) => {
                                                const key = e.target.value;
                                                const selected = transferOptions.find((option) => option.key === key);
                                                setTeacherTransferTarget(selected?.pair || { standard: '', section: '' });
                                            }}
                                            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        >
                                            <option value="">Select a class for teachers</option>
                                            {transferOptions.map((option) => (
                                                <option key={option.key} value={option.key}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={clearDeletePrompt}
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmTransferDelete}
                                disabled={
                                    savingClass ||
                                    (hasStudentsToMove && (transferOptions.length === 0 || !transferSelectionKey)) ||
                                    (hasTeachersToMove && teacherAction === 'transfer' && (transferOptions.length === 0 || !teacherTransferSelectionKey))
                                }
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                style={{ backgroundColor: accentColor }}
                            >
                                {savingClass ? <ButtonSpinner /> : deleteActionLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPostCreateModal && createdClassInfo && (
                <div className="fixed inset-0 z-[115] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fadeIn" />
                    <div className="relative w-full max-md rounded-[2.5rem] bg-white border border-slate-100 shadow-2xl p-8 overflow-hidden animate-scaleUp">
                        {/* Decorative blobs */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-60" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -ml-12 -mb-12 opacity-50" />

                        <div className="relative z-10 space-y-5">
                            {/* Header */}
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto transform rotate-3 shadow-sm border border-emerald-100">
                                    <FaCheck className="text-emerald-500 text-2xl" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                    Class <span style={{ color: accentColor }}>{createdClassInfo.standard} - {createdClassInfo.section}</span> Created!
                                </h3>
                                <p className="text-slate-400 text-xs">Saved to the database. You can add students now or later.</p>
                            </div>

                            {/* Subject pills strip */}
                            {(createdClassInfo.subjects || []).length > 0 && (
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">Subjects saved</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {createdClassInfo.subjects.map((sub, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                                                <FaCheck size={8} />{sub}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action choices */}
                            <div className="space-y-2 pt-1">
                                {/* Action 1 — add a student */}
                                <button
                                    onClick={() => {
                                        setShowPostCreateModal(false);
                                        setAddStudentForClass({ ...createdClassInfo });
                                        setCreatedClassInfo(null);
                                    }}
                                    className="group w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all hover:scale-[1.01] active:scale-95 shadow-md shadow-emerald-100"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><FaUserGraduate size={13} /></div>
                                        <span className="text-sm">Add a student now</span>
                                    </div>
                                    <FaArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>

                                {/* Action 2 — bulk import (coming soon) */}
                                <button
                                    type="button"
                                    disabled
                                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><FaChalkboardTeacher size={13} /></div>
                                        <span className="text-sm font-semibold">Bulk import students</span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">Soon</span>
                                </button>

                                {/* Action 3 — create another */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPostCreateModal(false);
                                        setCreatedClassInfo(null);
                                    }}
                                    className="group w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><FaPlus size={13} /></div>
                                        <span className="text-sm">Create another class</span>
                                    </div>
                                    <FaArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            </div>

                            {/* Dismiss link */}
                            <div className="text-center pt-1">
                                <button
                                    type="button"
                                    onClick={() => { setShowPostCreateModal(false); setCreatedClassInfo(null); }}
                                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
                                >
                                    Dismiss — I&apos;ll add students later
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AddUserModal wired to post-create student flow */}
            {addStudentForClass && (
                <AddUserModal
                    isOpen={!!addStudentForClass}
                    onClose={() => setAddStudentForClass(null)}
                    roleToAdd="student"
                    initialData={addStudentForClass}
                    onSuccess={() => {
                        showMessage('success', 'Student added successfully');
                        setAddStudentForClass(null);
                    }}
                />
            )}

            <div className="space-y-8">
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-7 md:p-8 shadow-xl">
                    <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
                    <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
                    <div className="relative z-10 flex items-start gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                            <FaCog size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Settings Console</h1>
                            <p className="text-slate-200 mt-1 text-sm md:text-base">
                                {isSuperAdmin ? 'Premium control center for branding, features, and academics' : 'Fine-tune portal branding and academic setup'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-7 space-y-6">
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                                        <FaPalette className="text-indigo-500" size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Theme Palette</h2>
                                        <p className="text-sm text-gray-500">Choose a premium accent color</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${savingTheme ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-emerald-700 bg-emerald-50 border-emerald-100'}`}>
                                    {savingTheme ? 'Saving...' : 'Auto Save'}
                                </span>
                            </div>
                            <div className="px-6 pt-6 pb-12">
                                <div className="flex flex-wrap gap-4 mt-2 mb-2">
                                    {THEME_COLORS.map((color) => (
                                        <button
                                            key={color.value}
                                            type="button"
                                            onClick={() => handleColorSelect(color.value)}
                                            disabled={savingTheme}
                                            className={`group relative w-14 h-14 rounded-2xl transition-all duration-200 focus:outline-none shadow-sm ${savingTheme ? 'cursor-wait opacity-70' : 'hover:scale-105'} ${accentColor === color.value ? 'ring-2 ring-offset-4 ring-slate-900 scale-105' : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-200'}`}
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                        >
                                            {accentColor === color.value && (
                                                <span className="absolute inset-0 flex items-center justify-center">
                                                    <FaCheck className="text-white text-lg drop-shadow-md" />
                                                </span>
                                            )}
                                            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-10 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-900 text-white px-3 py-1.5 rounded-lg pointer-events-none shadow-lg">
                                                {color.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                    <FaImage className="text-amber-600" size={18} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Portal Logo</h2>
                                    <p className="text-sm text-gray-500">Upload your organization logo</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className={`w-full group flex flex-col items-center justify-center gap-3 px-6 py-8 border-2 border-dashed rounded-2xl transition-all ${uploading ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${uploading ? 'bg-gray-100' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
                                        {uploading ? <ButtonSpinner /> : <FaUpload className="text-gray-400 group-hover:text-gray-600" size={20} />}
                                    </div>
                                    <div className="text-center">
                                        <span className={`text-base font-medium ${uploading ? 'text-gray-400' : 'text-gray-700'}`}>{uploading ? 'Uploading...' : 'Click to upload logo'}</span>
                                        <p className="text-sm text-gray-400 mt-1">PNG, JPG, WEBP (max 2MB)</p>
                                    </div>
                                </button>
                            </div>
                        </div>


                        {canManageAcademic && (
                            <div id="academic-management" className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden scroll-mt-24">
                                <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}14` }}>
                                        <FaGraduationCap style={{ color: accentColor }} size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Academic Management</h2>
                                        <p className="text-sm text-gray-500">Create class-section pairs in one row (example: 10 - A)</p>
                                    </div>
                                </div>

                                <div className="p-6 space-y-5">
                                    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                                            <input
                                                type="text"
                                                value={newStandard}
                                                onChange={(e) => setNewStandard(sanitizeStandardInput(e.target.value))}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCreateClassSection()}
                                                placeholder="Class (e.g. 10)"
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                            <div className="text-gray-400 font-bold text-lg text-center hidden md:block">-</div>
                                            <input
                                                type="text"
                                                value={newSection}
                                                onChange={(e) => setNewSection(sanitizeSectionInput(e.target.value))}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCreateClassSection()}
                                                placeholder="Section (e.g. A)"
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div className="flex-1 w-full md:max-w-xl">
                                                <CreatableSelect
                                                    isMulti
                                                    placeholder="Type subject and press Enter (e.g. Mathematics, Science)"
                                                    value={newSubjects}
                                                    onChange={setNewSubjects}
                                                    styles={REACT_SELECT_STYLES}
                                                    className="w-full"
                                                />
                                                {createError && (
                                                    <p className="text-xs text-red-600 mt-1.5 font-semibold px-1 flex items-center gap-1">
                                                        <FaTimes size={9} />{createError}
                                                    </p>
                                                )}
                                                {!createError && newSubjects.length === 0 && (
                                                    <p className="text-xs text-amber-600 mt-1.5 font-medium px-1">Add at least one subject to continue.</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 w-full md:w-auto">
                                                <div className="flex-1 md:flex-none px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-600 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                                                    Preview: <span className="text-gray-900">{newStandard.trim() || '--'} - {(newSection.trim() || '--').toUpperCase()}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleCreateClassSection}
                                                    disabled={savingClass || newSubjects.length === 0}
                                                    title={newSubjects.length === 0 ? 'Add at least one subject to continue' : undefined}
                                                    className="px-5 py-2.5 rounded-xl text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
                                                    style={{ backgroundColor: accentColor }}
                                                >
                                                    {savingClass ? <ButtonSpinner /> : <FaPlus size={12} />}
                                                    Create
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-gray-200 overflow-hidden">
                                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Configured Class-Section List</p>
                                            <span className="text-xs font-semibold text-gray-500">{classSections.length} total</span>
                                        </div>

                                        <div className="max-h-72 overflow-y-auto">
                                            {classesLoading ? (
                                                <div className="py-8 flex justify-center">
                                                    <ButtonSpinner />
                                                </div>
                                            ) : classSections.length === 0 ? (
                                                <div className="py-10 text-center">
                                                    <div className="w-12 h-12 mx-auto rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                                                        <FaLayerGroup size={18} />
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-700">No class-section entries yet</p>
                                                    <p className="text-xs text-gray-500 mt-1">Create your first one above</p>
                                                </div>
                                            ) : (
                                                classSections.map((pair) => (
                                                    <div key={makeClassKey(pair)} className="px-4 py-3.5 border-b border-gray-100 last:border-b-0 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }}></span>
                                                            <span className="font-semibold text-gray-900 whitespace-nowrap">{pair.standard} - {pair.section}</span>
                                                            {newlyCreatedKeys.has(makeClassKey(pair)) && (
                                                                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-700">New</span>
                                                            )}
                                                            <div className="hidden sm:flex gap-1 flex-wrap ml-2 overflow-hidden items-center">
                                                                {(pair.subjects || []).slice(0, 3).map((sub, idx) => (
                                                                    <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-20" title={sub}>
                                                                        {sub}
                                                                    </span>
                                                                ))}
                                                                {(pair.subjects || []).length > 3 && (
                                                                    <span className="bg-slate-50 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                                        +{(pair.subjects.length - 3)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveClassSection(pair)}
                                                            disabled={savingClass}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                                                        >
                                                            <FaTrash size={10} />
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="xl:col-span-5 space-y-6">
                        {isSuperAdmin && (
                            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
                                                <FaToggleOn className="text-blue-500" size={18} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900">Feature Toggles</h2>
                                                <p className="text-sm text-gray-500">Enable or disable school features</p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full font-semibold">Super Admin</span>
                                    </div>
                                    {!currentSchoolId && <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">No school assigned to your account</p>}
                                </div>
                                <div className="p-4">
                                    {featuresLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <ButtonSpinner />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">{Object.entries(FEATURE_META).map(([key, meta]) => renderFeatureToggle(key, meta))}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border border-gray-200 p-6 lg:p-7 shadow-sm">
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
                                <p className="text-sm text-gray-500">Instant preview of your branding updates</p>
                            </div>
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                                <div className="p-4 flex items-center gap-3" style={{ backgroundColor: accentColor }}>
                                    {settings.logoUrl ? (
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center p-1.5">
                                            <img
                                                src={`${settings.logoUrl}${settings.logoPublicId || settings.updatedAt ? `${settings.logoUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(settings.logoPublicId || settings.updatedAt)}` : ''}`}
                                                alt="Logo"
                                                className="h-full w-full object-contain"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">S</span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-white font-semibold text-sm">School Portal</p>
                                        <p className="text-white/70 text-xs">Management System</p>
                                    </div>
                                </div>

                                <div className="p-3 space-y-1">
                                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: accentColor }}>
                                        <div className="w-5 h-5 bg-white/20 rounded"></div>
                                        <span>Dashboard</span>
                                    </div>
                                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 text-sm hover:bg-gray-50">
                                        <div className="w-5 h-5 bg-gray-200 rounded"></div>
                                        <span>Users</span>
                                    </div>
                                </div>

                                <div className="px-4 pb-4">
                                    <button className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: accentColor }}>
                                        Sample Button
                                    </button>
                                </div>
                            </div>

                            <div className="mt-5 p-4 bg-white rounded-2xl border border-gray-200">
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Current Theme</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: accentColor }}></div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{THEME_COLORS.find((c) => c.value === accentColor)?.name || 'Custom'}</p>
                                        <p className="text-xs text-gray-400 font-mono">{accentColor}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Settings;
