import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import { FaChevronLeft, FaChevronRight, FaCalendarAlt, FaPlus, FaTrash, FaTimes } from 'react-icons/fa';

// Mock Holidays Data
const MOCK_HOLIDAYS = [
  { date: '2024-01-26', name: 'Republic Day', type: 'national' },
  { date: '2024-03-25', name: 'Holi', type: 'gazetted' },
  { date: '2024-08-15', name: 'Independence Day', type: 'national' },
  { date: '2024-10-02', name: 'Gandhi Jayanti', type: 'national' },
  { date: '2024-12-25', name: 'Christmas', type: 'gazetted' }
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Calendar = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState(MOCK_HOLIDAYS);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [message, setMessage] = useState('');

  // Calendar Logic
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const formatDate = (date) => { // format YYYY-MM-DD
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Interaction Handlers
  const handleDayClick = (day) => {
    if (!isAdmin) return; // Only Admin can edit

    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDate(clickedDate);
    setSelectedDate(dateStr);

    // Check if holiday exists
    const holiday = holidays.find(h => h.date === dateStr);
    if (holiday) {
      setNewHolidayName(holiday.name); // Pre-fill for potential edit/delete
    } else {
      setNewHolidayName('');
    }
    setShowModal(true);
  };

  const handleSaveHoliday = () => {
    if (!newHolidayName.trim()) return;

    // Add or Update
    setHolidays(prev => {
      const exists = prev.find(h => h.date === selectedDate);
      if (exists) {
        return prev.map(h => h.date === selectedDate ? { ...h, name: newHolidayName } : h);
      }
      return [...prev, { date: selectedDate, name: newHolidayName, type: 'custom' }];
    });

    setShowModal(false);
    setMessage('Holiday updated successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteHoliday = () => {
    setHolidays(prev => prev.filter(h => h.date !== selectedDate));
    setShowModal(false);
    setMessage('Holiday removed successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  // Render Generation
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  // Empty cells for previous month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-14 sm:h-20 bg-gray-50/50 border border-gray-100"></div>);
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDate(dateObj);
    const holiday = holidays.find(h => h.date === dateStr);
    const isToday = dateStr === formatDate(new Date());

    days.push(
      <div
        key={day}
        onClick={() => handleDayClick(day)}
        className={`relative h-14 sm:h-20 border border-gray-100 p-1 transition-all group ${isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''
          } ${isToday ? 'bg-indigo-50/30' : 'bg-white'}`}
      >
        <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700'
          }`}>
          {day}
        </span>

        {holiday && (
          <div className={`mt-2 p-1.5 rounded-md text-xs font-medium truncate ${holiday.type === 'national' ? 'bg-rose-100 text-rose-700' :
            holiday.type === 'gazetted' ? 'bg-amber-100 text-amber-800' :
              'bg-emerald-100 text-emerald-800'
            }`}>
            {holiday.name}
          </div>
        )}

        {/* Visual cue for admin hover */}
        {isAdmin && !holiday && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <FaPlus className="text-gray-300" />
          </div>
        )}
      </div>
    );
  }

  return (
    <DashboardLayout>
      {message && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fadeIn">
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaCalendarAlt className="text-primary" />
              Academic Calendar
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {isAdmin ? 'Manage holidays and events' : 'View holidays and academic events'}
            </p>
          </div>

          {/* Month Navigation */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                <FaChevronLeft size={14} />
              </button>
              <span className="text-lg font-semibold text-gray-900 min-w-[140px] text-center">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                <FaChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {WEEKDAYS.map(day => (
              <div key={day} className="py-3 text-center text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          {/* Days Grid */}
          <div className="grid grid-cols-7">
            {days}
          </div>
        </div>
      </div>

      {/* Modal for Admin */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {holidays.find(h => h.date === selectedDate) ? 'Edit Holiday' : 'Add Holiday'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-600 text-sm border border-gray-200">
                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
              <input
                type="text"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                placeholder="e.g. Annual Sports Day"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              {holidays.find(h => h.date === selectedDate) && (
                <button
                  onClick={handleDeleteHoliday}
                  className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  title="Delete Holiday"
                >
                  <FaTrash size={16} />
                </button>
              )}
              <button
                onClick={handleSaveHoliday}
                disabled={!newHolidayName.trim()}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Calendar;
