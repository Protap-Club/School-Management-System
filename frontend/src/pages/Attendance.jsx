import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import { useFeatures } from '../state';
import api from '../api/axios';
import { connectSocket, disconnectSocket } from '../api/socket';
import {
  FaUserGraduate,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUsers,
  FaSearch,
  FaWifi,
  FaChevronDown,
  FaChevronUp,
  FaChalkboardTeacher,
  FaUserTie,
  FaRegCircle,
  FaClipboardList
} from 'react-icons/fa';


const Attendance = () => {
  const { user: currentUser } = useAuth();
  const { hasFeature, loading: featuresLoading } = useFeatures();
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceMap, setAttendanceMap] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);

  // Admin View State
  const [groupedClasses, setGroupedClasses] = useState({});
  const [expandedClasses, setExpandedClasses] = useState({});
  const [teacherAttendance, setTeacherAttendance] = useState({}); // Local state for teacher attendance

  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0
  });

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const isAdmin = currentUser?.role === 'admin';

        // 1. Fetch Students
        const studentEndpoint = '/user?role=student&pageSize=500';
        const studentRes = await api.get(studentEndpoint);

        // 2. Fetch Teachers (Only for Admin)
        let teacherData = [];
        if (isAdmin) {
          try {
            const teacherRes = await api.get('/user?role=teacher&pageSize=100');
            if (teacherRes.data.success) {
              teacherData = teacherRes.data.data.users || [];
              setTeachers(teacherData);
            }
          } catch (err) {
            console.error('Failed to fetch teachers', err);
          }
        }

        // 3. Fetch Today's Attendance
        let attendanceData = [];
        try {
          const attRes = await api.get('/attendance/today');
          if (attRes.data.success) {
            attendanceData = attRes.data.data;
          }
        } catch (err) {
          console.error('Failed to fetch today attendance', err);
        }

        if (studentRes.data.success) {
          const studentData = studentRes.data.data.users || [];
          setStudents(studentData);

          // Build Attendance Map from backend data
          const initialMap = {};
          let presentCount = 0;

          attendanceData.forEach(record => {
            initialMap[record.studentId] = {
              status: record.status.toLowerCase(),
              checkInTime: record.checkInTime
            };
            if (record.status === 'Present') presentCount++;
          });
          setAttendanceMap(initialMap);

          // Update Stats
          const total = studentData.length;
          setStats({
            total,
            present: presentCount,
            absent: Math.max(0, total - presentCount)
          });

          // Group Data for Admin
          if (isAdmin) {
            const groups = {};

            // Initialize groups based on students
            studentData.forEach(student => {
              const std = student.profile?.standard || 'Unassigned';
              const sec = student.profile?.section || '';
              const groupKey = `${std} ${sec}`.trim();

              if (!groups[groupKey]) {
                // Find teacher for this class
                const classTeacher = teacherData.find(t =>
                  String(t.profile?.standard) === String(std) &&
                  String(t.profile?.section) === String(sec)
                );

                groups[groupKey] = {
                  id: groupKey,
                  standard: std,
                  section: sec,
                  teacher: classTeacher || null,
                  students: []
                };
              }
              groups[groupKey].students.push(student);
            });

            // Sort keys to order classes nicely (e.g. 9 A, 9 B, 10 A...)
            const sortedGroups = Object.keys(groups).sort().reduce((acc, key) => {
              acc[key] = groups[key];
              return acc;
            }, {});

            setGroupedClasses(sortedGroups);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Socket.io connection
  useEffect(() => {
    const socket = connectSocket(currentUser?.schoolId);

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('attendance-marked', (data) => {
      setAttendanceMap(prev => ({
        ...prev,
        [data.studentId]: {
          status: data.status.toLowerCase(),
          checkInTime: data.checkInTime
        }
      }));

      setStats(prev => ({
        ...prev,
        present: prev.present + 1,
        absent: Math.max(0, prev.absent - 1)
      }));
    });

    return () => {
      disconnectSocket();
    };
  }, [currentUser?.schoolId]);

  const toggleClassExpand = (classId) => {
    setExpandedClasses(prev => ({
      ...prev,
      [classId]: !prev[classId]
    }));
  };

  const toggleTeacherAttendance = (teacherId, e) => {
    e.stopPropagation();
    setTeacherAttendance(prev => ({
      ...prev,
      [teacherId]: !prev[teacherId]
    }));
  };

  // Get status for a student
  const getStudentStatus = (studentId) => {
    return attendanceMap[studentId]?.status || 'unmarked';
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Access control
  if (currentUser?.role === 'super_admin') {
    return (
      <DashboardLayout>
        <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-gray-100">
          <FaTimesCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="text-gray-500 mt-2">Super Admins do not have access to school-specific attendance pages.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!featuresLoading && !hasFeature('attendance')) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-gray-100">
          <FaClipboardList className="text-gray-300 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-800">Feature Disabled</h2>
          <p className="text-gray-500 mt-2">The Attendance feature is not enabled for your school.</p>
        </div>
      </DashboardLayout>
    );
  }

  const StatCard = ({ icon: Icon, label, value, color, bgColor }) => (
    <div className={`${bgColor} rounded-2xl p-5 border border-gray-100`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{label}</p>
          <p className={`text-3xl font-bold ${color} mt-1`}>{value}</p>
        </div>
        <div className={`w-12 h-12 ${color.replace('text-', 'bg-').replace('-600', '-100')} rounded-xl flex items-center justify-center`}>
          <Icon className={color} size={24} />
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Attendance</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <FaCalendarAlt className="text-primary" />
              {today}
            </p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${socketConnected
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
            }`}>
            <FaWifi size={12} />
            {socketConnected ? 'Live Updates Active' : 'Connecting...'}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FaUsers}
            label="Total Students"
            value={stats.total}
            color="text-blue-600"
            bgColor="bg-white shadow-sm"
          />
          <StatCard
            icon={FaCheckCircle}
            label="Present Today"
            value={stats.present}
            color="text-green-600"
            bgColor="bg-white shadow-sm"
          />
          <StatCard
            icon={FaTimesCircle}
            label="Absent Today"
            value={stats.absent}
            color="text-red-600"
            bgColor="bg-white shadow-sm"
          />
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-100">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading data...</p>
          </div>
        ) : (
          <>
            {currentUser?.role === 'admin' ? (
              /* ADMIN VIEW: Grouped By Class */
              <div className="space-y-4">
                {Object.values(groupedClasses).map((group) => {
                  const isExpanded = expandedClasses[group.id];
                  const teacherIsPresent = group.teacher && teacherAttendance[group.teacher._id];

                  return (
                    <div key={group.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md">
                      {/* Accordion Header */}
                      <div
                        onClick={() => toggleClassExpand(group.id)}
                        className="p-5 flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                      >
                        {/* Left: Class Info */}
                        <div className="flex items-center gap-4 w-full md:w-auto">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${isExpanded ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                            } transition-colors`}>
                            {group.standard}
                            <span className="text-sm ml-0.5">{group.section}</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-lg">Class {group.id}</h3>
                            <p className="text-sm text-gray-500">{group.students.length} Students</p>
                          </div>
                        </div>

                        {/* Right: Teacher Info & Actions */}
                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                          {/* Teacher Card */}
                          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                              <FaUserTie size={14} />
                            </div>
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">{group.teacher?.name || 'No Teacher'}</p>
                              <p className="text-xs text-gray-500">Class Teacher</p>
                            </div>
                          </div>

                          {/* Teacher Attendance Status (Static) */}
                          {group.teacher && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 border border-red-100">
                              <FaTimesCircle />
                              Absent
                            </div>
                          )}

                          {/* Expand Icon */}
                          <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                            <FaChevronDown />
                          </div>
                        </div>
                      </div>

                      {/* Accordion Body: Student List */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 animate-fadeIn">
                          {/* Search within class */}
                          <div className="p-4 bg-gray-50/30 border-b border-gray-50">
                            <div className="relative max-w-md">
                              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                              <input
                                type="text"
                                placeholder={`Search student in Class ${group.id}...`}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                                  <th className="px-6 py-3">Student</th>
                                  <th className="px-6 py-3">Roll No</th>
                                  <th className="px-6 py-3">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {group.students.map(student => {
                                  const status = getStudentStatus(student._id);
                                  const isPresent = status === 'present';
                                  const isLate = status === 'late';
                                  const isAbsent = status === 'absent';
                                  const isUnmarked = status === 'unmarked';

                                  return (
                                    <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isPresent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {student.name.charAt(0)}
                                          </div>
                                          <div>
                                            <p className="font-medium text-gray-900 text-sm">{student.name}</p>
                                            <p className="text-xs text-gray-500">{student.email}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-3 text-sm text-gray-500">
                                        {student.profile?.rollNumber || '-'}
                                      </td>
                                      <td className="px-6 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${isPresent ? 'bg-green-50 text-green-700 border-green-100' :
                                          isLate ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                            'bg-red-50 text-red-700 border-red-100'
                                          }`}>
                                          {isPresent ? 'Present' : isLate ? 'Late' : 'Absent'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {Object.keys(groupedClasses).length === 0 && (
                  <div className="text-center py-10 text-gray-500">
                    No classes found.
                  </div>
                )}
              </div>
            ) : (
              /* TEACHER VIEW (Legacy Table) */
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center gap-4">
                  <FaUserGraduate className="text-primary" />
                  <h2 className="text-lg font-bold text-gray-800">My Students</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {students.map((student) => {
                        const status = getStudentStatus(student._id);
                        const isPresent = status === 'present';
                        return (
                          <tr key={student._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                  {student.name.charAt(0)}
                                </div>
                                <span className="font-medium text-gray-900 text-sm">{student.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{student.email}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs ${isPresent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {isPresent ? 'Present' : 'Absent'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
