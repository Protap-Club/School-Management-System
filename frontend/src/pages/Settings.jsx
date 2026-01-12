import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { FaSave, FaPalette, FaImage, FaCheck, FaUpload, FaLink, FaToggleOn, FaToggleOff } from 'react-icons/fa';

// Predefined theme colors
// Predefined theme colors
const THEME_COLORS = [
    { name: 'Royal Blue', value: '#2563eb', textColor: '#ffffff' },
    { name: 'Purple', value: '#7c3aed', textColor: '#ffffff' },
    { name: 'Emerald', value: '#059669', textColor: '#ffffff' },
    { name: 'Rose', value: '#e11d48', textColor: '#ffffff' },
    { name: 'Amber', value: '#d97706', textColor: '#ffffff' },
];

// Feature toggle configuration
const FEATURE_CONFIG = [
    { key: 'attendance', label: 'Attendance Module', description: 'Track student attendance' },
    { key: 'feeManagement', label: 'Fee Management', description: 'Manage student fees and payments' },
    { key: 'library', label: 'Library Module', description: 'Library book management' },
    { key: 'transport', label: 'Transport Module', description: 'School transport management' },
];

const Settings = () => {
    const { user: currentUser } = useAuth();
    const isSuperAdmin = currentUser?.role === 'super_admin';

    const [settings, setSettings] = useState({
        logoUrl: '',
        theme: {
            accentColor: '#2563eb'
        }
    });
    const [features, setFeatures] = useState({
        attendance: false,
        feeManagement: false,
        library: false,
        transport: false,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [logoInputType, setLogoInputType] = useState('url');
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/settings');
            if (response.data.success) {
                setSettings(response.data.data);
                // Extract features if available
                if (response.data.data.features) {
                    setFeatures(prev => ({
                        ...prev,
                        ...response.data.data.features
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleColorSelect = (colorValue) => {
        setSettings(prev => ({
            ...prev,
            theme: { ...prev.theme, accentColor: colorValue }
        }));
    };

    const handleLogoChange = (e) => {
        setSettings(prev => ({ ...prev, logoUrl: e.target.value }));
    };

    const handleFeatureToggle = (featureKey) => {
        setFeatures(prev => ({
            ...prev,
            [featureKey]: !prev[featureKey]
        }));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select an image file' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'File size must be less than 5MB' });
            return;
        }

        setUploading(true);
        setMessage({ type: '', text: '' });

        try {
            const formData = new FormData();
            formData.append('logo', file);

            const response = await api.post('/settings/upload-logo', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                const fullLogoUrl = `http://localhost:5000${response.data.data.logoUrl}`;
                setSettings(prev => ({ ...prev, logoUrl: fullLogoUrl }));
                setMessage({ type: 'success', text: 'Logo uploaded successfully!' });
                window.dispatchEvent(new Event('settingsUpdated'));
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to upload logo' });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            // Save settings
            const settingsData = { ...settings };
            if (isSuperAdmin) {
                settingsData.features = features;
            }

            const response = await api.put('/settings', settingsData);
            if (response.data.success) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
                window.dispatchEvent(new Event('settingsUpdated'));
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
                    <p className="text-gray-500 mt-1">Customize your portal appearance</p>
                </div>

                {message.text && (
                    <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Two Column Layout for SuperAdmin */}
                    <div className={`grid gap-8 ${isSuperAdmin ? 'lg:grid-cols-2' : 'max-w-2xl'}`}>
                        {/* Left Column - Theme & Logo */}
                        <div className="space-y-8">
                            {/* Theme Colors */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                                    <FaPalette className="text-primary text-xl" />
                                    <h2 className="text-lg font-bold text-gray-800">Theme Color</h2>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm text-gray-500 mb-6 font-medium">Choose a primary theme color</p>
                                    <div className="flex flex-wrap gap-4">
                                        {THEME_COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => handleColorSelect(color.value)}
                                                className={`group relative w-12 h-12 rounded-full shadow-sm transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${settings.theme?.accentColor === color.value
                                                    ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                                                    : 'hover:shadow-md'
                                                    }`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            >
                                                {settings.theme?.accentColor === color.value && (
                                                    <span className="absolute inset-0 flex items-center justify-center">
                                                        <FaCheck className="text-white text-lg drop-shadow-md" />
                                                    </span>
                                                )}
                                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-gray-100 px-2 py-1 rounded shadow-sm z-10 pointer-events-none">
                                                    {color.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Logo */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                                    <FaImage className="text-primary text-xl" />
                                    <h2 className="text-lg font-bold text-gray-800">Portal Logo</h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    {/* Toggle between URL and Upload */}
                                    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                                        <button
                                            type="button"
                                            onClick={() => setLogoInputType('url')}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${logoInputType === 'url'
                                                ? 'bg-white text-primary shadow-sm'
                                                : 'text-gray-600 hover:text-gray-800'
                                                }`}
                                        >
                                            <FaLink /> URL
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLogoInputType('upload')}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${logoInputType === 'upload'
                                                ? 'bg-white text-primary shadow-sm'
                                                : 'text-gray-600 hover:text-gray-800'
                                                }`}
                                        >
                                            <FaUpload /> Upload
                                        </button>
                                    </div>

                                    {/* URL Input */}
                                    {logoInputType === 'url' && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Logo URL</label>
                                            <input
                                                type="url"
                                                value={settings.logoUrl || ''}
                                                onChange={handleLogoChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                                placeholder="https://example.com/logo.png"
                                            />
                                            <p className="text-xs text-gray-400">Enter a URL to your logo image</p>
                                        </div>
                                    )}

                                    {/* File Upload */}
                                    {logoInputType === 'upload' && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Upload Logo</label>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary/60 hover:bg-primary/5 transition-all text-gray-600 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <FaUpload size={20} />
                                                <span>{uploading ? 'Uploading...' : 'Click to upload logo'}</span>
                                            </button>
                                            <p className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</p>
                                        </div>
                                    )}

                                    {/* Logo Preview */}
                                    {settings.logoUrl && (
                                        <div className="mt-4 p-6 bg-gray-50 rounded-xl">
                                            <p className="text-sm text-gray-500 mb-3">Preview:</p>
                                            <div className="flex items-center justify-center bg-white p-4 rounded-lg border border-gray-200">
                                                <img
                                                    src={settings.logoUrl}
                                                    alt="Logo Preview"
                                                    className="h-12 max-w-[200px] object-contain"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Feature Toggles (SuperAdmin only) */}
                        {isSuperAdmin && (
                            <div className="space-y-8">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                                        <FaToggleOn className="text-purple-600 text-xl" />
                                        <h2 className="text-lg font-bold text-gray-800">Feature Toggles</h2>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-sm text-gray-500 mb-6">Enable or disable features for this school</p>
                                        <div className="space-y-4">
                                            {FEATURE_CONFIG.map((feature) => (
                                                <div
                                                    key={feature.key}
                                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                                >
                                                    <div>
                                                        <h3 className="font-medium text-gray-800">{feature.label}</h3>
                                                        <p className="text-sm text-gray-500">{feature.description}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleFeatureToggle(feature.key)}
                                                        className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${features[feature.key] ? 'bg-purple-600' : 'bg-gray-300'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${features[feature.key] ? 'translate-x-7' : 'translate-x-1'
                                                                }`}
                                                        />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <FaSave />
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
};

export default Settings;
