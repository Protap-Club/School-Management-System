import React, { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import { useTheme, useFeatures } from '../state';
import api from '../lib/axios';
import { ButtonSpinner, PageSpinner } from '../components/ui/Spinner';
import { useToastMessage } from '../hooks/useToastMessage';
import {
    FaPalette,
    FaImage,
    FaCheck,
    FaUpload,
    FaToggleOn,
    FaBuilding,
    FaGraduationCap,
    FaPlus,
    FaTrash,
    FaCog,
    FaTimes,
    FaLayerGroup
} from 'react-icons/fa';

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
    examination: { label: 'Examination', description: 'Manage term exams and class tests', color: 'from-purple-100 to-indigo-100', iconColor: 'text-purple-500' },
    assignment: { label: 'Assignment', description: 'Student assignments and submissions', color: 'from-blue-100 to-indigo-100', iconColor: 'text-blue-600' },
    result: { label: 'Result', description: 'Manage and publish student exam results', color: 'from-emerald-100 to-teal-100', iconColor: 'text-emerald-600' },
};

const normalizeClassSection = (standard, section) => ({
    standard: String(standard || '').trim(),
    section: String(section || '').trim().toUpperCase()
});

const makeClassKey = ({ standard, section }) =>
    `${String(standard || '').trim().toLowerCase()}::${String(section || '').trim().toUpperCase()}`;

const sortClassSections = (items = []) =>
    [...items].sort((a, b) => {
        const numA = Number.parseInt(a.standard, 10);
        const numB = Number.parseInt(b.standard, 10);
        if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) return numA - numB;
        const stdCmp = String(a.standard).localeCompare(String(b.standard), undefined, { numeric: true, sensitivity: 'base' });
        if (stdCmp !== 0) return stdCmp;
        return String(a.section).localeCompare(String(b.section), undefined, { sensitivity: 'base' });
    });

const Settings = () => {
    const { user: currentUser } = useAuth();
    const { updateTheme, fetchBranding } = useTheme();
    const { refreshFeatures } = useFeatures();
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const canManageAcademic = ['super_admin', 'admin'].includes(currentUser?.role);
    const currentSchoolId = currentUser?.schoolId?._id || currentUser?.schoolId;
    const fileInputRef = useRef(null);

    const [settings, setSettings] = useState({ logoUrl: '', theme: { accentColor: '#2563eb' } });
    const [refreshKey, setRefreshKey] = useState(() => Date.now());
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const { message, showMessage } = useToastMessage();

    const [features, setFeatures] = useState({});
    const [featuresLoading, setFeaturesLoading] = useState(false);
    const [togglingFeature, setTogglingFeature] = useState(null);

    const [classSections, setClassSections] = useState([]);
    const [classesLoading, setClassesLoading] = useState(false);
    const [savingClass, setSavingClass] = useState(false);
    const [newStandard, setNewStandard] = useState('');
    const [newSection, setNewSection] = useState('');


    const fetchAcademicClasses = useCallback(async () => {
        if (!canManageAcademic) return;
        setClassesLoading(true);
        try {
            const response = await api.get('/school/classes');
            const pairs = response?.data?.data?.classSections || [];
            const normalized = pairs
                .map((pair) => normalizeClassSection(pair.standard, pair.section))
                .filter((pair) => pair.standard && pair.section);
            setClassSections(sortClassSections(normalized));
        } catch (error) {
            console.error('Failed to fetch school classes', error);
            showMessage('error', error?.response?.data?.message || 'Failed to fetch class-section list');
        } finally {
            setClassesLoading(false);
        }
    }, [canManageAcademic, showMessage]);

    useEffect(() => {
        const fetchSchoolData = async () => {
            try {
                if (isSuperAdmin) setFeaturesLoading(true);
                const response = await api.get('/school/');
                if (response.data.success && response.data.data?.school) {
                    const school = response.data.data.school;
                    setSettings({
                        logoUrl: school.logoUrl || '',
                        theme: school.theme || { accentColor: '#2563eb' },
                    });
                    if (isSuperAdmin) setFeatures(school.features || {});
                }
            } catch (error) {
                console.error('Failed to fetch settings', error);
            } finally {
                setLoading(false);
                setFeaturesLoading(false);
            }
        };

        fetchSchoolData();
        if (canManageAcademic) fetchAcademicClasses();
    }, [currentSchoolId, isSuperAdmin, canManageAcademic, fetchAcademicClasses]);

    const handleToggleFeature = useCallback(async (featureKey) => {
        if (!currentSchoolId || togglingFeature) return;
        setTogglingFeature(featureKey);
        const newValue = !features[featureKey];
        try {
            const response = await api.patch('/school/features', { features: { ...features, [featureKey]: newValue } });
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
        setSettings((prev) => ({ ...prev, theme: { ...prev.theme, accentColor: colorValue } }));
        updateTheme(colorValue);
        try {
            await api.put('/school/', { theme: { accentColor: colorValue } });
            showMessage('success', 'Theme updated successfully');
            fetchBranding();
        } catch (error) {
            console.error('Failed to save theme', error);
            showMessage('error', 'Failed to save theme');
        }
    }, [updateTheme, showMessage, fetchBranding]);

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
                setSettings((prev) => ({ ...prev, logoUrl: response.data.data.logoUrl }));
                setRefreshKey(Date.now());
                showMessage('success', 'Logo uploaded successfully');
                window.dispatchEvent(new Event('settingsUpdated'));
            }
        } catch (error) {
            showMessage('error', error?.response?.data?.message || 'Failed to upload logo');
        } finally {
            setUploading(false);
        }
    };

    const handleCreateClassSection = async () => {
        if (savingClass) return;

        const normalized = normalizeClassSection(newStandard, newSection);
        if (!normalized.standard || !normalized.section) {
            showMessage('error', 'Please enter both class and section');
            return;
        }

        const duplicate = classSections.some((item) => makeClassKey(item) === makeClassKey(normalized));
        if (duplicate) {
            showMessage('error', `${normalized.standard} - ${normalized.section} already exists`);
            return;
        }

        setSavingClass(true);
        try {
            const response = await api.post('/school/classes', normalized);
            const updatedPairs = response?.data?.data?.classSections;
            if (Array.isArray(updatedPairs)) {
                const parsed = updatedPairs
                    .map((pair) => normalizeClassSection(pair.standard, pair.section))
                    .filter((pair) => pair.standard && pair.section);
                setClassSections(sortClassSections(parsed));
            } else {
                await fetchAcademicClasses();
            }

            setNewStandard('');
            setNewSection('');
            showMessage('success', `Class ${normalized.standard} - ${normalized.section} added successfully`);
            window.dispatchEvent(new Event('customClassesUpdated'));
        } catch (error) {
            showMessage('error', error?.response?.data?.message || 'Failed to add class-section');
        } finally {
            setSavingClass(false);
        }
    };

    const handleRemoveClassSection = async (pair) => {
        if (savingClass) return;
        const normalized = normalizeClassSection(pair.standard, pair.section);
        setSavingClass(true);
        try {
            const response = await api.delete('/school/classes', { data: normalized });
            const updatedPairs = response?.data?.data?.classSections;
            if (Array.isArray(updatedPairs)) {
                const parsed = updatedPairs
                    .map((item) => normalizeClassSection(item.standard, item.section))
                    .filter((item) => item.standard && item.section);
                setClassSections(sortClassSections(parsed));
            } else {
                await fetchAcademicClasses();
            }

            showMessage('success', `Class ${normalized.standard} - ${normalized.section} removed`);
            window.dispatchEvent(new Event('customClassesUpdated'));
        } catch (error) {
            showMessage('error', error?.response?.data?.message || 'Failed to remove class-section');
        } finally {
            setSavingClass(false);
        }
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

    const accentColor = settings.theme?.accentColor || '#2563eb';

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
            {message.text && (
                <div className={`fixed top-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${message.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
                        {message.type === 'success' ? <FaCheck size={12} /> : <FaTimes size={12} />}
                    </div>
                    <span className="font-medium">{message.text}</span>
                </div>
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
                                <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full font-semibold">
                                    Auto Save
                                </span>
                            </div>
                            <div className="p-6">
                                <div className="flex flex-wrap gap-4">
                                    {THEME_COLORS.map((color) => (
                                        <button
                                            key={color.value}
                                            type="button"
                                            onClick={() => handleColorSelect(color.value)}
                                            className={`group relative w-14 h-14 rounded-2xl transition-all duration-200 hover:scale-105 focus:outline-none shadow-sm ${accentColor === color.value ? 'ring-2 ring-offset-4 ring-slate-900 scale-105' : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-200'}`}
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                        >
                                            {accentColor === color.value && (
                                                <span className="absolute inset-0 flex items-center justify-center">
                                                    <FaCheck className="text-white text-lg drop-shadow-md" />
                                                </span>
                                            )}
                                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-900 text-white px-3 py-1.5 rounded-lg pointer-events-none shadow-lg">
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
                            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
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
                                    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_auto] gap-3 items-center">
                                            <input
                                                type="text"
                                                value={newStandard}
                                                onChange={(e) => setNewStandard(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCreateClassSection()}
                                                placeholder="Class (e.g. 10)"
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                            <div className="text-gray-400 font-bold text-lg text-center hidden md:block">-</div>
                                            <input
                                                type="text"
                                                value={newSection}
                                                onChange={(e) => setNewSection(e.target.value.toUpperCase())}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCreateClassSection()}
                                                placeholder="Section (e.g. A)"
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                            <div className="px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-600 text-center">
                                                Preview: <span className="text-gray-900">{newStandard.trim() || '--'} - {(newSection.trim() || '--').toUpperCase()}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleCreateClassSection}
                                                disabled={savingClass}
                                                className="px-4 py-2.5 rounded-xl text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                style={{ backgroundColor: accentColor }}
                                            >
                                                {savingClass ? <ButtonSpinner /> : <FaPlus size={12} />}
                                                Create
                                            </button>
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
                                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}></span>
                                                            <span className="font-semibold text-gray-900">{pair.standard} - {pair.section}</span>
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
                                                src={`${settings.logoUrl}${settings.logoUrl.includes('?') ? '&' : '?'}t=${refreshKey}`}
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
