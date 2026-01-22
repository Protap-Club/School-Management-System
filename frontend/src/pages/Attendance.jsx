import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { connectSocket, disconnectSocket } from '../api/socket';
import {
  FaUserGraduate,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaChartBar,
  FaUsers,
  FaSearch,
  FaWifi
} from 'react-icons/fa';

const Attendance = () => {
  const { user: currentUser } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceMap, setAttendanceMap] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0
  });

  // Fetch students from the school
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Admin needs profiles for filtering, Teachers get backend-filtered list via get-users
        const endpoint = currentUser?.role === 'admin'
          ? '/user/get-users-with-profiles?role=student'
          : '/user/get-users?role=student&pageSize=100';

        const response = await api.get(endpoint);
        if (response.data.success) {
          const studentData = response.data.data;
          setStudents(studentData);

          const total = studentData.length;
          setStats({
            total,
            present: 0,
            absent: total,
            late: 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch students', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // Socket.io connection for real-time updates
  useEffect(() => {
    const socket = connectSocket(currentUser?.schoolId);

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Listen for real-time attendance updates
    socket.on('attendance-marked', (data) => {

      // Update attendance map
      setAttendanceMap(prev => ({
        ...prev,
        [data.studentId]: {
          status: data.status.toLowerCase(),
          checkInTime: data.checkInTime
        }
      }));

      // Update stats
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

  const [selectedStandard, setSelectedStandard] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // Filter students by search, standard, and division
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Robust filtering: ensure string comparison and handle potential non-string types
    // Standard matches if it starts with the selected value (e.g. "9th" starts with "9")
    const studentStandard = student.profile?.standard || '';
    const matchesStandard = !selectedStandard || String(studentStandard).startsWith(String(selectedStandard));

    // Section matches exact value
    const studentSection = student.profile?.section || '';
    const matchesSection = !selectedSection || studentSection === selectedSection;

    return matchesSearch && matchesStandard && matchesSection;
  });

  // Get status for a student
  const getStudentStatus = (studentId) => {
    return attendanceMap[studentId]?.status || 'unmarked';
  };

  // Get today's date formatted
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
          {/* Socket Connection Status */}
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



        {/* Student List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <FaUserGraduate className="text-primary" />
              <h2 className="text-lg font-bold text-gray-800">Student List</h2>
              <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded-full">
                {filteredStudents.length} students
              </span>
            </div>

            {/* Filters for Admin */}
            {currentUser?.role === 'admin' && (
              <div className="flex gap-3 mb-4 md:mb-0 w-full md:w-auto">
                <select
                  value={selectedStandard}
                  onChange={(e) => setSelectedStandard(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white text-gray-700 text-sm cursor-pointer hover:border-gray-300 transition-colors"
                >
                  <option value="">Standard</option>
                  <option value="9">9</option>
                  <option value="10">10</option>
                  <option value="11">11</option>
                  <option value="12">12</option>
                </select>

                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white text-gray-700 text-sm cursor-pointer hover:border-gray-300 transition-colors"
                >
                  <option value="">Section</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
            )}

            {/* Search */}
            <div className="relative w-full md:w-64">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaUserGraduate size={24} className="text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-600">No students found</p>
              <p className="text-sm mt-1">
                {(selectedStandard || selectedSection)
                  ? "Try adjusting your Standard and Section filters."
                  : "There are no students matching your search criteria."}
              </p>
            </div>
          ) : (
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
                  {filteredStudents.slice(0, 20).map((student) => {
                    const status = getStudentStatus(student._id);
                    const isPresent = status === 'present';
                    const isLate = status === 'late';
                    const isAbsent = status === 'absent';
                    const isUnmarked = status === 'unmarked';

                    return (
                      <tr
                        key={student._id}
                        className={`group transition-all duration-200 ${isPresent
                          ? 'bg-green-50/30 hover:bg-green-50/60'
                          : 'hover:bg-gray-50'
                          }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${isPresent
                              ? 'bg-green-100 text-green-800'
                              : 'bg-green-50 text-green-700 border border-green-100 group-hover:bg-green-100'
                              }`}>
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{student.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${isPresent
                            ? 'bg-green-50 text-green-700 border-green-100'
                            : isLate
                              ? 'bg-orange-50 text-orange-700 border-orange-100'
                              : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                            {isPresent && <FaCheckCircle size={10} />}
                            {isLate && <FaClock size={10} />}
                            {(isAbsent || isUnmarked) && <FaTimesCircle size={10} />}
                            {isPresent ? 'Present' : isLate ? 'Late' : 'Absent'}
                          </span>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Info Footer */}
          {filteredStudents.length > 20 && (
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-sm text-gray-500">
              Showing 20 of {filteredStudents.length} students. Full pagination coming soon.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
