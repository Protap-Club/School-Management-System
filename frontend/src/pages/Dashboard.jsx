import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../features/auth';
import api from '../api/axios';
import DashboardLayout from '../layouts/DashboardLayout';
import { connectSocket, disconnectSocket } from '../api/socket';
import { FaChartBar } from 'react-icons/fa';

const Dashboard = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [stats, setStats] = useState({ total: 0, present: 0 });

  const attendanceRate = useMemo(() => (
    stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0
  ), [stats.total, stats.present]);

  useEffect(() => {
    if (!isTeacher && !isAdmin) return;
    const fetchData = async () => {
      try {
        const endpoint = isAdmin ? '/users?role=student' : '/users?role=student&pageSize=100';
        const [mainRes, allRes] = await Promise.all([
          api.get(endpoint),
          isTeacher ? api.get('/users?role=student') : Promise.resolve(null),
        ]);
        if (mainRes.data.success) {
          const users = mainRes.data.data?.users || mainRes.data.data || [];
          setStats(prev => ({ ...prev, total: users.length, present: 0 }));
        }
        if (isTeacher && allRes?.data?.success) {
          const myStudents = mainRes.data.data?.users || mainRes.data.data || [];
          const allProfiles = allRes.data.data?.users || allRes.data.data || [];
          if (myStudents.length > 0) {
            const firstProfile = allProfiles.find(s => s._id === myStudents[0]._id);
            if (firstProfile?.profile) {
              setTeacherProfile({ standard: firstProfile.profile.standard, section: firstProfile.profile.section });
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!isAdmin && !isTeacher) return;
    const socket = connectSocket(user?.schoolId);
    socket.on('attendance-marked', () => {
      setStats(prev => ({ ...prev, present: prev.present + 1 }));
    });
    return () => disconnectSocket();
  }, [user?.schoolId, user?.role]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="relative bg-white rounded-3xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-50 to-transparent blur-2xl"></div>
          <div className="relative z-10 space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
              Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 font-extrabold pb-1 inline-block">{user?.name}</span>
            </h1>
            <div className="pt-6 flex flex-wrap gap-4 items-center">
              {user?.schoolId?.name && (
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-gray-700 shadow-sm">
                  <span className="font-semibold text-sm tracking-wide uppercase text-gray-400 mr-2">School</span>
                  <span className="font-medium text-gray-900">{user.schoolId.name}</span>
                </div>
              )}
              {isTeacher && teacherProfile && (
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-800 shadow-sm">
                  <span className="font-semibold text-sm tracking-wide uppercase text-blue-400 mr-2">Class Teacher</span>
                  <span className="font-medium text-blue-900">{teacherProfile.standard} • {teacherProfile.section}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {(isAdmin || isTeacher) && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-lg shadow-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-medium opacity-90">Today's Attendance Rate</h3>
                <p className="text-5xl font-bold mt-3 tracking-tight">{attendanceRate}%</p>
                <p className="text-base opacity-90 mt-2 font-medium">{stats.present} out of {stats.total} students present</p>
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
