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

                {/* Theme & Logo Settings */}
                <div className="max-w-2xl space-y-8">
                    {/* Theme Colors */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <FaPalette className="text-primary text-xl" />
                            <h2 className="text-lg font-bold text-gray-800">Theme Color</h2>
                            <span className="text-xs text-gray-400 ml-auto">Click to apply</span>
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
                            {/* File Upload */}
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
                                <p className="text-xs text-gray-400">PNG, JPG, GIF, WEBP up to 2MB</p>
                            </div>

                            {/* Logo Preview */}
                            {settings.logoUrl && (
                                <div className="mt-4 p-6 bg-gray-50 rounded-xl">
                                    <p className="text-sm text-gray-500 mb-3">Current Logo:</p>
                                    <div className="flex items-center justify-center bg-white p-4 rounded-lg border border-gray-200">
                                        <img
                                            src={settings.logoUrl.startsWith('/') ? `http://localhost:5000${settings.logoUrl}` : settings.logoUrl}
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
            </div>
        </DashboardLayout>
    );
};

export default Settings;
