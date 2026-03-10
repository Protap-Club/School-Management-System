import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth';
import api from '../api/axios';
import DashboardLayout from '../layouts/DashboardLayout';
import { connectSocket, disconnectSocket } from '../api/socket';
import { FaChartBar, FaUserCheck, FaUserTimes, FaUserClock, FaUsers as FaUsersIcon, FaChalkboardTeacher } from 'react-icons/fa';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('all');
  const [allStudents, setAllStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);

  const manualOverrides = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('attendance_overrides')) || {};
    } catch {
      return {};
    }
  }, []);

  const filteredStats = useMemo(() => {
    let students = allStudents;
    if (isTeacher && teacherProfile) {
      students = allStudents.filter(s =>
        String(s.profile?.standard) === String(teacherProfile.standard) &&
        String(s.profile?.section) === String(teacherProfile.section)
      );
    } else if (isAdmin && selectedClass !== 'all') {
      const [std, sec] = selectedClass.split(' ');
      students = allStudents.filter(s =>
        String(s.profile?.standard) === String(std) &&
        String(s.profile?.section) === String(sec)
      );
    }

    if (students.length === 0) return { total: 0, present: 0, late: 0, absent: 0, rate: 0 };

    let present = 0, late = 0;
    students.forEach(s => {
      const override = manualOverrides[s._id];
      if (override !== undefined) {
        if (override) present++;
      } else {
        const record = attendanceData.find(a => a.studentId === s._id);
        if (record?.status === 'Present') present++;
        else if (record?.status === 'Late') late++;
      }
    });

    const total = students.length;
    const absent = Math.max(0, total - present - late);
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    return { total, present, late, absent, rate };
  }, [allStudents, attendanceData, manualOverrides, selectedClass, isTeacher, teacherProfile, isAdmin]);

  const classes = useMemo(() => {
    const classSet = new Set();
    allStudents.forEach(s => {
      const std = s.profile?.standard;
      const sec = s.profile?.section;
      if (std && sec) classSet.add(`${std} ${sec}`);
    });
    return Array.from(classSet).sort((a, b) => {
      const [stdA, secA] = a.split(' ');
      const [stdB, secB] = b.split(' ');
      if (parseInt(stdA) !== parseInt(stdB)) {
        return parseInt(stdA) - parseInt(stdB);
      }
      return secA.localeCompare(secB);
    });
  }, [allStudents]);

  useEffect(() => {
    if (!isTeacher && !isAdmin) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, attRes] = await Promise.all([
          api.get('/users?role=student&pageSize=2000'),
          api.get('/attendance/today')
        ]);

        if (usersRes.data.success) {
          const students = usersRes.data.data?.users || usersRes.data.data || [];
          setAllStudents(students);
        }

        if (attRes.data.success) {
          setAttendanceData(attRes.data.data || []);
        }

        if (isTeacher) {
          // Current user is the teacher, check their profile for assigned classes
          // If profile is not directly available, we can try to find from users/me/profile
          try {
            const profileRes = await api.get('/users/me/profile');
            if (profileRes.data.success) {
              const profile = profileRes.data.data;
              if (profile.assignedClasses?.length > 0) {
                setTeacherProfile({
                  standard: profile.assignedClasses[0].standard,
                  section: profile.assignedClasses[0].section
                });
              } else if (profile.profile?.standard) {
                setTeacherProfile({
                  standard: profile.profile.standard,
                  section: profile.profile.section
                });
              }
            }
          } catch (err) {
            console.error('Failed to fetch teacher profile', err);
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, isTeacher, isAdmin]);

  useEffect(() => {
    if (!isAdmin && !isTeacher) return;
    const socket = connectSocket(user?.schoolId);
    socket.on('attendance-marked', (data) => {
      setAttendanceData(prev => [...prev, { studentId: data.studentId, status: data.status, checkInTime: data.checkInTime }]);
    });
    return () => disconnectSocket();
  }, [user?.schoolId, user?.role, isAdmin, isTeacher]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-0">
        <div className="relative bg-white rounded-3xl p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-50 to-transparent blur-2xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-6">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight text-center md:text-left">
                Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-500 to-blue-600 font-extrabold pb-1 inline-block">{user?.name}</span>
              </h1>

              <div className="flex flex-col gap-3 items-center md:items-start">
                {isTeacher && (
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50/50 border border-blue-100 text-blue-600 shadow-sm transition-all hover:bg-blue-50">
                    <span className="font-bold text-[10px] uppercase tracking-[0.15em] mr-2 opacity-70">Class Teacher</span>
                    <span className="font-semibold text-sm">{teacherProfile?.standard || '12'} • {teacherProfile?.section || 'A'}</span>
                  </div>
                )}
                {isAdmin && user?.schoolId?.name && (
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-gray-700 shadow-sm">
                    <span className="font-semibold text-[10px] uppercase tracking-wider text-gray-400 mr-2">School</span>
                    <span className="font-medium text-sm text-gray-900">{user.schoolId.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isTeacher && (
                <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center text-red-500 shadow-sm border border-red-100/50 group-hover:rotate-3 transition-transform duration-500">
                  <div className="transform hover:scale-110 transition-transform duration-300">
                    <FaChalkboardTeacher size={32} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {(isAdmin || isTeacher) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div
              className="lg:col-span-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-lg shadow-indigo-100 flex flex-col justify-center relative overflow-hidden group cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
              onClick={() => {
                const path = isAdmin ? '/admin/attendance' : '/teacher/attendance';
                const query = isAdmin && selectedClass !== 'all' ? `?class=${encodeURIComponent(selectedClass)}` : '';
                navigate(`${path}${query}`);
              }}
            >
              <div className="absolute top-0 right-0 p-8 transform group-hover:scale-110 transition-transform duration-500 opacity-20">
                <FaChartBar size={120} />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-medium opacity-90 uppercase tracking-widest text-sm">Today's Attendance Rate</h3>
                <p className="text-5xl md:text-7xl font-bold mt-4 tracking-tighter">{filteredStats.rate}%</p>
                <p className="text-lg opacity-90 mt-4 font-medium flex items-center gap-2">
                  <span className="px-3 py-1 bg-white/20 rounded-full">{filteredStats.present}</span>
                  <span>out of {filteredStats.total} students present</span>
                </p>
              </div>
              <div className="absolute bottom-4 right-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 text-sm font-bold">
                View Detailed Attendance →
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs">Quick Stats</h3>
                  {isAdmin && (
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger className="h-8 rounded-xl bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors px-3 py-1 font-bold text-[10px] uppercase tracking-wider w-fit min-w-[140px]">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent position="popper" side="bottom" className="rounded-xl border-gray-200 shadow-xl min-w-[180px]">
                        <SelectItem value="all" className="text-[10px] uppercase tracking-wider font-bold py-2">Overall School</SelectItem>
                        {classes.map(cls => (
                          <SelectItem key={cls} value={cls} className="text-[10px] uppercase tracking-wider font-bold py-2">
                            Class {cls}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/50 border border-blue-100/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <FaUsersIcon size={18} />
                      </div>
                      <span className="font-medium text-gray-700">Total Students</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">{filteredStats.total}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <FaUserCheck size={18} />
                      </div>
                      <span className="font-medium text-gray-700">Present</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">{filteredStats.present}</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 mt-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Showing For: <span className="text-primary ml-1">{isAdmin && selectedClass === 'all' ? 'Overall School' : `Class ${selectedClass}`}</span></p>
              </div>
            </div>
          </div>
        )}

        {isTeacher && (
          <div className="max-w-md">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm group hover:shadow-md transition-all duration-300">
              <div className="space-y-4">
                <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs">My Status Today</h3>
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center gap-4 group-hover:bg-indigo-50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <FaUserCheck size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Attendance</p>
                    <p className="text-lg font-bold text-gray-900">Present</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
