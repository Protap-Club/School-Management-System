import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import { FaChevronLeft, FaChevronRight, FaCalendarAlt, FaPlus, FaTrash, FaTimes, FaSpinner, FaClock, FaTag, FaUmbrellaBeach, FaUsers } from 'react-icons/fa';
import api from '../lib/axios';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TYPE_CONFIG = {
  national: { bg: 'bg-emerald-500', text: 'text-white', light: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'National Holiday' },
  exam: { bg: 'bg-blue-500', text: 'text-white', light: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Examination' },
  custom: { bg: 'bg-amber-400', text: 'text-amber-900', light: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Custom' },
  event: { bg: 'bg-purple-500', text: 'text-white', light: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Event' },
};
const LEGEND_ITEMS = [
  { color: 'bg-emerald-500', label: 'National Holiday' },
  { color: 'bg-blue-500', label: 'Exam' },
  { color: 'bg-amber-400', label: 'Custom' },
  { color: 'bg-purple-500', label: 'Event' },
];
const getTypeColors = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.event;
const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const resetFormForDate = (dateStr) => ({ title: '', startDate: dateStr, endDate: dateStr, type: 'event', description: '', allDay: true, targetAudience: 'all', targetClasses: [] });
const loadFormFromEvent = (event) => ({
  _id: event._id, title: event.title, startDate: formatDate(new Date(event.start)),
  endDate: formatDate(new Date(event.end)), type: event.type || 'event', description: event.description || '', allDay: event.allDay !== false,
  targetAudience: event.targetAudience || 'all',
  targetClasses: event.targetClasses || [],
});

const INPUT_CLASS = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm';

const Calendar = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [tooltip, setTooltip] = useState({ event: null, position: { x: 0, y: 0 }, expanded: false });
  const [formData, setFormData] = useState(resetFormForDate(''));
  // Phase A: class list for the audience picker (admin only)
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (!isAdmin) return;
    api.get('/timetables')
      .then(res => {
        const timetables = res.data?.data || [];
        setClasses(
          timetables.map(t => ({
            value: `${t.standard}-${t.section}`,
            label: `Class ${t.standard} - Section ${t.section}`,
          }))
        );
      })
      .catch(() => {});
  }, [isAdmin]);

  const showMessage = (text, type = 'success') => { setMessage({ text, type }); setTimeout(() => setMessage({ text: '', type: '' }), 3000); };
  const updateFormField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const response = await api.get('/calendar', { params: { start: startOfMonth.toISOString(), end: endOfMonth.toISOString() } });
      if (response.data.success) setEvents(response.data.data);
    } catch (error) { console.error('Failed to fetch events:', error); showMessage('Failed to load events', 'error'); }
    finally { setLoading(false); }
  }, [currentDate]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const getEventsForDate = useMemo(() => {
    const map = {};
    events.forEach(event => {
      const start = new Date(event.start); start.setHours(0, 0, 0, 0);
      const end = new Date(event.end); end.setHours(0, 0, 0, 0);
      const current = new Date(start);
      while (current <= end) { const ds = formatDate(current); if (!map[ds]) map[ds] = []; map[ds].push(event); current.setDate(current.getDate() + 1); }
    });
    return map;
  }, [events]);

  const holidayCount = useMemo(() => {
    const uniqueDays = new Set();
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    events.forEach(event => {
      if (event.type !== 'national') return;
      const start = new Date(event.start); start.setHours(0, 0, 0, 0);
      const end = new Date(event.end); end.setHours(0, 0, 0, 0);
      const current = new Date(start);
      while (current <= end) { if (current >= monthStart && current <= monthEnd) uniqueDays.add(formatDate(current)); current.setDate(current.getDate() + 1); }
    });
    return uniqueDays.size;
  }, [events, currentDate]);

  const handleDayClick = useCallback((day) => {
    if (!isAdmin) return;
    const dateStr = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    const existing = getEventsForDate[dateStr];
    setFormData(existing?.length > 0 ? loadFormFromEvent(existing[0]) : resetFormForDate(dateStr));
    setShowModal(true);
  }, [isAdmin, currentDate, getEventsForDate]);

  const handleEventHover = useCallback((event, e) => {
    if (event) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({ event, position: { x: rect.left + rect.width / 2, y: rect.bottom + 8 }, expanded: false });
    } else { setTooltip({ event: null, position: { x: 0, y: 0 }, expanded: false }); }
  }, []);

  const handleSaveEvent = useCallback(async () => {
    if (!formData.title.trim()) return;
    try {
      setSaving(true);
      const payload = { title: formData.title.trim(), start: new Date(formData.startDate).toISOString(), end: new Date(formData.endDate).toISOString(), allDay: formData.allDay, type: formData.type, description: formData.description, targetAudience: formData.targetAudience, targetClasses: formData.targetClasses };
      if (formData._id) { await api.put(`/calendar/${formData._id}`, payload); showMessage('Event updated!'); }
      else { await api.post('/calendar', payload); showMessage('Event created!'); }
      setShowModal(false); fetchEvents();
    } catch (error) { showMessage(error.response?.data?.message || 'Failed to save event', 'error'); }
    finally { setSaving(false); }
  }, [formData, fetchEvents]);

  const handleDeleteEvent = useCallback(async () => {
    if (!formData._id) return;
    try { setSaving(true); await api.delete(`/calendar/${formData._id}`); showMessage('Event deleted!'); setShowModal(false); fetchEvents(); }
    catch (error) { showMessage('Failed to delete event', 'error'); }
    finally { setSaving(false); }
  }, [formData._id, fetchEvents]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const calendarDays = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/30 border-b border-r border-gray-100"></div>);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
      const dayEvents = getEventsForDate[dateStr] || [];
      const isToday = dateStr === formatDate(new Date());
      cells.push(
        <div key={day} onClick={() => handleDayClick(day)}
          className={`h-24 border-b border-r border-gray-100 p-1.5 transition-all group relative overflow-hidden ${isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''} ${isToday ? 'bg-indigo-50/40' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>{day}</span>
            {isAdmin && dayEvents.length === 0 && <FaPlus className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs" />}
          </div>
          <div className="space-y-0.5 overflow-hidden">
            {dayEvents.slice(0, 2).map((event, idx) => {
              const colors = getTypeColors(event.type);
              return (
                <div key={event._id || idx} onMouseEnter={(e) => handleEventHover(event, e)} onMouseLeave={() => handleEventHover(null)}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer transition-all hover:scale-[1.02] ${colors.bg} ${colors.text}`}>
                  {event.title}
                </div>
              );
            })}
            {dayEvents.length > 2 && <div className="text-[10px] text-gray-400 font-medium pl-1">+{dayEvents.length - 2} more</div>}
          </div>
        </div>
      );
    }
    return cells;
  }, [currentDate, daysInMonth, firstDay, getEventsForDate, isAdmin, handleDayClick, handleEventHover]);

  const renderFormField = (label, children) => (
    <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>
  );

  return (
    <DashboardLayout>
      {message.text && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-fadeIn ${message.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {message.type === 'error' ? <FaTimes /> : <FaCalendarAlt />}{message.text}
        </div>
      )}
      {tooltip.event && (
        <div className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 min-w-[260px] max-w-[340px] animate-fadeIn"
          style={{ left: `${Math.min(tooltip.position.x, window.innerWidth - 360)}px`, top: `${tooltip.position.y}px`, transform: 'translateX(-50%)' }}>
          <div className="flex items-start gap-3">
            <div className={`w-1.5 rounded-full flex-shrink-0 ${getTypeColors(tooltip.event.type).bg}`} style={{ minHeight: '50px' }}></div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm mb-2">{tooltip.event.title}</h4>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FaTag className="text-gray-400" />
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getTypeColors(tooltip.event.type).light}`}>{TYPE_CONFIG[tooltip.event.type]?.label || 'Event'}</span>
                  </div>
                  {tooltip.event.targetAudience === 'classes' && tooltip.event.targetClasses?.length > 0 && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <FaUsers className="text-gray-400" />
                      <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {tooltip.event.targetClasses.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <FaClock className="text-gray-400" />
                  <span>
                    {new Date(tooltip.event.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {tooltip.event.start !== tooltip.event.end && ` - ${new Date(tooltip.event.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  </span>
                </div>
                {tooltip.event.description && (
                  <div className="pt-1 border-t border-gray-100">
                    <p className={tooltip.expanded ? '' : 'line-clamp-2'}>{tooltip.event.description}</p>
                    {tooltip.event.description.length > 80 && (
                      <button onClick={(e) => { e.stopPropagation(); setTooltip(prev => ({ ...prev, expanded: !prev.expanded })); }}
                        className="text-indigo-600 hover:text-indigo-700 font-medium mt-1">{tooltip.expanded ? 'Show less' : 'Read more...'}</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FaCalendarAlt className="text-indigo-600" /> Academic Calendar</h1>
            <p className="text-gray-500 text-xs mt-0.5">{isAdmin ? 'Click on any day to manage events' : 'Hover on events to see details'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-2 rounded-xl border border-emerald-100">
              <FaUmbrellaBeach className="text-emerald-500" />
              <div className="text-sm">
                <span className="font-bold text-emerald-600">{holidayCount}</span>
                <span className="text-gray-500 ml-1">{holidayCount === 1 ? 'Holiday' : 'Holidays'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
              <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"><FaChevronLeft size={12} /></button>
              <span className="text-sm font-semibold text-gray-800 min-w-[120px] text-center">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"><FaChevronRight size={12} /></button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-gray-400 font-medium">Legend:</span>
          {LEGEND_ITEMS.map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${item.color}`}></div><span className="text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-gray-100"><FaSpinner className="animate-spin text-2xl text-indigo-600" /></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
              {WEEKDAYS.map(day => <div key={day} className="py-2.5 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{day}</div>)}
            </div>
            <div className="grid grid-cols-7">{calendarDays}</div>
          </div>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 text-white">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{formData._id ? 'Edit Event' : 'Create Event'}</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><FaTimes size={16} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {renderFormField('Event Title',
                <input type="text" value={formData.title} onChange={(e) => updateFormField('title', e.target.value)} placeholder="e.g., Annual Sports Day" autoFocus className={INPUT_CLASS} />
              )}
              <div className="grid grid-cols-2 gap-3">
                {renderFormField('Start Date',
                  <input type="date" value={formData.startDate} className={INPUT_CLASS}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value, endDate: prev.endDate < e.target.value ? e.target.value : prev.endDate }))} />
                )}
                {renderFormField('End Date',
                  <input type="date" value={formData.endDate} min={formData.startDate} onChange={(e) => updateFormField('endDate', e.target.value)} className={INPUT_CLASS} />
                )}
              </div>
              {renderFormField('Event Type',
                <select value={formData.type} onChange={(e) => updateFormField('type', e.target.value)} className={`${INPUT_CLASS} bg-white`}>
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                </select>
              )}
              {/* ── Phase D: Audience picker (admin only) ── */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Audience</label>
                <div className="space-y-2">
                  {/* Radio: All school */}
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="radio" name="targetAudience" value="all"
                      checked={formData.targetAudience === 'all'}
                      onChange={() => setFormData(prev => ({ ...prev, targetAudience: 'all', targetClasses: [] }))}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">All school <span className="text-gray-400 text-xs">(everyone sees this)</span></span>
                  </label>
                  {/* Radio: Specific Classes */}
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="radio" name="targetAudience" value="classes"
                      checked={formData.targetAudience === 'classes'}
                      onChange={() => updateFormField('targetAudience', 'classes')}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">Specific Classes</span>
                  </label>
                </div>
                {/* Checkbox list — shown only when Specific Classes is selected */}
                {formData.targetAudience === 'classes' && (
                  <div className="mt-2.5 border border-gray-200 rounded-lg overflow-hidden">
                    {classes.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No classes available</p>
                    ) : (
                      <div className="max-h-36 overflow-y-auto divide-y divide-gray-100">
                        {classes.map(cls => {
                          const checked = formData.targetClasses.includes(cls.value);
                          return (
                            <label key={cls.value}
                              className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${checked ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'}`}>
                              <input type="checkbox" checked={checked}
                                onChange={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    targetClasses: checked
                                      ? prev.targetClasses.filter(v => v !== cls.value)
                                      : [...prev.targetClasses, cls.value]
                                  }));
                                }}
                                className="accent-indigo-600 w-4 h-4 shrink-0"
                              />
                              <span className={`text-sm ${checked ? 'font-medium text-indigo-700' : 'text-gray-700'}`}>{cls.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {renderFormField('Description',
                <textarea value={formData.description} onChange={(e) => updateFormField('description', e.target.value)} placeholder="Add event details..." rows={3} className={`${INPUT_CLASS} resize-none`} />
              )}

            </div>
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              {formData._id && (
                <button onClick={handleDeleteEvent} disabled={saving}
                  className="px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2">
                  {saving ? <FaSpinner className="animate-spin" /> : <FaTrash size={14} />} Delete
                </button>
              )}
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium">Cancel</button>
              <button onClick={handleSaveEvent} disabled={!formData.title.trim() || saving}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
                {saving && <FaSpinner className="animate-spin" />}{formData._id ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Calendar;
