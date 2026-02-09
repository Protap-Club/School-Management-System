import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import { FaChevronLeft, FaChevronRight, FaCalendarAlt, FaPlus, FaTrash, FaTimes, FaSpinner, FaClock, FaTag, FaInfoCircle } from 'react-icons/fa';
import api from '../lib/axios';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Category color mapping for different event types
const getCategoryColors = (type, category) => {
  // Priority: type > category
  const key = type || category || 'event';
  switch (key) {
    case 'national':
      return { bg: 'bg-red-500', text: 'text-white', light: 'bg-red-100 text-red-700 border-red-200' };
    case 'gazetted':
      return { bg: 'bg-amber-500', text: 'text-white', light: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'holiday':
      return { bg: 'bg-rose-500', text: 'text-white', light: 'bg-rose-100 text-rose-700 border-rose-200' };
    case 'exam':
      return { bg: 'bg-purple-500', text: 'text-white', light: 'bg-purple-100 text-purple-700 border-purple-200' };
    case 'meeting':
      return { bg: 'bg-blue-500', text: 'text-white', light: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'custom':
      return { bg: 'bg-emerald-500', text: 'text-white', light: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    default:
      return { bg: 'bg-slate-500', text: 'text-white', light: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

// Type labels for display
const TYPE_LABELS = {
  national: 'National Holiday',
  gazetted: 'Gazetted Holiday',
  custom: 'Custom Event',
  event: 'Event'
};

const CATEGORY_LABELS = {
  holiday: 'Holiday',
  exam: 'Examination',
  meeting: 'Meeting',
  event: 'General Event'
};

const Calendar = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Form state for event modal
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    type: 'custom',
    category: 'event',
    description: '',
    allDay: true
  });

  // Helper to format date as YYYY-MM-DD
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const response = await api.get('/calendar', {
        params: {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString()
        }
      });

      if (response.data.success) {
        setEvents(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      showMessage('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // Calendar Logic
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  // Get events for a specific date (including multi-day events)
  const getEventsForDate = useMemo(() => {
    const map = {};

    events.forEach(event => {
      const start = new Date(event.start);
      const end = new Date(event.end);

      // Normalize to midnight for comparison
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      // Add event to each day in range
      const current = new Date(start);
      while (current <= end) {
        const dateStr = formatDate(current);
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(event);
        current.setDate(current.getDate() + 1);
      }
    });

    return map;
  }, [events]);

  // Handle day click - admin can add/edit
  const handleDayClick = (day) => {
    if (!isAdmin) return;

    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDate(clickedDate);
    setSelectedDate(dateStr);

    const existingEvents = getEventsForDate[dateStr];
    if (existingEvents && existingEvents.length > 0) {
      const event = existingEvents[0];
      setFormData({
        _id: event._id,
        title: event.title,
        startDate: formatDate(new Date(event.start)),
        endDate: formatDate(new Date(event.end)),
        type: event.type || 'custom',
        category: event.category || 'event',
        description: event.description || '',
        allDay: event.allDay !== false
      });
    } else {
      setFormData({
        title: '',
        startDate: dateStr,
        endDate: dateStr,
        type: 'custom',
        category: 'event',
        description: '',
        allDay: true
      });
    }
    setShowModal(true);
  };

  // Handle event hover for tooltip
  const handleEventHover = (event, e) => {
    if (event) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8
      });
      setHoveredEvent(event);
    } else {
      setHoveredEvent(null);
    }
  };

  // Save event
  const handleSaveEvent = async () => {
    if (!formData.title.trim()) return;

    try {
      setSaving(true);
      const eventPayload = {
        title: formData.title.trim(),
        start: new Date(formData.startDate).toISOString(),
        end: new Date(formData.endDate).toISOString(),
        allDay: formData.allDay,
        type: formData.type,
        category: formData.category,
        description: formData.description
      };

      if (formData._id) {
        await api.put(`/calendar/${formData._id}`, eventPayload);
        showMessage('Event updated successfully!');
      } else {
        await api.post('/calendar', eventPayload);
        showMessage('Event created successfully!');
      }

      setShowModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Failed to save event:', error);
      showMessage(error.response?.data?.message || 'Failed to save event', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async () => {
    if (!formData._id) return;

    try {
      setSaving(true);
      await api.delete(`/calendar/${formData._id}`);
      showMessage('Event deleted successfully!');
      setShowModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      showMessage(error.response?.data?.message || 'Failed to delete event', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Render calendar
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  // Empty cells
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/30 border-b border-r border-gray-100"></div>);
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDate(dateObj);
    const dayEvents = getEventsForDate[dateStr] || [];
    const isToday = dateStr === formatDate(new Date());

    days.push(
      <div
        key={day}
        onClick={() => handleDayClick(day)}
        className={`h-24 border-b border-r border-gray-100 p-1.5 transition-all group relative overflow-hidden
          ${isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''}
          ${isToday ? 'bg-indigo-50/40' : 'bg-white'}`}
      >
        {/* Day number */}
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
            ${isToday ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>
            {day}
          </span>
          {isAdmin && dayEvents.length === 0 && (
            <FaPlus className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs" />
          )}
        </div>

        {/* Events for this day */}
        <div className="space-y-0.5 overflow-hidden">
          {dayEvents.slice(0, 2).map((event, idx) => {
            const colors = getCategoryColors(event.type, event.category);
            return (
              <div
                key={event._id || idx}
                onMouseEnter={(e) => handleEventHover(event, e)}
                onMouseLeave={() => handleEventHover(null)}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer transition-all hover:scale-[1.02] ${colors.bg} ${colors.text}`}
              >
                {event.title}
              </div>
            );
          })}
          {dayEvents.length > 2 && (
            <div className="text-[10px] text-gray-400 font-medium pl-1">
              +{dayEvents.length - 2} more
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Toast */}
      {message.text && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-fadeIn
          ${message.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {message.type === 'error' ? <FaTimes /> : <FaCalendarAlt />}
          {message.text}
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredEvent && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 min-w-[240px] max-w-[320px] animate-fadeIn pointer-events-none"
          style={{
            left: `${Math.min(tooltipPosition.x, window.innerWidth - 340)}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="flex items-start gap-3">
            <div className={`w-2 h-full rounded-full flex-shrink-0 ${getCategoryColors(hoveredEvent.type, hoveredEvent.category).bg}`} style={{ minHeight: '40px' }}></div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">{hoveredEvent.title}</h4>
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <FaTag className="text-gray-400" />
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getCategoryColors(hoveredEvent.type, hoveredEvent.category).light}`}>
                    {TYPE_LABELS[hoveredEvent.type] || CATEGORY_LABELS[hoveredEvent.category] || 'Event'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FaClock className="text-gray-400" />
                  <span>
                    {new Date(hoveredEvent.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {hoveredEvent.start !== hoveredEvent.end && ` - ${new Date(hoveredEvent.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  </span>
                </div>
                {hoveredEvent.description && (
                  <div className="flex items-start gap-1.5">
                    <FaInfoCircle className="text-gray-400 mt-0.5" />
                    <p className="line-clamp-2">{hoveredEvent.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FaCalendarAlt className="text-indigo-600" />
              Academic Calendar
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {isAdmin ? 'Click on any day to manage events' : 'Hover on events to see details'}
            </p>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
            <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
              <FaChevronLeft size={12} />
            </button>
            <span className="text-sm font-semibold text-gray-800 min-w-[120px] text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
              <FaChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-gray-400 font-medium">Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-500"></div>
            <span className="text-gray-500">National</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-500"></div>
            <span className="text-gray-500">Gazetted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-purple-500"></div>
            <span className="text-gray-500">Exam</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></div>
            <span className="text-gray-500">Custom</span>
          </div>
        </div>

        {/* Calendar */}
        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-gray-100">
            <FaSpinner className="animate-spin text-2xl text-indigo-600" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
              {WEEKDAYS.map(day => (
                <div key={day} className="py-2.5 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            {/* Days Grid */}
            <div className="grid grid-cols-7">
              {days}
            </div>
          </div>
        )}
      </div>

      {/* Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 text-white">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {formData._id ? 'Edit Event' : 'Create Event'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <FaTimes size={16} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Event Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Annual Sports Day"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  autoFocus
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      startDate: e.target.value,
                      endDate: prev.endDate < e.target.value ? e.target.value : prev.endDate
                    }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    min={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              {/* Type & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-white"
                  >
                    <option value="custom">Custom</option>
                    <option value="national">National</option>
                    <option value="gazetted">Gazetted</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-white"
                  >
                    <option value="event">Event</option>
                    <option value="holiday">Holiday</option>
                    <option value="exam">Exam</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add event details..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              {formData._id && (
                <button
                  onClick={handleDeleteEvent}
                  disabled={saving}
                  className="px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                >
                  {saving ? <FaSpinner className="animate-spin" /> : <FaTrash size={14} />}
                  Delete
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={!formData.title.trim() || saving}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {saving && <FaSpinner className="animate-spin" />}
                {formData._id ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Calendar;
