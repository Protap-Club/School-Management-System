import React, { useState } from 'react';
import api from '../api/axios';
import { FaTimes, FaBuilding, FaToggleOn, FaToggleOff } from 'react-icons/fa';

const AddInstituteModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        contactEmail: '',
        contactPhone: '',
        logoUrl: ''
    });
    const [features, setFeatures] = useState({
        attendance: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload = {
                ...formData,
                features: {
                    attendance: { enabled: features.attendance }
                }
            };

            const response = await api.post('/institute', payload);
            if (response.data.success) {
                onSuccess();
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create institute');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <FaBuilding className="text-white text-xl" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Add New Institute</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-sm font-medium text-gray-700">Institute Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                placeholder="ABC School"
                                required
                            />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="text-sm font-medium text-gray-700">Institute Code *</label>
                            <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none uppercase"
                                placeholder="ABC001"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700">Address</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            rows="2"
                            className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                            placeholder="123 Main Street, City"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Contact Email</label>
                            <input
                                type="email"
                                name="contactEmail"
                                value={formData.contactEmail}
                                onChange={handleChange}
                                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                placeholder="contact@school.com"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700">Contact Phone</label>
                            <input
                                type="tel"
                                name="contactPhone"
                                value={formData.contactPhone}
                                onChange={handleChange}
                                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                placeholder="+91 9876543210"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700">Logo URL</label>
                        <input
                            type="url"
                            name="logoUrl"
                            value={formData.logoUrl}
                            onChange={handleChange}
                            className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                            placeholder="https://example.com/logo.png"
                        />
                    </div>

                    {/* Features Section */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3">Institute Features</h3>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-800">Attendance Module</p>
                                <p className="text-xs text-gray-500">Enable teachers to mark student attendance</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFeatures(p => ({ ...p, attendance: !p.attendance }))}
                                className={`text-3xl transition-colors ${features.attendance ? 'text-green-500' : 'text-gray-300'}`}
                            >
                                {features.attendance ? <FaToggleOn /> : <FaToggleOff />}
                            </button>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating...' : 'Create Institute'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddInstituteModal;
