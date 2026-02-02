import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth';
import api from '../api/axios';
import DashboardLayout from '../layouts/DashboardLayout';
import { connectSocket, disconnectSocket } from '../api/socket';
import { FaChartBar } from 'react-icons/fa';

const Dashboard = () => {
  const { user } = useAuth();
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    present: 0
  });

  // Fetch Teacher Details
  useEffect(() => {
    const fetchTeacherDetails = async () => {
      if (user?.role === 'teacher') {
        try {
          const [filteredResponse, allProfilesResponse] = await Promise.all([
            api.get('/user?role=student&pageSize=1'),
            api.get('/user/with-profiles?role=student')
          ]);

          if (filteredResponse.data.success && allProfilesResponse.data.success) {
            const myStudents = filteredResponse.data.data;
            const allProfiles = allProfilesResponse.data.data;

            if (myStudents.length > 0) {
              const firstStudentId = myStudents[0]._id;
              const firstStudentProfile = allProfiles.find(s => s._id === firstStudentId);

              if (firstStudentProfile?.profile) {
                setTeacherProfile({
                  standard: firstStudentProfile.profile.standard,
                  section: firstStudentProfile.profile.section
                });
              }
            }
          }
        } catch (error) {
          console.error("Failed to infer teacher details", error);
        }
      }
    };

    fetchTeacherDetails();
  }, [user]);

  // Fetch Student Stats for Attendance Rate
  useEffect(() => {
    const fetchStudents = async () => {
      if (user?.role === 'admin' || user?.role === 'teacher') {
        try {
          const endpoint = user?.role === 'admin'
            ? '/user/get-users-with-profiles?role=student'
            : '/user/get-users?role=student&pageSize=100';

          const response = await api.get(endpoint);
          if (response.data.success) {
            setStats(prev => ({
              ...prev,
              total: response.data.data.length,
              present: 0 // Reset present count on load as per existing logic
            }));
          }
        } catch (error) {
          console.error('Failed to fetch students for stats', error);
        }
      }
    };

    fetchStudents();
  }, [user]);

  // Socket Connection for Real-time Attendance
  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'teacher') return;

    const socket = connectSocket(user?.schoolId);

    // Listen for real-time attendance updates
    socket.on('attendance-marked', (data) => {
      setStats(prev => ({
        ...prev,
        present: prev.present + 1
      }));
    });

    return () => {
      disconnectSocket();
    };
  }, [user?.schoolId, user?.role]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="relative bg-white rounded-3xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500">
          {/* Elegant Background Decor */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-50 to-transparent blur-2xl"></div>

          <div className="relative z-10 space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
                Welcome, <br className="md:hidden" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 font-extrabold pb-1 inline-block">
                  {user?.name}
                </span>
              </h1>

            </div>

            <div className="pt-6 flex flex-wrap gap-4 items-center">
              {/* School Name Badge */}
              {user?.schoolId?.name && (
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-gray-700 shadow-sm">
                  <span className="font-semibold text-sm tracking-wide uppercase text-gray-400 mr-2">School</span>
                  <span className="font-medium text-gray-900">{user.schoolId.name}</span>
                </div>
              )}

              {/* Class Teacher Badge */}
              {user?.role === 'teacher' && teacherProfile && (
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-800 shadow-sm">
                  <span className="font-semibold text-sm tracking-wide uppercase text-blue-400 mr-2">Class Teacher</span>
                  <span className="font-medium text-blue-900">{teacherProfile.standard} • {teacherProfile.section}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Rate Section */}
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-lg shadow-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-medium opacity-90">Today's Attendance Rate</h3>
                <p className="text-5xl font-bold mt-3 tracking-tight">
                  {stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-base opacity-90 mt-2 font-medium">
                  {stats.present} out of {stats.total} students present
                </p>
              </div>
              <div className="hidden md:block bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                <FaChartBar size={50} className="text-white/90" />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
