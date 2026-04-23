import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../auth';
import { FaChevronLeft, FaChevronRight, FaCalendarAlt, FaPlus, FaTrash, FaTimes, FaClock, FaUmbrellaBeach, FaUsers, FaEdit } from 'react-icons/fa';
import api from '../../lib/axios';
import { ButtonSpinner } from '../../components/ui/Spinner';
import { useToastMessage } from '../../hooks/useToastMessage';
import { useSchoolClasses } from '../../hooks/useSchoolClasses';
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
  useClearDayEvents,
} from './api/queries';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TYPE_CONFIG = {
  national: { bg: 'bg-emerald-500', text: 'text-white', light: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'National Holiday' },
  exam: { bg: 'bg-blue-500', text: 'text-white', light: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Exam' },
  custom: { bg: 'bg-amber-400', text: 'text-amber-900', light: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Custom' },
};
const LEGEND_ITEMS = [
  { color: 'bg-emerald-500', label: 'National Holiday' },
  { color: 'bg-blue-500', label: 'Exam' },
  { color: 'bg-amber-400', label: 'Custom' },
];
const getTypeColors = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.national;
const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const resetFormForDate = (dateStr) => ({ 
  title: '', startDate: dateStr, startTime: '09:00', endDate: dateStr, endTime: '10:00', 
  type: 'national', description: '', allDay: true, targetAudience: 'all', targetClasses: [] 
});
const loadFormFromEvent = (event) => {
  const s = new Date(event.start);
  const e = new Date(event.end);
  return {
    _id: event._id, title: event.title, 
    startDate: formatDate(s),
    startTime: `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`,
    endDate: formatDate(e), 
    endTime: `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`,
    type: TYPE_CONFIG[event.type] ? event.type : 'national', description: event.description || '', allDay: event.allDay !== false,
    targetAudience: event.targetAudience || 'all',
    targetClasses: event.targetClasses || [],
  };
};

const CalendarPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isTeacher = user?.role === 'teacher';
  const canEdit = isAdmin || isTeacher;

  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear  = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();   // 0-indexed, matches Date API

  // ── React Query ──────────────────────────────────────────────────────────
  const { data: events = [], isLoading: loading } = useCalendarEvents(currentYear, currentMonth);
  const { mutateAsync: createEvent,  isPending: creatingEvent  } = useCreateCalendarEvent(currentYear, currentMonth);
  const { mutateAsync: updateEvent,  isPending: updatingEvent  } = useUpdateCalendarEvent(currentYear, currentMonth);
  const { mutateAsync: deleteEvent,  isPending: deletingEvent  } = useDeleteCalendarEvent(currentYear, currentMonth);
  const { mutateAsync: clearDay,     isPending: clearingDay    } = useClearDayEvents(currentYear, currentMonth);

  const saving = creatingEvent || updatingEvent || deletingEvent || clearingDay;

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(null); // String YYYY-MM-DD

  const [tooltip, setTooltip] = useState({ event: null, position: { x: 0, y: 0 }, placement: 'bottom', expanded: false });
  const [formData, setFormData] = useState(resetFormForDate(''));
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: 'single', id: null, dateStr: null, hasExams: false });
  
  // Class list for target audience picker
  const [classes, setClasses] = useState([]);
  const [availableClasses, setAvailableClasses] = useState({ standards: [], sections: [], classSections: [] });
  const [adminClassInput, setAdminClassInput] = useState({ standard: '', section: '' });
  const { payload: adminSchoolClasses } = useSchoolClasses({ enabled: canEdit && isAdmin });

  // Fetch classes for dropdown based on role
  useEffect(() => {
    if (!canEdit) return;
    
    // Teachers can target ONLY their class-teacher class from their profile.
    if (isTeacher) {
      api.get('/users/me/profile')
        .then(res => {
          const userObj = res.data?.data;
          const profile = userObj?.profile || userObj;
          const classTeacherOf = profile?.classTeacherOf;
          if (classTeacherOf?.standard && classTeacherOf?.section) {
            setClasses([{
              value: `${classTeacherOf.standard}-${classTeacherOf.section}`,
              label: `Class ${classTeacherOf.standard} - Section ${classTeacherOf.section}`,
            }]);
            return;
          }
          setClasses([]);
        })
        .catch(() => {});
    }
  }, [canEdit, isTeacher]);

  useEffect(() => {
    if (!isAdmin) return;

    setAvailableClasses({
      standards: (adminSchoolClasses?.standards || []).map(v => String(v)),
      sections: (adminSchoolClasses?.sections || []).map(v => String(v).toUpperCase()),
      classSections: (adminSchoolClasses?.classSections || []).map(c => ({
        standard: String(c.standard),
        section: String(c.section).toUpperCase(),
      })),
    });
  }, [adminSchoolClasses, isAdmin]);

  const normalizedStandard = adminClassInput.standard.trim();

  const adminStandardOptions = useMemo(() => {
    const fromPairs = Array.from(
      new Set(
        (availableClasses.classSections || [])
          .map(c => String(c.standard || '').trim())
          .filter(Boolean)
      )
    );
    if (fromPairs.length > 0) {
      return fromPairs.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }

    const fallback = Array.from(
      new Set((availableClasses.standards || []).map(v => String(v || '').trim()).filter(Boolean))
    );
    return fallback.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [availableClasses.classSections, availableClasses.standards]);

  const adminSectionOptions = useMemo(() => {
    if (!normalizedStandard) return [];

    const byStandard = Array.from(
      new Set(
        (availableClasses.classSections || [])
          .filter(c => String(c.standard || '').trim() === normalizedStandard)
          .map(c => String(c.section || '').trim().toUpperCase())
          .filter(Boolean)
      )
    );
    if (byStandard.length > 0) {
      return byStandard.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }

    const fallback = Array.from(
      new Set((availableClasses.sections || []).map(v => String(v || '').trim().toUpperCase()).filter(Boolean))
    );
    return fallback.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [availableClasses.classSections, availableClasses.sections, normalizedStandard]);

  const isClassSelectionInvalid = formData.targetAudience === 'classes' && formData.targetClasses.length === 0;

  const { message, showMessage } = useToastMessage();
  const updateFormField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  // fetchEvents is no longer needed — React Query re-fetches automatically when
  // currentYear/currentMonth change (month navigation) or after mutations.

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

  const selectedDayEvents = useMemo(
    () => (selectedDateStr ? (getEventsForDate[selectedDateStr] || []) : []),
    [getEventsForDate, selectedDateStr]
  );

  const hasExamModuleEvents = useMemo(
    () => selectedDayEvents.some(event => event.sourceType === 'exam'),
    [selectedDayEvents]
  );

  const hasClearableDayEvents = useMemo(
    () => selectedDayEvents.some(event => !event.sourceType),
    [selectedDayEvents]
  );

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
    setAdminClassInput({ standard: '', section: '' });
    setShowEditModal(true);
    // Note: Teacher can only create targeted events, default them to 'classes'
    if (isTeacher) {
      setFormData(prev => ({ ...prev, targetAudience: 'classes' }));
    }
  };

  const openEditEventModal = (event) => {
    setFormData(loadFormFromEvent(event));
    if (isAdmin) {
      setAdminClassInput({ standard: '', section: '' });
    }
    setShowEditModal(true);
  };

  const handleEventHover = useCallback((event, e) => {
    if (event) {
      const rect = e.currentTarget.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Heuristic: If the event is in the bottom half of the viewport, show tooltip above.
      const shouldShowAbove = rect.bottom > windowHeight / 2;
      
      setTooltip({ 
        event, 
        position: { 
          x: rect.left + rect.width / 2, 
          y: shouldShowAbove ? rect.top - 12 : rect.bottom + 12 
        }, 
        placement: shouldShowAbove ? 'top' : 'bottom',
        expanded: false 
      });
    } else { 
      setTooltip({ event: null, position: { x: 0, y: 0 }, placement: 'bottom', expanded: false }); 
    }
  }, []);

  const handleSaveEvent = useCallback(async () => {
    if (!formData.title.trim()) return;

    if (isAdmin && formData.targetAudience === 'classes' && formData.targetClasses.length === 0) {
      showMessage('Please select at least one class.', 'error');
      return;
    }

    let startD, endD;
    if (formData.allDay) {
      startD = new Date(formData.startDate);
      startD.setHours(0, 0, 0, 0);
      endD = new Date(formData.endDate);
      endD.setHours(23, 59, 59, 999);
    } else {
      startD = new Date(`${formData.startDate}T${formData.startTime}:00`);
      endD = new Date(`${formData.endDate}T${formData.endTime}:00`);
    }

    const payload = {
      title: formData.title.trim(),
      start: startD.toISOString(),
      end: endD.toISOString(),
      allDay: formData.allDay,
      type: formData.type,
      description: formData.description,
      targetAudience: formData.targetAudience,
      targetClasses: formData.targetClasses,
    };

    try {
      if (formData._id) {
        await updateEvent({ id: formData._id, payload });
        showMessage('success', 'Event updated!');
      } else {
        await createEvent(payload);
        showMessage('success', 'Event created!');
      }
      setShowEditModal(false);
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to save event');
    }
  }, [formData, createEvent, updateEvent, isAdmin, showMessage]);

  const handleDeleteEvent = useCallback(async (idToUse = formData._id) => {
    if (!idToUse) return;
    try {
      await deleteEvent(idToUse);
      showMessage('success', 'Event deleted!');
      setShowEditModal(false);
      setDeleteConfirm({ open: false, type: 'single', id: null, dateStr: null, hasExams: false });
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to delete event');
    }
  }, [formData._id, deleteEvent, showMessage]);

  const handleClearDayEvents = (dateStr, containsExamManagedEvents = false) => {
    setDeleteConfirm({
      open: true,
      type: 'clear',
      dateStr,
      hasExams: containsExamManagedEvents,
    });
  };

  const executeClearDayEvents = async () => {
    const { dateStr } = deleteConfirm;
    if (!dateStr) return;
    try {
      const res = await clearDay(dateStr);
      showMessage('success', res?.message || 'Events cleared!');
      setDeleteConfirm({ open: false, type: 'single', id: null, dateStr: null, hasExams: false });
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to clear events');
    }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const calendarDays = useMemo(() => {
    const cells = [];
    

    for (let i = 0; i < firstDay; i++) {
      const isFirstRow = i < 7;
      const isFirstCol = i % 7 === 0;
      cells.push(
        <div 
          key={`empty-${i}`} 
          className={`h-28 bg-gray-50/40 border-b border-r border-gray-200 ${isFirstRow ? 'border-t' : ''} ${isFirstCol ? 'border-l' : ''}`}
        />
      );
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const cellIndex = firstDay + day - 1;
      const isFirstRow = cellIndex < 7;
      const isFirstCol = cellIndex % 7 === 0;
      const dateStr = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
      const dayEvents = getEventsForDate[dateStr] || [];
      const isToday = dateStr === formatDate(new Date());
      
      cells.push(
        <div 
          key={day} 
          onClick={() => handleDayClick(dateStr)}
          className={`h-28 border-b border-r border-gray-200 p-1.5 transition-all group relative overflow-hidden cursor-pointer hover:bg-gray-50 ${isFirstRow ? 'border-t' : ''} ${isFirstCol ? 'border-l' : ''} ${isToday ? 'bg-indigo-50/30' : 'bg-transparent'}`}
        >
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

const INPUT_CLASS = 'w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 text-sm font-medium transition-all';
const LABEL_CLASS = 'block text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2';

const renderFormField = (label, children) => (
  <div className="space-y-2"><label className={LABEL_CLASS}>{label}</label>{children}</div>
);

  return (
    <DashboardLayout>
      {message?.text && (
        <div className={`fixed top-6 left-4 right-4 sm:left-auto sm:right-6 z-[100] px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${message.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
          {message?.type === 'error' ? <FaTimes /> : <FaCalendarAlt />}{message?.text}
        </div>
      )}
      {tooltip.event && !showDayModal && createPortal(
        <div className="fixed z-[10000] pointer-events-none"
          style={{ 
            left: `${Math.min(Math.max(tooltip.position.x, 190), window.innerWidth - 190)}px`, 
            top: tooltip.placement === 'bottom' ? `${tooltip.position.y}px` : 'auto',
            bottom: tooltip.placement === 'top' ? `${window.innerHeight - tooltip.position.y}px` : 'auto',
            transform: 'translateX(-50%)' 
          }}>
          <div className="animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 min-w-[280px] max-w-[350px]">
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
          </div>
        </div>,
        document.body
      )}
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/10">
                        <FaCalendarAlt size={20} />
                    </div>
                    <h1 className="page-title">Academic Calendar</h1>
                </div>
                <p className="page-subtitle ml-12">{canEdit ? 'Click any day to view or add events. Hover for quick details.' : 'Click on a day to see scheduled events.'}</p>
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
          <div className="rounded-xl shadow-sm border border-gray-200 overflow-hidden ring-1 ring-black/5">
            {/* Weekday header — same as real grid */}
            <div className="grid grid-cols-7 bg-gray-50/80 border-b border-gray-200">
              {WEEKDAYS.map(day => (
                <div key={day} className="py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>
            {/* 5 skeleton rows × 7 cells — matches real cell min-height */}
            <div className="grid grid-cols-7 bg-white">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="border-b border-r border-gray-100 p-2 min-h-[90px] flex flex-col gap-1.5"
                  style={{ animationDelay: `${(i % 7) * 0.04}s` }}
                >
                  {/* Date number bone */}
                  <div className="skeleton-shimmer h-5 w-5 rounded-full self-end" />
                  {/* 0–2 event pill bones — vary by position for realism */}
                  {i % 5 !== 0 && <div className="skeleton-shimmer h-3.5 rounded w-full" />}
                  {i % 3 === 0 && <div className="skeleton-shimmer h-3.5 rounded w-4/5" />}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl shadow-sm border border-gray-200 overflow-hidden ring-1 ring-black/5">
            <div className="grid grid-cols-7 bg-gray-50/80 border-b border-gray-200">
              {WEEKDAYS.map(day => <div key={day} className="py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-widest">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 bg-transparent">{calendarDays}</div>
          </div>
        )}

      </div>

      {/* ── Day Details Modal ── */}
      {showDayModal && selectedDateStr && (
        <div className="modal-overlay fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <div>
                 <h2 className="text-lg font-bold text-gray-900">
                   {new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                 </h2>
                 <p className="text-xs font-medium text-gray-500 mt-0.5">{selectedDayEvents.length} events scheduled</p>
               </div>
               <button onClick={() => setShowDayModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><FaTimes size={18} /></button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 bg-gray-50/30">
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-12">
                   <div className="w-16 h-16 bg-gray-100 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4"><FaCalendarAlt size={24} /></div>
                   <h3 className="text-sm font-bold text-gray-700 mb-1">No events scheduled</h3>
                   <p className="text-xs text-gray-400 font-medium">Enjoy your free day!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map(event => {
                    const colors = getTypeColors(event.type);
                    // Determine if current user can edit this specific event.
                    // Exam events created from Examination module are read-only here.
                    const canEditEvent = !event.sourceType && (isAdmin || (isTeacher && event.targetAudience !== 'all'));

                    return (
                      <div key={event._id} className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow relative group">
                        <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${colors.bg}`}></div>
                        <div className="p-4 pl-5">
                           <div className="flex justify-between items-start mb-2 gap-3">
                              <h4 className="font-bold text-gray-900 leading-tight">{event.title}</h4>
                              {canEditEvent && (
                                <div className="flex gap-2 transition-opacity">
                                  <button 
                                    onClick={() => openEditEventModal(event)} 
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl bg-white border border-gray-100 hover:border-indigo-200 transition-all shadow-sm active:scale-90"
                                    title="Edit Event"
                                  >
                                    <FaEdit size={14}/>
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirm({ open: true, type: 'single', id: event._id })} 
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl bg-white border border-gray-100 hover:border-red-200 transition-all shadow-sm active:scale-90"
                                    title="Delete Event"
                                  >
                                    <FaTrash size={14}/>
                                  </button>
                                </div>
                              )}
                           </div>
                           <div className="flex flex-wrap gap-2 mb-2 items-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${colors.light}`}>{TYPE_CONFIG[event.type]?.label || 'Event'}</span>
                              {!event.allDay && (
                                 <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                    <FaClock className="text-gray-400"/>
                                    {new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {event.end ? new Date(event.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD'}
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
                  {hasExamModuleEvents && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-medium text-blue-800">
                      This exam event is managed from the Examination section. Once the exam is completed, this calendar event will be auto-deleted.
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {canEdit && (
              <div className="p-4 border-t border-gray-100 bg-white flex justify-between gap-3">
                 {hasClearableDayEvents ? (
                   <button onClick={() => handleClearDayEvents(selectedDateStr, hasExamModuleEvents)} disabled={saving} className="px-4 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center min-w-[120px]">
                     {saving ? <ButtonSpinner className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : (hasExamModuleEvents ? 'Clear Non-Exam' : 'Clear All')}
                   </button>
                 ) : <div></div>}
                 <button onClick={() => openCreateEventModal(selectedDateStr)} className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2">
                    <FaPlus size={10} /> Add New Event
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

          {/* ── Premium Create / Edit Event Form Modal ── */}
      {showEditModal && (
        <div className="modal-overlay fixed inset-0 bg-indigo-900/30 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fadeIn">
          <div className="bg-[#fbfbfe] rounded-[28px] shadow-2xl border border-indigo-100/60 max-w-5xl w-full flex flex-col md:flex-row overflow-hidden relative z-10">
            
            {/* Close Button */}
            <button onClick={() => setShowEditModal(false)} className="absolute top-3 right-3 z-30 w-10 h-10 flex items-center justify-center bg-white border border-gray-200 text-gray-500 rounded-full transition-colors hover:text-gray-800 hover:border-gray-300">
              <FaTimes size={14} />
            </button>

            {/* Left Column: Core Subject details */}
            <div className="w-full md:w-[60%] flex flex-col h-full border-r border-gray-100/80 bg-transparent p-8 relative">
              <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-8 relative z-10">
                {formData._id ? 'Edit Event' : 'Create Event'}
                <div className="w-16 h-1 bg-indigo-600 rounded-full mt-3 opacity-90"></div>
              </h3>

              <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-3 relative z-10">
                {renderFormField('Event Title',
                  <input type="text" value={formData.title} onChange={(e) => updateFormField('title', e.target.value)} placeholder="e.g., Annual Sports Day" autoFocus className={INPUT_CLASS} />
                )}
                
                <div className="grid grid-cols-2 gap-5">
                  {renderFormField('Start Date',
                    <div className="relative group">
                      <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input type="date" value={formData.startDate} className={`${INPUT_CLASS} pl-11`}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value, endDate: prev.endDate < e.target.value ? e.target.value : prev.endDate }))} />
                    </div>
                  )}
                  {renderFormField('End Date',
                    <div className="relative group">
                      <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input type="date" value={formData.endDate} min={formData.startDate} onChange={(e) => updateFormField('endDate', e.target.value)} className={`${INPUT_CLASS} pl-11`} />
                    </div>
                  )}
                </div>
                
                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-700">
                  <input type="checkbox" id="allDay" checked={formData.allDay} onChange={(e) => updateFormField('allDay', e.target.checked)} className="w-5 h-5 accent-indigo-600 rounded-md" />
                  All Day Event
                </label>

                {!formData.allDay && (
                  <div className="grid grid-cols-2 gap-5 animate-fadeIn">
                    {renderFormField('Start Time',
                      <div className="relative group">
                        <FaClock className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input type="time" value={formData.startTime} onChange={(e) => updateFormField('startTime', e.target.value)} className={`${INPUT_CLASS} pl-11`} />
                      </div>
                    )}
                    {renderFormField('End Time',
                      <div className="relative group">
                        <FaClock className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input type="time" value={formData.endTime} onChange={(e) => updateFormField('endTime', e.target.value)} className={`${INPUT_CLASS} pl-11`} />
                      </div>
                    )}
                  </div>
                )}
                
                {renderFormField('Event Description',
                  <textarea value={formData.description} onChange={(e) => updateFormField('description', e.target.value)} placeholder="Add specific details or instructions..." rows={5} className={`${INPUT_CLASS} resize-none`} />
                )}
              </div>
            </div>

            {/* Right Column: Configuration & Audience */}
            <div className="w-full md:w-[40%] flex flex-col h-full bg-transparent relative">
              <div className="p-8 flex-1 overflow-hidden flex flex-col relative z-10">
                {renderFormField('Event Type',
                  <select value={formData.type} onChange={(e) => updateFormField('type', e.target.value)} className={`${INPUT_CLASS} appearance-none cursor-pointer font-semibold text-gray-700`}>
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                  </select>
                )}
                
                <div className="mt-8 flex-1 flex flex-col overflow-hidden">
                  <label className={LABEL_CLASS}>Event Audience</label>
                  
                  {isTeacher && formData.targetAudience === 'all' && (
                     <div className="text-xs text-amber-700 font-bold mb-3 bg-amber-100/50 px-3 py-2.5 rounded-xl border border-amber-200/50 flex items-center gap-2">
                       <FaTimes className="text-amber-500"/>
                       Teachers cannot edit school-wide events.
                     </div>
                  )}

                  <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-200 shrink-0">
                    <button
                      onClick={() => !isTeacher && setFormData(prev => ({ ...prev, targetAudience: 'all', targetClasses: [] }))}
                      disabled={isTeacher}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${formData.targetAudience === 'all' ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:text-gray-900'} ${isTeacher ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      Entire School
                    </button>
                    <button
                      onClick={() => updateFormField('targetAudience', 'classes')}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${formData.targetAudience === 'classes' ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Specific Classes
                    </button>
                  </div>
                  
                  {/* Class selector */}
                  {formData.targetAudience === 'classes' && (
                    isAdmin ? (
                      <div className="mt-4 bg-white border border-gray-200 rounded-2xl p-4">
                        <div className="flex gap-3 items-end">
                          <div className="flex-1 space-y-2">
                            <select
                              value={adminClassInput.standard}
                              onChange={(e) => setAdminClassInput({ standard: e.target.value, section: '' })}
                              className={`${INPUT_CLASS} appearance-none py-2`}
                            >
                              <option value="">Select Class</option>
                              {adminStandardOptions.map((standard) => (
                                <option key={standard} value={standard}>{standard}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1 space-y-2">
                            <select
                              value={adminClassInput.section}
                              onChange={(e) => setAdminClassInput(prev => ({ ...prev, section: e.target.value }))}
                              disabled={!normalizedStandard || adminSectionOptions.length === 0}
                              className={`${INPUT_CLASS} appearance-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed py-2`}
                            >
                              <option value="">
                                {!normalizedStandard ? 'Select Class First' : 'Select Section'}
                              </option>
                              {normalizedStandard && adminSectionOptions.length > 0 && <option value="ALL">All Sections</option>}
                              {adminSectionOptions.map((section) => (
                                <option key={section} value={section}>{section}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            disabled={!adminClassInput.standard || !adminClassInput.section}
                            onClick={() => {
                              let newClasses = [];
                              if (adminClassInput.section === 'ALL') {
                                newClasses = adminSectionOptions.map(sec => `${adminClassInput.standard}-${sec}`);
                              } else {
                                newClasses = [`${adminClassInput.standard}-${adminClassInput.section}`];
                              }
                              setFormData(prev => {
                                const classesSet = new Set(prev.targetClasses || []);
                                newClasses.forEach(c => classesSet.add(c));
                                return { ...prev, targetClasses: Array.from(classesSet) };
                              });
                              setAdminClassInput({ standard: '', section: '' });
                            }}
                            className="p-3 mb-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                            title="Add Class"
                          >
                            <FaPlus />
                          </button>
                        </div>
                        {formData.targetClasses?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {formData.targetClasses.map(c => (
                              <div key={c} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm">
                                <span>{c}</span>
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, targetClasses: prev.targetClasses.filter(x => x !== c) }))}
                                  className="text-indigo-400 hover:text-indigo-600 focus:outline-none p-0.5 rounded-full hover:bg-indigo-200/50 transition-colors"
                                >
                                  <FaTimes size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className={`mt-3 text-xs font-semibold ${formData.targetClasses?.length > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {formData.targetClasses?.length > 0 ? `${formData.targetClasses.length} class(es) selected.` : 'Add at least one class to continue.'}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden flex-1 flex flex-col">
                        {classes.length === 0 ? (
                          <div className="flex flex-col items-center justify-center flex-1 py-8 opacity-60">
                            <FaUsers size={32} className="text-gray-300 mb-3" />
                            <p className="text-sm font-bold text-gray-400">No classes assigned to you</p>
                          </div>
                        ) : (
                          <div className="overflow-y-auto flex-1 custom-scrollbar p-2.5 space-y-2">
                            {classes.map(cls => {
                              const checked = formData.targetClasses.includes(cls.value);
                              return (
                                <label key={cls.value}
                                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl transition-all border ${checked ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                                  <input type="checkbox" checked={checked}
                                    onChange={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        targetClasses: checked
                                          ? prev.targetClasses.filter(v => v !== cls.value)
                                          : [...prev.targetClasses, cls.value]
                                      }));
                                    }}
                                    className="accent-indigo-600 w-4 h-4 shrink-0 rounded transition-transform active:scale-95"
                                  />
                                  <span className={`text-sm ${checked ? 'font-black text-indigo-900' : 'font-bold text-gray-600'}`}>{cls.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Action Buttons fixed to bottom of right column */}
              <div className="p-6 bg-white border-t border-gray-100 flex gap-3 shrink-0 mt-auto justify-end">
                <button onClick={() => setShowEditModal(false)} className="px-5 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 rounded-2xl transition-colors text-sm font-bold">
                  Cancel
                </button>
                <button onClick={handleSaveEvent} disabled={!formData.title.trim() || saving || isClassSelectionInvalid}
                  className="px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-hover hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-md">
                  {saving && <ButtonSpinner />}
                  {isClassSelectionInvalid
                    ? (isAdmin ? 'Select Valid Class & Section' : 'Select a Class to Continue')
                    : (formData._id ? 'Update Event' : 'Create Event')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm.open && (
        <div className="modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6 mx-auto border border-rose-100">
              <FaTrash size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
              {deleteConfirm.type === 'clear' ? 'Clear Day Events' : 'Confirm Deletion'}
            </h3>
            <p className="text-slate-500 text-center mb-8">
              {deleteConfirm.type === 'clear' 
                ? (deleteConfirm.hasExams 
                    ? `Are you sure you want to clear non-exam events on ${new Date(deleteConfirm.dateStr).toLocaleDateString()}? Exam events will be preserved.`
                    : `Are you sure you want to clear all events on ${new Date(deleteConfirm.dateStr).toLocaleDateString()}?`)
                : 'Are you sure you want to delete this event? This action is permanent and cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, type: 'single', id: null, dateStr: null, hasExams: false })}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all font-sans"
              >
                Cancel
              </button>
              <button
                onClick={deleteConfirm.type === 'clear' ? executeClearDayEvents : () => handleDeleteEvent(deleteConfirm.id)}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-sans"
              >
                {saving ? (
                  <ButtonSpinner className="w-4 h-4" />
                ) : (
                  <FaTrash size={14} />
                )}
                <span>{deleteConfirm.type === 'clear' ? 'Clear All' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CalendarPage;
