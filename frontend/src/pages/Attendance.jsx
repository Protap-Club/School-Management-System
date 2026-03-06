import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import { useFeatures } from '../state';
import api from '../api/axios';
import { connectSocket, disconnectSocket } from '../api/socket';
import {
  FaUserGraduate, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaClock,
  FaUsers, FaSearch, FaWifi, FaChevronDown, FaUserTie, FaClipboardList,
  FaChevronLeft, FaChevronRight, FaToggleOn, FaToggleOff
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
const ITEMS_PER_PAGE = 15;

const buildAttendanceMap = (attendanceData) => {
  const map = {};
  let presentCount = 0;
  attendanceData.forEach(record => {
    map[record.studentId] = { status: record.status.toLowerCase(), checkInTime: record.checkInTime };
    if (record.status === 'Present') presentCount++;
  });
  return { map, presentCount };
};

const buildClassGroups = (studentData, teacherData) => {
  const groups = {};
  studentData.forEach(student => {
    const std = student.profile?.standard || 'Unassigned';
    const sec = student.profile?.section || '';
    const key = `${std} ${sec}`.trim();
    if (!groups[key]) {
      const classTeacher = teacherData.find(t => t.profile?.assignedClasses?.some(ac => String(ac.standard) === String(std) && String(ac.section) === String(sec)));
      groups[key] = { id: key, standard: std, section: sec, teacher: classTeacher || null, students: [] };
    }
    groups[key].students.push(student);
  });
  return Object.keys(groups).sort((a, b) => {
    const [stdA, secA = ''] = a.split(' ');
    const [stdB, secB = ''] = b.split(' ');
    return Number(stdA) - Number(stdB) || secA.localeCompare(secB);
  }).reduce((acc, k) => { acc[k] = groups[k]; return acc; }, {});
};

const Attendance = () => {
  const { user: currentUser } = useAuth();
  const { hasFeature, loading: featuresLoading } = useFeatures();
  const isAdmin = currentUser?.role === 'admin';

  // Data state
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const [groupedClasses, setGroupedClasses] = useState({});

  // UI state
  const [socketConnected, setSocketConnected] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [teacherPage, setTeacherPage] = useState(0);
  const [classPages, setClassPages] = useState({});
  const [statsModal, setStatsModal] = useState(null); // null | 'present' | 'absent'
  const [statsModalPage, setStatsModalPage] = useState(0);
  const [statsModalSearch, setStatsModalSearch] = useState('');
  const [manualOverrides, setManualOverrides] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('attendance_overrides'));
      if (stored && stored.date === new Date().toISOString().slice(0, 10)) {
        return stored.overrides || {};
      }
      localStorage.removeItem('attendance_overrides');
      return {};
    } catch {
      return {};
    }
  });

  const getClassPage = (classId) => classPages[classId] || 0;
  const setClassPage = (classId, page) => setClassPages(prev => ({ ...prev, [classId]: page }));

  const PaginationControls = ({ currentPage, totalItems, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;
    const start = currentPage * ITEMS_PER_PAGE + 1;
    const end = Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalItems);
    return (
      <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50">
        <div className="text-xs text-gray-500">
          Showing <span className="font-medium text-gray-700">{start}</span> to <span className="font-medium text-gray-700">{end}</span> of <span className="font-medium text-gray-700">{totalItems}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(Math.max(0, currentPage - 1))} disabled={currentPage === 0}
            className="px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-md transition-colors font-medium">
            <FaChevronLeft size={10} />
          </button>
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            let pageNum;
            if (totalPages <= 5) pageNum = i;
            else if (currentPage < 3) pageNum = i;
            else if (currentPage > totalPages - 4) pageNum = totalPages - 5 + i;
            else pageNum = currentPage - 2 + i;
            if (pageNum >= totalPages) return null;
            return (
              <button key={pageNum} onClick={() => onPageChange(pageNum)}
                className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${currentPage === pageNum ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {pageNum + 1}
              </button>
            );
          })}
          <button onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage >= totalPages - 1}
            className="px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-md transition-colors font-medium">
            <FaChevronRight size={10} />
          </button>
        </div>
      </div>
    );
  };

  const today = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), []);
  const getStudentStatus = useCallback((studentId) => {
    if (manualOverrides[studentId] !== undefined) {
      return manualOverrides[studentId] ? 'present' : 'absent';
    }
    return attendanceMap[studentId]?.status || 'unmarked';
  }, [attendanceMap, manualOverrides]);

  const handleManualToggle = useCallback((studentId, e) => {
    e.stopPropagation();
    const originalStatus = attendanceMap[studentId]?.status || 'unmarked';
    const wasOriginallyPresent = originalStatus === 'present';

    // We handle state update at the bottom for persistence consistency


    // Update stats OUTSIDE the updater to avoid React StrictMode double-fire
    setStats(prev => {
      const currentOverride = manualOverrides[studentId];
      const wasPresent = currentOverride !== undefined ? currentOverride : wasOriginallyPresent;
      const willBePresent = !wasPresent;
      if (willBePresent === wasPresent) return prev;
      return {
        ...prev,
        present: prev.present + (willBePresent ? 1 : -1),
        absent: Math.max(0, prev.absent + (willBePresent ? -1 : 1)),
      };
    });

    // Persist to localStorage
    setManualOverrides(current => {
      const updated = { ...current };
      if (current[studentId] === undefined) {
        updated[studentId] = !wasOriginallyPresent;
      } else {
        updated[studentId] = !current[studentId];
      }
      localStorage.setItem('attendance_overrides', JSON.stringify({ date: new Date().toISOString().slice(0, 10), overrides: updated }));
      return updated;
    });
  }, [attendanceMap, manualOverrides]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const studentRes = await api.get('/users?role=student&pageSize=2000');
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
          const { map } = buildAttendanceMap(attendanceData);
          setAttendanceMap(map);

          // Calculate stats considering manual overrides
          let presentCount = 0;
          studentData.forEach(s => {
            const originalStatus = map[s._id]?.status || 'unmarked';
            const isPresent = manualOverrides[s._id] !== undefined
              ? manualOverrides[s._id]
              : (originalStatus === 'present');
            if (isPresent) presentCount++;
          });

          setStats({ total: studentData.length, present: presentCount, absent: Math.max(0, studentData.length - presentCount) });
          if (isAdmin) setGroupedClasses(buildClassGroups(studentData, teacherData));
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

  const renderStudentRow = (student, showRollNo = false, showToggle = false) => {
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
              {showRollNo && <p className="text-xs text-gray-500">{student.email}</p>}
            </div>
          </div>
        </td>
        {showRollNo ? (
          <td className="px-6 py-3 text-sm text-gray-500">{student.profile?.rollNumber || '-'}</td>
        ) : (
          <td className="px-6 py-4 text-sm text-gray-500">{student.email}</td>
        )}
        <td className={showRollNo ? "px-6 py-3" : "px-6 py-4"}>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded${showRollNo ? '-full' : ''} text-xs font-medium ${showRollNo ? `border ${STATUS_STYLES[status]}` : (isPresent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}`}>
            {STATUS_LABELS[status]}
          </span>
        </td>
        {showToggle && (
          <td className="px-6 py-4">
            <button
              onClick={(e) => handleManualToggle(student._id, e)}
              className="flex items-center transition-colors focus:outline-none"
              title={isPresent ? 'Mark Absent' : 'Mark Present'}
            >
              {isPresent ? (
                <FaToggleOn className="text-green-500" size={36} />
              ) : (
                <FaToggleOff className="text-gray-400" size={36} />
              )}
            </button>
          </td>
        )}
      </tr>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Attendance</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2"><FaCalendarAlt className="text-primary" />{today}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${socketConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <FaWifi size={12} />{socketConnected ? 'Live Updates Active' : 'Connecting...'}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ icon: Icon, label, key, color }) => {
            const isClickable = key === 'present' || key === 'absent';
            return (
              <div key={key}
                className={`bg-white shadow-sm rounded-2xl p-5 border border-gray-100 transition-all duration-200 ${isClickable ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''}`}
                onClick={() => { if (isClickable) { setStatsModal(key); setStatsModalPage(0); setStatsModalSearch(''); } }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">{label}</p>
                    <p className={`text-3xl font-bold ${color} mt-1`}>{stats[key]}</p>
                  </div>
                  <div className={`w-12 h-12 ${color.replace('text-', 'bg-').replace('-600', '-100')} rounded-xl flex items-center justify-center`}>
                    <Icon className={color} size={24} />
                  </div>
                </div>
                {isClickable && <p className="text-xs text-gray-400 mt-2">Click to view list →</p>}
              </div>
            );
          })}
        </div>
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-100">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading data...</p>
          </div>
        ) : isAdmin ? (
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
                              <th className="px-6 py-3">Student</th><th className="px-6 py-3">Roll No</th><th className="px-6 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {group.students.slice(getClassPage(group.id) * ITEMS_PER_PAGE, (getClassPage(group.id) + 1) * ITEMS_PER_PAGE).map(student => renderStudentRow(student, true))}
                          </tbody>
                        </table>
                      </div>
                      <PaginationControls currentPage={getClassPage(group.id)} totalItems={group.students.length} onPageChange={(p) => setClassPage(group.id, p)} />
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
              <FaUserGraduate className="text-primary" /><h2 className="text-lg font-bold text-gray-800">My Students</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mark Manually</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.slice(teacherPage * ITEMS_PER_PAGE, (teacherPage + 1) * ITEMS_PER_PAGE).map(student => renderStudentRow(student, false, true))}
                </tbody>
              </table>
            </div>
            <PaginationControls currentPage={teacherPage} totalItems={students.length} onPageChange={setTeacherPage} />
          </div>
        )}
        <StudentHistoryModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />

        {/* Stats Modal - Present/Absent Student List */}
        {statsModal && (() => {
          const isPresent = statsModal === 'present';
          const filtered = students.filter(s => {
            const status = getStudentStatus(s._id);
            return isPresent ? status === 'present' : (status === 'absent' || status === 'unmarked');
          }).filter(s => !statsModalSearch || s.name.toLowerCase().includes(statsModalSearch.toLowerCase()) || s.email?.toLowerCase().includes(statsModalSearch.toLowerCase()));
          const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
          const paged = filtered.slice(statsModalPage * ITEMS_PER_PAGE, (statsModalPage + 1) * ITEMS_PER_PAGE);
          return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setStatsModal(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={`p-5 border-b border-gray-100 flex items-center justify-between ${isPresent ? 'bg-green-50' : 'bg-red-50'} rounded-t-2xl`}>
                  <div className="flex items-center gap-3">
                    {isPresent ? <FaCheckCircle className="text-green-600" size={22} /> : <FaTimesCircle className="text-red-600" size={22} />}
                    <div>
                      <h2 className={`text-lg font-bold ${isPresent ? 'text-green-800' : 'text-red-800'}`}>
                        {isPresent ? 'Present' : 'Absent'} Students
                      </h2>
                      <p className="text-sm text-gray-500">{filtered.length} students</p>
                    </div>
                  </div>
                  <button onClick={() => setStatsModal(null)} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <FaTimesCircle className="text-gray-400" size={16} />
                  </button>
                </div>
                {/* Search */}
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                    <input type="text" placeholder="Search by name or email..." value={statsModalSearch}
                      onChange={e => { setStatsModalSearch(e.target.value); setStatsModalPage(0); }}
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                </div>
                {/* Student List */}
                <div className="flex-1 overflow-y-auto">
                  {paged.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <p className="text-lg">No students found</p>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr className="text-xs font-semibold text-gray-500 uppercase">
                          <th className="px-5 py-3">#</th>
                          <th className="px-5 py-3">Student</th>
                          <th className="px-5 py-3">Class</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paged.map((student, idx) => {
                          const status = getStudentStatus(student._id);
                          return (
                            <tr key={student._id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-3 text-sm text-gray-400">{statsModalPage * ITEMS_PER_PAGE + idx + 1}</td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isPresent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {student.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">{student.name}</p>
                                    <p className="text-xs text-gray-500">{student.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-sm text-gray-600">
                                {student.profile?.standard || '-'} {student.profile?.section || ''}
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[status]}`}>
                                  {STATUS_LABELS[status]}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-b-2xl">
                    <span className="text-xs text-gray-500">
                      Page {statsModalPage + 1} of {totalPages}
                    </span>
                    <div className="flex gap-1">
                      <button disabled={statsModalPage === 0} onClick={() => setStatsModalPage(p => p - 1)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        <FaChevronLeft size={10} />
                      </button>
                      <button disabled={statsModalPage >= totalPages - 1} onClick={() => setStatsModalPage(p => p + 1)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        <FaChevronRight size={10} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
