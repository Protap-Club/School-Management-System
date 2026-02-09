import React, { useState, useEffect } from 'react';
import { FaTimes, FaUserPlus, FaBuilding } from 'react-icons/fa';
import api from '../api/axios';
import { useAuth } from '../features/auth';

const AddUserModal = ({ isOpen, onClose, roleToAdd, onSuccess }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        department: '',
        standard: '',
        section: '',
        rollNumber: '',
        course: '',
        year: '',
        contactNo: '',
        schoolId: ''
    });
    const [schoolName, setSchoolName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Set school data from user context or fetch if needed
    useEffect(() => {
        const fetchSchoolDetails = async () => {
            if (isOpen && user?.schoolId) {
                // Case 1: schoolId is already a populated object with name
                if (typeof user.schoolId === 'object' && user.schoolId.name) {
                    setSchoolName(user.schoolId.name);
                    setFormData(prev => ({ ...prev, schoolId: user.schoolId._id }));
                }
                // Case 2: schoolId is just an ID string - fetch the name
                else {
                    setFormData(prev => ({ ...prev, schoolId: user.schoolId }));
                    try {
                        const response = await api.get('/school/profile');
                        if (response.data.success && response.data.data?.school?.name) {
                            setSchoolName(response.data.data.school.name);
                        } else {
                            setSchoolName('School');
                        }
                    } catch (err) {
                        console.error('Failed to fetch school name', err);
                        setSchoolName('School');
                    }
                }
            }
        };
        fetchSchoolDetails();
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Concatenate names
            const fullName = `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim();

            const payload = {
                ...formData,
                name: fullName,
                role: roleToAdd
            };

            // Remove temporary name fields from payload
            delete payload.firstName;
            delete payload.middleName;
            delete payload.lastName;

            // Map "year" to number if present
            if (payload.year) payload.year = parseInt(payload.year);

            await api.post('/users', payload);
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                firstName: '', middleName: '', lastName: '',
                email: '', department: '', standard: '', section: '',
                rollNumber: '', course: '', year: '', contactNo: '', schoolId: user?.schoolId || ''
            });
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Failed to create user';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="bg-primary px-6 py-4 flex items-center justify-between">
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
                        {/* School Field - Read Only for Everyone */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <FaBuilding className="text-gray-400" />
                                School
                            </label>
                            <input
                                value={schoolName || 'Loading...'}
                                disabled
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed font-medium"
                            />
                        </div>

                        {/* Name Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">First Name *</label>
                                <input
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Middle Name</label>
                                <input
                                    name="middleName"
                                    value={formData.middleName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Last Name *</label>
                                <input
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Email Address *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Contact No</label>
                                <input
                                    name="contactNo"
                                    value={formData.contactNo}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Info about auto-generated password */}
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
                            <span className="text-primary mt-0.5">ℹ️</span>
                            <p className="text-sm text-primary">
                                A secure password will be auto-generated and sent to the user's email address.
                            </p>
                        </div>

                        {/* Admin Specific Fields */}
                        {roleToAdd === 'admin' && (
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Department *</label>
                                <input
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                    required
                                />
                            </div>
                        )}

                        {/* Teacher Specific Fields */}
                        {roleToAdd === 'teacher' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Standard *</label>
                                    <select
                                        name="standard"
                                        value={formData.standard}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                        required
                                    >
                                        <option value="">Select Standard</option>
                                        <option value="9th">9th</option>
                                        <option value="10th">10th</option>
                                        <option value="11th">11th</option>
                                        <option value="12th">12th</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Section *</label>
                                    <select
                                        name="section"
                                        value={formData.section}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                        required
                                    >
                                        <option value="">Select Section</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                    </select>
                                </div>
                            </div>
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
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                            required
                                        />
                                    </div><div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Class *</label>
                                        <input
                                            name="standard"
                                            value={formData.standard}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Section *</label>
                                        <input
                                            name="section"
                                            value={formData.section}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
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
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
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
                                disabled={loading}
                                className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg shadow-lg shadow-primary/30 transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed"
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
