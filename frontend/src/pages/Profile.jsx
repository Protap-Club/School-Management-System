import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../features/auth/api/api';
import { User, Mail, Shield, Building2, Calendar, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import api from '../lib/axios';

const Profile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('info');
    const [schoolName, setSchoolName] = useState(() => {
        try {
            const cached = JSON.parse(sessionStorage.getItem('schoolBranding'));
            return cached?.name || cached?.school?.name || null;
        } catch { return null; }
    });
    
    // Password states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchSchool = async () => {
            if (schoolName) return;
            try {
                const response = await api.get('/school');
                if (response.data?.success && response.data?.data) {
                    const schoolData = response.data.data.school || response.data.data;
                    setSchoolName(schoolData?.name);
                    sessionStorage.setItem('schoolBranding', JSON.stringify(schoolData));
                }
            } catch (error) {
                console.error('Failed to fetch school', error);
            }
        };
        fetchSchool();
    }, [schoolName]);

    const updatePasswordMutation = useMutation({
        mutationFn: authApi.updatePassword,
        onSuccess: () => {
            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            // Logout and redirect to login after 2 seconds
            setTimeout(() => {
                logout();
                navigate('/login');
            }, 2000);
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Failed to update password');
        },
    });

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        setError('');
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('All fields are required');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (currentPassword === newPassword) {
            setError('New password must be different');
            return;
        }
        
        updatePasswordMutation.mutate({ currentPassword, newPassword });
    };

    const formatRole = (role) => {
        return role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'User';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
        } catch {
            return 'N/A';
        }
    };

    const avatarSrc = user?.avatarUrl || null;

    return (
        <div className="min-h-screen bg-gray-50 py-6">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Back to Dashboard</span>
                </button>

                {/* Main Layout */}
                <div className="flex gap-8">
                    {/* Left Sidebar - Narrower */}
                    <div className="w-40 shrink-0">
                        <div className="sticky top-6 space-y-1">
                            <button
                                onClick={() => setActiveTab('info')}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    activeTab === 'info' 
                                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                Personal Info
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    activeTab === 'security' 
                                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                Security
                            </button>
                        </div>
                    </div>

                    {/* Main Content - Wider */}
                    <div className="flex-1 min-w-0 max-w-3xl">
                        {activeTab === 'info' ? (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                {/* User Info Header */}
                                <div className="px-6 py-6 border-b border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl font-medium text-gray-500 overflow-hidden shrink-0">
                                            {avatarSrc ? (
                                                <img src={avatarSrc} alt={user?.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{user?.name?.charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">{user?.name}</h2>
                                            <p className="text-gray-500 text-sm">{formatRole(user?.role)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Info List */}
                                <div className="divide-y divide-gray-100">
                                    <div className="px-6 py-4 flex items-center gap-4">
                                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                                            <User className="w-4 h-4 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Full Name</p>
                                            <p className="text-gray-900 font-medium text-sm">{user?.name || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="px-6 py-4 flex items-center gap-4">
                                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Mail className="w-4 h-4 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                                            <p className="text-gray-900 font-medium text-sm">{user?.email || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="px-6 py-4 flex items-center gap-4">
                                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Shield className="w-4 h-4 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Role</p>
                                            <p className="text-gray-900 font-medium text-sm">{formatRole(user?.role)}</p>
                                        </div>
                                    </div>

                                    <div className="px-6 py-4 flex items-center gap-4">
                                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Building2 className="w-4 h-4 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">School</p>
                                            <p className="text-gray-900 font-medium text-sm">{schoolName || user?.schoolName || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="px-6 py-4 flex items-center gap-4">
                                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Calendar className="w-4 h-4 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Member Since</p>
                                            <p className="text-gray-900 font-medium text-sm">{formatDate(user?.updatedAt)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                {/* Security Header */}
                                <div className="px-6 py-6 border-b border-gray-100">
                                    <h2 className="text-lg font-semibold text-gray-900">Password</h2>
                                    <p className="text-gray-500 text-sm mt-1">Update your password to keep your account secure</p>
                                </div>

                                <div className="p-6">
                                    {success && (
                                        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
                                            Password updated successfully
                                        </div>
                                    )}

                                    {error && (
                                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                                            {error}
                                        </div>
                                    )}

                                    <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-md">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Current Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showCurrentPassword ? 'text' : 'password'}
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                                                    placeholder="Enter current password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                New Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                                                    placeholder="Minimum 8 characters"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    required
                                                    minLength={8}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Confirm New Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                                                    placeholder="Re-enter new password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={updatePasswordMutation.isPending}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                        >
                                            {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                                        </button>
                                    </form>

                                    <div className="mt-6 p-4 bg-gray-50 rounded-lg max-w-md">
                                        <p className="text-xs text-gray-500">
                                            <span className="font-medium text-gray-700">Tip:</span> Use at least 8 characters with a mix of letters, numbers, and symbols.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
