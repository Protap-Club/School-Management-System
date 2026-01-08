import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../api/axios';
import { FaSave, FaPalette, FaImage, FaCheck, FaUpload, FaLink } from 'react-icons/fa';

// Predefined theme colors
const THEME_COLORS = [
    { name: 'White', value: '#ffffff', textColor: '#1f2937' },
    { name: 'Black', value: '#1f2937', textColor: '#ffffff' },
    { name: 'Blue', value: '#2563eb', textColor: '#ffffff' },
    { name: 'Purple', value: '#7c3aed', textColor: '#ffffff' },
    { name: 'Green', value: '#059669', textColor: '#ffffff' },
    { name: 'Light Pink', value: '#ec4899', textColor: '#ffffff' },
];

const Settings = () => {
    const [settings, setSettings] = useState({
        logoUrl: '',
        theme: {
            accentColor: '#2563eb'
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [logoInputType, setLogoInputType] = useState('url'); // 'url' or 'upload'
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/settings');
            if (response.data.success) {
                setSettings(response.data.data);
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

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select an image file' });
            return;
        }

        // Validate file size (5MB max)
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
                // Construct full URL for the uploaded file
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
            const response = await api.put('/settings', settings);
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-2xl">
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
                    {/* Theme Colors */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <FaPalette className="text-blue-600 text-xl" />
                            <h2 className="text-lg font-bold text-gray-800">Theme Color</h2>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-500 mb-4">Choose a theme color for your portal</p>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                {THEME_COLORS.map((color) => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        onClick={() => handleColorSelect(color.value)}
                                        className={`relative w-full aspect-square rounded-xl border-2 transition-all duration-200 hover:scale-105 ${settings.theme?.accentColor === color.value
                                                ? 'border-blue-500 ring-2 ring-blue-200'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                    >
                                        {settings.theme?.accentColor === color.value && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <FaCheck style={{ color: color.textColor }} size={20} />
                                            </div>
                                        )}
                                        <span
                                            className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-medium"
                                            style={{ color: color.textColor }}
                                        >
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
                            <FaImage className="text-blue-600 text-xl" />
                            <h2 className="text-lg font-bold text-gray-800">Portal Logo</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Toggle between URL and Upload */}
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                                <button
                                    type="button"
                                    onClick={() => setLogoInputType('url')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${logoInputType === 'url'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                >
                                    <FaLink /> URL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLogoInputType('upload')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${logoInputType === 'upload'
                                            ? 'bg-white text-blue-600 shadow-sm'
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                                        className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-200">
                                        <img
                                            src={settings.logoUrl}
                                            alt="Logo Preview"
                                            className="h-10 w-10 object-contain rounded"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                        <span className="text-xl font-bold text-gray-800">SMS Portal</span>
                                    </div>
                                </div>
                            )}
                        </div>
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
