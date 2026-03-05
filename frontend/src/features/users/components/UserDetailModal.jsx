import React, { useState, useEffect, useMemo } from 'react';
import {
  FaTimes, FaUser, FaIdCard, FaBuilding, FaLayerGroup, FaEnvelope, FaPhone,
  FaChalkboardTeacher, FaChevronLeft, FaChevronRight, FaClock, FaCheck,
  FaTimesCircle, FaExclamationTriangle
} from 'react-icons/fa';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_CONFIG = {
  present: {
    color: 'bg-emerald-500 text-white',
    light: 'bg-emerald-50 border-emerald-200',
    icon: <FaCheck className="text-emerald-600" />,
    iconBg: 'bg-emerald-100',
    textColor: 'text-emerald-600',
    legendColor: 'bg-emerald-500'
  },
  absent: {
    color: 'bg-red-500 text-white',
    light: 'bg-red-50 border-red-200',
    icon: <FaTimesCircle className="text-red-600" />,
    iconBg: 'bg-red-100',
    textColor: 'text-red-600',
    legendColor: 'bg-red-500'
  },
  late: {
    color: 'bg-amber-500 text-white',
    light: 'bg-amber-50 border-amber-200',
    icon: <FaExclamationTriangle className="text-amber-600" />,
    iconBg: 'bg-amber-100',
    textColor: 'text-amber-600',
    legendColor: 'bg-amber-500'
  },
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

const UserDetailModal = ({ user, onClose }) => {
  if (!user) return null;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => { generateMockHistory(); }, [user]);

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
          ${isToday && !record ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
          ${isToday && record ? 'ring-2 ring-white ring-offset-2 ring-offset-blue-500' : ''}`}
        title={record ? `${record.status} - ${record.checkIn}` : isWeekend ? 'Weekend' : isFuture ? 'Future' : 'No data'}>
        {day}
      </div>
    );
  }

  const attendancePercentage = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;

  const isStudent = user.role === 'student';

  const profileBadges = [
    { icon: <FaIdCard className="text-blue-500" />, label: isStudent ? 'Roll:' : 'ID:', value: isStudent ? user.profile?.rollNumber : `#${user._id?.slice(-6).toUpperCase()}` },
    { icon: <FaEnvelope className="text-purple-500" />, label: 'Email:', value: user.email },
    { icon: <FaPhone className="text-emerald-500" />, label: 'Phone:', value: user.phoneNumber || '-' },
  ];

  if (isStudent) {
    profileBadges.push(
      { icon: <FaBuilding className="text-orange-500" />, label: 'Class:', value: user.profile?.standard },
      { icon: <FaLayerGroup className="text-indigo-500" />, label: 'Section:', value: user.profile?.section }
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl font-bold border-2 border-white/30 shadow-lg">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  user.name?.charAt(0) || 'U'
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{user.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold uppercase tracking-wider">{user.role?.replace('_', ' ')}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-blue-100 text-xs font-medium">Active Member</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-xl transition-all"><FaTimes size={20} /></button>
          </div>
        </div>

        {/* Action Bar / Badges */}
        <div className="px-6 py-4 flex flex-wrap gap-3 bg-gray-50 border-b border-gray-100 shrink-0">
          {profileBadges.map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs shadow-sm shadow-gray-100/50">
              {icon}<span className="text-gray-500 font-medium">{label}</span>
              <span className="font-bold text-gray-800">{value || '-'}</span>
            </div>
          ))}
          <div className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold
            ${attendancePercentage >= 90 ? 'bg-emerald-100 text-emerald-700' : attendancePercentage >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            <FaUser className="text-[10px]" />{attendancePercentage}% Presence (90 Days)
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Calendar View */}
          <div className="flex-1 p-6 overflow-y-auto border-r border-gray-100 custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">Activity Calendar</h3>
              <div className="flex items-center gap-4 bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  className="p-2 hover:bg-white rounded-lg text-gray-600 shadow-sm transition-all"><FaChevronLeft size={12} /></button>
                <span className="text-sm font-bold text-gray-700 min-w-[120px] text-center">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={nextMonth}
                  className="p-2 hover:bg-white rounded-lg text-gray-600 shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) > new Date()}>
                  <FaChevronRight size={12} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-3">
              {WEEKDAYS.map(day => (
                <div key={day} className="h-10 flex items-center justify-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">{calendarDays}</div>

            <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-gray-100">
              {LEGEND_ITEMS.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <div className={`w-3.5 h-3.5 rounded-md ${color} shadow-sm`}></div>{label}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="w-80 p-6 bg-gray-50/50 overflow-y-auto shrink-0 custom-scrollbar">
            <div className="mb-8">
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Quick Stats</h4>
              <div className="grid grid-cols-1 gap-3">
                {STAT_CARDS.map(({ key, label, icon, iconBg, textColor }) => (
                  <div key={key} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm shadow-gray-200/50">
                    <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center text-xl`}>{icon}</div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
                      <p className={`text-2xl font-black ${textColor}`}>{stats[key]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Selected Day Details</h4>
            {selectedDay ? (
              <div className={`p-5 rounded-2xl border-2 transition-all animate-fadeIn ${STATUS_CONFIG[selectedDay.status]?.light || 'bg-white border-gray-100'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[selectedDay.status]?.legendColor}`}></div>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-700">{selectedDay.status}</span>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><FaTimes size={12} /></button>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-800 leading-tight">
                    {new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  {selectedDay.checkIn !== '-' ? (
                    <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/80">
                      <FaClock className="text-gray-400" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Check-in Time</p>
                        <p className="text-sm font-bold text-gray-800">{selectedDay.checkIn}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50/50 rounded-xl border border-red-100/50 italic text-[11px] text-red-500 font-medium text-center">
                      No records found for this academic day.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-6 bg-white/50 border-2 border-dashed border-gray-200 rounded-3xl">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaUser className="text-gray-400" size={16} />
                </div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider leading-relaxed">
                  Select a day in the calendar to view full details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;
