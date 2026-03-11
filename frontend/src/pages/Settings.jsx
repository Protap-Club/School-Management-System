import React, { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import { useTheme, useFeatures } from '../state';
import api from '../api/axios';
import { FaPalette, FaImage, FaCheck, FaUpload, FaToggleOn, FaBuilding } from 'react-icons/fa';

const THEME_COLORS = [
    { name: 'Royal Blue', value: '#2563eb', textColor: '#ffffff' },
    { name: 'Purple', value: '#7c3aed', textColor: '#ffffff' },
    { name: 'Emerald', value: '#059669', textColor: '#ffffff' },
    { name: 'Rose', value: '#e11d48', textColor: '#ffffff' },
    { name: 'Amber', value: '#d97706', textColor: '#ffffff' },
];

const FEATURE_META = {
    attendance: { label: 'Attendance', description: 'Track student attendance via NFC', color: 'from-blue-100 to-cyan-100', iconColor: 'text-blue-500' },
    notice: { label: 'Notice Board', description: 'School announcements and notifications', color: 'from-indigo-100 to-purple-100', iconColor: 'text-indigo-500' },
    fees: { label: 'Fee Management', description: 'Manage student fees and payments', color: 'from-emerald-100 to-green-100', iconColor: 'text-emerald-500' },
    timetable: { label: 'Timetable', description: 'Class and exam schedules', color: 'from-violet-100 to-purple-100', iconColor: 'text-violet-500' },
    library: { label: 'Library', description: 'Book inventory and borrowing', color: 'from-amber-100 to-orange-100', iconColor: 'text-amber-500' },
    transport: { label: 'Transport', description: 'Bus routes and tracking', color: 'from-rose-100 to-pink-100', iconColor: 'text-rose-500' },
    calendar: { label: 'Calendar', description: 'Academic calendar and holidays', color: 'from-pink-100 to-rose-100', iconColor: 'text-rose-500' },
    examination: { label: 'Examination', description: 'Manage term exams and class tests', color: 'from-purple-100 to-indigo-100', iconColor: 'text-purple-500' },
};

const Settings = () => {
    const { user: currentUser } = useAuth();
    const { updateTheme, fetchBranding } = useTheme();
    const { refreshFeatures } = useFeatures();
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const currentSchoolId = currentUser?.schoolId?._id || currentUser?.schoolId;
    const fileInputRef = useRef(null);

    // Theme & logo state
    const [settings, setSettings] = useState({ logoUrl: '', theme: { accentColor: '#2563eb' } });
    const [refreshKey, setRefreshKey] = useState(() => Date.now());
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Feature state
    const [features, setFeatures] = useState({});
    const [featuresLoading, setFeaturesLoading] = useState(false);
    const [togglingFeature, setTogglingFeature] = useState(null);

    const showMessage = useCallback((type, text, duration = 2000) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), duration);
    }, []);

    useEffect(() => {
        const fetchSchoolData = async () => {
            try {
                const response = await api.get('/school/');
                if (response.data.success && response.data.data?.school) {
                    const school = response.data.data.school;
                    setSettings({ logoUrl: school.logoUrl || '', theme: school.theme || { accentColor: '#2563eb' } });
                    if (isSuperAdmin) setFeatures(school.features || {});
                }
            } catch (error) { console.error('Failed to fetch settings', error); }
            finally { setLoading(false); setFeaturesLoading(false); }
        };
        if (isSuperAdmin) setFeaturesLoading(true);
        fetchSchoolData();
    }, [currentSchoolId, isSuperAdmin]);


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
        } catch { showMessage('error', 'Internal Server Error'); }
        finally { setTogglingFeature(null); }
    }, [currentSchoolId, togglingFeature, features, refreshFeatures, showMessage]);

    const handleColorSelect = useCallback(async (colorValue) => {
        setSettings(prev => ({ ...prev, theme: { ...prev.theme, accentColor: colorValue } }));
        updateTheme(colorValue);
        try {
            await api.put('/school/', { theme: { accentColor: colorValue } });
            showMessage('success', 'Theme updated!');
            // Refresh branding data to stay in sync with server
            fetchBranding();
        }
        catch (error) { console.error('Failed to save theme', error); }
    }, [updateTheme, showMessage, fetchBranding]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select an image file.' });
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype || file.type)) {
            setMessage({ type: 'error', text: 'Invalid file type. Only JPG, PNG, and WEBP are allowed.' });
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'File is too large. Max size is 2MB.' });
            return;
        }

        setUploading(true);
        setMessage({ type: '', text: '' });
        try {
            const formData = new FormData();
            formData.append('logo', file);
            if (settings._id) formData.append('schoolId', settings._id);

            const response = await api.put('/school/logo', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                setSettings(prev => ({ ...prev, logoUrl: response.data.data.logoUrl }));
                setRefreshKey(Date.now());
                showMessage('success', 'Logo uploaded successfully!');
                window.dispatchEvent(new Event('settingsUpdated'));

                // Clear success message after 3 seconds
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error?.message || error.response?.data?.message || 'Failed to upload logo'
            });
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    const accentColor = settings.theme?.accentColor || '#2563eb';

    const renderSectionHeader = (icon, iconBg, title, subtitle, badge = null) => (
        <div className={`px-6 py-5 border-b border-gray-100 flex items-center ${badge ? 'justify-between' : 'gap-4'}`}>
            <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center`}>{icon}</div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <p className="text-sm text-gray-500">{subtitle}</p>
                </div>
            </div>
            {badge}
        </div>
    );

    const renderFeatureToggle = (key, meta) => (
        <div key={key} className={`flex items-center justify-between p-4 rounded-xl transition-colors ${features[key] ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center`}><FaBuilding className={meta.iconColor} size={14} /></div>
                <div>
                    <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                    <p className="text-xs text-gray-400">{meta.description}</p>
                </div>
            </div>
            <button onClick={() => handleToggleFeature(key)} disabled={togglingFeature === key}
                className={`relative w-12 h-7 rounded-full transition-colors ${features[key] ? 'bg-emerald-500' : 'bg-gray-200'} ${togglingFeature === key ? 'opacity-50' : ''}`}>
                <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${features[key] ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
    );

    return (
        <DashboardLayout>
            {message.text && (
                <div className={`fixed top-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${message.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
                        {message.type === 'success' ? <FaCheck size={12} /> : <FaPalette size={12} />}
                    </div>
                    <span className="font-medium">{message.text}</span>
                </div>
            )}
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500 mt-1">{isSuperAdmin ? 'Manage portal appearance and school features' : 'Customize your portal appearance and branding'}</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            {renderSectionHeader(<FaPalette className="text-indigo-500" size={18} />, 'from-violet-100 to-indigo-100', 'Theme Color', 'Choose your primary accent',
                                <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">Auto-save</span>
                            )}
                            <div className="p-6">
                                <div className="flex flex-wrap gap-4">
                                    {THEME_COLORS.map(color => (
                                        <button key={color.value} type="button" onClick={() => handleColorSelect(color.value)}
                                            className={`group relative w-14 h-14 rounded-2xl transition-all duration-200 hover:scale-105 focus:outline-none shadow-sm ${accentColor === color.value ? 'ring-2 ring-offset-4 ring-gray-900 scale-105' : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-200'}`}
                                            style={{ backgroundColor: color.value }} title={color.name}>
                                            {accentColor === color.value && <span className="absolute inset-0 flex items-center justify-center"><FaCheck className="text-white text-lg drop-shadow-md" /></span>}
                                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-gray-900 text-white px-3 py-1.5 rounded-lg pointer-events-none shadow-lg">{color.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            {renderSectionHeader(<FaImage className="text-amber-600" size={18} />, 'from-amber-100 to-orange-100', 'Portal Logo', 'Upload your organization logo')}
                            <div className="p-6">
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                                    className={`w-full group flex flex-col items-center justify-center gap-3 px-6 py-8 border-2 border-dashed rounded-xl transition-all ${uploading ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'}`}>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${uploading ? 'bg-gray-100' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
                                        {uploading ? <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600"></div> : <FaUpload className="text-gray-400 group-hover:text-gray-600" size={20} />}
                                    </div>
                                    <div className="text-center">
                                        <span className={`text-base font-medium ${uploading ? 'text-gray-400' : 'text-gray-700'}`}>{uploading ? 'Uploading...' : 'Click to upload logo'}</span>
                                        <p className="text-sm text-gray-400 mt-1">PNG, JPG, GIF, WEBP (max 2MB)</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        {isSuperAdmin && (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center"><FaToggleOn className="text-blue-500" size={18} /></div>
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900">Feature Toggles</h2>
                                                <p className="text-sm text-gray-500">Enable/disable school features</p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-medium">Super Admin</span>
                                    </div>
                                    {!currentSchoolId && <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">No school assigned to your account</p>}
                                </div>
                                <div className="p-4">
                                    {featuresLoading ? (
                                        <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-600"></div></div>
                                    ) : (
                                        <div className="space-y-2">{Object.entries(FEATURE_META).map(([key, meta]) => renderFeatureToggle(key, meta))}</div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6 lg:p-8">
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
                                <p className="text-sm text-gray-500">See how your branding looks</p>
                            </div>
                            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                                <div
                                    className="p-4 flex items-center gap-3"
                                    style={{ backgroundColor: settings.theme?.accentColor || '#2563eb' }}
                                >
                                    {settings.logoUrl ? (
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center p-1.5">
                                            <img
                                                src={`${settings.logoUrl}${settings.logoUrl.includes('?') ? '&' : '?'}t=${refreshKey}`}
                                                alt="Logo"
                                                className="h-full w-full object-contain"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
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
                                        <div className="w-5 h-5 bg-white/20 rounded"></div><span>Dashboard</span>
                                    </div>
                                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 text-sm hover:bg-gray-50">
                                        <div className="w-5 h-5 bg-gray-200 rounded"></div><span>Users</span>
                                    </div>
                                </div>
                                <div className="px-4 pb-4">
                                    <button className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: accentColor }}>Sample Button</button>
                                </div>
                            </div>
                            <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Current Theme</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: accentColor }}></div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{THEME_COLORS.find(c => c.value === accentColor)?.name || 'Custom'}</p>
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