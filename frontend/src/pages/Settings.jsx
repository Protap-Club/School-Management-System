import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import { FaPalette, FaImage, FaCheck, FaUpload } from 'react-icons/fa';

// Predefined theme colors
const THEME_COLORS = [
    { name: 'Royal Blue', value: '#2563eb', textColor: '#ffffff' },
    { name: 'Purple', value: '#7c3aed', textColor: '#ffffff' },
    { name: 'Emerald', value: '#059669', textColor: '#ffffff' },
    { name: 'Rose', value: '#e11d48', textColor: '#ffffff' },
    { name: 'Amber', value: '#d97706', textColor: '#ffffff' },
];

const Settings = () => {
    const { user: currentUser } = useAuth();
    const { updateTheme } = useTheme();

    const [settings, setSettings] = useState({
        logoUrl: '',
        theme: {
            accentColor: '#2563eb'
        }
    });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/school/my-branding');
            if (response.data.success && response.data.data) {
                setSettings({
                    logoUrl: response.data.data.logoUrl || '',
                    theme: response.data.data.theme || { accentColor: '#2563eb' }
                });
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleColorSelect = async (colorValue) => {
        // Update local state
        setSettings(prev => ({
            ...prev,
            theme: { ...prev.theme, accentColor: colorValue }
        }));
        // Immediately apply theme for live preview
        updateTheme(colorValue);

        // Auto-save theme to backend
        try {
            await api.put('/school/theme', { accentColor: colorValue });
            setMessage({ type: 'success', text: 'Theme updated!' });
            // Clear message after 2 seconds
            setTimeout(() => setMessage({ type: '', text: '' }), 2000);
        } catch (error) {
            console.error('Failed to save theme', error);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select an image file' });
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'File size must be less than 2MB' });
            return;
        }

        setUploading(true);
        setMessage({ type: '', text: '' });

        try {
            const formData = new FormData();
            formData.append('logo', file);

            const response = await api.post('/school/logo', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                const logoUrl = response.data.data.logoUrl;
                setSettings(prev => ({ ...prev, logoUrl }));
                setMessage({ type: 'success', text: 'Logo uploaded successfully!' });
                window.dispatchEvent(new Event('settingsUpdated'));
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to upload logo' });
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

    return (
        <DashboardLayout>
            {/* Toast Notification */}
            {message.text && (
                <div className={`fixed top-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${message.type === 'success'
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-red-500/90 text-white'
                    }`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
                        {message.type === 'success' ? <FaCheck size={12} /> : <FaPalette size={12} />}
                    </div>
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500 mt-1">Customize your portal appearance and branding</p>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Settings Controls */}
                    <div className="space-y-6">
                        {/* Theme Colors */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                                        <FaPalette className="text-indigo-500" size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Theme Color</h2>
                                        <p className="text-sm text-gray-500">Choose your primary accent</p>
                                    </div>
                                </div>
                                <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">Auto-save</span>
                            </div>
                            <div className="p-6">
                                <div className="flex flex-wrap gap-4">
                                    {THEME_COLORS.map((color) => (
                                        <button
                                            key={color.value}
                                            type="button"
                                            onClick={() => handleColorSelect(color.value)}
                                            className={`group relative w-14 h-14 rounded-2xl transition-all duration-200 hover:scale-105 focus:outline-none shadow-sm ${settings.theme?.accentColor === color.value
                                                    ? 'ring-2 ring-offset-4 ring-gray-900 scale-105'
                                                    : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-200'
                                                }`}
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                        >
                                            {settings.theme?.accentColor === color.value && (
                                                <span className="absolute inset-0 flex items-center justify-center">
                                                    <FaCheck className="text-white text-lg drop-shadow-md" />
                                                </span>
                                            )}
                                            {/* Tooltip */}
                                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-gray-900 text-white px-3 py-1.5 rounded-lg pointer-events-none shadow-lg">
                                                {color.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Logo Upload */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
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
                                {/* Upload Area */}
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
                                    className={`w-full group flex flex-col items-center justify-center gap-3 px-6 py-8 border-2 border-dashed rounded-xl transition-all ${uploading
                                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                                        }`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${uploading ? 'bg-gray-100' : 'bg-gray-100 group-hover:bg-gray-200'
                                        }`}>
                                        {uploading ? (
                                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600"></div>
                                        ) : (
                                            <FaUpload className="text-gray-400 group-hover:text-gray-600" size={20} />
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <span className={`text-base font-medium ${uploading ? 'text-gray-400' : 'text-gray-700'}`}>
                                            {uploading ? 'Uploading...' : 'Click to upload logo'}
                                        </span>
                                        <p className="text-sm text-gray-400 mt-1">PNG, JPG, GIF, WEBP (max 2MB)</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Live Preview */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6 lg:p-8">
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
                            <p className="text-sm text-gray-500">See how your branding looks</p>
                        </div>

                        {/* Preview Card - Simulated Sidebar Header */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            {/* Simulated Sidebar Header */}
                            <div
                                className="p-4 flex items-center gap-3"
                                style={{ backgroundColor: settings.theme?.accentColor || '#2563eb' }}
                            >
                                {settings.logoUrl ? (
                                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center p-1.5">
                                        <img
                                            src={settings.logoUrl.startsWith('/') ? `http://localhost:5000${settings.logoUrl}` : settings.logoUrl}
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

                            {/* Simulated Menu Items */}
                            <div className="p-3 space-y-1">
                                <div
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white text-sm font-medium"
                                    style={{ backgroundColor: settings.theme?.accentColor || '#2563eb' }}
                                >
                                    <div className="w-5 h-5 bg-white/20 rounded"></div>
                                    <span>Dashboard</span>
                                </div>
                                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 text-sm hover:bg-gray-50">
                                    <div className="w-5 h-5 bg-gray-200 rounded"></div>
                                    <span>Users</span>
                                </div>
                                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 text-sm hover:bg-gray-50">
                                    <div className="w-5 h-5 bg-gray-200 rounded"></div>
                                    <span>Settings</span>
                                </div>
                            </div>

                            {/* Sample Button */}
                            <div className="px-4 pb-4">
                                <button
                                    className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: settings.theme?.accentColor || '#2563eb' }}
                                >
                                    Sample Button
                                </button>
                            </div>
                        </div>

                        {/* Current Selection Info */}
                        <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Current Theme</p>
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-lg shadow-sm"
                                    style={{ backgroundColor: settings.theme?.accentColor || '#2563eb' }}
                                ></div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {THEME_COLORS.find(c => c.value === settings.theme?.accentColor)?.name || 'Custom'}
                                    </p>
                                    <p className="text-xs text-gray-400 font-mono">{settings.theme?.accentColor}</p>
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

