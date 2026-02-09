import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import { FaChevronLeft, FaChevronRight, FaCalendarAlt, FaPlus, FaTrash, FaTimes, FaSpinner } from 'react-icons/fa';
import api from '../lib/axios';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Category color mapping for different event types
const getCategoryColors = (type) => {
  switch (type) {
    case 'national':
      return 'bg-rose-100 text-rose-700';
    case 'gazetted':
      return 'bg-amber-100 text-amber-800';
    case 'holiday':
      return 'bg-rose-100 text-rose-700';
    case 'exam':
      return 'bg-purple-100 text-purple-700';
    case 'meeting':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-emerald-100 text-emerald-800';
  }
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

  // Form state for event modal
  const [formData, setFormData] = useState({
    title: '',
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
      // Get events for current month view (with some buffer)
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

  // Load events on mount and when month changes
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Show temporary message
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

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

  // Get event for a specific date
  const getEventForDate = (dateStr) => {
    return events.find(e => {
      const eventDate = new Date(e.start);
      return formatDate(eventDate) === dateStr;
    });
  };

  // Interaction Handlers
  const handleDayClick = (day) => {
    if (!isAdmin) return;

    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDate(clickedDate);
    setSelectedDate(dateStr);

    // Check if event exists
    const existingEvent = getEventForDate(dateStr);
    if (existingEvent) {
      setFormData({
        _id: existingEvent._id,
        title: existingEvent.title,
        type: existingEvent.type || 'custom',
        category: existingEvent.category || 'event',
        description: existingEvent.description || '',
        allDay: existingEvent.allDay !== false
      });
    } else {
      setFormData({
        title: '',
        type: 'custom',
        category: 'event',
        description: '',
        allDay: true
      });
    }
    setShowModal(true);
  };

  // Save event (create or update)
  const handleSaveEvent = async () => {
    if (!formData.title.trim()) return;

    try {
      setSaving(true);
      const eventPayload = {
        title: formData.title.trim(),
        start: new Date(selectedDate).toISOString(),
        end: new Date(selectedDate).toISOString(),
        allDay: formData.allDay,
        type: formData.type,
        category: formData.category,
        description: formData.description
      };

      if (formData._id) {
        // Update existing event
        await api.put(`/calendar/${formData._id}`, eventPayload);
        showMessage('Event updated successfully!');
      } else {
        // Create new event
        await api.post('/calendar', eventPayload);
        showMessage('Event created successfully!');
      }

      setShowModal(false);
      fetchEvents(); // Refresh events
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
      fetchEvents(); // Refresh events
    } catch (error) {
      console.error('Failed to delete event:', error);
      showMessage(error.response?.data?.message || 'Failed to delete event', 'error');
    } finally {
      setSaving(false);
    }
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
    const event = getEventForDate(dateStr);
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

        {event && (
          <div className={`mt-1 p-1 sm:p-1.5 rounded-md text-xs font-medium truncate ${getCategoryColors(event.type || event.category)}`}>
            {event.title}
          </div>
        )}

        {/* Visual cue for admin hover */}
        {isAdmin && !event && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <FaPlus className="text-gray-300" />
          </div>
        )}
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Message Toast */}
      {message.text && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-2 rounded-lg shadow-lg text-sm animate-fadeIn ${message.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
          }`}>
          {message.text}
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

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-2xl shadow-sm border border-gray-200">
            <FaSpinner className="animate-spin text-3xl text-indigo-600" />
          </div>
        ) : (
          /* Calendar Grid */
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
        )}
      </div>

      {/* Modal for Admin */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {formData._id ? 'Edit Event' : 'Add Event'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-600 text-sm border border-gray-200">
                  {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Annual Sports Day"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  autoFocus
                />
              </div>

              {/* Type Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                >
                  <option value="custom">Custom Event</option>
                  <option value="national">National Holiday</option>
                  <option value="gazetted">Gazetted Holiday</option>
                  <option value="event">General Event</option>
                </select>
              </div>

              {/* Category Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                >
                  <option value="event">Event</option>
                  <option value="holiday">Holiday</option>
                  <option value="exam">Exam</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add any additional details..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              {formData._id && (
                <button
                  onClick={handleDeleteEvent}
                  disabled={saving}
                  className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete Event"
                >
                  {saving ? <FaSpinner className="animate-spin" /> : <FaTrash size={16} />}
                </button>
              )}
              <button
                onClick={handleSaveEvent}
                disabled={!formData.title.trim() || saving}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving && <FaSpinner className="animate-spin" />}
                {formData._id ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Calendar;
