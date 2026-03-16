import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../features/auth';
import { FaChevronLeft, FaChevronRight, FaCalendarAlt, FaPlus, FaTrash, FaTimes, FaSpinner, FaClock, FaTag, FaUmbrellaBeach, FaUsers, FaEdit } from 'react-icons/fa';
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
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isTeacher = user?.role === 'teacher';
  const canEdit = isAdmin || isTeacher;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  
  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(null); // String YYYY-MM-DD
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [tooltip, setTooltip] = useState({ event: null, position: { x: 0, y: 0 }, expanded: false });
  const [formData, setFormData] = useState(resetFormForDate(''));
  
  // Class list for target audience picker
  const [classes, setClasses] = useState([]);

  // Fetch classes for dropdown based on role
  useEffect(() => {
    if (!canEdit) return;
    
    // Teachers fetch ONLY their assigned classes from their profile
    // Admins fetch ALL school classes from timetables API
    if (isTeacher) {
      api.get('/users/profile/me')
        .then(res => {
          const profile = res.data?.data;
          const assigned = profile?.assignedClasses || [];
          setClasses(
            assigned.map(t => ({
              value: `${t.standard}-${t.section}`,
              label: `Class ${t.standard} - Section ${t.section}`,
            }))
          );
        })
        .catch(() => {});
    } else {
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
    }
  }, [canEdit, isTeacher]);

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

  const handleDayClick = useCallback((dateStr) => {
    // Both students and admins/teachers can open the day view modal
    setSelectedDateStr(dateStr);
    setShowDayModal(true);
  }, []);

  const openCreateEventModal = (dateStr) => {
    setFormData(resetFormForDate(dateStr));
    setShowEditModal(true);
    // Note: Teacher can only create targeted events, default them to 'classes'
    if (isTeacher) {
      setFormData(prev => ({ ...prev, targetAudience: 'classes' }));
    }
  };

  const openEditEventModal = (event) => {
    setFormData(loadFormFromEvent(event));
    setShowEditModal(true);
  };

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
      setShowEditModal(false); fetchEvents();
    } catch (error) { showMessage(error.response?.data?.message || 'Failed to save event', 'error'); }
    finally { setSaving(false); }
  }, [formData, fetchEvents]);

  const handleDeleteEvent = useCallback(async (idToUse = formData._id) => {
    if (!idToUse) return;
    try { setSaving(true); await api.delete(`/calendar/${idToUse}`); showMessage('Event deleted!'); setShowEditModal(false); fetchEvents(); }
    catch (error) { showMessage(error.response?.data?.message || 'Failed to delete event', 'error'); }
    finally { setSaving(false); }
  }, [formData._id, fetchEvents]);

  const handleClearDayEvents = async (dateStr) => {
    if (!window.confirm(`Are you sure you want to clear all your events on ${dateStr}?`)) return;
    try {
      setSaving(true);
      const res = await api.delete(`/calendar/date/${dateStr}`);
      showMessage(res.data?.message || 'Events cleared!');
      fetchEvents();
    } catch (error) {
       showMessage(error.response?.data?.message || 'Failed to clear events', 'error');
    } finally {
      setSaving(false);
    }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const calendarDays = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} className="h-28 bg-gray-50/40 border-b border-r border-gray-100"></div>);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
      const dayEvents = getEventsForDate[dateStr] || [];
      const isToday = dateStr === formatDate(new Date());
      cells.push(
        <div key={day} onClick={() => handleDayClick(dateStr)}
          className={`h-28 border-b border-r border-gray-200 p-1.5 transition-all group relative overflow-hidden cursor-pointer hover:bg-gray-50 ${isToday ? 'bg-indigo-50/30' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700'}`}>{day}</span>
            {canEdit && <FaPlus className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]" onClick={(e) => { e.stopPropagation(); openCreateEventModal(dateStr); }} />}
          </div>
          <div className="space-y-[3px] overflow-hidden">
            {dayEvents.slice(0, 3).map((event, idx) => {
              const colors = getTypeColors(event.type);
              return (
                <div key={event._id || idx} onMouseEnter={(e) => handleEventHover(event, e)} onMouseLeave={() => handleEventHover(null)}
                  className={`text-[9.5px] leading-tight font-medium px-1.5 py-0.5 rounded border border-transparent hover:border-black/5 truncate transition-all ${colors.bg} ${colors.text}`}>
                  {event.title}
                </div>
              );
            })}
            {dayEvents.length > 3 && <div className="text-[10px] text-gray-500 font-medium pl-1 bg-gray-50 rounded py-0.5 text-center mt-1 border border-gray-100">+{dayEvents.length - 3} more</div>}
          </div>
        </div>
      );
    }
    return cells;
  }, [currentDate, daysInMonth, firstDay, getEventsForDate, canEdit, handleDayClick, handleEventHover]);

  const renderFormField = (label, children) => (
    <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>
  );

  return (
    <DashboardLayout>
      {message.text && (
        <div className={`fixed top-6 right-6 z-[60] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-fadeIn ${message.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {message.type === 'error' ? <FaTimes /> : <FaCalendarAlt />}{message.text}
        </div>
      )}
      {tooltip.event && !showDayModal && (
        <div className="fixed z-40 bg-white rounded-xl shadow-xl border border-gray-200 p-4 min-w-[260px] max-w-[340px] animate-fadeIn pointer-events-none"
          style={{ left: `${Math.min(tooltip.position.x, window.innerWidth - 360)}px`, top: `${tooltip.position.y}px`, transform: 'translateX(-50%)' }}>
          <div className="flex items-start gap-3">
            <div className={`w-1.5 rounded-full flex-shrink-0 ${getTypeColors(tooltip.event.type).bg}`} style={{ minHeight: '50px' }}></div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-sm mb-2 leading-tight">{tooltip.event.title}</h4>
              <div className="flex items-center gap-2 mb-2">
                 <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${getTypeColors(tooltip.event.type).light}`}>{TYPE_CONFIG[tooltip.event.type]?.label || 'Event'}</span>
              </div>
              {tooltip.event.targetAudience === 'classes' && tooltip.event.targetClasses?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 mb-2">
                  {tooltip.event.targetClasses.map(c => <span key={c} className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{c}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5"><FaCalendarAlt className="text-indigo-600" /> Academic Calendar</h1>
            <p className="text-gray-500 text-xs mt-1">{canEdit ? 'Click any day to view or add events. Hover for quick details.' : 'Click on a day to see scheduled events.'}</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-green-50 px-3 py-1.5 rounded-lg border border-emerald-100 whitespace-nowrap">
              <FaUmbrellaBeach className="text-emerald-500 text-sm" />
              <div className="text-xs">
                <span className="font-bold text-emerald-700">{holidayCount}</span>
                <span className="text-emerald-600/80 ml-1 uppercase tracking-wider font-semibold">Holidays</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
              <button onClick={prevMonth} className="p-2 hover:bg-white rounded shadow-sm text-gray-600 transition-all active:scale-95"><FaChevronLeft size={12} /></button>
              <span className="text-[13px] font-bold text-gray-800 min-w-[130px] text-center tracking-wide">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              <button onClick={nextMonth} className="p-2 hover:bg-white rounded shadow-sm text-gray-600 transition-all active:scale-95"><FaChevronRight size={12} /></button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-xs bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100">
          <span className="text-gray-400 font-bold uppercase tracking-wider">Legend:</span>
          {LEGEND_ITEMS.map(item => (
            <div key={item.label} className="flex items-center gap-2 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color} shadow-sm`}></div><span className="text-gray-700 font-medium">{item.label}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96 bg-white rounded-xl shadow-sm border border-gray-200"><FaSpinner className="animate-spin text-3xl text-indigo-600/50" /></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ring-1 ring-black/5">
            <div className="grid grid-cols-7 bg-gray-50/80 border-b border-gray-200">
              {WEEKDAYS.map(day => <div key={day} className="py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-widest">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 bg-white">{calendarDays}</div>
          </div>
        )}
      </div>

      {/* ── Day Details Modal ── */}
      {showDayModal && selectedDateStr && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <div>
                 <h2 className="text-lg font-bold text-gray-900">
                   {new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                 </h2>
                 <p className="text-xs font-medium text-gray-500 mt-0.5">{getEventsForDate[selectedDateStr]?.length || 0} events scheduled</p>
               </div>
               <button onClick={() => setShowDayModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><FaTimes size={18} /></button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 bg-gray-50/30">
              {(!getEventsForDate[selectedDateStr] || getEventsForDate[selectedDateStr].length === 0) ? (
                <div className="text-center py-12">
                   <div className="w-16 h-16 bg-gray-100 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4"><FaCalendarAlt size={24} /></div>
                   <h3 className="text-sm font-bold text-gray-700 mb-1">No events scheduled</h3>
                   <p className="text-xs text-gray-400 font-medium">Enjoy your free day!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getEventsForDate[selectedDateStr].map(event => {
                    const colors = getTypeColors(event.type);
                    // Determine if current user can edit this specific event. 
                    // Admins can edit anything.
                    // Teachers can only edit non-school-wide events that they have access to. Wait, for UI simplicity, if they see it and it's 'classes', let's assume they can edit it (backend verifies). Actually backend throws 403 if they edit a school-wide event.
                    const canEditEvent = isAdmin || (isTeacher && event.targetAudience !== 'all');

                    return (
                      <div key={event._id} className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow relative group">
                        <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${colors.bg}`}></div>
                        <div className="p-4 pl-5">
                           <div className="flex justify-between items-start mb-2 gap-3">
                              <h4 className="font-bold text-gray-900 leading-tight">{event.title}</h4>
                              {canEditEvent && (
                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openEditEventModal(event)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded bg-white border border-transparent hover:border-indigo-100 transition-colors"><FaEdit size={12}/></button>
                                  <button onClick={() => { if(window.confirm('Delete this event?')) handleDeleteEvent(event._id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded bg-white border border-transparent hover:border-red-100 transition-colors"><FaTrash size={12}/></button>
                                </div>
                              )}
                           </div>
                           <div className="flex flex-wrap gap-2 mb-2 items-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${colors.light}`}>{TYPE_CONFIG[event.type]?.label || 'Event'}</span>
                              {!event.allDay && (
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                   <FaClock className="text-gray-400"/>
                                   {new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(event.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                              )}
                           </div>
                           {event.targetAudience === 'classes' && event.targetClasses?.length > 0 && (
                             <div className="flex flex-wrap gap-1 mb-2">
                               {event.targetClasses.map(c => <span key={c} className="text-[10px] font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100">{c}</span>)}
                             </div>
                           )}
                           {event.description && <p className="text-xs font-medium text-gray-600 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100 mt-2">{event.description}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            
            {canEdit && (
              <div className="p-4 border-t border-gray-100 bg-white flex justify-between gap-3">
                 {getEventsForDate[selectedDateStr]?.length > 0 ? (
                   <button onClick={() => handleClearDayEvents(selectedDateStr)} disabled={saving} className="px-4 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center min-w-[120px]">
                     {saving ? <FaSpinner className="animate-spin"/> : 'Clear All'}
                   </button>
                 ) : <div></div>}
                 <button onClick={() => openCreateEventModal(selectedDateStr)} className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2">
                    <FaPlus size={10} /> Add New Event
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create / Edit Event Form Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[95vh]">
            <div className={`px-6 py-5 text-white bg-gradient-to-r ${formData._id ? 'from-amber-600 to-orange-600' : 'from-indigo-600 to-purple-600'}`}>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold tracking-wide">{formData._id ? 'Edit Calendar Event' : 'Create New Event'}</h3>
                <button onClick={() => setShowEditModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><FaTimes size={16} /></button>
              </div>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              {renderFormField('Event Title',
                <input type="text" value={formData.title} onChange={(e) => updateFormField('title', e.target.value)} placeholder="e.g., Annual Sports Day" autoFocus className={INPUT_CLASS} />
              )}
              <div className="grid grid-cols-2 gap-4">
                {renderFormField('Start Date',
                  <input type="date" value={formData.startDate} className={INPUT_CLASS}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value, endDate: prev.endDate < e.target.value ? e.target.value : prev.endDate }))} />
                )}
                {renderFormField('End Date',
                  <input type="date" value={formData.endDate} min={formData.startDate} onChange={(e) => updateFormField('endDate', e.target.value)} className={INPUT_CLASS} />
                )}
              </div>
              <div className="flex items-center gap-2">
                 <input type="checkbox" id="allDay" checked={formData.allDay} onChange={(e) => updateFormField('allDay', e.target.checked)} className="w-4 h-4 accent-indigo-600 rounded cursor-pointer" />
                 <label htmlFor="allDay" className="text-sm font-semibold text-gray-700 cursor-pointer">All Day Event</label>
              </div>
              
              {renderFormField('Event Type',
                <select value={formData.type} onChange={(e) => updateFormField('type', e.target.value)} className={`${INPUT_CLASS} bg-gray-50 font-medium`}>
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                </select>
              )}
              
              {/* Audience picker */}
              <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Event Audience</label>
                
                {isTeacher && formData.targetAudience === 'all' && (
                   <p className="text-xs text-amber-600 font-semibold mb-3 bg-amber-50 p-2 rounded border border-amber-100">
                     Teachers cannot edit school-wide events.
                   </p>
                )}

                <div className="space-y-3">
                  <label className={`flex items-center gap-3 cursor-pointer group ${isTeacher ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="radio" name="targetAudience" value="all"
                      checked={formData.targetAudience === 'all'}
                      onChange={() => setFormData(prev => ({ ...prev, targetAudience: 'all', targetClasses: [] }))}
                      className="accent-indigo-600 w-4 h-4 mt-0.5"
                      disabled={isTeacher}
                    />
                    <div>
                      <span className="text-sm font-bold text-gray-900 block">Entire School</span>
                      <span className="text-xs font-medium text-gray-500">Visible to every student and teacher</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="radio" name="targetAudience" value="classes"
                      checked={formData.targetAudience === 'classes'}
                      onChange={() => updateFormField('targetAudience', 'classes')}
                      className="accent-indigo-600 w-4 h-4 mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-bold text-gray-900 block">Specific Classes Only</span>
                      <span className="text-xs font-medium text-gray-500">{isTeacher ? 'Select from your assigned classes' : 'Target specific classes or sections'}</span>
                    </div>
                  </label>
                </div>
                {/* Class selector */}
                {formData.targetAudience === 'classes' && (
                  <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    {classes.length === 0 ? (
                      <p className="text-xs font-semibold text-gray-400 text-center py-4">No classes available</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                        {classes.map(cls => {
                          const checked = formData.targetClasses.includes(cls.value);
                          return (
                            <label key={cls.value}
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-indigo-50/50' : 'bg-white hover:bg-gray-50'}`}>
                              <input type="checkbox" checked={checked}
                                onChange={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    targetClasses: checked
                                      ? prev.targetClasses.filter(v => v !== cls.value)
                                      : [...prev.targetClasses, cls.value]
                                  }));
                                }}
                                className="accent-indigo-600 w-4 h-4 shrink-0 rounded"
                              />
                              <span className={`text-sm ${checked ? 'font-bold text-indigo-800' : 'font-semibold text-gray-700'}`}>{cls.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {renderFormField('Description (Optional)',
                <textarea value={formData.description} onChange={(e) => updateFormField('description', e.target.value)} placeholder="Add specific details or instructions..." rows={3} className={`${INPUT_CLASS} resize-none`} />
              )}

            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 mt-auto">
              <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-all text-sm font-bold shadow-sm">Cancel</button>
              <button onClick={handleSaveEvent} disabled={!formData.title.trim() || saving || (formData.targetAudience === 'classes' && formData.targetClasses.length === 0)}
                className="flex-[2] bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-sm ring-1 ring-indigo-600/50">
                {saving && <FaSpinner className="animate-spin" />}
                {formData.targetAudience === 'classes' && formData.targetClasses.length === 0 ? 'Select a Class' : formData._id ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Calendar;
