import React, { useState, useEffect, useMemo } from 'react';
import { FaTimes, FaUserGraduate, FaIdCard, FaBuilding, FaLayerGroup, FaChevronLeft, FaChevronRight, FaClock, FaCheck, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Modal to display student details and attendance history with calendar view
 */
const StudentHistoryModal = ({ student, onClose, attendanceMap }) => {
  if (!student) return null;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    // Mock generation of history data
    // In a real app, this would fetch from API
    generateMockHistory();
  }, [student]);

  const generateMockHistory = () => {
    const mockData = [];
    const today = new Date();
    let present = 0;
    let absent = 0;
    let late = 0;

    // Generate last 90 days (3 months for better calendar view)
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      // Skip future dates
      if (date > today) continue;

      const r = Math.random();
      let status = 'present';

      if (r > 0.85) status = 'absent';
      else if (r > 0.75) status = 'late';

      if (status === 'present') present++;
      if (status === 'absent') absent++;
      if (status === 'late') late++;

      // Generate realistic check-in times
      let checkIn = '-';
      if (status === 'present') {
        const hour = 8;
        const minute = Math.floor(Math.random() * 20) + 20; // 8:20-8:40
        checkIn = `${hour}:${minute.toString().padStart(2, '0')} AM`;
      } else if (status === 'late') {
        const hour = 9;
        const minute = Math.floor(Math.random() * 30); // 9:00-9:30
        checkIn = `${hour}:${minute.toString().padStart(2, '0')} AM`;
      }

      mockData.push({
        date: date.toISOString().split('T')[0],
        status: status,
        checkIn: checkIn
      });
    }

    setHistory(mockData);
    setStats({ present, absent, late, total: present + absent + late });
  };

  // Create a map of date -> attendance record for quick lookup
  const attendanceByDate = useMemo(() => {
    const map = {};
    history.forEach(record => {
      map[record.date] = record;
    });
    return map;
  }, [history]);

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const nextMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    if (next <= new Date()) {
      setCurrentDate(next);
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Get status color classes
  const getStatusColors = (status) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-500 text-white';
      case 'absent':
        return 'bg-red-500 text-white';
      case 'late':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-gray-100 text-gray-400';
    }
  };

  const getStatusBgLight = (status) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-50 border-emerald-200';
      case 'absent':
        return 'bg-red-50 border-red-200';
      case 'late':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <FaCheck className="text-emerald-600" />;
      case 'absent':
        return <FaTimesCircle className="text-red-600" />;
      case 'late':
        return <FaExclamationTriangle className="text-amber-600" />;
      default:
        return null;
    }
  };

  // Generate calendar days
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const today = new Date();
  const todayStr = formatDate(today);

  const calendarDays = [];

  // Empty cells for previous month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(
      <div key={`empty-${i}`} className="h-10 bg-gray-50/50 rounded"></div>
    );
  }

  // Day cells with attendance status
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDate(dateObj);
    const record = attendanceByDate[dateStr];
    const isToday = dateStr === todayStr;
    const isFuture = dateObj > today;
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    calendarDays.push(
      <div
        key={day}
        onClick={() => record && setSelectedDay(record)}
        className={`h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all
          ${record ? 'cursor-pointer hover:scale-105 hover:shadow-md ' + getStatusColors(record.status) : ''}
          ${!record && !isFuture && !isWeekend ? 'bg-gray-100 text-gray-400' : ''}
          ${isFuture ? 'bg-gray-50 text-gray-300' : ''}
          ${isWeekend && !record ? 'bg-gray-50 text-gray-300' : ''}
          ${isToday && !record ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}
          ${isToday && record ? 'ring-2 ring-white ring-offset-2 ring-offset-indigo-500' : ''}
        `}
        title={record ? `${record.status} - ${record.checkIn}` : isWeekend ? 'Weekend' : isFuture ? 'Future' : 'No data'}
      >
        {day}
      </div>
    );
  }

  // Calculate attendance percentage
  const attendancePercentage = stats.total > 0
    ? Math.round(((stats.present + stats.late) / stats.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-xl font-bold border-2 border-white/30">
                {student.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold">{student.name}</h2>
                <p className="text-blue-100 text-sm">{student.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FaTimes size={18} />
            </button>
          </div>
        </div>

        {/* Profile Overview - Compact */}
        <div className="px-5 py-3 flex flex-wrap gap-3 bg-gray-50 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-sm">
            <FaIdCard className="text-blue-500" />
            <span className="text-gray-500">Roll:</span>
            <span className="font-semibold text-gray-800">{student.profile?.rollNumber || '-'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-sm">
            <FaBuilding className="text-purple-500" />
            <span className="text-gray-500">Class:</span>
            <span className="font-semibold text-gray-800">{student.profile?.standard || '-'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-sm">
            <FaLayerGroup className="text-orange-500" />
            <span className="text-gray-500">Section:</span>
            <span className="font-semibold text-gray-800">{student.profile?.section || '-'}</span>
          </div>
          {/* Attendance Rate Badge */}
          <div className={`ml-auto flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold
            ${attendancePercentage >= 90 ? 'bg-emerald-100 text-emerald-700' :
              attendancePercentage >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            <FaUserGraduate />
            {attendancePercentage}% Attendance
          </div>
        </div>

        {/* Content Body - Two Column Layout */}
        <div className="flex-1 overflow-hidden flex">

          {/* Left: Calendar */}
          <div className="flex-1 p-5 overflow-y-auto border-r border-gray-100">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
              >
                <FaChevronLeft size={14} />
              </button>
              <span className="text-base font-semibold text-gray-900">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) > new Date()}
              >
                <FaChevronRight size={14} />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(day => (
                <div key={day} className="h-8 flex items-center justify-center text-xs font-semibold text-gray-400 uppercase">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-3 h-3 rounded bg-emerald-500"></div>
                Present
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-3 h-3 rounded bg-amber-500"></div>
                Late
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                Absent
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-3 h-3 rounded bg-gray-200"></div>
                No Data
              </div>
            </div>
          </div>

          {/* Right: Stats & Details */}
          <div className="w-72 p-5 bg-gray-50 overflow-y-auto shrink-0">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Summary</h4>

            {/* Stats Cards */}
            <div className="space-y-3 mb-6">
              <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <FaCheck className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Present</p>
                  <p className="text-xl font-bold text-emerald-600">{stats.present}</p>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <FaExclamationTriangle className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Late</p>
                  <p className="text-xl font-bold text-amber-600">{stats.late}</p>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <FaTimesCircle className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Absent</p>
                  <p className="text-xl font-bold text-red-600">{stats.absent}</p>
                </div>
              </div>
            </div>

            {/* Selected Day Details */}
            {selectedDay && (
              <div className={`p-4 rounded-xl border ${getStatusBgLight(selectedDay.status)}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-700">Day Details</h4>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedDay.status)}
                    <span className="text-sm font-semibold capitalize text-gray-700">{selectedDay.status}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedDay.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  {selectedDay.checkIn !== '-' && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FaClock className="text-gray-400" />
                      Check-in: {selectedDay.checkIn}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedDay && (
              <div className="text-center py-6 text-gray-400 text-sm">
                <p>Click on a day to see details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentHistoryModal;
