import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth';
import api from '../lib/axios';
import { 
    FaEnvelope, FaPhone, FaSchool, 
    FaCalendarAlt, FaIdCard, FaUserTie, 
    FaBuilding, FaGraduationCap
} from 'react-icons/fa';
import DashboardLayout from '../layouts/DashboardLayout';
import { PageSpinner, ButtonSpinner } from '../components/ui/Spinner';

const ROLE_COLORS = {
    super_admin: 'bg-purple-600',
    admin: 'bg-blue-600',
    teacher: 'bg-indigo-600',
    student: 'bg-emerald-600'
};

const Profile = () => {
    const { user, accessToken } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user || !accessToken) return;
            try {
                setLoading(true);
                const response = await api.get('/users/me/profile');
                if (response.data.success) {
                    setProfileData(response.data.data);
                } else {
                    setError('Failed to load profile data.');
                }
            } catch (err) {
                console.error("Error fetching profile", err);
                setError(err.response?.data?.message || 'An error occurred while loading your profile.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user, accessToken]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <PageSpinner />
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto p-4 md:p-8 text-center">
                    <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 inline-block shadow-sm">
                        <p className="font-semibold mb-2">Error Occurred</p>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!profileData) return null;

    const roleColor = ROLE_COLORS[user?.role] || 'bg-gray-600';
    const isSuperAdmin = user?.role === 'super_admin';
    const isTeacher = user?.role === 'teacher';

    const InfoCard = ({ icon: Icon, title, value }) => (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/80 border border-gray-100/80 hover:bg-white hover:border-gray-200 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-blue-600 shadow-sm border border-gray-100">
                <Icon size={16} />
            </div>
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">{title}</p>
                <p className="text-sm font-semibold text-gray-900 leading-none">{value || 'Not Specified'}</p>
            </div>
        </div>
    );

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto pb-10 animate-in fade-in duration-500">
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                    
                    {/* Left Column - Profile Card */}
                    <div className="lg:col-span-4 space-y-6">
                        
                        {/* Main Identity Card */}
                        <div className="bg-white rounded-[24px] shadow-sm border border-gray-200 overflow-hidden text-center">
                            {/* Top Color Banner */}
                            <div className={`h-32 ${roleColor}`}></div>
                            
                            <div className="px-6 pb-8 relative">
                                {/* Overlapping Avatar */}
                                <div className="w-28 h-28 mx-auto -mt-14 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center text-4xl font-bold bg-gray-50 text-gray-300 relative z-10">
                                    {profileData.avatarUrl ? (
                                        <img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center ${roleColor} text-white`}>
                                            {profileData.name?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-4">
                                    <h1 className="text-2xl font-bold text-gray-900">{profileData.name}</h1>
                                    <div className="mt-2 flex justify-center">
                                        <span className="px-3 md:px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest">
                                            {profileData.role?.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>

                                {/* Stacked Info Tiles */}
                                <div className="mt-8 space-y-3 text-left">
                                    <InfoCard 
                                        icon={FaSchool} 
                                        title="School" 
                                        value={profileData.school?.name || (isSuperAdmin ? 'Central Management' : 'N/A')} 
                                    />
                                    <InfoCard 
                                        icon={FaEnvelope} 
                                        title="Email" 
                                        value={profileData.email} 
                                    />
                                    <InfoCard 
                                        icon={FaPhone} 
                                        title="Contact" 
                                        value={profileData.contactNo || 'N/A'} 
                                    />
                                    <InfoCard 
                                        icon={FaCalendarAlt} 
                                        title="Tenure" 
                                        value={`Joined ${new Date(profileData.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`} 
                                    />
                                </div>

                                <button className="w-full mt-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                                    Edit Profile
                                </button>
                            </div>
                        </div>

                        {/* Status/Engagement Score Card (Decorative/Static for now) */}
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[24px] border border-blue-100 p-6 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Account Status</p>
                            <div className="flex items-end gap-3 mb-4">
                                <h2 className="text-4xl font-black text-blue-600 tracking-tight">Active</h2>
                                <span className="text-emerald-600 text-sm font-bold flex items-center mb-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div> Online
                                </span>
                            </div>
                            <div className="w-full h-2 bg-blue-200/50 rounded-full overflow-hidden">
                                <div className="w-full h-full bg-blue-600 rounded-full"></div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column - Work Details */}
                    <div className="lg:col-span-8 space-y-8">
                        
                        {/* Assigned Classes Region */}
                        {isTeacher && (
                            <div>
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-lg font-bold text-gray-900">Assigned Classes</h2>
                                    {/* <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">View Curriculum</button> */}
                                </div>
                                
                                {profileData.profile?.assignedClasses?.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {profileData.profile.assignedClasses.map((ac, idx) => (
                                            <div key={idx} className="bg-white rounded-[24px] border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                                                        🏫
                                                    </div>
                                                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                                                        Active
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                    Class {ac.standard} - {ac.section}
                                                </h3>
                                                <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                                                    Primary instruction and class management responsibilities for Grade {ac.standard}, Section {ac.section}.
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <div className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded border border-gray-200 text-xs font-bold">
                                                        Standard {ac.standard}
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-500">Section {ac.section}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-[24px] border border-gray-200 p-8 text-center text-gray-500 shadow-sm">
                                        <p>No classes currently assigned.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Professional Information */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 mb-5">Professional Information</h2>
                            
                            <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
                                {isSuperAdmin ? (
                                    <div className="p-8 text-center bg-gray-50/50">
                                        <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <FaUserTie className="w-7 h-7" />
                                        </div>
                                        <p className="text-gray-900 font-bold text-lg">System Administrator</p>
                                        <p className="text-sm text-gray-500 max-w-sm mx-auto mt-2">
                                            Super admin account with full access to school configurations, user management, and platform billing.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                                            <div className="w-32 text-sm font-bold text-gray-900 shrink-0">Employee ID</div>
                                            <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-600 font-medium">
                                                    {profileData.profile?.employeeId || 'Not provided'}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                                            <div className="w-32 text-sm font-bold text-gray-900 shrink-0">Department</div>
                                            <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-600 font-medium">
                                                    {profileData.profile?.department || 'Not provided'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                                            <div className="w-32 text-sm font-bold text-gray-900 shrink-0">Highest Qual.</div>
                                            <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-600 font-medium">
                                                    {profileData.profile?.qualification || 'Not provided'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                                            <div className="w-32 text-sm font-bold text-gray-900 shrink-0">Account Role</div>
                                            <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-600 font-medium uppercase tracking-wider">
                                                    {profileData.role?.replace('_', ' ')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};

export default Profile;
