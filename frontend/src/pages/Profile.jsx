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
        <div className="min-h-screen bg-slate-50/50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                {/* Back Link */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="group mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all duration-200"
                >
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 group-hover:border-slate-300 shadow-sm transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight">Back to Dashboard</span>
                </button>

                {/* Profile Header Card */}
                <div className="mb-8 relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-200 shadow-xl shadow-slate-200/40 p-1">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-50/50 rounded-full blur-2xl -ml-24 -mb-24" />
                    
                    <div className="relative bg-white rounded-[2.2rem] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                        <div className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary to-indigo-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full p-1.5 bg-gradient-to-tr from-slate-100 to-slate-200 shadow-inner">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-4xl md:text-5xl font-black text-slate-300 overflow-hidden">
                                    {avatarSrc ? (
                                        <img src={avatarSrc} alt={user?.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{user?.name?.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="text-center md:text-left flex-1 min-w-0">
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-3">
                                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{user?.name}</h1>
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest border border-primary/10">
                                    {formatRole(user?.role)}
                                </span>
                            </div>
                            <div className="flex items-center justify-center md:justify-start gap-2 mt-1 px-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Academic Year: {(() => {
                                        const now = new Date();
                                        const year = now.getFullYear();
                                        const month = now.getMonth();
                                        // Academic year usually starts in June (month 5)
                                        return month >= 5 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;
                                    })()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Grid */}
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Navigation Sidebar */}
                    <div className="w-full lg:w-64 shrink-0">
                        <nav className="flex lg:flex-col gap-2 p-1 bg-slate-100/50 rounded-3xl border border-slate-200 overflow-x-auto lg:overflow-visible no-scrollbar">
                            <button
                                onClick={() => setActiveTab('info')}
                                className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold tracking-tight transition-all duration-300 min-w-max lg:min-w-0 ${
                                    activeTab === 'info' 
                                        ? 'bg-white text-primary shadow-xl shadow-slate-200/60 border border-slate-100 scale-[1.02]' 
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                                }`}
                            >
                                <User className={`w-5 h-5 transition-colors ${activeTab === 'info' ? 'text-primary font-bold' : 'text-slate-400'}`} />
                                Personal info
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold tracking-tight transition-all duration-300 min-w-max lg:min-w-0 ${
                                    activeTab === 'security' 
                                        ? 'bg-white text-primary shadow-xl shadow-slate-200/60 border border-slate-100 scale-[1.02]' 
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                                }`}
                            >
                                <Shield className={`w-5 h-5 transition-colors ${activeTab === 'security' ? 'text-primary font-bold' : 'text-slate-400'}`} />
                                Privacy & Security
                            </button>
                        </nav>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {activeTab === 'info' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Details Card */}
                                <div className="md:col-span-2 bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/20 overflow-hidden">
                                    <div className="px-8 py-6 border-b border-slate-100 flex items-center">
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight italic">Personal Details</h3>
                                    </div>
                                    
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="group p-4 rounded-2xl bg-slate-50/50 border border-transparent hover:border-slate-100 hover:bg-white transition-all flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100 group-hover:bg-primary/5 transition-colors">
                                                <User className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-0.5">Full Name</p>
                                                <p className="text-base font-bold text-slate-800">{user?.name || 'N/A'}</p>
                                            </div>
                                        </div>

                                        <div className="group p-4 rounded-2xl bg-slate-50/50 border border-transparent hover:border-slate-100 hover:bg-white transition-all flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100 group-hover:bg-primary/5 transition-colors">
                                                <Mail className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-0.5">Email Address</p>
                                                <p className="text-base font-bold text-slate-800">{user?.email || 'N/A'}</p>
                                            </div>
                                        </div>

                                        <div className="group p-4 rounded-2xl bg-slate-50/50 border border-transparent hover:border-slate-100 hover:bg-white transition-all flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100 group-hover:bg-primary/5 transition-colors">
                                                <Shield className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-0.5">Account Role</p>
                                                <p className="text-base font-bold text-slate-800">{formatRole(user?.role)}</p>
                                            </div>
                                        </div>

                                        <div className="group p-4 rounded-2xl bg-slate-50/50 border border-transparent hover:border-slate-100 hover:bg-white transition-all flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100 group-hover:bg-primary/5 transition-colors">
                                                <Building2 className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-0.5">Primary School</p>
                                                <p className="text-base font-bold text-slate-800">{schoolName || user?.schoolName || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    

                                </div>
                            </div>
                        ) : (
                            <div className="max-w-xl bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/20 overflow-hidden">
                                <div className="px-8 py-8 border-b border-slate-100">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight italic">Security Update</h3>
                                    <p className="text-slate-500 text-sm mt-1 font-medium">Reset your authentication credentials securely</p>
                                </div>

                                <div className="p-8">
                                    {success && (
                                        <div className="mb-8 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold flex items-center gap-3 animate-in zoom-in-95">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            Password updated! Redirecting to login...
                                        </div>
                                    )}

                                    {error && (
                                        <div className="mb-8 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm font-bold flex items-center gap-3 animate-shake">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            {error}
                                        </div>
                                    )}

                                    <form onSubmit={handlePasswordSubmit} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Current Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-primary transition-colors">
                                                    <Shield size={16} />
                                                </div>
                                                <input
                                                    type={showCurrentPassword ? 'text' : 'password'}
                                                    className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all text-sm font-medium"
                                                    placeholder="Existing password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                                                >
                                                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">New Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-primary transition-colors">
                                                    <Shield size={16} />
                                                </div>
                                                <input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all text-sm font-medium"
                                                    placeholder="Minimum 8 characters"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    required
                                                    minLength={8}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                                                >
                                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Confirm New Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-primary transition-colors">
                                                    <Shield size={16} />
                                                </div>
                                                <input
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all text-sm font-medium"
                                                    placeholder="Verify new password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={updatePasswordMutation.isPending}
                                            className="w-full bg-primary hover:bg-primary-hover text-white font-black py-4 px-4 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-widest"
                                        >
                                            {updatePasswordMutation.isPending ? 'Processing...' : 'Secure Account Now'}
                                        </button>
                                    </form>

                                    <div className="mt-8 p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 ring-4 ring-slate-50/50">
                                        <div className="flex gap-3">
                                            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                                <Shield size={10} />
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                                <span className="font-black text-slate-700 uppercase tracking-tighter">Security Tip:</span> Mandatory 8 characters required. For maximal safety, mix Uppercase, Numbers (1-9) and special characters (!@#).
                                            </p>
                                        </div>
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
