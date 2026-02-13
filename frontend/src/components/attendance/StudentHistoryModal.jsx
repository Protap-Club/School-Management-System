import React, { useState, useEffect, useMemo } from 'react';
import { FaTimes, FaUserGraduate, FaIdCard, FaBuilding, FaLayerGroup, FaChevronLeft, FaChevronRight, FaClock, FaCheck, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_CONFIG = {
  present: { color: 'bg-emerald-500 text-white', light: 'bg-emerald-50 border-emerald-200', icon: <FaCheck className="text-emerald-600" />, iconBg: 'bg-emerald-100', textColor: 'text-emerald-600', legendColor: 'bg-emerald-500' },
  absent: { color: 'bg-red-500 text-white', light: 'bg-red-50 border-red-200', icon: <FaTimesCircle className="text-red-600" />, iconBg: 'bg-red-100', textColor: 'text-red-600', legendColor: 'bg-red-500' },
  late: { color: 'bg-amber-500 text-white', light: 'bg-amber-50 border-amber-200', icon: <FaExclamationTriangle className="text-amber-600" />, iconBg: 'bg-amber-100', textColor: 'text-amber-600', legendColor: 'bg-amber-500' },
};
const LEGEND_ITEMS = [
  { label: 'Present', color: 'bg-emerald-500' },
  { label: 'Late', color: 'bg-amber-500' },
  { label: 'Absent', color: 'bg-red-500' },
  { label: 'No Data', color: 'bg-gray-200' },
];
const STAT_CARDS = [
  { key: 'present', label: 'Present', ...STATUS_CONFIG.present },
  { key: 'late', label: 'Late', ...STATUS_CONFIG.late },
  { key: 'absent', label: 'Absent', ...STATUS_CONFIG.absent },
];

const StudentHistoryModal = ({ student, onClose }) => {
  if (!student) return null;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => { generateMockHistory(); }, [student]);

  const generateMockHistory = () => {
    const mockData = [];
    const today = new Date();
    let present = 0, absent = 0, late = 0;

    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      if (date.getDay() === 0 || date.getDay() === 6 || date > today) continue;

      const r = Math.random();
      const status = r > 0.85 ? 'absent' : r > 0.75 ? 'late' : 'present';
      if (status === 'present') present++;
      if (status === 'absent') absent++;
      if (status === 'late') late++;

      let checkIn = '-';
      if (status === 'present') checkIn = `8:${(Math.floor(Math.random() * 20) + 20).toString().padStart(2, '0')} AM`;
      else if (status === 'late') checkIn = `9:${Math.floor(Math.random() * 30).toString().padStart(2, '0')} AM`;

      mockData.push({ date: date.toISOString().split('T')[0], status, checkIn });
    }
    setHistory(mockData);
    setStats({ present, absent, late, total: present + absent + late });
  };

  const attendanceByDate = useMemo(() => Object.fromEntries(history.map(r => [r.date, r])), [history]);

  const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const nextMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    if (next <= new Date()) setCurrentDate(next);
  };

  const today = new Date();
  const todayStr = formatDate(today);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-10 bg-gray-50/50 rounded"></div>);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDate(dateObj);
    const record = attendanceByDate[dateStr];
    const isToday = dateStr === todayStr;
    const isFuture = dateObj > today;
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    const cfg = record ? STATUS_CONFIG[record.status] : null;

    calendarDays.push(
      <div key={day} onClick={() => record && setSelectedDay(record)}
        className={`h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all
          ${cfg ? 'cursor-pointer hover:scale-105 hover:shadow-md ' + cfg.color : ''}
          ${!record && !isFuture && !isWeekend ? 'bg-gray-100 text-gray-400' : ''}
          ${isFuture ? 'bg-gray-50 text-gray-300' : ''}
          ${isWeekend && !record ? 'bg-gray-50 text-gray-300' : ''}
          ${isToday && !record ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}
          ${isToday && record ? 'ring-2 ring-white ring-offset-2 ring-offset-indigo-500' : ''}`}
        title={record ? `${record.status} - ${record.checkIn}` : isWeekend ? 'Weekend' : isFuture ? 'Future' : 'No data'}>
        {day}
      </div>
    );
  }

  const attendancePercentage = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;

  const profileBadges = [
    { icon: <FaIdCard className="text-blue-500" />, label: 'Roll:', value: student.profile?.rollNumber },
    { icon: <FaBuilding className="text-purple-500" />, label: 'Class:', value: student.profile?.standard },
    { icon: <FaLayerGroup className="text-orange-500" />, label: 'Section:', value: student.profile?.section },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><FaTimes size={18} /></button>
          </div>
        </div>
        <div className="px-5 py-3 flex flex-wrap gap-3 bg-gray-50 border-b border-gray-100 shrink-0">
          {profileBadges.map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-sm">
              {icon}<span className="text-gray-500">{label}</span>
              <span className="font-semibold text-gray-800">{value || '-'}</span>
            </div>
          ))}
          <div className={`ml-auto flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold
            ${attendancePercentage >= 90 ? 'bg-emerald-100 text-emerald-700' : attendancePercentage >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            <FaUserGraduate />{attendancePercentage}% Attendance
          </div>
        </div>
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 p-5 overflow-y-auto border-r border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"><FaChevronLeft size={14} /></button>
              <span className="text-base font-semibold text-gray-900">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) > new Date()}>
                <FaChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(day => (
                <div key={day} className="h-8 flex items-center justify-center text-xs font-semibold text-gray-400 uppercase">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">{calendarDays}</div>
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
              {LEGEND_ITEMS.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className={`w-3 h-3 rounded ${color}`}></div>{label}
                </div>
              ))}
            </div>
          </div>
          <div className="w-72 p-5 bg-gray-50 overflow-y-auto shrink-0">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Summary</h4>
            <div className="space-y-3 mb-6">
              {STAT_CARDS.map(({ key, label, icon, iconBg, textColor }) => (
                <div key={key} className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>{icon}</div>
                  <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className={`text-xl font-bold ${textColor}`}>{stats[key]}</p>
                  </div>
                </div>
              ))}
            </div>
            {selectedDay ? (
              <div className={`p-4 rounded-xl border ${STATUS_CONFIG[selectedDay.status]?.light || 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-700">Day Details</h4>
                  <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600"><FaTimes size={12} /></button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {STATUS_CONFIG[selectedDay.status]?.icon}
                    <span className="text-sm font-semibold capitalize text-gray-700">{selectedDay.status}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  {selectedDay.checkIn !== '-' && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FaClock className="text-gray-400" />Check-in: {selectedDay.checkIn}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm"><p>Click on a day to see details</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentHistoryModal;
