import React, { useState, useEffect } from 'react';
import { FaTimes, FaUserPlus, FaBuilding } from 'react-icons/fa';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const AddUserModal = ({ isOpen, onClose, roleToAdd, onSuccess }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        department: '',
        designation: '',
        rollNumber: '',
        course: '',
        year: '',
        contactNo: '',
        instituteId: ''
    });
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch institutes for SuperAdmin
    useEffect(() => {
        if (isOpen && user?.role === 'super_admin') {
            fetchInstitutes();
        }
    }, [isOpen, user?.role]);

    const fetchInstitutes = async () => {
        try {
            const response = await api.get('/institute/list');
            if (response.data.success) {
                setInstitutes(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch institutes', error);
        }
    };

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate institute for SuperAdmin
        if (user?.role === 'super_admin' && !formData.instituteId) {
            setError('Please select an institute');
            setLoading(false);
            return;
        }

        try {
            const payload = {
                ...formData,
                targetRole: roleToAdd
            };

            // Map "year" to number if present
            if (payload.year) payload.year = parseInt(payload.year);

            await api.post('/user/create-user', payload);
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                name: '', email: '', department: '', designation: '',
                rollNumber: '', course: '', year: '', contactNo: '', instituteId: ''
            });
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const isSuperAdmin = user?.role === 'super_admin';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <FaUserPlus />
                        ADD {roleToAdd?.toUpperCase()}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Institute Selector - Only for SuperAdmin */}
                        {isSuperAdmin && (
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <FaBuilding className="text-purple-600" />
                                    Select Institute *
                                </label>
                                <select
                                    name="instituteId"
                                    value={formData.instituteId}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-purple-50"
                                    required
                                >
                                    <option value="">-- Select an Institute --</option>
                                    {institutes.map(inst => (
                                        <option key={inst._id} value={inst._id}>
                                            {inst.name} ({inst.code})
                                        </option>
                                    ))}
                                </select>
                                {institutes.length === 0 && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        No institutes found. Please create an institute first.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Common Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Full Name *</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Contact No</label>
                                <input
                                    name="contactNo"
                                    value={formData.contactNo}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Email Address *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                required
                            />
                        </div>

                        {/* Info about auto-generated password */}
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">ℹ️</span>
                            <p className="text-sm text-blue-700">
                                A secure password will be auto-generated and sent to the user's email address.
                            </p>
                        </div>

                        {/* Teacher/Admin Specific Fields */}
                        {(roleToAdd === 'teacher' || roleToAdd === 'admin') && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Department *</label>
                                        <input
                                            name="department"
                                            value={formData.department}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    {roleToAdd === 'teacher' && (
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Designation *</label>
                                            <input
                                                name="designation"
                                                value={formData.designation}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Student Specific Fields */}
                        {roleToAdd === 'student' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Roll Number *</label>
                                        <input
                                            name="rollNumber"
                                            value={formData.rollNumber}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Course *</label>
                                        <input
                                            name="course"
                                            value={formData.course}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Year *</label>
                                        <input
                                            type="number"
                                            name="year"
                                            value={formData.year}
                                            onChange={handleChange}
                                            min="1"
                                            max="6"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="pt-4 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || (isSuperAdmin && institutes.length === 0)}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-600/30 transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating...' : `Create ${roleToAdd}`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddUserModal;
