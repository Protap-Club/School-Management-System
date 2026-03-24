import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../features/auth';
import { useStudents, useTodayAttendance, useProfile } from '../features/attendance';
import DashboardLayout from '../layouts/DashboardLayout';
import { connectSocket, disconnectSocket } from '../api/socket';
import api from '../lib/axios';
import {
  Users,
  UserCheck,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  LayoutGrid,
  Clock,
  MoreHorizontal,
  ChevronRight,
  Sparkle,
  Calendar,
  BookOpen,
  Megaphone,
  Bell
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { attendanceKeys } from '../features/attendance/api/queries';
import { CircularProgress, Sparkline, MiniBarChart } from '../components/dashboard/SvgCharts';
import { useMySchedule, DAY_MAP, DAYS_OF_WEEK } from '../features/timetable';
import { useNotices } from '../features/notices';

const Dashboard = () => {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const rolePrefix = useMemo(
    () => isSuperAdmin ? 'superadmin' : (isAdmin ? 'admin' : (user?.role || 'student')),
    [isSuperAdmin, isAdmin, user?.role]
  );

  // Persistence Key
  const CACHE_KEY = `dashboard_cache_${user?._id}`;

  // Queries
  const { data: studentsRes, isLoading: studentsLoading, isError: studentsError } = useStudents();
  const { data: attendanceRes, isLoading: attendanceLoading, isError: attendanceError } = useTodayAttendance();
  const { data: profileRes } = useProfile();
  const { data: scheduleRes } = useMySchedule(isTeacher);
  const { data: noticesRes } = useNotices(!isTeacher);

  const [selectedClass, setSelectedClass] = useState('all');
  const [attendanceData, setAttendanceData] = useState([]);
  const [calendarEventsCount, setCalendarEventsCount] = useState(0);

  // Persistence State
  const [persistedData, setPersistedData] = useState(() => {
    const key = user?._id ? `dashboard_cache_${user._id}` : null;
    if (!key) return null;
    try {
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });

  const parseTime = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let [_, hours, minutes, modifier] = match;
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);
    if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const todaySchedule = useMemo(() => {
    if (!isTeacher || !scheduleRes?.data) return [];
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayKey = DAY_MAP[todayName];
    const rawSessions = scheduleRes.data[todayKey] || [];

    // Deduplicate by slot to avoid showing multiple classes for the same period if data is messy
    const uniqueSlots = new Map();
    rawSessions.forEach(s => {
      const slotId = s.timeSlotId?._id || s.timeSlotId || s.timeSlot;
      if (!uniqueSlots.has(slotId)) {
        uniqueSlots.set(slotId, s);
      }
    });

    return Array.from(uniqueSlots.values()).sort((a, b) => {
      const timeA = a.timeSlotId?.startTime || '';
      const timeB = b.timeSlotId?.startTime || '';
      return timeA.localeCompare(timeB);
    });
  }, [isTeacher, scheduleRes?.data]);

  const activeSessionInfo = useMemo(() => {
    if (!todaySchedule.length) return { index: 0, status: 'Up Next' };
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const nowOnIndex = todaySchedule.findIndex(s => {
      const start = parseTime(s.timeSlotId?.startTime);
      const end = parseTime(s.timeSlotId?.endTime);
      return currentMinutes >= start && currentMinutes <= end;
    });

    if (nowOnIndex !== -1) return { index: nowOnIndex, status: 'Now On' };

    const upNextIndex = todaySchedule.findIndex(s => {
      const start = parseTime(s.timeSlotId?.startTime);
      return start > currentMinutes;
    });

    return { index: upNextIndex === -1 ? 0 : upNextIndex, status: 'Up Next' };
  }, [todaySchedule]);

  // Fetch current month calendar events for overview
  useEffect(() => {
    if (!user || !accessToken) return;

    const fetchCalendarStats = async () => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const response = await api.get('/calendar', {
          params: {
            start: startOfMonth.toISOString(),
            end: endOfMonth.toISOString()
          }
        });

        if (response.data.success) {
          setCalendarEventsCount(response.data.data.length);
        }
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
      }
    };

    fetchCalendarStats();
  }, [user, accessToken]);

  // Local state for socket updates
  useEffect(() => {
    if (!user?._id) return;

    if (attendanceRes?.data || studentsRes?.data || profileRes?.data) {
      const newCache = {
        students: studentsRes?.data || persistedData?.students,
        attendance: attendanceRes?.data || persistedData?.attendance,
        profile: profileRes?.data || persistedData?.profile,
        timestamp: Date.now()
      };

      if (attendanceRes?.data) setAttendanceData(attendanceRes.data);

      localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
      setPersistedData(newCache);
    }
  }, [attendanceRes?.data, studentsRes?.data, profileRes?.data, CACHE_KEY, user?._id]);

  const allStudents = useMemo(() => {
    const raw = studentsRes?.data || persistedData?.students;
    return raw?.users || raw || [];
  }, [studentsRes, persistedData]);

  const currentProfile = useMemo(() => {
    const raw = profileRes?.data || persistedData?.profile;
    return raw?.data || raw;
  }, [profileRes, persistedData]);

  const teacherProfile = useMemo(() => {
    if (!isTeacher || !currentProfile) return null;
    const profile = currentProfile;
    if (profile.assignedClasses?.length > 0) {
      return { standard: profile.assignedClasses[0].standard, section: profile.assignedClasses[0].section };
    } else if (profile.profile?.standard) {
      return { standard: profile.profile.standard, section: profile.profile.section };
    }
    return null;
  }, [isTeacher, currentProfile]);

  const loading = (studentsLoading || attendanceLoading) && !persistedData;

  const stats = useMemo(() => {
    let students = allStudents;
    const rawAtt = attendanceRes?.data || attendanceData || persistedData?.attendance || [];
    const currentAttendance = Array.isArray(rawAtt) ? rawAtt : (rawAtt?.data || []);
    const attendanceMap = new Map(currentAttendance.map(a => [a.studentId, a.status]));

    const calculateForGroup = (group) => {
      let present = 0, late = 0;
      group.forEach(s => {
        const serverStatus = attendanceMap.get(s._id);
        if (serverStatus) {
          if (serverStatus === 'Present') present++;
          else if (serverStatus === 'Late') late++;
        }
      });
      const total = group.length;
      // Fixed precision logic: handle 0 present correctly
      const rateNumber = total > 0 ? (present / total) * 100 : 0;
      const rate = rateNumber > 0 ? rateNumber.toFixed(1) : "0";
      return { total, present, late, absent: Math.max(0, total - present - late), rate };
    };

    const overall = calculateForGroup(allStudents);

    // Classroom Matrix Data
    const classGroups = {};
    allStudents.forEach(s => {
      const cls = `${s.profile?.standard} ${s.profile?.section}`;
      if (!s.profile?.standard) return;
      if (!classGroups[cls]) classGroups[cls] = [];
      classGroups[cls].push(s);
    });

    const matrix = Object.entries(classGroups).map(([name, students]) => ({
      name,
      ...calculateForGroup(students)
    })).sort((a, b) => {
      const [stdA, secA] = a.name.split(' ');
      const [stdB, secB] = b.name.split(' ');
      return parseInt(stdA) !== parseInt(stdB) ? parseInt(stdA) - parseInt(stdB) : secA.localeCompare(secB);
    });

    // Mock trend based on current rate for visual flair
    const trend = [30, 45, overall.rate * 0.8, overall.rate * 0.9, overall.rate].map(v => Math.max(10, v));

    return { overall, matrix, trend };
  }, [allStudents, attendanceRes, attendanceData, persistedData]);

  const filteredStats = useMemo(() => {
    if (isTeacher && currentProfile?.assignedClasses?.length > 0) {
      // Aggregate stats for all assigned classes
      const assignedClassNames = currentProfile.assignedClasses.map(ac => `${ac.standard} ${ac.section}`);
      const matchingClasses = stats.matrix.filter(m => assignedClassNames.includes(m.name));

      if (matchingClasses.length > 0) {
        return matchingClasses.reduce((acc, curr) => ({
          total: acc.total + curr.total,
          present: acc.present + curr.present,
          late: acc.late + curr.late,
          absent: acc.absent + curr.absent,
          rate: (((acc.total + curr.total) > 0) ? (((acc.present + curr.present) / (acc.total + curr.total)) * 100).toFixed(1) : "0")
        }), { total: 0, present: 0, late: 0, absent: 0, rate: "0" });
      }
      return stats.overall;
    }
    if ((isAdmin || isSuperAdmin) && selectedClass !== 'all') {
      return stats.matrix.find(m => m.name === selectedClass) || stats.overall;
    }
    return stats.overall;
  }, [stats, selectedClass, isAdmin, isSuperAdmin, isTeacher, teacherProfile]);

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin && !isTeacher) return;
    const socket = connectSocket(user?.schoolId);
    socket.on('attendance-marked', (data) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.today() });
      setAttendanceData(prev => {
        const arr = Array.isArray(prev) ? prev : [];
        const index = arr.findIndex(a => a.studentId === data.studentId);
        if (index >= 0) {
          const next = [...arr];
          next[index] = { ...next[index], status: data.status, checkInTime: data.checkInTime };
          return next;
        }
        return [...arr, { studentId: data.studentId, status: data.status, checkInTime: data.checkInTime }];
      });
    });
    return () => disconnectSocket();
  }, [user?.schoolId, isAdmin, isSuperAdmin, isTeacher, queryClient]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Initializing System...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        className="max-w-[1600px] mx-auto space-y-8 p-4 md:p-6 lg:p-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Modern Header Section - Personalized Greeting */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
              Welcome, <span className="text-primary">{user?.name?.split(' ')[0] || 'User'}</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-600 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">Live Status: Active</span>
            </div>
            {(isAdmin || isSuperAdmin) && (
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-10 rounded-full bg-white border-gray-100 shadow-sm text-gray-700 hover:bg-gray-50 transition-all font-bold text-xs px-6 min-w-[160px]">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent position="popper" className="rounded-2xl border-gray-100 shadow-2xl">
                  <SelectItem value="all" className="font-bold text-xs uppercase tracking-wider">All Classes</SelectItem>
                  {stats.matrix.map(m => (
                    <SelectItem key={m.name} value={m.name} className="font-bold text-xs uppercase tracking-wider">Class {m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </motion.div>

        {/* Top Metric Cards - Updated Labels and logic */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: 'Total Students',
              value: filteredStats.total,
              icon: Users,
              color: 'indigo',
              trend: '+12.5%',
              trendText: 'Enrollment Growth',
              spark: [40, 45, 42, 50, 55, 52, 60]
            },
            {
              label: 'Present Today',
              value: filteredStats.present,
              icon: UserCheck,
              color: 'emerald',
              trend: 'Live',
              trendText: 'Checked-in students',
              spark: [80, 85, 82, 90, 88, 92, 95],
              nav: 'present'
            },
            {
              label: 'Absent Today',
              value: filteredStats.absent,
              icon: Users,
              color: 'red',
              trend: 'Requires Action',
              trendText: 'Not checked-in',
              spark: [10, 8, 12, 5, 7, 4, 2],
              nav: 'absent'
            },
            {
              label: 'Calendar Overview',
              value: `${calendarEventsCount} Events`,
              icon: Calendar,
              color: 'amber',
              trend: 'Upcoming',
              trendText: 'View Schedule',
              spark: [2, 1, 3, 2, 4, 3, 5],
              nav: 'calendar'
            }
          ].map((card, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className={`bg-white rounded-[2rem] p-6 border border-gray-50 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 group relative overflow-hidden cursor-pointer`}
              onClick={() => {
                if (card.nav === 'calendar' || card.label === 'Calendar Overview') {
                  navigate(`/${rolePrefix}/calendar`);
                } else {
                  const filter = card.nav ? `?show=${card.nav}` : '';
                  const path = (isAdmin || isSuperAdmin)
                    ? (selectedClass === 'all' ? `/${rolePrefix}/attendance${filter}` : `/${rolePrefix}/attendance/${encodeURIComponent(selectedClass)}${filter}`)
                    : `/${rolePrefix}/attendance${filter}`;
                  navigate(path);
                }
              }}
            >
              {/* Background watermark icons removed as per user request */}
              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-start">
                  {/* Metric Icons removed as per user request */}
                  <div className="text-right ml-auto">
                    <span className={`text-[10px] font-black uppercase tracking-tighter text-${card.color}-500 bg-${card.color}-50/50 px-2 py-1 rounded-md`}>
                      {card.trend}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{card.label}</h3>
                  <p className="text-3xl font-black text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className="pt-2 flex items-center justify-between gap-4">
                  <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{card.trendText}</span>
                  <div className="flex-1 h-[30px] flex items-center">
                    <Sparkline data={card.spark} color={`var(--color-${card.color}-600)`} width={80} height={30} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid - Timetable Overview replace Attendance Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timetable Overview (Large) - Only for Teachers */}
          {isTeacher && (
            <motion.div
              variants={itemVariants}
              className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-50 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] overflow-hidden relative group cursor-pointer"
              onClick={() => navigate(`/${rolePrefix}/timetable`)}
            >
              {/* Background decorative icon removed */}

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-8">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Today&apos;s <span className="text-primary underline decoration-primary/20 decoration-4 underline-offset-4">Timetable</span></h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                      Your ongoing and upcoming sessions
                    </p>
                  </div>
                  <div className="px-4 py-1.5 bg-gray-50 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-900 shadow-sm border border-gray-100 flex items-center gap-2">
                    <Clock size={12} className="text-primary" /> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  {todaySchedule.length > 0 ? (
                    todaySchedule.slice(0, 3).map((session, i) => {
                      const isActive = i === activeSessionInfo.index;
                      return (
                        <div key={i} className={`p-5 rounded-[1.5rem] border transition-all flex items-center justify-between ${isActive ? 'bg-primary/5 border-primary/20 shadow-sm' : 'border-gray-50 bg-white hover:border-gray-200'}`}>
                          <div className="flex items-center gap-5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${isActive ? 'bg-primary text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>
                              {`${session.timetableId?.standard || ''}${session.timetableId?.section || ''}`}
                            </div>
                            <div className="space-y-1">
                              <p className={`text-base font-black tracking-tight ${isActive ? 'text-primary' : 'text-gray-900'}`}>{session.subject || 'Subject'}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Room {session.roomNumber || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-black ${isActive ? 'text-primary' : 'text-gray-400'}`}>{session.timeSlotId?.startTime} - {session.timeSlotId?.endTime}</p>
                            {isActive && <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 animate-pulse">{activeSessionInfo.status}</span>}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-10 bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest text-center">No classes scheduled for today</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    {todaySchedule.length > 0 ? 'Your schedule for today' : 'No sessions today'}
                  </p>
                  <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:gap-3 transition-all">
                    Open Full Timetable <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* School Bulletin - Added for Admins to fill space nicely */}
          {!isTeacher && (
            <motion.div
              variants={itemVariants}
              className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-50 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] overflow-hidden relative group"
            >
              {/* Background decorative icon removed */}

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-8">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">School <span className="text-primary tracking-tight">Bulletin</span></h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Latest announcements & updates</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                    <Bell size={20} />
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  {noticesRes?.data?.notices?.length > 0 ? (
                    noticesRes.data.notices.slice(0, 3).map((notice, i) => (
                      <div key={i} className="p-5 rounded-[1.5rem] border border-gray-50 bg-white hover:border-primary/20 hover:shadow-sm transition-all flex items-start gap-4 group/notice cursor-pointer" onClick={() => navigate(`/${user?.role}/notice`)}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-400 group-hover/notice:bg-primary group-hover/notice:text-white transition-colors`}>
                          <Megaphone size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-black text-gray-900 truncate tracking-tight group-hover/notice:text-primary transition-colors">{notice.title}</p>
                            <span className="text-[8px] bg-gray-50 text-gray-400 font-bold px-2 py-0.5 rounded-full uppercase">{new Date(notice.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 line-clamp-1 mt-1 font-medium">{notice.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-10 bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest text-center">No recent bulletins</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Showing latest developments</p>
                  <button onClick={() => navigate(`/${user?.role}/notice`)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:gap-3 transition-all">
                    View All Notices <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Attendance Circle (Small) - Fixed 0% logic and routing */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-[2.5rem] p-8 border border-gray-50 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] flex flex-col justify-between group cursor-pointer"
            onClick={() => {
              const path = (isAdmin || isSuperAdmin)
                ? (selectedClass === 'all' ? `/${rolePrefix}/attendance` : `/${rolePrefix}/attendance/${encodeURIComponent(selectedClass)}`)
                : `/${rolePrefix}/attendance`;
              navigate(path);
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">Rate Overview</h2>
              <button
                className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400"
                onClick={(e) => { e.stopPropagation(); }}
              >
                <MoreHorizontal size={20} />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
              <CircularProgress
                value={parseFloat(filteredStats.rate) === 0 ? 0 : filteredStats.rate}
                size={180}
                strokeWidth={14}
                color="var(--color-primary)"
                label={parseFloat(filteredStats.rate) === 0 ? "0% AS OF NOW" : (selectedClass === 'all' ? 'Overall' : `Class ${selectedClass}`)}
              />

              <div className="w-full space-y-3">
                {[
                  { label: 'Present', value: filteredStats.present, percentage: filteredStats.total > 0 ? ((filteredStats.present / filteredStats.total) * 100).toFixed(0) : 0, color: 'emerald' },
                  { label: 'Absent', value: filteredStats.absent, percentage: filteredStats.total > 0 ? ((filteredStats.absent / filteredStats.total) * 100).toFixed(0) : 0, color: 'red' },
                  { label: 'Late', value: filteredStats.late, percentage: filteredStats.total > 0 ? ((filteredStats.late / filteredStats.total) * 100).toFixed(0) : 0, color: 'amber' },
                ].map((row, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                      <span className="text-gray-500">{row.label}</span>
                      <span className="text-gray-900">{row.value} ({row.percentage}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-${row.color}-500`}
                        initial={{ width: 0 }}
                        animate={{ width: `${row.percentage}%` }}
                        transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <Clock size={12} /> Last Sync: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST
              </p>
            </div>
          </motion.div>
        </div>

        {/* Classroom Status Matrix - Expanded to full width */}
        <div className="grid grid-cols-1 pb-10">
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="flex justify-between items-end px-2">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Classroom <span className="text-primary">Attendance Matrix</span></h2>
                <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Live Attendance Heatmap</p>
              </div>
              <div className="flex gap-2">
                {['Floor 1', 'Floor 2', 'Lab Wing'].map(f => (
                  <button key={f} className="px-3 py-1.5 rounded-lg border border-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 hover:border-primary/20 transition-all">{f}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {stats.matrix.map((cls, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -5 }}
                  className="bg-white p-4 rounded-3xl border border-gray-50 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => navigate(`/${rolePrefix}/attendance/${encodeURIComponent(cls.name)}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">R{101 + idx}</p>
                      <p className="text-sm font-black text-gray-900 truncate tracking-tight">{cls.name?.replace(/\s+/g, '').replace(/-/g, '')}</p>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full ${parseFloat(cls.rate) > 90 ? 'bg-emerald-500' : 'bg-amber-500'} shadow-[0_0_8px_rgba(34,197,94,0.4)]`} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-gray-900">{cls.rate}%</p>
                    <div className="h-1 w-full bg-gray-50 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${parseFloat(cls.rate) > 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${cls.rate}%` }}
                        transition={{ duration: 1, delay: idx * 0.05 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

    </DashboardLayout>
  );
};

export default Dashboard;

