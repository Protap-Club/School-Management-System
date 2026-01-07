import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../api/axios';
import {
    FaSave, FaPalette, FaImage, FaSchool, FaPhone, FaEnvelope, FaMapMarkerAlt

} from 'react-icons/fa';

const Settings = () => {
    const [settings, setSettings] = useState({
        schoolName: '',
        schoolCode: '',
        logoUrl: '',
        address: '',
        contactEmail: '',
        contactPhone: '',
        welcomeMessage: '',
        academicYear: '',
        theme: {
            mode: 'light',
            accentColor: '#2563eb'
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('theme.')) {
            const themeField = name.split('.')[1];
            setSettings(prev => ({
                ...prev,
                theme: { ...prev.theme, [themeField]: value }
            }));
        } else {
            setSettings(prev => ({ ...prev, [name]: value }));
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
                // Optionally update CSS variables for live preview
                document.documentElement.style.setProperty('--primary-color', settings.theme.accentColor);
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
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
                    <p className="text-gray-500 mt-1">Customize your institute's appearance and information</p>
                </div>

                {message.text && (
                    <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Theme & Branding */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <FaPalette className="text-blue-600 text-xl" />
                            <h2 className="text-lg font-bold text-gray-800">Theme & Branding</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Accent Color</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        name="theme.accentColor"
                                        value={settings.theme?.accentColor || '#2563eb'}
                                        onChange={handleChange}
                                        className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={settings.theme?.accentColor || '#2563eb'}
                                        onChange={(e) => handleChange({ target: { name: 'theme.accentColor', value: e.target.value } })}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="#2563eb"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Theme Mode</label>
                                <select
                                    name="theme.mode"
                                    value={settings.theme?.mode || 'light'}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Institute Information */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <FaSchool className="text-blue-600 text-xl" />
                            <h2 className="text-lg font-bold text-gray-800">Institute Information</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Institute Name</label>
                                <input
                                    type="text"
                                    name="schoolName"
                                    value={settings.schoolName || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="Enter institute name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Institute Code</label>
                                <input
                                    type="text"
                                    name="schoolCode"
                                    value={settings.schoolCode || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="e.g., SCH001"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <FaImage /> Logo URL
                                </label>
                                <input
                                    type="url"
                                    name="logoUrl"
                                    value={settings.logoUrl || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="https://example.com/logo.png"
                                />
                                {settings.logoUrl && (
                                    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-500 mb-2">Preview:</p>
                                        <img
                                            src={settings.logoUrl}
                                            alt="Logo Preview"
                                            className="h-16 object-contain"
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Academic Year</label>
                                <input
                                    type="text"
                                    name="academicYear"
                                    value={settings.academicYear || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="2025-2026"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Welcome Message</label>
                                <input
                                    type="text"
                                    name="welcomeMessage"
                                    value={settings.welcomeMessage || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="Welcome to our institute!"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <FaPhone className="text-blue-600 text-xl" />
                            <h2 className="text-lg font-bold text-gray-800">Contact Information</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <FaEnvelope /> Email
                                </label>
                                <input
                                    type="email"
                                    name="contactEmail"
                                    value={settings.contactEmail || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="contact@institute.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <FaPhone /> Phone
                                </label>
                                <input
                                    type="tel"
                                    name="contactPhone"
                                    value={settings.contactPhone || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="+1 234 567 890"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <FaMapMarkerAlt /> Address
                                </label>
                                <textarea
                                    name="address"
                                    value={settings.address || ''}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                    placeholder="123 Main Street, City, Country"
                                />
                            </div>
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
