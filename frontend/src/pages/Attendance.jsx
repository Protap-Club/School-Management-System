import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import { useFeatures } from '../state';
import api from '../api/axios';
import { connectSocket, disconnectSocket } from '../api/socket';
import {
  FaUserGraduate, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaClock,
  FaUsers, FaSearch, FaWifi, FaChevronDown, FaUserTie, FaClipboardList
} from 'react-icons/fa';
import StudentHistoryModal from '../components/attendance/StudentHistoryModal';
const STATUS_STYLES = {
  present: 'bg-green-50 text-green-700 border-green-100',
  late: 'bg-orange-50 text-orange-700 border-orange-100',
  absent: 'bg-red-50 text-red-700 border-red-100',
  unmarked: 'bg-red-50 text-red-700 border-red-100',
};

const STATUS_LABELS = { present: 'Present', late: 'Late', absent: 'Absent', unmarked: 'Absent' };

const STAT_CARDS = [
  { icon: FaUsers, label: 'Total Students', key: 'total', color: 'text-blue-600' },
  { icon: FaCheckCircle, label: 'Present Today', key: 'present', color: 'text-green-600' },
  { icon: FaTimesCircle, label: 'Absent Today', key: 'absent', color: 'text-red-600' },
];

const Attendance = () => {
  const { user: currentUser } = useAuth();
  const { hasFeature, loading: featuresLoading } = useFeatures();
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [groupedClasses, setGroupedClasses] = useState({});
  const [expandedClasses, setExpandedClasses] = useState({});
  const [teacherAttendance, setTeacherAttendance] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });

  const getStudentStatus = (studentId) => attendanceMap[studentId]?.status || 'unmarked';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const isAdmin = currentUser?.role === 'admin';
        const studentRes = await api.get('/users?role=student&pageSize=500');

        let teacherData = [];
        if (isAdmin) {
          try {
            const teacherRes = await api.get('/users?role=teacher&pageSize=100');
            if (teacherRes.data.success) { teacherData = teacherRes.data.data.users || []; setTeachers(teacherData); }
          } catch (err) { console.error('Failed to fetch teachers', err); }
        }
        let attendanceData = [];
        try {
          const attRes = await api.get('/attendance/today');
          if (attRes.data.success) attendanceData = attRes.data.data;
        } catch (err) { console.error('Failed to fetch today attendance', err); }

        if (studentRes.data.success) {
          const studentData = studentRes.data.data.users || [];
          setStudents(studentData);
          const initialMap = {};
          let presentCount = 0;
          attendanceData.forEach(record => {
            initialMap[record.studentId] = { status: record.status.toLowerCase(), checkInTime: record.checkInTime };
            if (record.status === 'Present') presentCount++;
          });
          setAttendanceMap(initialMap);
          setStats({ total: studentData.length, present: presentCount, absent: Math.max(0, studentData.length - presentCount) });

          if (isAdmin) {
            const groups = {};
            studentData.forEach(student => {
              const std = student.profile?.standard || 'Unassigned';
              const sec = student.profile?.section || '';
              const groupKey = `${std} ${sec}`.trim();
              if (!groups[groupKey]) {
                const classTeacher = teacherData.find(t => String(t.profile?.standard) === String(std) && String(t.profile?.section) === String(sec));
                groups[groupKey] = { id: groupKey, standard: std, section: sec, teacher: classTeacher || null, students: [] };
              }
              groups[groupKey].students.push(student);
            });
            setGroupedClasses(Object.keys(groups).sort().reduce((acc, key) => { acc[key] = groups[key]; return acc; }, {}));
          }
        }
      } catch (error) { console.error('Failed to fetch data', error); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [currentUser]);

  useEffect(() => {
    const socket = connectSocket(currentUser?.schoolId);
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('attendance-marked', (data) => {
      setAttendanceMap(prev => ({ ...prev, [data.studentId]: { status: data.status.toLowerCase(), checkInTime: data.checkInTime } }));
      setStats(prev => ({ ...prev, present: prev.present + 1, absent: Math.max(0, prev.absent - 1) }));
    });
    return () => disconnectSocket();
  }, [currentUser?.schoolId]);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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

  const renderStudentRow = (student, showRollNo = false) => {
    const status = getStudentStatus(student._id);
    const isPresent = status === 'present';
    return (
      <tr key={student._id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedStudent(student)}>
        <td className="px-6 py-3">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isPresent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {student.name.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{student.name}</p>
              {!showRollNo && <span className="text-xs text-gray-500 hidden">{student.email}</span>}
              {showRollNo && <p className="text-xs text-gray-500">{student.email}</p>}
            </div>
          </div>
        </td>
        {showRollNo && <td className="px-6 py-3 text-sm text-gray-500">{student.profile?.rollNumber || '-'}</td>}
        {!showRollNo && <td className="px-6 py-4 text-sm text-gray-500">{student.email}</td>}
        <td className={showRollNo ? "px-6 py-3" : "px-6 py-4"}>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded${showRollNo ? '-full' : ''} text-xs font-medium ${showRollNo ? `border ${STATUS_STYLES[status]}` : (isPresent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}`}>
            {STATUS_LABELS[status]}
          </span>
        </td>
      </tr>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Attendance</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2"><FaCalendarAlt className="text-primary" />{today}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${socketConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <FaWifi size={12} />
            {socketConnected ? 'Live Updates Active' : 'Connecting...'}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ icon: Icon, label, key, color }) => (
            <div key={key} className="bg-white shadow-sm rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">{label}</p>
                  <p className={`text-3xl font-bold ${color} mt-1`}>{stats[key]}</p>
                </div>
                <div className={`w-12 h-12 ${color.replace('text-', 'bg-').replace('-600', '-100')} rounded-xl flex items-center justify-center`}>
                  <Icon className={color} size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-100">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading data...</p>
          </div>
        ) : (
          <>
            {currentUser?.role === 'admin' ? (
              <div className="space-y-4">
                {Object.values(groupedClasses).map(group => {
                  const isExpanded = expandedClasses[group.id];
                  return (
                    <div key={group.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md">
                      <div onClick={() => setExpandedClasses(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                        className="p-5 flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${isExpanded ? 'bg-primary text-white' : 'bg-primary/10 text-primary'} transition-colors`}>
                            {group.standard}<span className="text-sm ml-0.5">{group.section}</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-lg">Class {group.id}</h3>
                            <p className="text-sm text-gray-500">{group.students.length} Students</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><FaUserTie size={14} /></div>
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">{group.teacher?.name || 'No Teacher'}</p>
                              <p className="text-xs text-gray-500">Class Teacher</p>
                            </div>
                          </div>
                          {group.teacher && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 border border-red-100">
                              <FaTimesCircle /> Absent
                            </div>
                          )}
                          <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><FaChevronDown /></div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-gray-100 animate-fadeIn">
                          <div className="p-4 bg-gray-50/30 border-b border-gray-50">
                            <div className="relative max-w-md">
                              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                              <input type="text" placeholder={`Search student in Class ${group.id}...`}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                                onClick={(e) => e.stopPropagation()} />
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
                                {group.students.map(student => renderStudentRow(student, true))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {Object.keys(groupedClasses).length === 0 && (
                  <div className="text-center py-10 text-gray-500">No classes found.</div>
                )}
              </div>
            ) : (
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
                      {students.map(student => renderStudentRow(student, false))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
        <StudentHistoryModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
